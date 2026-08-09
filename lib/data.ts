import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  MatchPreviewItem,
  NewListing,
  NewRentPin,
  NewSeeker,
  NewToLetSpot,
  PinComment,
  PinFlag,
  RatingSummary,
  RentPin,
  ToLetSpot,
} from "./types";
import { distanceKm, roundCoord } from "./geo";
import { generateSeedPins } from "./seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

/** True when a real Supabase backend is configured; false = local demo mode. */
export const isLive = supabase !== null;

const LOCAL_KEY = "punerents_local_pins";

const PIN_COLS =
  "id, lat, lng, rent, deposit, bhk, housing_type, furnishing, maintenance_included, gated, tenant_type, pets, parking_count, sqft, society, note, rating_sum, rating_count, report_count, created_at";

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readLocalPins(): RentPin[] {
  return readLocal<RentPin[]>(LOCAL_KEY, []);
}

// --- Write gateway -----------------------------------------------------------
// Live-mode writes go through /api/submit, which rate-limits per IP and
// (when configured) verifies Turnstile. The anon key is read-only.

let captchaToken: string | null = null;
let captchaReset: (() => void) | null = null;

/** Called by the Turnstile widget; the next form submit sends it along. */
export function setCaptchaToken(token: string | null) {
  captchaToken = token;
}

/** The widget registers how to mint a fresh token after a failed submit. */
export function registerCaptchaReset(fn: (() => void) | null) {
  captchaReset = fn;
}

async function submit<T>(kind: string, payload: unknown): Promise<T> {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, payload, captchaToken }),
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    // Turnstile tokens are single-use; get a fresh one so a retry can pass.
    captchaToken = null;
    captchaReset?.();
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

// PostgREST caps every response at 1,000 rows regardless of .limit(), so big
// tables must be paged or the map silently truncates.
const PAGE = 1000;
const MAX_PINS = 10000;

