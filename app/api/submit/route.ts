import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { roundCoord } from "@/lib/geo";
import { isValidEmail, toE164 } from "@/lib/validate";
import { isWaterPoint } from "@/lib/water";
import { isPublicPlacePoint } from "@/lib/publicPlaces";

// Single write gateway for everything the browser used to insert directly.
// Enforces a per-IP rate limit (consume_rate_limit RPC) and, when Turnstile
// keys are configured, a captcha on the four big forms. The anon key has no
// insert rights anymore (schema v4), so this route is the only write path.
//
// Each kind is described declaratively below: its rate limit, the column
// allow-list (mass-assignment protection), and which cross-column rules apply
// (location on land, valid email, normalizable phone). Value constraints
// (rent range, rating 1–5, text lengths) are enforced by the DB checks.

const PIN_COLS =
  "id, lat, lng, rent, deposit, bhk, housing_type, furnishing, maintenance_included, gated, tenant_type, pets, parking_count, sqft, society, note, rating_sum, rating_count, report_count, created_at";

const TOLET_COLS = "id, lat, lng, photo_url, spotter_name, message, created_at";

interface KindConfig {
  max: number; // writes allowed per IP…
  window: number; // …per this many minutes
  captcha?: boolean;
  columns: string[]; // payload keys that may reach the insert
  table?: string; // plain insert target…
  rpc?: string; // …or an RPC to call instead
  returning?: string; // .select() columns; omitted → { ok: true }
  location?: boolean; // lat/lng must be finite, on land; rounded to ~100m
  emailField?: string;
  emailOptional?: boolean; // empty/absent emailField becomes null instead of 400
  phoneField?: string; // normalized to E.164 (privacy + email/SMS safety)
  tolerateDuplicate?: boolean; // 23505 treated as success (idempotent inserts)
}

const KINDS: Record<string, KindConfig> = {
  pin: {
    max: 5, window: 60, captcha: true,
    table: "rent_pins", returning: PIN_COLS, location: true,
    columns: [
      "lat", "lng", "rent", "deposit", "bhk", "housing_type", "furnishing",
      "maintenance_included", "gated", "tenant_type", "pets", "parking_count",
      "sqft", "society", "note",
    ],
  },
  listing: {
    max: 3, window: 60, captcha: true,
    table: "listings", location: true,
    emailField: "contact_email", phoneField: "contact_phone",
    columns: [
      "lat", "lng", "rent", "deposit", "bhk", "furnishing", "whole_flat",
      "veg_only", "smoking_ok", "parking", "contact_email", "contact_phone",
    ],
  },
  seeker: {
    max: 3, window: 60, captcha: true,
    table: "seekers", location: true,
    emailField: "contact_email", phoneField: "contact_phone",
    columns: [
      "lat", "lng", "budget_max", "bhk", "room_ok", "veg", "smoker",
      "contact_email", "contact_phone",
      // Optional "Tell us about you" profile (value checks live in the DB).
      "move_in", "food_pref", "smoker_pref", "gender", "flatmate_gender",
      "parking_needed", "lifestyle",
    ],
  },
  tolet: {
    max: 5, window: 60, captcha: true,
    table: "tolet_spots", returning: TOLET_COLS, location: true,
    // photo_url is never accepted from the client - it's set server-side
    // after the photo_data upload, so hotlinking is impossible.
    columns: ["lat", "lng", "spotter_name", "message"],
  },
  rating: {
    max: 30, window: 60,
    table: "pin_ratings", columns: ["pin_id", "rating"],
  },
  comment: {
    max: 10, window: 60,
    table: "pin_comments", returning: "id, body, created_at",
    columns: ["pin_id", "body"],
  },
  alert: {
    max: 5, window: 60,
    table: "area_alerts", location: true, emailField: "email",
    // "Already subscribed here" is success for the user.
    tolerateDuplicate: true,
    columns: ["lat", "lng", "email"],
  },
  report_pin: { max: 10, window: 60, rpc: "report_pin", columns: ["pin_id"] },
  report_tolet: { max: 10, window: 60, rpc: "report_tolet", columns: ["spot_id"] },
  feedback: {
    max: 5, window: 60,
    table: "feedback", emailField: "email", emailOptional: true,
    columns: ["message", "email"],
  },
};

