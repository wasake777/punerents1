import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatINR } from "@/lib/format";
import { emailConfigured, sendEmail, sendSms } from "@/lib/notify";
import { escapeHtml } from "@/lib/validate";

// Daily matcher: pairs seekers with listings within 2.5km that fit budget/BHK/
// preferences, emails both sides each other's contact (the ONLY place contacts
// are ever shared), and records the pair so it's never re-sent. Also delivers
// the "be the first to know" area alerts: one email per subscription when a
// new listing appears within 1km of it.
//
// Trigger: Vercel cron (see vercel.json) or `curl -H "Authorization: Bearer
// $CRON_SECRET" https://<site>/api/match`.

export const maxDuration = 60;

// Emails/SMS are awaited per pair; a big backlog processed one-by-one would
// hit the function timeout halfway through the list.
const CONCURRENCY = 5;

async function inChunks<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    out.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(fn))));
  }
  return out;
}

interface MatchRow {
  seeker_id: string;
  listing_id: string;
  seeker_email: string;
  seeker_phone: string | null;
  seeker_move_in: string | null;
  seeker_food_pref: string | null;
  seeker_smoker_pref: string | null;
  seeker_gender: string | null;
  seeker_flatmate_gender: string | null;
  seeker_parking_needed: boolean | null;
  seeker_lifestyle: string | null;
  listing_email: string;
  listing_phone: string | null;
  listing_rent: number;
  listing_bhk: string;
  listing_furnishing: string;
  listing_whole_flat: boolean;
  listing_lat: number;
  listing_lng: number;
}

interface AlertRow {
  alert_id: string;
  email: string;
  listing_rent: number;
  listing_bhk: string;
  listing_furnishing: string;
  listing_whole_flat: boolean;
  listing_lat: number;
  listing_lng: number;
}

function describeFlat(r: {
  listing_bhk: string;
  listing_whole_flat: boolean;
  listing_furnishing: string;
  listing_rent: number;
}): string {
  return `${r.listing_bhk} ${r.listing_whole_flat ? "flat" : "room"} · ${r.listing_furnishing} · ${formatINR(r.listing_rent)}/month`;
}

function osmLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

