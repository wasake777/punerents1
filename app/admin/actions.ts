"use server";

import { createHash, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/adminDb";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  mintSession,
  verifySession,
} from "@/lib/adminSession";
import { sendEmail } from "@/lib/notify";
import { isValidEmail } from "@/lib/validate";

// Every admin mutation lives here. Each one re-checks the session cookie
// (the middleware already gates the pages, but actions are POST endpoints of
// their own), runs with the service key, and leaves a row in admin_audit.

async function requireAdmin(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!password || !token || !(await verifySession(token, password))) {
    redirect("/admin/login");
  }
}

/** Same per-IP hash as /api/submit, so both share write_log and ip_blocks. */
async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(ip + (process.env.CRON_SECRET ?? "punerents"))
    .digest("hex");
}

async function audit(
  sb: SupabaseClient,
  action: string,
  target?: string,
  detail?: string
) {
  const { error } = await sb
    .from("admin_audit")
    .insert({ action, target: target ?? null, detail: detail ?? null });
  // Missing table (schema v7 not applied yet) shouldn't block moderation.
  if (error) console.warn(`admin_audit insert failed: ${error.message}`);
}

type Mutate = (
  sb: SupabaseClient
) => PromiseLike<{ error: { message: string } | null }>;

async function run(
  path: string,
  action: string,
  target: string | undefined,
  mutate: Mutate,
  detail?: string
) {
  await requireAdmin();
  const sb = adminDb();
  const { error } = await mutate(sb);
  if (error) throw new Error(`${action} failed: ${error.message}`);
  await audit(sb, action, target, detail);
  revalidatePath(path);
}

// --- Auth --------------------------------------------------------------------

export async function login(formData: FormData) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) redirect("/admin/login?error=unconfigured");

  // Brute-force protection rides the same rate limiter as public submissions.
  const sb = adminDb();
  const { data: allowed, error } = await sb.rpc("consume_rate_limit", {
    p_ip: await ipHash(),
    p_action: "admin_login",
    p_max: 5,
    p_window_minutes: 15,
  });
  if (error || !allowed) redirect("/admin/login?error=rate");

  const given = String(formData.get("password") ?? "");
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(adminPassword).digest();
  if (!timingSafeEqual(a, b)) redirect("/admin/login?error=bad");

  (await cookies()).set(SESSION_COOKIE, await mintSession(adminPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_S,
    path: "/",
  });
  await audit(sb, "login");
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// --- Rent pins -----------------------------------------------------------------

export async function setPinHidden(id: string, hidden: boolean) {
  await run("/admin/pins", hidden ? "pin.hide" : "pin.unhide", id, (sb) =>
    sb.from("rent_pins").update({ hidden }).eq("id", id)
  );
}

/**
 * "This pin stays." Resolves the open flags (keeping them for history) and
 * marks the pin approved, so no future flag can auto-hide it.
 *
 * The old version just set report_count back to 0, which handed anyone willing
 * to flag it again a fresh run at the threshold - the moderator could never
 * actually win. approve_pin (schema v9) makes the decision stick.
 */
export async function clearPinReports(id: string) {
  await run("/admin/pins", "pin.approve", id, (sb) =>
    sb.rpc("approve_pin", { p_pin_id: id })
  );
}

export async function wipePinRatings(id: string) {
  await requireAdmin();
  const sb = adminDb();
  const del = await sb.from("pin_ratings").delete().eq("pin_id", id);
  if (del.error) throw new Error(`pin.wipe_ratings failed: ${del.error.message}`);
  const upd = await sb
    .from("rent_pins")
    .update({ rating_sum: 0, rating_count: 0 })
    .eq("id", id);
  if (upd.error) throw new Error(`pin.wipe_ratings failed: ${upd.error.message}`);
  await audit(sb, "pin.wipe_ratings", id);
  revalidatePath("/admin/pins");
}

/** Hard delete - cascades ratings and comments. */
export async function deletePin(id: string) {
  await run("/admin/pins", "pin.delete", id, (sb) =>
    sb.from("rent_pins").delete().eq("id", id)
  );
}

// --- Pin comments --------------------------------------------------------------

export async function setCommentHidden(id: string, hidden: boolean) {
  await run(
    "/admin/comments",
    hidden ? "comment.hide" : "comment.unhide",
    id,
    (sb) => sb.from("pin_comments").update({ hidden }).eq("id", id)
  );
}

export async function deleteComment(id: string) {
  await run("/admin/comments", "comment.delete", id, (sb) =>
    sb.from("pin_comments").delete().eq("id", id)
  );
}

// --- To-Let spots ----------------------------------------------------------------

export async function setToletHidden(id: string, hidden: boolean) {
  await run("/admin/tolets", hidden ? "tolet.hide" : "tolet.unhide", id, (sb) =>
    sb.from("tolet_spots").update({ hidden }).eq("id", id)
  );
}

/** As clearPinReports, for spotted To-Let boards. */
export async function clearToletReports(id: string) {
  await run("/admin/tolets", "tolet.approve", id, (sb) =>
    sb.rpc("approve_tolet", { p_spot_id: id })
  );
}