function pick<T extends object>(obj: T, keys: string[]): Record<string, unknown> {
  const rec = obj as Record<string, unknown>;
  return Object.fromEntries(keys.filter((k) => k in rec).map((k) => [k, rec[k]]));
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Location rule: coordinates must be finite numbers on land (the DB box check
 * keeps them inside the PMR), and are rounded to ~100m server-side so the
 * privacy promise doesn't depend on the client.
 */
function checkLocation(row: Record<string, unknown>): string | null {
  const { lat, lng } = row;
  if (
    typeof lat !== "number" || !Number.isFinite(lat) ||
    typeof lng !== "number" || !Number.isFinite(lng)
  ) {
    return "Invalid location.";
  }
  // Validate the rounded point - it's what gets stored and displayed, and
  // rounding can shift a shoreline click up to ~70m into a water cell.
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  if (isWaterPoint(rLat, rLng)) {
    return "That location is in open water - pick a spot on land.";
  }
  if (isPublicPlacePoint(rLat, rLng)) {
    return "That location is a public place (park, beach, or station land) - pick a residential building.";
  }
  row.lat = rLat;
  row.lng = rLng;
  return null;
}

/** Empty/absent phone becomes null; anything else must normalize to E.164. */
function checkPhone(row: Record<string, unknown>, field: string): string | null {
  const raw = row[field];
  if (raw == null || raw === "") {
    row[field] = null;
    return null;
  }
  const e164 = typeof raw === "string" ? toE164(raw) : null;
  if (!e164) return "Invalid phone number - use a 10-digit Indian mobile.";
  row[field] = e164;
  return null;
}

// Downscaled client-side to ≤1000px JPEG; anything bigger than this decoded
// cap is not a photo from our form.
const MAX_PHOTO_BYTES = 1_500_000;

async function uploadPhoto(
  supabase: SupabaseClient,
  photoData: unknown
): Promise<{ url?: string; error?: string }> {
  if (photoData == null) return {};
  if (typeof photoData !== "string") return { error: "Invalid photo." };
  const base64 = photoData.replace(/^data:image\/jpeg;base64,/, "");
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    return { error: "Invalid photo." };
  }
  // JPEG magic bytes - the form always uploads image/jpeg.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { error: "Invalid photo." };
  }
  if (bytes.length > MAX_PHOTO_BYTES) return { error: "Photo too large." };
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("tolet-photos")
    .upload(path, bytes, { contentType: "image/jpeg" });
  if (error) return { error: `Photo upload failed: ${error.message}` };
  return { url: supabase.storage.from("tolet-photos").getPublicUrl(path).data.publicUrl };
}

async function captchaOk(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // captcha not configured - rate limit still applies
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return bad("Server not configured: SUPABASE_SERVICE_ROLE_KEY is required.", 501);
  }

  let body: { kind?: string; payload?: unknown; captchaToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON.");
  }

  const kind = body.kind ?? "";
  const config = KINDS[kind];
  const payload = (body.payload ?? {}) as Record<string, unknown>;
  if (!config || typeof payload !== "object") {
    return bad("Unknown request.");
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256")
    .update(ip + (process.env.CRON_SECRET ?? "punerents"))
    .digest("hex");

  const supabase = createClient(url, serviceKey);

  // Hard blocklist (admin panel, schema v7). Checked before captcha and rate
  // limiting so a blocked connection burns no Turnstile verification and
  // consumes no write_log rows. If the table doesn't exist yet, `data` is
  // null and the request proceeds as before.
  const { data: blocked } = await supabase
    .from("ip_blocks")
    .select("ip_hash")
    .eq("ip_hash", ipHash)
    .maybeSingle();
  if (blocked) {
    return bad("Submissions from your connection are not allowed.", 403);
  }

  if (config.captcha && !(await captchaOk(body.captchaToken, ip))) {
    return bad("Captcha failed - refresh and try again.", 403);
  }

  const { data: allowed, error: rlError } = await supabase.rpc(
    "consume_rate_limit",
    { p_ip: ipHash, p_action: kind, p_max: config.max, p_window_minutes: config.window }
  );
  if (rlError) {
    return bad(`Rate limiter unavailable: ${rlError.message}`, 500);
  }
  if (!allowed) {
    return bad("Too many submissions from your connection - try again later.", 429);
  }

  const row = pick(payload, config.columns);

  if (config.location) {
    const err = checkLocation(row);
    if (err) return bad(err);
  }
  if (config.emailField) {
    const email = row[config.emailField];
    if (config.emailOptional && (email == null || email === "")) {
      row[config.emailField] = null;
    } else if (!isValidEmail(email)) {
      return bad("Invalid email.");
    }
  }
  if (config.phoneField) {
    const err = checkPhone(row, config.phoneField);
    if (err) return bad(err);
  }

  if (config.rpc) {
    const { error } = await supabase.rpc(config.rpc, row);
    if (error) return bad(error.message);
    return NextResponse.json({ ok: true });
  }

  if (kind === "tolet") {
    const photo = await uploadPhoto(supabase, payload.photo_data);
    if (photo.error) return bad(photo.error);
    row.photo_url = photo.url ?? null;
  }

  if (config.returning) {
    const { data, error } = await supabase
      .from(config.table!).insert(row).select(config.returning).single();
    if (error) return bad(error.message);
    return NextResponse.json(data);
  }

  const { error } = await supabase.from(config.table!).insert(row);
  if (error && !(config.tolerateDuplicate && error.code === "23505")) {
    return bad(error.message);
  }
  return NextResponse.json({ ok: true });
}
