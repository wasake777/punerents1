import { adminDb } from "@/lib/adminDb";
import { blockIp, unblockIp } from "../../actions";
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

interface LogRow {
  ip_hash: string;
  action: string;
  created_at: string;
}

interface IpBlock {
  ip_hash: string;
  note: string | null;
  created_at: string;
}

interface IpActivity {
  hash: string;
  total: number;
  byAction: Record<string, number>;
  last: string;
}

export default async function AbusePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: formError } = await searchParams;
  const sb = adminDb();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [logs, blocks] = await Promise.all([
    sb
      .from("write_log")
      .select("ip_hash, action, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    sb.from("ip_blocks").select("ip_hash, note, created_at").order("created_at", {
      ascending: false,
    }),
  ]);

  const byIp = new Map<string, IpActivity>();
  for (const row of (logs.data ?? []) as LogRow[]) {
    const entry =
      byIp.get(row.ip_hash) ??
      ({ hash: row.ip_hash, total: 0, byAction: {}, last: row.created_at } as IpActivity);
    entry.total++;
    entry.byAction[row.action] = (entry.byAction[row.action] ?? 0) + 1;
    byIp.set(row.ip_hash, entry);
  }
  const activity = [...byIp.values()].sort((a, b) => b.total - a.total).slice(0, 50);
  const blockRows = (blocks.data ?? []) as IpBlock[];
  const blockedSet = new Set(blockRows.map((b) => b.ip_hash));

  return (
    <div>
      <PageHead
        title="Abuse"
        subtitle="Per-IP submission activity (last 24h, hashed IPs) and the hard blocklist enforced by /api/submit."
      />
      {formError === "badhash" && (
        <div className="mb-3">
          <ErrorNote message="That doesn't look like an IP hash (expected 64 hex chars)." />
        </div>
      )}
      {logs.error && <ErrorNote message={`write_log: ${logs.error.message}`} />}
      {blocks.error && (
        <ErrorNote
          message={`ip_blocks: ${blocks.error.message} — run schema v7 in the Supabase SQL editor.`}
        />
      )}

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        Busiest connections (24h)
      </h2>
      <Card>
        {activity.length === 0 ? (
          <Empty label="No submissions in the last 24 hours." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>IP hash</Th>
                <Th>Writes</Th>
                <Th>Breakdown</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.hash}>
                  <Td>
                    <code className="text-xs">{a.hash.slice(0, 16)}…</code>
                  </Td>
                  <Td>
                    <Badge tone={a.total >= 20 ? "rose" : a.total >= 8 ? "amber" : "slate"}>
                      {a.total}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500">
                      {Object.entries(a.byAction)
                        .map(([k, v]) => `${k}:${v}`)
                        .join(" · ")}
                    </span>
                  </Td>
                  <Td>{blockedSet.has(a.hash) && <Badge tone="rose">blocked</Badge>}</Td>
                  <Td>
                    {blockedSet.has(a.hash) ? (
                      <form action={unblockIp.bind(null, a.hash)}>
                        <button className={BTN_DANGER}>Unblock</button>
                      </form>
                    ) : (
                      <form action={blockIp}>
                        <input type="hidden" name="ip_hash" value={a.hash} />
                        <input type="hidden" name="note" value="blocked from activity list" />
                        <ConfirmButton
                          className={BTN_DANGER}
                          message="Block all submissions from this connection?"
                        >
                          Block
                        </ConfirmButton>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
        Blocklist
      </h2>
      <div className="mb-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <form action={blockIp} className="flex flex-wrap gap-2">
          <input
            name="ip_hash"
            required
            pattern="[0-9a-f]{64}"
            placeholder="IP hash (64 hex chars)"
            className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs outline-none focus:border-emerald-500"
          />
          <input
            name="note"
            placeholder="Note (optional)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
          <button className={BTN_PRIMARY}>Block</button>
        </form>
      </div>
      <Card>
        {blockRows.length === 0 ? (
          <Empty label="No blocked connections." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>IP hash</Th>
                <Th>Note</Th>
                <Th>Since</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {blockRows.map((b) => (
                <tr key={b.ip_hash}>
                  <Td>
                    <code className="text-xs">{b.ip_hash.slice(0, 24)}…</code>
                  </Td>
                  <Td>{b.note ?? "—"}</Td>
                  <Td>{new Date(b.created_at).toLocaleDateString("en-IN")}</Td>
                  <Td>
                    <form action={unblockIp.bind(null, b.ip_hash)}>
                      <button className={BTN_DANGER}>Unblock</button>
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
