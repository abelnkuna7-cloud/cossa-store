import { useState } from "react";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type CjCommercialProduct = {
  productId: string;
  title: string;
  status: "active" | "draft" | "archived";
  availableVariants?: number;
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
  archived: number;
  pricing: {
    fxZarPerUsd: number;
    riskBufferRate: number;
    fixedOrderBufferZar: number;
    targetGrossMargin: number;
  };
  products: CjCommercialProduct[];
};

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.refreshSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Please sign in again to run CJ catalogue controls.");
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    const context = (error as { context?: unknown }).context as {
      clone?: () => { json?: () => Promise<unknown> };
      json?: () => Promise<unknown>;
    } | null;
    const response = typeof context?.clone === "function" ? context.clone() : context;
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
    throw new Error((error as { message?: string }).message || `${name} failed.`);
  }

  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

function zar(value?: number) {
  return value == null
    ? "—"
    : new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        minimumFractionDigits: 2,
      }).format(value);
}

function usd(value?: number) {
  return value == null ? "—" : `US$ ${value.toFixed(2)}`;
}

export function CjProductSyncPanel({ onSynced }: { onSynced?: () => void }) {
  const [working, setWorking] = useState(false);
  const [requestedProduct, setRequestedProduct] = useState("");
  const [result, setResult] = useState<CjSyncResult | null>(null);
  const [commercial, setCommercial] = useState<CjCommercialResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  async function addRequestedProduct() {
    const reference = requestedProduct.trim();
    if (!reference) {
      setLastError("Paste a CJ product ID or CJ product link first.");
      return;
    }

    setWorking(true);
    setLastError(null);
    try {
      const imported = await invokeFunction<CjSyncResult>("cj-product-sync", {
        action: "sync",
        productRef: reference,
      });
      setResult(imported);

      const productId = imported.products[0]?.productId;
      if (!productId) {
        const rejection = imported.rejectionDetails?.[0]?.reason?.replace(/_/g, " ");
        throw new Error(
          rejection
            ? `CJ candidate was not admitted: ${rejection}.`
            : "CJ candidate did not pass the catalogue admission check.",
        );
      }

      const priced = await invokeFunction<CjCommercialResult>("cj-commercial-sync", {
        action: "price_and_publish",
        productRef: productId,
      });
      setCommercial(priced);

      const item = priced.products[0];
      if (item?.status === "active") {
        toast.success("CJ product approved and published", {
          description:
            "The exact product passed live stock, South Africa freight and protected-pricing checks.",
        });
      } else if (item?.status === "archived") {
        toast.error("CJ product failed commercial qualification", {
          description:
            "A confirmed commercial failure was archived instead of being left as unusable working stock.",
        });
      } else {
        toast.warning("CJ product requires recheck", {
          description:
            "The product is not public. A temporary or incomplete provider check still needs verification.",
        });
      }

      setRequestedProduct("");
      onSynced?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "CJ product qualification failed.";
      setLastError(message);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  }

  async function reviewExistingDrafts() {
    setWorking(true);
    setLastError(null);
    try {
      const next = await invokeFunction<CjCommercialResult>("cj-commercial-sync", {
        action: "price_and_publish",
      });
      setCommercial(next);
      toast.success("Existing CJ drafts reviewed", {
        description: `${next.activated} published · ${next.keptDraft} require recheck · ${next.archived} confirmed failures archived.`,
      });
      onSynced?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "CJ commercial review failed.";
      setLastError(message);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden />
            <h2 className="font-semibold">CJ acquisition control</h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Automatic bulk catalogue filling is paused. Cossa Store is moving to qualification-first
            acquisition so supplier products are not accumulated merely to be rejected later.
          </p>

          <div className="mt-3 grid gap-2 rounded-md border border-border bg-background/60 p-3 text-xs sm:grid-cols-2">
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              <span>Exact product admission remains available for deliberate sourcing.</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              <span>Existing drafts can still be commercially reviewed and cleaned.</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={requestedProduct}
              onChange={(event) => setRequestedProduct(event.target.value)}
              placeholder="Paste an exact CJ product ID or CJ product link"
              aria-label="CJ product ID or link"
              disabled={working}
            />
            <Button
              type="button"
              onClick={() => void addRequestedProduct()}
              disabled={working || !requestedProduct.trim()}
            >
              {working ? "Checking…" : "Qualify exact product"}
            </Button>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            No public listing is promised at import time. Stock, South Africa freight and protected
            pricing must pass before publication.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void reviewExistingDrafts()}
          disabled={working}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${working ? "animate-spin" : ""}`} aria-hidden />
          Review existing CJ drafts
        </Button>
      </div>

      {lastError ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {lastError}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Available variants</th>
                <th className="px-3 py-2">CJ inventory</th>
                <th className="px-3 py-2">Admission</th>
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
                  <td className="px-3 py-2">
                    {product.availableVariants}/{product.variants}
                  </td>
                  <td className="px-3 py-2">{product.totalInventory ?? "—"}</td>
                  <td className="px-3 py-2">Controlled draft</td>
                </tr>
              ))}
              {!result.products.length ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                    Candidate not admitted. See the error or rejection reason above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {commercial ? (
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong>Published:</strong> {commercial.activated}</span>
            <span><strong>Recheck:</strong> {commercial.keptDraft}</span>
            <span><strong>Archived failures:</strong> {commercial.archived}</span>
            <span><strong>Protected FX:</strong> US$1 = R{commercial.pricing.fxZarPerUsd.toFixed(2)}</span>
            <span><strong>Target margin:</strong> {(commercial.pricing.targetGrossMargin * 100).toFixed(0)}%</span>
          </div>

          {commercial.products.filter((product) => product.status === "active").length ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Approved product</th>
                    <th className="px-3 py-2">ZA freight</th>
                    <th className="px-3 py-2">ETA</th>
                    <th className="px-3 py-2">Protected cost</th>
                    <th className="px-3 py-2">From price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commercial.products
                    .filter((product) => product.status === "active")
                    .map((product) => (
                      <tr key={product.productId}>
                        <td className="px-3 py-2 font-medium">{product.title}</td>
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
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
