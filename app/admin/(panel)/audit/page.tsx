import { adminDb } from "@/lib/adminDb";
import { daysAgo } from "@/lib/types";
import { Card, Empty, ErrorNote, PageHead, Table, Td, Th } from "../admin-ui";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: number;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: string;
}

export default async function AuditPage() {
  const sb = adminDb();
  const { data, error } = await sb
    .from("admin_audit")
    .select("id, action, target, detail, created_at")
    .order("id", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as AuditRow[];

  return (
    <div>
      <PageHead
        title="Audit log"
        subtitle="Every admin action, newest first. Append-only."
      />
      {error && (
        <ErrorNote
          message={`${error.message} — run schema v7 in the Supabase SQL editor.`}
        />
      )}
      <Card>
        {rows.length === 0 ? (
          <Empty label="No admin actions recorded yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="whitespace-nowrap">
                      {daysAgo(r.created_at)}
                      <span className="ml-1 text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleString("en-IN")}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <code className="text-xs">{r.action}</code>
                  </Td>
                  <Td>
                    <code className="text-xs">{r.target ?? "—"}</code>
                  </Td>
                  <Td>
                    <span className="break-all text-xs text-slate-500">
                      {r.detail ?? "—"}
                    </span>
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