export async function fetchPins(): Promise<RentPin[]> {
  if (supabase) {
    const all: RentPin[] = [];
    for (let from = 0; from < MAX_PINS; from += PAGE) {
      const { data, error } = await supabase
        .from("rent_pins")
        .select(PIN_COLS)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Failed to load pins: ${error.message}`);
      all.push(...(data as unknown as RentPin[]));
      if (data.length < PAGE) break;
    }
    if (all.length >= MAX_PINS) {
      // Don't fail - but don't truncate silently either. Time for
      // viewport-bounded fetching when this fires.
      console.warn(`fetchPins: hit the ${MAX_PINS}-pin cap; oldest pins are not shown.`);
    }
    return all;
  }
  return [...generateSeedPins(), ...readLocalPins()];
}

export async function addPin(input: NewRentPin): Promise<RentPin> {
  const row = {
    ...input,
    lat: roundCoord(input.lat),
    lng: roundCoord(input.lng),
  };
  if (supabase) {
    return submit<RentPin>("pin", row);
  }
  const pin: RentPin = {
    ...row,
    id: crypto.randomUUID(),
    rating_sum: 0,
    rating_count: 0,
    report_count: 0,
    created_at: new Date().toISOString(),
  };
  writeLocal(LOCAL_KEY, [...readLocalPins(), pin]);
  return pin;
}

// --- Listings & seekers -----------------------------------------------------
// Live mode: write-only inserts (RLS blocks reads, so contact emails can never
// be pulled through the anon API). Demo mode: localStorage.

const LOCAL_LISTINGS_KEY = "punerents_local_listings";

type LocalListing = NewListing & { id: string; created_at: string };

function readLocalListings(): LocalListing[] {
  return readLocal<LocalListing[]>(LOCAL_LISTINGS_KEY, []);
}

export async function addListing(input: NewListing): Promise<void> {
  const row = {
    ...input,
    lat: roundCoord(input.lat),
    lng: roundCoord(input.lng),
  };
  if (supabase) {
    await submit("listing", row);
    return;
  }
  writeLocal(LOCAL_LISTINGS_KEY, [
    ...readLocalListings(),
    { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() },
  ]);
}

export async function addSeeker(input: NewSeeker): Promise<void> {
  const row = {
    ...input,
    lat: roundCoord(input.lat),
    lng: roundCoord(input.lng),
  };
  if (supabase) {
    await submit("seeker", row);
  }
  // Demo mode: nothing to persist server-side; the preview below still works.
}

function localListingToPreview(l: LocalListing): MatchPreviewItem {
  return {
    lat: l.lat,
    lng: l.lng,
    rent: l.rent,
    bhk: l.bhk,
    furnishing: l.furnishing,
    whole_flat: l.whole_flat,
  };
}

export async function matchPreview(
  seeker: Pick<NewSeeker, "lat" | "lng" | "budget_max" | "bhk" | "room_ok">
): Promise<MatchPreviewItem[]> {
  if (supabase) {
    const { data, error } = await supabase.rpc("match_preview", {
      p_lat: seeker.lat,
      p_lng: seeker.lng,
      p_budget: seeker.budget_max,
      p_bhk: seeker.bhk,
      p_room_ok: seeker.room_ok,
    });
    if (error) throw new Error(`Match preview failed: ${error.message}`);
    return (data ?? []) as MatchPreviewItem[];
  }
  return readLocalListings()
    .filter((l) => {
      const withinRadius =
        distanceKm(seeker.lat, seeker.lng, l.lat, l.lng) <= 2.5;
      const bhkOk = l.bhk === seeker.bhk || (seeker.room_ok && !l.whole_flat);
      return withinRadius && l.rent <= seeker.budget_max && bhkOk;
    })
    .map(localListingToPreview);
}

/** All currently active listings, anonymized - the "Available flats" layer. */
export async function availableFlats(): Promise<MatchPreviewItem[]> {
  if (supabase) {
    const { data, error } = await supabase.rpc("available_flats");
    if (error) throw new Error(`Failed to load available flats: ${error.message}`);
    return (data ?? []) as MatchPreviewItem[];
  }
  return readLocalListings().map(localListingToPreview);
}

// A flag carries its reason to the server, which records one row per reporter
// and weighs it (schema v9). It never deletes a pin by itself - the RPC only
// updates the pin's score and queue state.
export async function reportPin(pinId: string, flag: PinFlag): Promise<void> {
  if (!supabase || pinId.startsWith("seed-")) return; // no-op in demo mode
  await submit("report_pin", {
    pin_id: pinId,
    reason: flag.reason,
    claimed_rent: flag.claimed_rent ?? null,
    note: flag.note ?? null,
  });
}

// --- Ratings & comments -----------------------------------------------------
// Demo mode keeps them per-browser in localStorage so the UI is fully usable.

const LOCAL_SOCIAL_KEY = "punerents_local_social";

type LocalSocial = Record<string, { ratings: number[]; comments: PinComment[] }>;

function readLocalSocial(): LocalSocial {
  return readLocal<LocalSocial>(LOCAL_SOCIAL_KEY, {});
}

export interface PinSocial {
  rating: RatingSummary;
  comments: PinComment[];
}

export async function fetchPinSocial(
  pin: Pick<RentPin, "id" | "rating_sum" | "rating_count">
): Promise<PinSocial> {
  // The pin row already carries trigger-maintained rating aggregates, so only
  // comments need a query - no pulling every rating row just to average it.
  if (supabase && !pin.id.startsWith("seed-")) {
    const { data, error } = await supabase
      .from("pin_comments")
      .select("id, body, created_at")
      .eq("pin_id", pin.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return {
      rating: {
        count: pin.rating_count,
        avg: pin.rating_count > 0 ? pin.rating_sum / pin.rating_count : null,
      },
      comments: (data ?? []) as PinComment[],
    };
  }
  // Demo mode: combine the pin's baked-in aggregate (seed data) with ratings
  // stored per-browser in localStorage.
  const entry = readLocalSocial()[pin.id] ?? { ratings: [], comments: [] };
  const count = pin.rating_count + entry.ratings.length;
  const sum = pin.rating_sum + entry.ratings.reduce((a, b) => a + b, 0);
  return {
    rating: { count, avg: count > 0 ? sum / count : null },
    comments: [...entry.comments].reverse(),
  };
}

export async function ratePin(pinId: string, rating: number): Promise<void> {
  if (supabase && !pinId.startsWith("seed-")) {
    await submit("rating", { pin_id: pinId, rating });
    return;
  }
  const social = readLocalSocial();
  const entry = social[pinId] ?? { ratings: [], comments: [] };
  entry.ratings.push(rating);
  social[pinId] = entry;
  writeLocal(LOCAL_SOCIAL_KEY, social);
}

export async function addPinComment(pinId: string, body: string): Promise<PinComment> {
  if (supabase && !pinId.startsWith("seed-")) {
    return submit<PinComment>("comment", { pin_id: pinId, body });
  }
  const comment: PinComment = {
    id: crypto.randomUUID(),
    body,
    created_at: new Date().toISOString(),
  };
  const social = readLocalSocial();
  const entry = social[pinId] ?? { ratings: [], comments: [] };
  entry.comments.push(comment);
  social[pinId] = entry;
  writeLocal(LOCAL_SOCIAL_KEY, social);
  return comment;
}

// --- Area alerts ("be the first to know when a flat opens here") ------------

export async function addAreaAlert(
  lat: number,
  lng: number,
  email: string
): Promise<void> {
  if (supabase) {
    // "Already subscribed here" is treated as success server-side.
    await submit("alert", { lat: roundCoord(lat), lng: roundCoord(lng), email });
  }
  // Demo mode: accept silently - there is no mailer to notify anyway.
}

// --- To-Let spotting ---------------------------------------------------------

const LOCAL_TOLETS_KEY = "punerents_local_tolets";

function readLocalToLets(): ToLetSpot[] {
  return readLocal<ToLetSpot[]>(LOCAL_TOLETS_KEY, []);
}

export async function fetchToLets(): Promise<ToLetSpot[]> {
  if (supabase) {
    const all: ToLetSpot[] = [];
    for (let from = 0; from < 3000; from += PAGE) {
      const { data, error } = await supabase
        .from("tolet_spots")
        .select("id, lat, lng, photo_url, spotter_name, message, created_at")
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Failed to load To-Let spots: ${error.message}`);
      all.push(...(data as ToLetSpot[]));
      if (data.length < PAGE) break;
    }
    return all;
  }
  return readLocalToLets();
}

