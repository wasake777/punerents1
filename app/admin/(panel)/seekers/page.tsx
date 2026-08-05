import { adminDb } from "@/lib/adminDb";
import { formatINR } from "@/lib/format";
import { daysAgo } from "@/lib/types";
import { deleteSeeker, expireSeeker, extendSeeker } from "../../actions";
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

interface AdminSeeker {
  id: string;
  lat: number;
  lng: number;
  budget_max: number;
  bhk: string;
  room_ok: boolean;
  veg: boolean;
  smoker: boolean;
  contact_email: string;
  contact_phone: string | null;
  move_in: string | null;
  gender: string | null;
  lifestyle: string | null;
  active_until: string;
  created_at: string;
}

export default async function SeekersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const sb = adminDb();
  const nowIso = new Date().toISOString();

  let q = sb
    .from("seekers")
    .select(
      "id, lat, lng, budget_max, bhk, room_ok, veg, smoker, contact_email, contact_phone, move_in, gender, lifestyle, active_until, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "active") q = q.gt("active_until", nowIso);
  if (filter === "expired") q = q.lte("active_until", nowIso);

  const { data, error } = await q;
  const seekers = (data ?? []) as AdminSeeker[];

  return (
    <div>
      <PageHead
        title="Seekers"
        subtitle="Flat-hunters and their contacts (PII — delete on request). Active seekers get matched nightly."
      />
      <FilterBar
        base="/admin/seekers"
        current={filter}
        options={[
          ["all", "All"],
          ["active", "Active"],
          ["expired", "Expired"],
        ]}
      />
      {error && <ErrorNote message={error.message} />}
      <Card>
        {seekers.length === 0 ? (
          <Empty label="No seekers match this filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Age</Th>
                <Th>Searching near</Th>
                <Th>Wants</Th>
                <Th>Contact</Th>
                <Th>Profile</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {seekers.map((s) => {
                const active = s.active_until > nowIso;
                return (
                  <tr key={s.id}>
                    <Td>{daysAgo(s.created_at)}</Td>
                    <Td>
                      <MapLink lat={s.lat} lng={s.lng} />
                    </Td>
                    <Td>
                      {s.bhk}
                      {s.room_ok ? " or room" : ""} · up to{" "}
                      {formatINR(s.budget_max)}
                    </Td>
                    <Td>
                      <div className="max-w-48 break-all">
                        {s.contact_email}
                        {s.contact_phone && (
                          <div className="text-xs text-slate-500">
                            {s.contact_phone}
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="max-w-48 text-xs text-slate-500">
                        {[
                          s.move_in,
                          s.gender,
                          s.veg && "veg",
                          s.smoker && "smoker",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {s.lifestyle && (
                          <div className="italic">&ldquo;{s.lifestyle}&rdquo;</div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {active ? (
                        <Badge tone="emerald">active</Badge>
                      ) : (
                        <Badge tone="amber">expired</Badge>
                      )}
                      <div className="mt-0.5 text-xs text-slate-400">
                        until {new Date(s.active_until).toLocaleDateString("en-IN")}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {active ? (
                          <form action={expireSeeker.bind(null, s.id)}>
                            <button className={BTN}>Expire</button>
                          </form>
                        ) : (
                          <form action={extendSeeker.bind(null, s.id)}>
                            <button className={BTN}>Extend 30d</button>
                          </form>
                        )}
                        <form action={deleteSeeker.bind(null, s.id)}>
                          <ConfirmButton
                            className={BTN_DANGER}
                            message="Delete this seeker and their match history permanently?"
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
