import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, LoaderCircle, PackageCheck, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatZar } from "@/lib/format";

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

type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number | string;
  payment_provider: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  store_order_items: OrderItem[] | null;
  store_digital_entitlements: DigitalEntitlement[] | null;
};

export const Route = createFileRoute("/account/orders")({
  head: () => ({
    meta: [
      { title: "My orders & downloads | Cossa Store" },
      {
        name: "description",
        content: "View your Cossa Store order status and access approved digital purchases securely.",
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
  if (entitlement.expires_at && new Date(entitlement.expires_at).getTime() <= Date.now()) return false;
  return true;
}

function OrdersPage() {
  const { user, loading: authLoading } = useSession();
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["customer-store-orders", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CustomerOrder[]> => {
      const { data, error } = await db
        .from("store_orders")
        .select(
          "id,order_number,status,total,payment_provider,payment_reference,paid_at,created_at,store_order_items(id,product_id,product_name,sku,product_type,quantity,unit_price,line_total),store_digital_entitlements(id,order_item_id,product_id,download_limit,downloads_used,expires_at,revoked_at)",
        )
        .eq("customer_user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as CustomerOrder[];
    },
  });

  async function downloadEntitlement(entitlement: DigitalEntitlement) {
    setDownloadingId(entitlement.id);
    try {
      const { data, error } = await supabase.functions.invoke("digital-download", {
        body: { entitlementId: entitlement.id },
      });

      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "The download could not be prepared.");

      const link = document.createElement("a");
      link.href = data.url;
      link.download = typeof data.fileName === "string" ? data.fileName : "Cossa-digital-product";
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

      await queryClient.invalidateQueries({ queryKey: ["customer-store-orders", user?.id] });
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
        Your EFT orders and approved digital downloads are tied to the account used at checkout. {" "}
        <Link to="/auth" className="font-medium text-primary underline underline-offset-2">
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
        We could not read your order history securely. Refresh the page or contact Cossa support if the problem continues.
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
        <h2 className="font-display text-2xl font-semibold">Orders & digital downloads</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          EFT orders remain pending until Cossa approves the payment. Paid digital files appear here as controlled downloads.
        </p>
      </div>

      {orders.data.map((order) => {
        const items = order.store_order_items ?? [];
        const entitlements = order.store_digital_entitlements ?? [];
        const entitlementByItem = new Map(entitlements.map((entry) => [entry.order_item_id, entry]));
        const approved = ["paid", "processing", "completed"].includes(order.status);

        return (
          <section key={order.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{order.order_number}</p>
                <h3 className="mt-1 font-display text-lg font-semibold">{statusLabel(order.status)}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(order.created_at)}</p>
                {order.paid_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">Payment approved {formatDate(order.paid_at)}</p>
                ) : null}
              </div>
              <div className="sm:text-right">
                <p className="font-semibold text-primary">{formatZar(Number(order.total))}</p>
                {order.payment_reference ? (
                  <p className="mt-1 text-xs text-muted-foreground">Reference {order.payment_reference}</p>
                ) : null}
              </div>
            </div>

            <ul className="divide-y divide-border">
              {items.map((item) => {
                const entitlement = entitlementByItem.get(item.id);
                const isDigital = item.product_type === "digital";
                const available = entitlement ? entitlementAvailable(entitlement) : false;

                return (
                  <li key={item.id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.sku ? `SKU ${item.sku} · ` : ""}Quantity {item.quantity} · {formatZar(Number(item.line_total))}
                        </p>

                        {isDigital && !approved ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Download locked until EFT payment is approved.
                          </p>
                        ) : null}

                        {isDigital && approved && !entitlement ? (
                          <p className="mt-3 text-sm text-destructive">
                            Payment is approved but this digital entitlement is missing. Contact Cossa support with order {order.order_number}.
                          </p>
                        ) : null}

                        {entitlement ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {Math.max(0, entitlement.download_limit - entitlement.downloads_used)} of {entitlement.download_limit} downloads remaining
                            {entitlement.expires_at ? ` · Access expires ${formatDate(entitlement.expires_at)}` : ""}
                          </p>
                        ) : null}
                      </div>

                      {isDigital && entitlement ? (
                        <Button
                          type="button"
                          disabled={!available || downloadingId === entitlement.id}
                          onClick={() => void downloadEntitlement(entitlement)}
                          className="shrink-0"
                        >
                          {downloadingId === entitlement.id ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          {available ? "Download securely" : "Download unavailable"}
                        </Button>
                      ) : !isDigital && approved ? (
                        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/30 px-3 py-1.5 text-xs text-primary">
                          <PackageCheck className="h-4 w-4" /> Ready for fulfilment
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