/** "About the seeker" block for the owner email; "" when nothing was shared. */
function seekerProfileHtml(m: MatchRow): string {
  const bits = [
    m.seeker_move_in && `Move-in: ${m.seeker_move_in}`,
    m.seeker_gender && `Gender: ${m.seeker_gender}`,
    m.seeker_flatmate_gender && m.seeker_flatmate_gender !== "Any" &&
      `Prefers ${m.seeker_flatmate_gender} flatmates`,
    m.seeker_food_pref && m.seeker_food_pref !== "Any" &&
      `Prefers ${m.seeker_food_pref} flatmates`,
    m.seeker_smoker_pref && m.seeker_smoker_pref !== "Any" &&
      `Flatmate smoking: ${m.seeker_smoker_pref}`,
    m.seeker_parking_needed && "Needs parking",
  ].filter((b): b is string => !!b);
  const line = bits.length
    ? `<p>About the seeker: ${bits.map(escapeHtml).join(" · ")}</p>`
    : "";
  const lifestyle = m.seeker_lifestyle
    ? `<p style="color:#475569">In their words: <i>&ldquo;${escapeHtml(m.seeker_lifestyle)}&rdquo;</i></p>`
    : "";
  return line + lifestyle;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail closed in production: this route sends email/SMS, so it must never
  // be publicly triggerable just because the secret was forgotten.
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 401 }
    );
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 501 }
    );
  }

  const supabase = createClient(url, serviceKey);

  // --- Seeker ↔ listing matches ---
  const { data, error } = await supabase.rpc("find_new_matches");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as MatchRow[];

  const matchResults = await inChunks(rows, async (m) => {
    const result = { emailed: 0, smsSent: 0, failed: 0, recordErrors: 0 };
    const flatDesc = describeFlat(m);
    const mapLink = osmLink(m.listing_lat, m.listing_lng);
    // Phones are E.164-normalized on submit and emails regex-checked, but
    // escape everything user-supplied anyway - old rows predate validation.
    const ownerContact = escapeHtml(m.listing_email);
    const ownerPhone = m.listing_phone ? escapeHtml(m.listing_phone) : null;
    const seekerContact = escapeHtml(m.seeker_email);
    const seekerPhone = m.seeker_phone ? escapeHtml(m.seeker_phone) : null;

    const seekerResult = await sendEmail(
      m.seeker_email,
      `🏠 Match found: ${flatDesc}`,
      `<p>A flat matching your <a href="https://punerents.com">PuneRents</a> search is available:</p>
       <p><b>${flatDesc}</b><br>Approximate location: <a href="${mapLink}">map</a></p>
       <p>Owner contact: <b>${ownerContact}</b>${ownerPhone ? ` · <b>${ownerPhone}</b>` : ""}</p>
       <p>No broker, no fee. Mention PuneRents when you call.</p>`
    );
    // The seeker email carries the contact - that IS the match. Record the
    // pair only when it was really delivered: "failed" retries next run, and
    // "skipped" (email not configured yet) stays pending so the contact still
    // goes out once creds are added - same semantics as area alerts below.
    if (seekerResult !== "sent") {
      if (seekerResult === "failed") result.failed = 1;
      return result;
    }
    result.emailed++;

    // Record immediately after the delivery that matters, so a crash later in
    // this pair can't re-send it. The unique (seeker_id, listing_id) index
    // makes a duplicate insert (23505) harmless.
    const { error: recordError } = await supabase
      .from("matches")
      .insert({ seeker_id: m.seeker_id, listing_id: m.listing_id });
    if (recordError && recordError.code !== "23505") {
      // Emailed but not recorded - the next run will re-send. Surface it so
      // a broken matches table doesn't fail silently.
      result.recordErrors = 1;
    }

    // Owner email is best-effort: the seeker already has the owner's contact.
    const ownerResult = await sendEmail(
      m.listing_email,
      `🔎 A flat-hunter matches your listing (${flatDesc})`,
      `<p>Someone searching near your flat matches your listing:</p>
       <p>Seeker contact: <b>${seekerContact}</b>${seekerPhone ? ` · <b>${seekerPhone}</b>` : ""}</p>
       ${seekerProfileHtml(m)}
       <p>No broker, no fee - you can reach out directly.</p>`
    );
    if (ownerResult === "sent") result.emailed++;

    // SMS both sides too (best-effort; needs SMS_ENABLED=true + AWS creds).
    const seekerSms = await sendSms(
      m.seeker_phone,
      `PuneRents match: ${flatDesc}. Owner: ${m.listing_email}${m.listing_phone ? ` / ${m.listing_phone}` : ""}. No broker, no fee.`
    );
    const ownerSms = await sendSms(
      m.listing_phone,
      `PuneRents: a flat-hunter matches your listing (${flatDesc}). Seeker: ${m.seeker_email}${m.seeker_phone ? ` / ${m.seeker_phone}` : ""}.`
    );
    if (seekerSms === "sent") result.smsSent++;
    if (ownerSms === "sent") result.smsSent++;
    return result;
  });

  const emailed = matchResults.reduce((n, r) => n + r.emailed, 0);
  const failed = matchResults.reduce((n, r) => n + r.failed, 0);
  const smsSent = matchResults.reduce((n, r) => n + r.smsSent, 0);
  const recordErrors = matchResults.reduce((n, r) => n + r.recordErrors, 0);

  // --- 1-km area alerts ("be the first to know when a flat opens here") ---
  const alerts = await supabase.rpc("find_new_area_alerts");
  const alertRows = (alerts.data ?? []) as AlertRow[];

  const alertResults = await inChunks(alertRows, async (a) => {
    const flatDesc = describeFlat(a);
    const mapLink = osmLink(a.listing_lat, a.listing_lng);

    const result = await sendEmail(
      a.email,
      `🔔 A flat just opened up near your spot: ${flatDesc}`,
      `<p>You asked <a href="https://punerents.com">PuneRents</a> to tell you the moment a place lists within
       1&nbsp;km of a spot you saved - it just happened:</p>
       <p><b>${flatDesc}</b><br>Approximate location: <a href="${mapLink}">map</a></p>
       <p>Drop a seeker pin there on the map and the owner's contact lands in
       your inbox. No broker, no fee.</p>
       <p style="color:#64748b;font-size:12px">This was your one alert email for
       this spot - you won't hear from us again unless you subscribe anew.</p>`
    );
    // Mark delivered only on real success; "skipped" (no key yet) stays
    // pending so it goes out once emails are configured.
    if (result !== "sent") return 0;
    await supabase
      .from("area_alerts")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", a.alert_id);
    return 1;
  });
  const alertsEmailed = alertResults.reduce((n: number, r) => n + r, 0);

  // Housekeeping: rate-limit log only needs the last hour; keep a day for
  // debugging and drop the rest.
  await supabase
    .from("write_log")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  return NextResponse.json({
    pairs: rows.length,
    emailed,
    failed,
    recordErrors,
    smsSent,
    alerts: alertRows.length,
    alertsEmailed,
    // Non-null when find_new_area_alerts is missing (schema v3.2 not applied)
    alertsError: alerts.error?.message ?? null,
    emailsSkipped: !emailConfigured(),
    smsEnabled: process.env.SMS_ENABLED === "true",
  });
}
