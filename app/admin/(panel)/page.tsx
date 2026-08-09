import Link from "next/link";
import { SupabaseClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/adminDb";
import { emailConfigured } from "@/lib/notify";
import { formatINR } from "@/lib/format";
import { daysAgo } from "@/lib/types";
import { Badge, Card, Empty, MapLink, PageHead, Table, Td, Th } from "./admin-ui";

export const dynamic = "force-dynamic";

// Head-only count with optional filters; null when the query fails (e.g. a
// table from a schema version that hasn't been applied yet).
type CountQuery = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

async function count(
  sb: SupabaseClient,
  table: string,
  refine?: (q: CountQuery) => CountQuery
): Promise<number | null> {
  let q = sb.from(table).select("*", { count: "exact", head: true });
  if (refine) q = refine(q);
  const { count: n, error } = await q;
  return error ? null : n ?? 0;
}

function num(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-IN");
}

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-300"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </Link>
  );
}

function Health({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-slate-200">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
      {label}
    </span>
  );
}

interface ReportedPin {
  id: string;
  lat: number;
  lng: number;
  rent: number;
  bhk: string;
  report_count: number;
  report_score: number | null;
  moderation_state: string | null;
  hidden: boolean;
  created_at: string;
}

interface ReasonRow {
  pin_id: string;
  reason: string;
  claimed_rent: number | null;
}

const REASON_LABELS: Record<string, string> = {
  wrong_price: "wrong rent",
  not_a_rental: "not a rental",
  spam: "spam",
  duplicate: "duplicate",
  offensive: "offensive",
  other: "other",
};

export default async function Dashboard() {
  const sb = adminDb();
  const nowIso = new Date().toISOString();

  const [
    pins, pinsHidden, pinsReported,
    comments, commentsHidden,
    tolets, toletsReported,
    listings, listingsLive,
    seekers, seekersLive,
    matches, alerts, alertsPending,
    writes24h,
  ] = await Promise.all([
    count(sb, "rent_pins"),
    count(sb, "rent_pins", (q) => q.eq("hidden", true)),
    count(sb, "rent_pins", (q) => q.gt("report_count", 0)),
    count(sb, "pin_comments"),
    count(sb, "pin_comments", (q) => q.eq("hidden", true)),
    count(sb, "tolet_spots"),
    count(sb, "tolet_spots", (q) => q.gt("report_count", 0)),
    count(sb, "listings"),
    count(sb, "listings", (q) => q.eq("hidden", false).gt("active_until", nowIso)),
    count(sb, "seekers"),
    count(sb, "seekers", (q) => q.gt("active_until", nowIso)),
    count(sb, "matches"),
    count(sb, "area_alerts"),
    count(sb, "area_alerts", (q) => q.is("notified_at", null)),
    count(sb, "write_log", (q) =>
      q.gt("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
    ),
  ]);

  const { data: reportedPins } = await sb
    .from("rent_pins")
    .select("id, lat, lng, rent, bhk, report_count, report_score, hidden, moderation_state, created_at")
    .gt("report_count", 0)
    .order("report_score", { ascending: false })
    .limit(10);

  // Why each pin was flagged. Ranking by score rather than raw count matters:
  // three flags fired off together by fresh devices score far below three that
  // arrived independently over a week (schema v9), so a staged campaign sinks
  // down this list instead of straight to the top. Missing table = v9 not
  // applied yet, and the queue simply renders without reasons.
  const { data: reasonRows } = await sb
    .from("pin_reports")
    .select("pin_id, reason, claimed_rent")
    .eq("resolved", false)
    .in("pin_id", (reportedPins ?? []).map((p) => (p as ReportedPin).id));

  const reasonsByPin = new Map<string, string[]>();
  for (const r of (reasonRows ?? []) as ReasonRow[]) {
    const label = r.claimed_rent
      ? `${REASON_LABELS[r.reason] ?? r.reason} (says ${formatINR(r.claimed_rent)})`
      : REASON_LABELS[r.reason] ?? r.reason;
    reasonsByPin.set(r.pin_id, [...(reasonsByPin.get(r.pin_id) ?? []), label]);
  }

  return (
    <div>
      <PageHead
        title="Dashboard"
        subtitle="What needs a human, and whether the machinery is running."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Health ok={emailConfigured()} label="Email (SES)" />
        <Health ok={process.env.SMS_ENABLED === "true"} label="SMS" />
        <Health ok={!!process.env.TURNSTILE_SECRET_KEY} label="Captcha" />
        <Health ok={!!process.env.CRON_SECRET} label="Cron secret" />
        <Health ok={!!process.env.SUPABASE_SERVICE_ROLE_KEY} label="Service key" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          label="Rent pins"
          value={num(pins)}
          sub={`${num(pinsHidden)} hidden · ${num(pinsReported)} reported`}
          href="/admin/pins"
        />
        <Stat
          label="Comments"
          value={num(comments)}
          sub={`${num(commentsHidden)} hidden`}
          href="/admin/comments"
        />
        <Stat
          label="To-Let spots"
          value={num(tolets)}
          sub={`${num(toletsReported)} reported`}
          href="/admin/tolets"
        />
        <Stat
          label="Listings"
          value={num(listings)}
          sub={`${num(listingsLive)} live`}
          href="/admin/listings"
        />
        <Stat
          label="Seekers"
          value={num(seekers)}
          sub={`${num(seekersLive)} active`}
          href="/admin/seekers"
        />
        <Stat
          label="Matches emailed"
          value={num(matches)}
          href="/admin/matching"
        />
        <Stat
          label="Area alerts"
          value={num(alerts)}
          sub={`${num(alertsPending)} waiting`}
          href="/admin/alerts"
        />
        <Stat
          label="Writes (24h)"
          value={num(writes24h)}
          sub="all public submissions"
          href="/admin/abuse"
        />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
        Report queue — most-reported pins
      </h2>
      <Card>
        {reportedPins?.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Reports</Th>
                <Th>Why</Th>
                <Th>Pin</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th>Age</Th>
              </tr>
            </thead>
            <tbody>
              {(reportedPins as ReportedPin[]).map((p) => (
                <tr key={p.id}>
                  <Td>
                    <Badge tone={p.report_count >= 3 ? "rose" : "amber"}>
                      {p.report_count}
                    </Badge>
                    <span className="ml-1 text-xs text-slate-400">
                      score {p.report_score?.toFixed(1) ?? "-"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-600">
                      {reasonsByPin.get(p.id)?.join(", ") ?? "-"}
                    </span>
                  </Td>
                  <Td>
                    {p.bhk} · {formatINR(p.rent)}
                  </Td>
                  <Td>
                    <MapLink lat={p.lat} lng={p.lng} />
                  </Td>
                  <Td>
                    {p.moderation_state === "approved" ? (
                      <Badge tone="emerald">approved</Badge>
                    ) : p.hidden ? (
                      <Badge tone="rose">hidden</Badge>
                    ) : (
                      <Badge tone="amber">queued</Badge>
                    )}
                  </Td>
                  <Td>{daysAgo(p.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty label="No reported pins — the map is clean." />
        )}
      </Card>
      {reportedPins && reportedPins.length > 0 && (
        <p className="mt-2 text-sm">
          <Link href="/admin/pins?filter=reported" className="text-emerald-700 hover:underline">
            Moderate these in the Pins section →
          </Link>
        </p>
      )}
    </div>
  );
}
