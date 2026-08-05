import { adminDb } from "@/lib/adminDb";
import { formatINR } from "@/lib/format";
import { RentPin, daysAgo } from "@/lib/types";
import {
  clearPinReports,
  deletePin,
  setPinHidden,
  wipePinRatings,
} from "../../actions";
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

type AdminPin = RentPin & { hidden: boolean };

const COLS =
  "id, lat, lng, rent, deposit, bhk, housing_type, furnishing, tenant_type, sqft, society, note, rating_sum, rating_count, report_count, hidden, created_at";

export default async function PinsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const sb = adminDb();

  let q = sb
    .from("rent_pins")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "reported") q = q.gt("report_count", 0);
  if (filter === "hidden") q = q.eq("hidden", true);

  const { data, error } = await q;
  const pins = (data ?? []) as unknown as AdminPin[];

  return (
    <div>
      <PageHead
        title="Rent pins"
        subtitle="Newest 200 shown. Hide takes a pin off the map; delete also removes its ratings and comments."
      />
      <FilterBar
        base="/admin/pins"
        current={filter}
        options={[
          ["all", "All"],
          ["reported", "Reported"],
          ["hidden", "Hidden"],
        ]}
      />
      {error && <ErrorNote message={error.message} />}
      <Card>
        {pins.length === 0 ? (
          <Empty label="No pins match this filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Age</Th>
                <Th>Location</Th>
                <Th>Flat</Th>
                <Th>Rent</Th>
                <Th>Details</Th>
                <Th>Rating</Th>
                <Th>Reports</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => (
                <tr key={p.id} className={p.hidden ? "bg-rose-50/40" : ""}>
                  <Td>{daysAgo(p.created_at)}</Td>
                  <Td>
                    <MapLink lat={p.lat} lng={p.lng} />
                  </Td>
                  <Td>
                    {p.bhk} · {p.housing_type}
                    {p.sqft ? ` · ${p.sqft} sqft` : ""}
                  </Td>
                  <Td>
                    {formatINR(p.rent)}
                    {p.deposit ? (
                      <span className="text-xs text-slate-500">
                        {" "}
                        / dep {formatINR(p.deposit)}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="max-w-52">
                      {p.society && <div className="font-medium">{p.society}</div>}
                      {p.note && (
                        <div className="text-xs text-slate-500">{p.note}</div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {p.rating_count > 0
                      ? `★${(p.rating_sum / p.rating_count).toFixed(1)} (${p.rating_count})`
                      : "—"}
                  </Td>
                  <Td>
                    {p.report_count > 0 ? (
                      <Badge tone={p.report_count >= 3 ? "rose" : "amber"}>
                        {p.report_count}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    {p.hidden ? (
                      <Badge tone="rose">hidden</Badge>
                    ) : (
                      <Badge tone="emerald">visible</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <form action={setPinHidden.bind(null, p.id, !p.hidden)}>
                        <button className={BTN}>
                          {p.hidden ? "Unhide" : "Hide"}
                        </button>
                      </form>
                      {p.report_count > 0 && (
                        <form action={clearPinReports.bind(null, p.id)}>
                          <button className={BTN}>Clear reports</button>
                        </form>
                      )}
                      {p.rating_count > 0 && (
                        <form action={wipePinRatings.bind(null, p.id)}>
                          <ConfirmButton
                            className={BTN}
                            message="Wipe all ratings on this pin?"
                          >
                            Wipe ratings
                          </ConfirmButton>
                        </form>
                      )}
                      <form action={deletePin.bind(null, p.id)}>
                        <ConfirmButton
                          className={BTN_DANGER}
                          message="Delete this pin (and its ratings + comments) permanently?"
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