/**
 * Adds a spotted To-Let board. `photo` is an already-downscaled JPEG blob.
 * Live mode sends it through /api/submit (which validates and uploads it with
 * the service key, so storage rides the same rate limit as everything else);
 * demo mode stores a data URL locally.
 */
export async function addToLet(
  input: NewToLetSpot,
  photo: Blob | null
): Promise<ToLetSpot> {
  const base = {
    ...input,
    lat: roundCoord(input.lat),
    lng: roundCoord(input.lng),
  };
  if (supabase) {
    const photo_data = photo ? await blobToDataUrl(photo) : null;
    return submit<ToLetSpot>("tolet", { ...base, photo_data });
  }
  const photo_url = photo ? await blobToDataUrl(photo) : null;
  const spot: ToLetSpot = {
    ...base,
    id: crypto.randomUUID(),
    photo_url,
    created_at: new Date().toISOString(),
  };
  writeLocal(LOCAL_TOLETS_KEY, [...readLocalToLets(), spot]);
  return spot;
}

export async function reportToLet(spotId: string, flag: PinFlag): Promise<void> {
  if (!supabase) return;
  await submit("report_tolet", {
    spot_id: spotId,
    reason: flag.reason,
    note: flag.note ?? null,
  });
}

// --- Feedback ("Request a feature" in the Live Stats modal) ------------------

export async function sendFeedback(
  message: string,
  email: string | null
): Promise<void> {
  if (supabase) {
    await submit("feedback", { message, email });
    return;
  }
  // Demo mode has no server to store it - surface it for the developer.
  console.info("[demo] feedback:", message, email);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
