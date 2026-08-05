import { adminDb } from "@/lib/adminDb";
import { formatINR } from "@/lib/format";
import { daysAgo } from "@/lib/types";
import {
  deleteListing,
  expireListing,
  extendListing,
  setListingHidden,
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

interface AdminListing {
  id: string;
  lat: number;
  lng: number;
  rent: number;
  deposit: number | null;
  bhk: string;
  furnishing: string;
  whole_flat: boolean;
  veg_only: boolean;
  smoking_ok: boolean;
  parking: boolean;
  contact_email: string;
  contact_phone: string | null;
  hidden: boolean;
  active_until: string;
  created_at: string;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const sb = adminDb();
  const nowIso = new Date().toISOString();

  let q = sb
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "live") q = q.eq("hidden", false).gt("active_until", nowIso);
  if (filter === "expired") q = q.lte("active_until", nowIso);
  if (filter === "hidden") q = q.eq("hidden", true);

  const { data, error } = await q;
  const listings = (data ?? []) as AdminListing[];

  return (
    <div>
      <PageHead
        title="Listings"
        subtitle="Owner listings with contact details. Expire = flat is taken; extend = live for another 45 days."
      />
      <FilterBar
        base="/admin/listings"
        current={filter}
        options={[
          ["all", "All"],
          ["live", "Live"],
          ["expired", "Expired"],
          ["hidden", "Hidden"],
        ]}
      />
      {error && <ErrorNote message={error.message} />}
      <Card>
        {listings.length === 0 ? (
          <Empty label="No listings match this filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Age</Th>
                <Th>Location</Th>
                <Th>Flat</Th>
                <Th>Rent</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const live = !l.hidden && l.active_until > nowIso;
                return (
                  <tr key={l.id} className={l.hidden ? "bg-rose-50/40" : ""}>
                    <Td>{daysAgo(l.created_at)}</Td>
                    <Td>
                      <MapLink lat={l.lat} lng={l.lng} />
                    </Td>
                    <Td>
                      {l.bhk} {l.whole_flat ? "flat" : "room"} · {l.furnishing}
                      <div className="text-xs text-slate-500">
                        {[
                          l.veg_only && "veg-only",
                          !l.smoking_ok && "no smoking",
                          l.parking && "parking",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "no restrictions"}
                      </div>
                    </Td>
                    <Td>
                      {formatINR(l.rent)}
                      {l.deposit ? (
                        <span className="text-xs text-slate-500">
                          {" "}
                          / dep {formatINR(l.deposit)}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <div className="max-w-48 break-all">
                        {l.contact_email}
                        {l.contact_phone && (
                          <div className="text-xs text-slate-500">
                            {l.contact_phone}
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {l.hidden ? (
                        <Badge tone="rose">hidden</Badge>
                      ) : live ? (
                        <Badge tone="emerald">live</Badge>
                      ) : (
                        <Badge tone="amber">expired</Badge>
                      )}
                      <div className="mt-0.5 text-xs text-slate-400">
                        until {new Date(l.active_until).toLocaleDateString("en-IN")}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <form action={setListingHidden.bind(null, l.id, !l.hidden)}>
                          <button className={BTN}>
                            {l.hidden ? "Unhide" : "Hide"}
                          </button>
                        </form>
                        {live ? (
                          <form action={expireListing.bind(null, l.id)}>
                            <ConfirmButton
                              className={BTN}
                              message="Expire this listing now (stops matching)?"
                            >
                              Expire
                            </ConfirmButton>
                          </form>
                        ) : (
                          <form action={extendListing.bind(null, l.id)}>
                            <button className={BTN}>Extend 45d</button>
                          </form>
                        )}
                        <form action={deleteListing.bind(null, l.id)}>
                          <ConfirmButton
                            className={BTN_DANGER}
                            message="Delete this listing permanently?"
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