/** Deletes the row AND its photo from storage - no orphaned public files. */
export async function deleteTolet(id: string) {
  await requireAdmin();
  const sb = adminDb();
  const { data } = await sb
    .from("tolet_spots")
    .select("photo_url")
    .eq("id", id)
    .single();
  const { error } = await sb.from("tolet_spots").delete().eq("id", id);
  if (error) throw new Error(`tolet.delete failed: ${error.message}`);
  const path = data?.photo_url?.split("/tolet-photos/")[1];
  if (path) {
    // Legacy rows (pre-v5) could hold arbitrary URLs; a malformed % sequence
    // must not turn a successful delete into an error page.
    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {}
    const { error: rmError } = await sb.storage
      .from("tolet-photos")
      .remove([decoded]);
    if (rmError) console.warn(`tolet photo removal failed: ${rmError.message}`);
  }
  await audit(sb, "tolet.delete", id, path ? `photo:${path}` : undefined);
  revalidatePath("/admin/tolets");
}

// --- Listings --------------------------------------------------------------------

export async function setListingHidden(id: string, hidden: boolean) {
  await run(
    "/admin/listings",
    hidden ? "listing.hide" : "listing.unhide",
    id,
    (sb) => sb.from("listings").update({ hidden }).eq("id", id)
  );
}

/** "My flat is taken" - stop matching it immediately. */
export async function expireListing(id: string) {
  await run("/admin/listings", "listing.expire", id, (sb) =>
    sb
      .from("listings")
      .update({ active_until: new Date().toISOString() })
      .eq("id", id)
  );
}

export async function extendListing(id: string) {
  const until = new Date(Date.now() + 45 * 86400_000).toISOString();
  await run(
    "/admin/listings",
    "listing.extend",
    id,
    (sb) => sb.from("listings").update({ active_until: until }).eq("id", id),
    `until:${until}`
  );
}

export async function deleteListing(id: string) {
  await run("/admin/listings", "listing.delete", id, (sb) =>
    sb.from("listings").delete().eq("id", id)
  );
}

// --- Seekers ---------------------------------------------------------------------

export async function expireSeeker(id: string) {
  await run("/admin/seekers", "seeker.expire", id, (sb) =>
    sb
      .from("seekers")
      .update({ active_until: new Date().toISOString() })
      .eq("id", id)
  );
}

export async function extendSeeker(id: string) {
  const until = new Date(Date.now() + 30 * 86400_000).toISOString();
  await run(
    "/admin/seekers",
    "seeker.extend",
    id,
    (sb) => sb.from("seekers").update({ active_until: until }).eq("id", id),
    `until:${until}`
  );
}

/** PII removal - use for "delete my data" requests. Cascades matches. */
export async function deleteSeeker(id: string) {
  await run("/admin/seekers", "seeker.delete", id, (sb) =>
    sb.from("seekers").delete().eq("id", id)
  );
}

// --- Area alerts -------------------------------------------------------------------

export async function deleteAlert(id: string) {
  await run("/admin/alerts", "alert.delete", id, (sb) =>
    sb.from("area_alerts").delete().eq("id", id)
  );
}

/** Re-arm a used subscription so its next matching listing emails again. */
export async function rearmAlert(id: string) {
  await run("/admin/alerts", "alert.rearm", id, (sb) =>
    sb.from("area_alerts").update({ notified_at: null }).eq("id", id)
  );
}

// --- Matching ---------------------------------------------------------------------

/** Forget a pair so the next matcher run re-sends it. */
export async function deleteMatch(id: string) {
  await run("/admin/matching", "match.delete", id, (sb) =>
    sb.from("matches").delete().eq("id", id)
  );
}

/** Trigger /api/match right now instead of waiting for the nightly cron. */
export async function runMatcher() {
  await requireAdmin();
  const secret = process.env.CRON_SECRET;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  let summary: unknown;
  try {
    const res = await fetch(`${proto}://${host}/api/match`, {
      headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
      cache: "no-store",
    });
    summary = await res.json();
  } catch (e) {
    summary = { error: e instanceof Error ? e.message : String(e) };
  }
  const json = JSON.stringify(summary);
  await audit(adminDb(), "matcher.run", undefined, json.slice(0, 500));
  redirect(`/admin/matching?result=${encodeURIComponent(json)}`);
}

export async function sendTestEmail(formData: FormData) {
  await requireAdmin();
  const to = String(formData.get("to") ?? "");
  if (!isValidEmail(to)) redirect("/admin/matching?test=invalid");
  const result = await sendEmail(
    to,
    "PuneRents admin test email",
    `<p>This is a test email sent from the PuneRents admin panel. If you can
     read this, outbound email is working.</p>`
  );
  await audit(adminDb(), "email.test", to, result);
  redirect(`/admin/matching?test=${result}`);
}

// --- Abuse / IP blocks ----------------------------------------------------------------

export async function blockIp(formData: FormData) {
  await requireAdmin();
  const hash = String(formData.get("ip_hash") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f]{64}$/.test(hash)) redirect("/admin/abuse?error=badhash");
  await run(
    "/admin/abuse",
    "ip.block",
    hash,
    (sb) => sb.from("ip_blocks").upsert({ ip_hash: hash, note: note || null }),
    note || undefined
  );
}

export async function unblockIp(hash: string) {
  await run("/admin/abuse", "ip.unblock", hash, (sb) =>
    sb.from("ip_blocks").delete().eq("ip_hash", hash)
  );
}
