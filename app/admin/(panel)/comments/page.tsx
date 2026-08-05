import { adminDb } from "@/lib/adminDb";
import { daysAgo } from "@/lib/types";
import { deleteComment, setCommentHidden } from "../../actions";
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

interface AdminComment {
  id: string;
  body: string;
  hidden: boolean;
  created_at: string;
  rent_pins: { lat: number; lng: number; rent: number; bhk: string } | null;
}

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const sb = adminDb();

  let q = sb
    .from("pin_comments")
    .select("id, body, hidden, created_at, rent_pins(lat, lng, rent, bhk)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "hidden") q = q.eq("hidden", true);

  const { data, error } = await q;
  const comments = (data ?? []) as unknown as AdminComment[];

  return (
    <div>
      <PageHead
        title="Comments"
        subtitle="Anonymous 280-char comments on rent pins, newest first."
      />
      <FilterBar
        base="/admin/comments"
        current={filter}
        options={[
          ["all", "All"],
          ["hidden", "Hidden"],
        ]}
      />
      {error && <ErrorNote message={error.message} />}
      <Card>
        {comments.length === 0 ? (
          <Empty label="No comments match this filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Age</Th>
                <Th>Comment</Th>
                <Th>On pin</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id} className={c.hidden ? "bg-rose-50/40" : ""}>
                  <Td>{daysAgo(c.created_at)}</Td>
                  <Td>
                    <div className="max-w-md whitespace-pre-wrap">{c.body}</div>
                  </Td>
                  <Td>
                    {c.rent_pins ? (
                      <>
                        {c.rent_pins.bhk} ·{" "}
                        <MapLink lat={c.rent_pins.lat} lng={c.rent_pins.lng} />
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    {c.hidden ? (
                      <Badge tone="rose">hidden</Badge>
                    ) : (
                      <Badge tone="emerald">visible</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <form action={setCommentHidden.bind(null, c.id, !c.hidden)}>
                        <button className={BTN}>
                          {c.hidden ? "Unhide" : "Hide"}
                        </button>
                      </form>
                      <form action={deleteComment.bind(null, c.id)}>
                        <ConfirmButton
                          className={BTN_DANGER}
                          message="Delete this comment permanently?"
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
