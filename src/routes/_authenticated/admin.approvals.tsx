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
import {
  approveStoreDeliveryQuote,
  listEftReviewQueue,
  listStoreDeliveryQuoteQueue,
  rejectStoreDeliveryQuote,
  reviewEftPayment,
  type AdminStoreDeliveryQuoteRequest,
  type EftReviewPayment,
} from "@/services/eft-payments";
import { formatZar } from "@/lib/format";

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
      description="Review EFT payment proofs and staff-confirmed delivery quotes."
    >
      <AdminOnly />
    </CatalogueShell>
  );
}

function AdminOnly() {
  const access = useCatalogueAccess();
  if (access.loading) return <LoadingBlock label="Checking your access…" />;
  if (!access.isStaff) {
    return (
      <EmptyBlock
        title="Cossa staff only"
        description="Only approved Cossa staff can review EFT payment proofs."
      />
    );
  }
  return (
    <div className="space-y-10">
      <PaymentReviewQueue />
      {access.isAdmin ? (
        <>
          <DeliveryQuoteQueue />
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Store catalogue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, edit, publish and archive Store products in the current catalogue manager.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/admin/catalogue">Open My products</Link>
            </Button>
          </section>
        </>
      ) : null}
    </div>
  );
}

type DeliveryQuoteDraft = {
  deliveryAmount: string;
  deliveryMethod: string;
  evidenceNote: string;
  staffNote: string;
};

