import { adminDb } from "@/lib/adminDb";
import { daysAgo } from "@/lib/types";
import { deleteAlert, rearmAlert } from "../../actions";
import {
  BTN,
  BTN_DANGER,
  Badge,
  Card,
  Empty,
  ErrorNote,
  FilterBar,
  MapLink,
  PageHead,
  Table,
  Td,
  Th,
} from "../admin-ui";
import ConfirmButton from "../confirm-button";

export const dynamic = "force-dynamic";

interface AdminAlert {
  id: string;
  lat: number;
  lng: number;
  email: string;
  notified_at: string | null;
  created_at: string;
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const sb = adminDb();

  let q = sb
    .from("area_alerts")
    .select("id, lat, lng, email, notified_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "waiting") q = q.is("notified_at", null);
  if (filter === "notified") q = q.not("notified_at", "is", null);

  const { data, error } = await q;
  const alerts = (data ?? []) as AdminAlert[];

  return (
    <div>
      <PageHead
        title="Area alerts"
        subtitle='"Tell me when a flat opens here" subscriptions. Each fires once; re-arm to let it fire again. Delete = unsubscribe.'
      />
      <FilterBar
        base="/admin/alerts"
        current={filter}
        options={[
          ["all", "All"],
          ["waiting", "Waiting"],
          ["notified", "Notified"],
        ]}
      />
      {error && <ErrorNote message={error.message} />}
      <Card>
        {alerts.length === 0 ? (
          <Empty label="No alerts match this filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Age</Th>
                <Th>Email</Th>
                <Th>Spot</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <Td>{daysAgo(a.created_at)}</Td>
                  <Td>
                    <span className="break-all">{a.email}</span>
                  </Td>
                  <Td>
                    <MapLink lat={a.lat} lng={a.lng} />
                  </Td>
                  <Td>
                    {a.notified_at ? (
                      <Badge>notified {daysAgo(a.notified_at)}</Badge>
                    ) : (
                      <Badge tone="emerald">waiting</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {a.notified_at && (
                        <form action={rearmAlert.bind(null, a.id)}>
                          <button className={BTN}>Re-arm</button>
                        </form>
                      )}
                      <form action={deleteAlert.bind(null, a.id)}>
                        <ConfirmButton
                          className={BTN_DANGER}
                          message="Delete this subscription (unsubscribe)?"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
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
