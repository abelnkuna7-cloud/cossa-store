import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CatalogueShell, useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  approveProduct,
  listMembers,
  listReviewQueue,
  rejectProduct,
  setMemberCatalogueStatus,
  type MemberRow,
  type ReviewProductRow,
} from "@/services/moderation";

export const Route = createFileRoute("/_authenticated/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals | Cossa internal" },
      { name: "description", content: "Approve or reject submitted Cossa Store listings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  return (
    <CatalogueShell
      title="Approvals dashboard"
      description="Review listings submitted by catalogue managers and control who may submit products."
    >
      <AdminOnly />
    </CatalogueShell>
  );
}

function AdminOnly() {
  const access = useCatalogueAccess();
  if (access.loading) return <LoadingBlock label="Checking your access…" />;
  if (!access.isAdmin) {
    return (
      <EmptyBlock
        title="Administrators only"
        description="Only cossa@cossanexusholdings.co.za and other administrators can approve listings."
      />
    );
  }
  return (
    <div className="space-y-10">
      <ReviewQueue />
      <MemberAccess />
    </div>
  );
}

function ReviewQueue() {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ["admin", "review-queue"], queryFn: listReviewQueue });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const act = useMutation({
    mutationFn: async (job:
      | { type: "approve" | "publish"; id: string }
      | { type: "reject"; id: string; notes: string }) => {
      if (job.type === "reject") return rejectProduct(job.id, job.notes);
      return approveProduct(job.id, job.type === "publish");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Review recorded");
    },
    onError: (error) =>
      toast.error("That review could not be saved", {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  if (queue.isPending) return <LoadingBlock label="Loading submissions…" />;
  if (queue.isError) return <ErrorBlock description="The review queue could not be loaded." />;

  const rows = queue.data ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Submitted listings</h2>
        <p className="text-sm text-muted-foreground">
          Nothing reaches the storefront until you publish it here.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyBlock
          title="Nothing awaiting review"
          description="Listings submitted for review by catalogue managers appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <QueueCard
              key={row.id}
              row={row}
              busy={act.isPending}
              note={notes[row.id] ?? ""}
              onNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
              onApprove={() => act.mutate({ type: "approve", id: row.id })}
              onPublish={() => act.mutate({ type: "publish", id: row.id })}
              onReject={() => act.mutate({ type: "reject", id: row.id, notes: notes[row.id] ?? "" })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function QueueCard({
  row,
  busy,
  note,
  onNote,
  onApprove,
  onPublish,
  onReject,
}: {
  row: ReviewProductRow;
  busy: boolean;
  note: string;
  onNote: (value: string) => void;
  onApprove: () => void;
  onPublish: () => void;
  onReject: () => void;
}) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{row.sku}</span> · {row.item_type ?? "—"} ·{" "}
            {row.imageCount} image{row.imageCount === 1 ? "" : "s"} · {row.variantCount} variant
            {row.variantCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted by{" "}
            {row.submitter?.business_name || row.submitter?.full_name || "a catalogue manager"} ·{" "}
            {new Date(row.updated_at).toLocaleDateString("en-ZA")}
          </p>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize">
          {row.publication_state.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/catalogue/$id" params={{ id: row.id }}>
            Open listing
          </Link>
        </Button>
        <Button size="sm" disabled={busy} onClick={onPublish}>
          Approve &amp; publish
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={onApprove}>
          Approve only
        </Button>
        <Input
          className="h-9 w-full sm:w-64"
          placeholder="Reason for rejection"
          value={note}
          onChange={(e) => onNote(e.target.value)}
        />
        <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
          Reject
        </Button>
      </div>

      {row.review_notes ? (
        <p className="mt-2 text-xs text-muted-foreground">Last note: {row.review_notes}</p>
      ) : null}
    </li>
  );
}

function MemberAccess() {
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: ["admin", "members"], queryFn: listMembers });
  const change = useMutation({
    mutationFn: (job: { id: string; status: "pending" | "approved" | "rejected" }) =>
      setMemberCatalogueStatus(job.id, job.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      toast.success("Catalogue access updated");
    },
    onError: () => toast.error("That change could not be saved."),
  });

  if (members.isPending) return <LoadingBlock label="Loading members…" />;
  if (members.isError) return <ErrorBlock description="Members could not be loaded." />;

  const rows = members.data ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Catalogue manager access</h2>
        <p className="text-sm text-muted-foreground">
          Only approved subscribers can create and submit listings.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyBlock title="No members yet" description="Registered members appear here." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Business</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Access</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((member: MemberRow) => (
                <tr key={member.id}>
                  <td className="px-3 py-2">{member.full_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{member.business_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{member.phone ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">{member.catalogue_status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        disabled={change.isPending || member.catalogue_status === "approved"}
                        onClick={() => change.mutate({ id: member.id, status: "approved" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={change.isPending || member.catalogue_status === "rejected"}
                        onClick={() => change.mutate({ id: member.id, status: "rejected" })}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}