function DeliveryQuoteQueue() {
  const queryClient = useQueryClient();
  const queue = useQuery({
    queryKey: ["admin", "delivery-quote-requests"],
    queryFn: listStoreDeliveryQuoteQueue,
  });
  const [drafts, setDrafts] = useState<Record<string, DeliveryQuoteDraft>>({});

  const updateDraft = (id: string, patch: Partial<DeliveryQuoteDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        deliveryAmount: current[id]?.deliveryAmount ?? "",
        deliveryMethod: current[id]?.deliveryMethod ?? "",
        evidenceNote: current[id]?.evidenceNote ?? "",
        staffNote: current[id]?.staffNote ?? "",
        ...patch,
      },
    }));
  };

  const approve = useMutation({
    mutationFn: (request: AdminStoreDeliveryQuoteRequest) => {
      const draft = drafts[request.id];
      return approveStoreDeliveryQuote({
        requestId: request.id,
        deliveryAmount: Number(draft?.deliveryAmount),
        deliveryMethod: draft?.deliveryMethod ?? "",
        evidenceNote: draft?.evidenceNote ?? "",
        staffNote: draft?.staffNote ?? "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-quote-requests"] });
      toast.success("Delivery quote approved", {
        description: "It is valid only for the customer’s exact cart and address for 24 hours.",
      });
    },
    onError: (error) =>
      toast.error("Delivery quote could not be approved", {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  const reject = useMutation({
    mutationFn: (request: AdminStoreDeliveryQuoteRequest) =>
      rejectStoreDeliveryQuote({
        requestId: request.id,
        staffNote: drafts[request.id]?.staffNote ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-quote-requests"] });
      toast.success("Delivery quote request rejected");
    },
    onError: (error) =>
      toast.error("Delivery quote request could not be rejected", {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  if (queue.isPending) return <LoadingBlock label="Loading delivery quote requests…" />;
  if (queue.isError)
    return <ErrorBlock description="The delivery quote queue could not be loaded." />;

  const requests = queue.data?.requests ?? [];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Staff delivery quotes</h2>
        <p className="text-sm text-muted-foreground">
          Confirm the live carrier or supplier amount, destination eligibility and packed parcel
          details before approving. The quote is locked to the exact cart and address for 24 hours.
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyBlock
          title="No delivery quotes awaiting review"
          description="Customer delivery-quote requests appear here when an automatic rate is unavailable."
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const draft = drafts[request.id] ?? {
              deliveryAmount: "",
              deliveryMethod: "",
              evidenceNote: "",
              staffNote: "",
            };
            const address = request.shippingAddress;
            return (
              <li key={request.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{request.customerName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.requesterEmail ?? "Customer email unavailable"}
                      {request.customerPhone ? ` · ${request.customerPhone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested{" "}
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleString("en-ZA")
                        : "just now"}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize">
                    {request.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 rounded-md border border-border bg-background/40 p-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Delivery address
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                      {[
                        address.address1,
                        address.address2,
                        address.suburb,
                        address.city,
                        address.region,
                        address.zip,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Items
                    </p>
                    <ul className="mt-1 space-y-1">
                      {request.items.map((item, index) => (
                        <li key={`${item.productId ?? item.name ?? "item"}-${index}`}>
                          {item.name ?? "Store product"} · quantity {item.quantity ?? 1}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor={`delivery-amount-${request.id}`}
                    >
                      Verified delivery amount (ZAR)
                    </label>
                    <Input
                      id={`delivery-amount-${request.id}`}
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      max="100000"
                      step="0.01"
                      value={draft.deliveryAmount}
                      onChange={(event) =>
                        updateDraft(request.id, { deliveryAmount: event.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor={`delivery-method-${request.id}`}
                    >
                      Delivery method
                    </label>
                    <Input
                      id={`delivery-method-${request.id}`}
                      value={draft.deliveryMethod}
                      maxLength={160}
                      onChange={(event) =>
                        updateDraft(request.id, { deliveryMethod: event.target.value })
                      }
                      placeholder="For example: DMC Locker-to-Door"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor={`delivery-evidence-${request.id}`}
                    >
                      Carrier or supplier evidence
                    </label>
                    <textarea
                      id={`delivery-evidence-${request.id}`}
                      className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      maxLength={2000}
                      value={draft.evidenceNote}
                      onChange={(event) =>
                        updateDraft(request.id, { evidenceNote: event.target.value })
                      }
                      placeholder="Quote reference, live carrier rate and eligibility/parcel check."
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor={`delivery-staff-note-${request.id}`}
                    >
                      Customer note {"(required if rejecting)"}
                    </label>
                    <textarea
                      id={`delivery-staff-note-${request.id}`}
                      className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      maxLength={1000}
                      value={draft.staffNote}
                      onChange={(event) =>
                        updateDraft(request.id, { staffNote: event.target.value })
                      }
                      placeholder="Optional when approving; explain the next step if rejecting."
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => approve.mutate(request)}
                  >
                    Approve delivery quote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => reject.mutate(request)}
                  >
                    Reject request
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PaymentReviewQueue() {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ["admin", "eft-review-queue"], queryFn: listEftReviewQueue });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const review = useMutation({
    mutationFn: (job: {
      paymentId: string;
      decision: "approve" | "reject";
      reviewerNote: string;
    }) => reviewEftPayment(job),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "eft-review-queue"] });
      toast.success("Payment review recorded", { description: result.message });
    },
    onError: (error) =>
      toast.error("Payment review could not be saved", {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  if (queue.isPending) return <LoadingBlock label="Loading payment proofs…" />;
  if (queue.isError)
    return <ErrorBlock description="The payment-proof queue could not be loaded." />;

  const payments = queue.data?.payments ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">EFT payment proofs</h2>
        <p className="text-sm text-muted-foreground">
          Approve only after confirming the payment. Rejection keeps the order private and lets the
          customer upload a replacement proof.
        </p>
      </div>

      {payments.length === 0 ? (
        <EmptyBlock
          title="No proofs awaiting review"
          description="Customer proof uploads will appear here before fulfilment or digital access is activated."
        />
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => (
            <PaymentReviewCard
              key={payment.id}
              payment={payment}
              busy={review.isPending}
              note={notes[payment.id] ?? ""}
              onNote={(value) =>
                setNotes((current) => ({ ...current, [payment.id]: value }))
              }
              onApprove={() =>
                review.mutate({
                  paymentId: payment.id,
                  decision: "approve",
                  reviewerNote: notes[payment.id] ?? "",
                })
              }
              onReject={() =>
                review.mutate({
                  paymentId: payment.id,
                  decision: "reject",
                  reviewerNote: notes[payment.id] ?? "",
                })
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PaymentReviewCard({
  payment,
  busy,
  note,
  onNote,
  onApprove,
  onReject,
}: {
  payment: EftReviewPayment;
  busy: boolean;
  note: string;
  onNote: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const order = payment.order;

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{payment.reference}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {payment.payerEmail ?? "Customer email unavailable"} ·{" "}
            {formatZar(payment.amount)}
          </p>
          {order ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Order {order.orderNumber} · {order.items.length}{" "}
              {order.items.length === 1 ? "item" : "items"} ·{" "}
              {order.requiresDelivery
                ? `delivery ${formatZar(order.shippingTotal)}`
                : "digital delivery"}
            </p>
          ) : null}
          {payment.payerNote ? (
            <p className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-sm">
              Customer note: {payment.payerNote}
            </p>
          ) : null}
        </div>
        {payment.proofUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer">
              Open proof
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          className="h-9 w-full sm:w-80"
          placeholder="Reviewer note (required if rejecting)"
          value={note}
          maxLength={2000}
          onChange={(event) => onNote(event.target.value)}
        />
        <Button size="sm" disabled={busy} onClick={onApprove}>
          Approve payment
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
          Reject proof
        </Button>
      </div>
    </li>
  );
}

function ReviewQueue() {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ["admin", "review-queue"], queryFn: listReviewQueue });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const act = useMutation({
    mutationFn: async (
      job:
        { type: "approve" | "publish"; id: string } | { type: "reject"; id: string; notes: string },
    ) => {
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
              onReject={() =>
                act.mutate({ type: "reject", id: row.id, notes: notes[row.id] ?? "" })
              }
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
            <span className="font-mono">{row.sku}</span> · {row.item_type ?? "—"} · {row.imageCount}{" "}
            image{row.imageCount === 1 ? "" : "s"} · {row.variantCount} variant
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
