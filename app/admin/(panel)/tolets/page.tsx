/* eslint-disable @next/next/no-img-element */
import { adminDb } from "@/lib/adminDb";
import { daysAgo } from "@/lib/types";
import { clearToletReports, deleteTolet, setToletHidden } from "../../actions";
import {
  BTN,
  BTN_DANGER,
  Badge,
  Empty,
  ErrorNote,
  FilterBar,
  MapLink,
  PageHead,
} from "../admin-ui";
import ConfirmButton from "../confirm-button";

export const dynamic = "force-dynamic";

interface AdminToLet {
  id: string;
  lat: number;
  lng: number;
  photo_url: string | null;
  spotter_name: string | null;
  message: string | null;
  hidden: boolean;
  report_count: number;
  created_at: string;
}

export default async function ToletsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const sb = adminDb();

  let q = sb
    .from("tolet_spots")
    .select("id, lat, lng, photo_url, spotter_name, message, hidden, report_count, created_at")
    .order("created_at", { ascending: false })
    .limit(120);
  if (filter === "reported") q = q.gt("report_count", 0);
  if (filter === "hidden") q = q.eq("hidden", true);
  if (filter === "photos") q = q.not("photo_url", "is", null);

  const { data, error } = await q;
  const spots = (data ?? []) as AdminToLet[];

  return (
    <div>
      <PageHead
        title="To-Let spots"
        subtitle="Anonymous public photo uploads — review these. Delete removes the photo file from storage too."
      />
      <FilterBar
        base="/admin/tolets"
        current={filter}
        options={[
          ["all", "All"],
          ["photos", "With photo"],
          ["reported", "Reported"],
          ["hidden", "Hidden"],
        ]}
      />
      {error && <ErrorNote message={error.message} />}
      {spots.length === 0 ? (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <Empty label="No To-Let spots match this filter." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((s) => {
            // Legacy rows (pre-v5) could hold arbitrary client-supplied URLs;
            // never render a non-https photo_url in the authenticated panel.
            const photo = s.photo_url?.startsWith("https://")
              ? s.photo_url
              : null;
            return (
            <div
              key={s.id}
              className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 ${
                s.hidden ? "ring-rose-300" : "ring-slate-200"
              }`}
            >
              {photo ? (
                <a href={photo} target="_blank" rel="noreferrer">
                  <img
                    src={photo}
                    alt="To-Let board"
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-40 items-center justify-center bg-slate-50 text-sm text-slate-400">
                  no photo
                </div>
              )}
              <div className="space-y-1.5 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <MapLink lat={s.lat} lng={s.lng} />
                  <span className="text-xs text-slate-400">
                    {daysAgo(s.created_at)}
                  </span>
                </div>
                {s.message && <p className="text-slate-700">{s.message}</p>}
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.spotter_name && <Badge>by {s.spotter_name}</Badge>}
                  {s.report_count > 0 && (
                    <Badge tone={s.report_count >= 3 ? "rose" : "amber"}>
                      {s.report_count} reports
                    </Badge>
                  )}
                  {s.hidden && <Badge tone="rose">hidden</Badge>}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <form action={setToletHidden.bind(null, s.id, !s.hidden)}>
                    <button className={BTN}>{s.hidden ? "Unhide" : "Hide"}</button>
                  </form>
                  {s.report_count > 0 && (
                    <form action={clearToletReports.bind(null, s.id)}>
                      <button className={BTN}>Clear reports</button>
                    </form>
                  )}
                  <form action={deleteTolet.bind(null, s.id)}>
                    <ConfirmButton
                      className={BTN_DANGER}
                      message="Delete this spot and its photo permanently?"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
