import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type CjSyncProduct = {
  productId: string;
  title: string;
  variants: number;
  availableVariants: number;
  totalInventory?: number;
};

type CjSyncResult = {
  requested: number;
  createdAsDraft: number;
  refreshed: number;
  skipped: number;
  products: CjSyncProduct[];
  rejectionDetails?: Array<{
    productId: string;
    reason: string;
    diagnosticCode?: string;
    missingField?: string;
  }>;
};

type CjAvailabilityResult = {
  processed: number;
  products: Array<{
    productId: string;
    title: string;
    availableVariants: number;
    totalInventory: number;
  }>;
};

type CjCommercialProduct = {
  productId: string;
  title: string;
  status: "active" | "draft";
  availableVariants?: number;
  shippingOrigin?: string;
  shippingCarrier?: string;
  shippingAging?: string;
  shippingUsd?: number;
  minCostZar?: number;
  fromPriceZar?: number;
  reason?: string;
};

type CjCommercialResult = {
  processed: number;
  activated: number;
  keptDraft: number;
  pricing: {
    fxZarPerUsd: number;
    riskBufferRate: number;
    fixedOrderBufferZar: number;
    targetGrossMargin: number;
  };
  products: CjCommercialProduct[];
};

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  // The generated client uses an opaque publishable key. Pass the current user
  // token explicitly so the Edge Function can enforce its server-side admin check.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.refreshSession();
  if (sessionError) throw new Error("Please sign in again to run CJ catalogue sync.");
  if (!session?.access_token) throw new Error("Please sign in again to run CJ catalogue sync.");

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    const context = (error as { context?: unknown }).context;
    const responseLike = context as {
      clone?: () => { json?: () => Promise<unknown> };
      json?: () => Promise<unknown>;
    } | null;
    const response =
      typeof responseLike?.clone === "function" ? responseLike.clone() : responseLike;
    if (typeof response?.json === "function") {
      const payload = await response.json().catch(() => null);
      if (
        payload &&
        typeof payload === "object" &&
        typeof (payload as { error?: unknown }).error === "string"
      ) {
        throw new Error((payload as { error: string }).error);
      }
    }
    const message = (error as { message?: unknown }).message;
    throw new Error(typeof message === "string" && message ? message : `${name} failed.`);
  }

  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

async function invokeCjSync(): Promise<CjSyncResult> {
  return invokeFunction<CjSyncResult>("cj-product-sync", { action: "sync" });
}

async function invokeCjAvailability(): Promise<CjAvailabilityResult> {
  return invokeFunction<CjAvailabilityResult>("cj-availability-sync", { action: "refresh" });
}

function zar(value?: number): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(value);
}

function usd(value?: number): string {
  return value == null ? "—" : `US$ ${value.toFixed(2)}`;
}

export function CjProductSyncPanel({ onSynced }: { onSynced?: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<CjSyncResult | null>(null);
  const [commercial, setCommercial] = useState<CjCommercialResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  async function syncCjProducts() {
    setLastError(null);
    setSyncing(true);
    try {
      const next = await invokeCjSync();
      const availability = await invokeCjAvailability();
      const availabilityByProduct = new Map(
        availability.products.map((product) => [product.productId, product]),
      );
      const merged: CjSyncResult = {
        ...next,
        products: next.products.map((product) => {
          const live = availabilityByProduct.get(product.productId);
          return live
            ? {
                ...product,
                availableVariants: live.availableVariants,
                totalInventory: live.totalInventory,
              }
            : product;
        }),
      };
      setResult(merged);

      setCommercial(null);
      toast.success("CJ Draft products imported", {
        description: `${next.createdAsDraft} real CJ product${next.createdAsDraft === 1 ? "" : "s"} added for catalogue and pricing review.`,
      });
      onSynced?.();
    } catch (error) {
      const candidate = (error as { message?: unknown } | null)?.message;
      const message =
        typeof candidate === "string" && candidate ? candidate : "CJ catalogue sync failed.";
      setLastError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold">CJ Dropshipping connection</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Import a controlled, department-balanced batch of real CJ products with live variant
            stock. Every product enters Cossa Store as Draft for pricing and catalogue approval;
            unavailable products are skipped safely.
          </p>
        </div>
        <Button type="button" onClick={() => void syncCjProducts()} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
          {syncing ? "Importing CJ Drafts…" : "Import 25 CJ Draft Products"}
        </Button>
      </div>

      {lastError ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {lastError}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <strong>Requested:</strong> {result.requested}
            </span>
            <span>
              <strong>New drafts:</strong> {result.createdAsDraft}
            </span>
            <span>
              <strong>Refreshed:</strong> {result.refreshed}
            </span>
            <span>
              <strong>Skipped:</strong> {result.skipped}
            </span>
          </div>
          {result.products.length ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">CJ product</th>
                    <th className="px-3 py-2">Variants</th>
                    <th className="px-3 py-2">Available variants</th>
                    <th className="px-3 py-2">CJ inventory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.products.map((product) => (
                    <tr key={product.productId}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{product.title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {product.productId}
                        </div>
                      </td>
                      <td className="px-3 py-2">{product.variants}</td>
                      <td className="px-3 py-2">{product.availableVariants}</td>
                      <td className="px-3 py-2">{product.totalInventory ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {result.rejectionDetails?.length ? (
            <details className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                Show import rejections
              </summary>
              <ul className="mt-2 space-y-1">
                {result.rejectionDetails.map((rejection) => (
                  <li key={rejection.productId}>
                    <span className="font-mono">{rejection.productId}</span>:{" "}
                    {rejection.reason.replace(/_/g, " ")}
                    {rejection.diagnosticCode ? ` (${rejection.diagnosticCode})` : ""}
                    {rejection.missingField ? ` — missing ${rejection.missingField}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {commercial ? (
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <strong>Published:</strong> {commercial.activated}
            </span>
            <span>
              <strong>Kept Draft:</strong> {commercial.keptDraft}
            </span>
            <span>
              <strong>Protected FX:</strong> US$1 = R{commercial.pricing.fxZarPerUsd.toFixed(2)}
            </span>
            <span>
              <strong>Target margin:</strong>{" "}
              {(commercial.pricing.targetGrossMargin * 100).toFixed(0)}%
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">ZA freight</th>
                  <th className="px-3 py-2">ETA</th>
                  <th className="px-3 py-2">Protected cost</th>
                  <th className="px-3 py-2">From price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commercial.products.map((product) => (
                  <tr key={product.productId}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{product.title}</div>
                      {product.reason ? (
                        <div className="text-xs text-muted-foreground">
                          {product.reason.replace(/_/g, " ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 capitalize">{product.status}</td>
                    <td className="px-3 py-2">
                      {product.shippingCarrier
                        ? `${product.shippingCarrier} · ${usd(product.shippingUsd)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{product.shippingAging || "—"}</td>
                    <td className="px-3 py-2">{zar(product.minCostZar)}</td>
                    <td className="px-3 py-2 font-medium">{zar(product.fromPriceZar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Only products with live CJ stock and a valid South Africa freight quote are published.
            Pricing includes supplier cost, quoted freight, a protective FX rate, a risk buffer, and
            Cossa margin protection.
          </p>
        </div>
      ) : null}
    </section>
  );
}
