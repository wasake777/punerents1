import { adminDb } from "@/lib/adminDb";
import { formatINR } from "@/lib/format";
import { emailConfigured } from "@/lib/notify";
import { daysAgo } from "@/lib/types";
import { deleteMatch, runMatcher, sendTestEmail } from "../../actions";
import {
  BTN_DANGER,
  BTN_PRIMARY,
  Badge,
  Card,
  Empty,
  ErrorNote,
  PageHead,
  Table,
  Td,
  Th,
} from "../admin-ui";
import ConfirmButton from "../confirm-button";

export const dynamic = "force-dynamic";

interface AdminMatch {
  id: string;
  emailed_at: string;
  seekers: { contact_email: string } | null;
  listings: { contact_email: string; rent: number; bhk: string } | null;
}

const TEST_MESSAGES: Record<string, [string, "emerald" | "rose" | "amber"]> = {
  sent: ["Test email sent - check the inbox.", "emerald"],
  failed: ["Test email failed - check AWS SES credentials and region.", "rose"],
  skipped: ["Email is not configured (MATCH_FROM_EMAIL / AWS keys missing).", "amber"],
  invalid: ["That doesn't look like a valid email address.", "rose"],
};

export default async function MatchingPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; test?: string }>;
}) {
  const { result, test } = await searchParams;
  const sb = adminDb();

  let runSummary: Record<string, unknown> | null = null;
  if (result) {
    try {
      runSummary = JSON.parse(result);
    } catch {
      runSummary = null;
    }
  }
  const testMsg = test ? TEST_MESSAGES[test] : undefined;

  const { data, error } = await sb
    .from("matches")
    .select(
      "id, emailed_at, seekers(contact_email), listings(contact_email, rent, bhk)"
    )
    .order("emailed_at", { ascending: false })
    .limit(200);
  const matches = (data ?? []) as unknown as AdminMatch[];

  return (
    <div>
      <PageHead
        title="Matching"
        subtitle="The nightly cron (3:30 UTC) pairs seekers with listings and emails both sides. Run it manually here."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-bold">Run matcher now</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sends real emails/SMS to matched users - same as the nightly cron.
          </p>
          <form action={runMatcher} className="mt-3">
            <ConfirmButton
              className={BTN_PRIMARY}
              message="Run the matcher now? Real emails will be sent to matched users."
            >
              Run matcher
            </ConfirmButton>
          </form>
          {runSummary && (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              {JSON.stringify(runSummary, null, 2)}
            </pre>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-bold">Email delivery</h2>
          <p className="mt-1 text-xs text-slate-500">
            {emailConfigured()
              ? "SES is configured - send yourself a test to verify delivery."
              : "SES is NOT configured - matches are found but no email goes out."}
          </p>
          <form action={sendTestEmail} className="mt-3 flex gap-2">
            <input
              type="email"
              name="to"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
            />
            <button className={BTN_PRIMARY}>Send test</button>
          </form>
          {testMsg && (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                testMsg[1] === "emerald"
                  ? "bg-emerald-50 text-emerald-700"
                  : testMsg[1] === "rose"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {testMsg[0]}
            </p>
          )}
        </div>
      </div>

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        Matches already emailed
      </h2>
      {error && <ErrorNote message={error.message} />}
      <Card>
        {matches.length === 0 ? (
          <Empty label="No matches emailed yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Seeker</Th>
                <Th>Owner</Th>
                <Th>Flat</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <Td>{daysAgo(m.emailed_at)}</Td>
                  <Td>
                    <span className="break-all">
                      {m.seekers?.contact_email ?? <Badge>deleted</Badge>}
                    </span>
                  </Td>
                  <Td>
                    <span className="break-all">
                      {m.listings?.contact_email ?? <Badge>deleted</Badge>}
                    </span>
                  </Td>
                  <Td>
                    {m.listings
                      ? `${m.listings.bhk} · ${formatINR(m.listings.rent)}`
                      : "—"}
                  </Td>
                  <Td>
                    <form action={deleteMatch.bind(null, m.id)}>
                      <ConfirmButton
                        className={BTN_DANGER}
                        message="Forget this pair? The next matcher run will re-email both sides."
                      >
                        Forget pair
                      </ConfirmButton>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
