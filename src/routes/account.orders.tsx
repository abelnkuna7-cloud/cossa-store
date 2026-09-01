import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileUp,
  LoaderCircle,
  MapPin,
  PackageCheck,
  ReceiptText,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatZar } from "@/lib/format";
import {
  getMyEftProofUrl,
  listMyEftPayments,
  submitEftProof,
  type EftPaymentDetail,
} from "@/services/eft-payments";

const db = supabase as any;

type DigitalEntitlement = {
  id: string;
  order_item_id: string;
  product_id: string;
  download_limit: number;
  downloads_used: number;
  expires_at: string | null;
  revoked_at: string | null;
};

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  product_type: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

type SupplierFulfilment = {
  id: string;
  store_order_id: string;
  supplier: string;
  status: string;
  logistics_method: string | null;
  origin_country_code: string | null;
  destination_country_code: string | null;
  tracking_number: string | null;
  updated_at: string;
};

type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number | string;
  shipping_total: number | string;
  shipping_method: string | null;
  metadata: Record<string, unknown> | null;
  total: number | string;
  payment_provider: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  store_order_items: OrderItem[] | null;
  store_digital_entitlements: DigitalEntitlement[] | null;
  supplier_fulfilments: SupplierFulfilment[];
};

export const Route = createFileRoute("/account/orders")({
  head: () => ({
    meta: [
      { title: "My orders & downloads | Cossa Store" },
      {
        name: "description",
        content:
          "View your Cossa Store order status, supplier fulfilment tracking and approved digital purchases securely.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function statusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Payment approved";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "pending":
      return "Awaiting EFT approval";
    case "cancelled":
      return "Cancelled";
    default:
      return status.replace(/_/g, " ");
  }
}

function paymentStatusLabel(status: EftPaymentDetail["payment"]["status"]) {
  switch (status) {
    case "awaiting_payment":
      return "Awaiting proof of payment";
    case "proof_submitted":
      return "Proof under review";
    case "approved":
      return "Payment confirmed";
    case "rejected":
      return "Proof needs clarification";
    case "expired":
      return "Payment request expired";
    case "cancelled":
      return "Payment request cancelled";
    default:
      return "Payment status unavailable";
  }
}

function canUploadPaymentProof(payment: EftPaymentDetail) {
  return ["awaiting_payment", "rejected"].includes(payment.payment.status);
}

function customerDeliveryAddress(metadata: Record<string, unknown> | null) {
  const value = metadata?.shipping_address;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const address = value as Record<string, unknown>;
  const fields = [
    address.address1,
    address.address2,
    address.suburb,
    address.city,
    address.region,
    address.zip,
  ]
    .filter((field): field is string => typeof field === "string" && field.trim().length > 0)
    .map((field) => field.trim());

  return fields.length > 0 ? fields : null;
}

function fulfilmentLabel(status: string) {
  switch (status) {
    case "creating":
    case "submitted":
    case "paid":
    case "processing":
      return "Processing with supplier";
    case "action_required":
      return "Supplier processing pending";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Fulfilment needs attention";
    default:
      return status.replace(/_/g, " ");
  }
}

function fulfilmentTone(status: string) {
  if (status === "delivered") return "text-emerald-500";
  if (status === "failed") return "text-destructive";
  if (status === "shipped") return "text-primary";
  return "text-muted-foreground";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function entitlementAvailable(entitlement: DigitalEntitlement) {
  if (entitlement.revoked_at) return false;
  if (entitlement.downloads_used >= entitlement.download_limit) return false;
  if (
    entitlement.expires_at &&
    new Date(entitlement.expires_at).getTime() <= Date.now()
  )
    return false;
  return true;
}

function OrdersPage() {
  const { user, loading: authLoading } = useSession();
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [proofFormPaymentId, setProofFormPaymentId] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [payerNote, setPayerNote] = useState("");
  const [submittingProofId, setSubmittingProofId] = useState<string | null>(null);
  const [openingProofId, setOpeningProofId] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["customer-store-orders", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CustomerOrder[]> => {
      const { data, error } = await db
        .from("store_orders")
        .select(
          "id,order_number,status,subtotal,shipping_total,shipping_method,metadata,total,payment_provider,payment_reference,paid_at,created_at,store_order_items(id,product_id,product_name,sku,product_type,quantity,unit_price,line_total),store_digital_entitlements(id,order_item_id,product_id,download_limit,downloads_used,expires_at,revoked_at)",
        )
        .eq("customer_user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const orderRows = (data ?? []) as Omit<
        CustomerOrder,
        "supplier_fulfilments"
      >[];
      const orderIds = orderRows.map((order) => order.id);

      if (!orderIds.length) return [];

      const { data: fulfilmentRows, error: fulfilmentError } = await db
        .from("supplier_fulfilment_orders")
        .select(
          "id,store_order_id,supplier,status,logistics_method,origin_country_code,destination_country_code,tracking_number,updated_at",
        )
        .in("store_order_id", orderIds)
        .order("updated_at", { ascending: false });

      if (fulfilmentError) throw fulfilmentError;

      const fulfilmentsByOrder = new Map<string, SupplierFulfilment[]>();
      for (const fulfilment of (fulfilmentRows ?? []) as SupplierFulfilment[]) {
        const current = fulfilmentsByOrder.get(fulfilment.store_order_id) ?? [];
        current.push(fulfilment);
        fulfilmentsByOrder.set(fulfilment.store_order_id, current);
      }

      return orderRows.map((order) => ({
        ...order,
        supplier_fulfilments: fulfilmentsByOrder.get(order.id) ?? [],
      }));
    },
  });

  const payments = useQuery({
    queryKey: ["customer-eft-payments", user?.id],
    enabled: Boolean(user?.id),
    queryFn: listMyEftPayments,
  });

  const paymentsByOrderNumber = useMemo(
    () =>
      new Map(
        (payments.data?.payments ?? [])
          .filter((detail) => detail.payment.purpose === "store_order" && detail.order?.orderNumber)
          .map((detail) => [detail.order!.orderNumber, detail]),
      ),
    [payments.data?.payments],
  );

  async function downloadEntitlement(entitlement: DigitalEntitlement) {
    setDownloadingId(entitlement.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "digital-download",
        {
          body: { entitlementId: entitlement.id },
        },
      );

      if (error) throw error;
      if (!data?.url)
        throw new Error(data?.error || "The download could not be prepared.");

      const link = document.createElement("a");
      link.href = data.url;
      link.download =
        typeof data.fileName === "string"
          ? data.fileName
          : "Cossa-digital-product";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Secure download prepared", {
        description:
          typeof data.remainingDownloads === "number"
            ? `${data.remainingDownloads} download${data.remainingDownloads === 1 ? "" : "s"} remaining after this claim.`
            : "Your signed download link expires shortly.",
      });

      await queryClient.invalidateQueries({
        queryKey: ["customer-store-orders", user?.id],
      });
    } catch (error) {
      toast.error("Download unavailable", {
        description:
          error instanceof Error
            ? error.message
            : "This file may be unpaid, expired, revoked or over its download limit.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function uploadProof(payment: EftPaymentDetail) {
    if (!proof || !canUploadPaymentProof(payment)) return;

    setSubmittingProofId(payment.payment.id);
    try {
      const result = await submitEftProof({
        paymentId: payment.payment.id,
        proof,
        payerNote,
      });
      setProof(null);
      setPayerNote("");
      setProofFormPaymentId(null);
      toast.success("Proof of payment submitted", { description: result.message });
      await queryClient.invalidateQueries({ queryKey: ["customer-eft-payments", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["customer-store-orders", user?.id] });
    } catch (error) {
      toast.error("Proof of payment could not be submitted", {
        description:
          error instanceof Error
            ? error.message
            : "Please use a PDF, JPG or PNG file no larger than 10 MB.",
      });
    } finally {
      setSubmittingProofId(null);
    }
  }

  async function viewProof(payment: EftPaymentDetail) {
    setOpeningProofId(payment.payment.id);
    try {
      const result = await getMyEftProofUrl(payment.payment.id);
      const link = document.createElement("a");
      link.href = result.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Proof unavailable", {
        description:
          error instanceof Error ? error.message : "Your proof could not be opened securely.",
      });
    } finally {
      setOpeningProofId(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your account…
      </div>
    );
  }

  if (!user) {
    return (
      <NoticeBlock tone="pending" title="Sign in to view your orders">
        Your EFT orders and approved digital downloads are tied to the account
        used at checkout. {" "}
        <Link
          to="/auth"
          className="font-medium text-primary underline underline-offset-2"
        >
          Sign in or create your account
        </Link>
        .
      </NoticeBlock>
    );
  }

  if (orders.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your orders…
      </div>
    );
  }

  if (orders.isError) {
    return (
      <NoticeBlock tone="pending" title="Your orders could not be loaded">
        We could not read your order history securely. Refresh the page or
        contact Cossa support if the problem continues.
      </NoticeBlock>
    );
  }

  if (!orders.data?.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <ReceiptText className="h-6 w-6 text-primary" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-semibold">No orders yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Orders created through secure Cossa Store checkout will appear here.
        </p>
        <Button asChild className="mt-5">
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">
          Orders & digital downloads
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track physical orders from payment through delivery. Approved digital
          files appear here as controlled downloads.
        </p>
      </div>

      {orders.data.map((order) => {
        const items = order.store_order_items ?? [];
        const payment = paymentsByOrderNumber.get(order.order_number);
        const deliveryAddress = customerDeliveryAddress(order.metadata);
        const entitlements = order.store_digital_entitlements ?? [];
        const entitlementByItem = new Map(
          entitlements.map((entry) => [entry.order_item_id, entry]),
        );
        const approved = ["paid", "processing", "completed"].includes(
          order.status,
        );

        return (
          <section
            key={order.id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {order.order_number}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold">
                  {statusLabel(order.status)}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {formatDate(order.created_at)}
                </p>
                {order.paid_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Payment approved {formatDate(order.paid_at)}
                  </p>
                ) : null}
              </div>
              <div className="sm:text-right">
                <p className="font-semibold text-primary">
                  {formatZar(Number(order.total))}
                </p>
                {order.payment_reference ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reference {order.payment_reference}
                  </p>
                ) : null}
              </div>
            </div>

            {payment ? (
              <div className="border-b border-border bg-muted/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      EFT payment
                    </p>
                    <p className="mt-1 font-semibold">{paymentStatusLabel(payment.payment.status)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reference {payment.payment.reference} · Amount due {formatZar(payment.payment.amount)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This single payment request covers all {items.length === 1 ? "item" : `${items.length} items`} in this order.
                    </p>
                    {payment.order?.requiresDelivery ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>
                          Delivery {payment.order.shippingMethod ? `· ${payment.order.shippingMethod} ` : ""}
                          {formatZar(payment.order.shippingTotal)}
                        </p>
                        {deliveryAddress ? <p className="mt-1">Deliver to: {deliveryAddress.join(", ")}</p> : null}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Digital delivery</p>
                    )}
                    {payment.payment.reviewerNote ? (
                      <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                        {payment.payment.reviewerNote}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {payment.payment.proofUploaded ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={openingProofId === payment.payment.id}
                        onClick={() => void viewProof(payment)}
                      >
                        {openingProofId === payment.payment.id ? (
                          <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : null}
                        View uploaded proof
                      </Button>
                    ) : null}

                    {canUploadPaymentProof(payment) ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setProofFormPaymentId((current) =>
                            current === payment.payment.id ? null : payment.payment.id,
                          );
                          setProof(null);
                          setPayerNote("");
                        }}
                      >
                        <FileUp className="mr-1.5 h-4 w-4" />
                        {payment.payment.status === "rejected" ? "Replace proof" : "Upload proof"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {proofFormPaymentId === payment.payment.id && canUploadPaymentProof(payment) ? (
                  <form
                    className="mt-5 space-y-4 rounded-lg border border-border bg-background/60 p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void uploadProof(payment);
                    }}
                  >
                    <div className="space-y-2">
                      <label htmlFor={`proof-${payment.payment.id}`} className="text-sm font-medium">
                        Proof of payment
                      </label>
                      <input
                        id={`proof-${payment.payment.id}`}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        required
                        onChange={(event) => setProof(event.target.files?.[0] ?? null)}
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">PDF, JPG or PNG only · maximum 10 MB · stored privately for Cossa review.</p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`proof-note-${payment.payment.id}`} className="text-sm font-medium">
                        Optional note for the reviewer
                      </label>
                      <textarea
                        id={`proof-note-${payment.payment.id}`}
                        value={payerNote}
                        onChange={(event) => setPayerNote(event.target.value)}
                        maxLength={1000}
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="For example: payment was made from a different account name."
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={!proof || submittingProofId === payment.payment.id}>
                      {submittingProofId === payment.payment.id ? (
                        <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <FileUp className="mr-1.5 h-4 w-4" />
                      )}
                      Submit proof for review
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : order.payment_provider === "eft" ? (
              <NoticeBlock tone="pending" title="EFT payment details are loading">
                Refresh this page to view your payment reference and proof-of-payment options.
              </NoticeBlock>
            ) : null}

            {order.supplier_fulfilments.length ? (
              <div className="space-y-3 border-b border-border bg-muted/20 p-5">
                {order.supplier_fulfilments.map((fulfilment) => (
                  <div
                    key={fulfilment.id}
                    className="rounded-lg border border-border bg-background/60 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {fulfilment.status === "delivered" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Truck className="h-4 w-4 text-primary" />
                          )}
                          <p className="text-sm font-semibold">
                            {fulfilment.supplier === "CJ Dropshipping"
                              ? "International fulfilment"
                              : "Supplier fulfilment"}
                          </p>
                        </div>
                        <p
                          className={`mt-2 text-sm font-medium ${fulfilmentTone(fulfilment.status)}`}
                        >
                          {fulfilmentLabel(fulfilment.status)}
                        </p>
                        {fulfilment.logistics_method ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Delivery method: {fulfilment.logistics_method}
                          </p>
                        ) : null}
                        {fulfilment.origin_country_code ||
                        fulfilment.destination_country_code ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {fulfilment.origin_country_code || "International"}
                            {" → "}
                            {fulfilment.destination_country_code || "ZA"}
                          </p>
                        ) : null}
                      </div>

                      <div className="sm:text-right">
                        {fulfilment.tracking_number ? (
                          <>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Tracking number
                            </p>
                            <p className="mt-1 break-all font-mono text-sm font-semibold text-primary">
                              {fulfilment.tracking_number}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Tracking will appear here after dispatch.
                          </p>
                        )}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Updated {formatDate(fulfilment.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <ul className="divide-y divide-border">
              {items.map((item) => {
                const entitlement = entitlementByItem.get(item.id);
                const isDigital = item.product_type === "digital";
                const available = entitlement
                  ? entitlementAvailable(entitlement)
                  : false;

                return (
                  <li key={item.id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.sku ? `SKU ${item.sku} · ` : ""}Quantity {item.quantity}
                          {" · "}
                          {formatZar(Number(item.line_total))}
                        </p>

                        {payment ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Payment: {paymentStatusLabel(payment.payment.status)}
                          </p>
                        ) : null}

                        {isDigital && !approved ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Download locked until EFT payment is approved.
                          </p>
                        ) : null}

                        {isDigital && approved && !entitlement ? (
                          <p className="mt-3 text-sm text-destructive">
                            Payment is approved but this digital entitlement is
                            missing. Contact Cossa support with order {order.order_number}.
                          </p>
                        ) : null}

                        {entitlement ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {Math.max(
                              0,
                              entitlement.download_limit -
                                entitlement.downloads_used,
                            )}{" "}
                            of {entitlement.download_limit} downloads remaining
                            {entitlement.expires_at
                              ? ` · Access expires ${formatDate(entitlement.expires_at)}`
                              : ""}
                          </p>
                        ) : null}
                      </div>

                      {isDigital && entitlement ? (
                        <Button
                          type="button"
                          disabled={
                            !available || downloadingId === entitlement.id
                          }
                          onClick={() => void downloadEntitlement(entitlement)}
                          className="shrink-0"
                        >
                          {downloadingId === entitlement.id ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          {available
                            ? "Download securely"
                            : "Download unavailable"}
                        </Button>
                      ) : !isDigital && approved ? (
                        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/30 px-3 py-1.5 text-xs text-primary">
                          <PackageCheck className="h-4 w-4" /> Order confirmed
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
