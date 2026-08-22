import { useState } from "react";
import { Eye, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PrintifyPreviewProduct = {
  printifyProductId: string;
  title: string;
  enabledVariantCount: number;
  availableVariantCount: number;
  minRetailUsd: number | null;
  minRetailZar: number | null;
  minCostUsd: number | null;
  minCostZar: number | null;
  valid: boolean;
  validationReasons: string[];
};

type CurrencyInfo = {
  source: "USD";
  store: "ZAR";
  fxRate: number;
};

type PrintifyPreview = {
  shop: {
    id: string;
    title: string;
    salesChannel?: unknown;
  };
  count: number;
  currency: CurrencyInfo;
  products: PrintifyPreviewProduct[];
};

type PrintifyReconcileResult = {
  shop: {
    id: string;
    title: string;
  };
  processed: number;
  createdAsDraft: number;
  refreshed: number;
  keptActive: number;
  demotedToDraft: number;
  skipped: Array<{ title: string; reasons: string[] }>;
};

type PrintifyWebhookResult = {
  endpoint: string;
  subscriptions: Array<{ topic: string; id: string; created: boolean }>;
};

async function invokePrintify<T>(action: "preview" | "reconcile" | "configure_webhooks"): Promise<T> {
  const { data, error } = await supabase.functions.invoke("printify-sync", {
    body: { action },
  });

  if (error) {
    const context = (error as { context?: unknown }).context;
    const responseLike = context as {
      clone?: () => { json?: () => Promise<unknown> };
      json?: () => Promise<unknown>;
    } | null;
    const response = typeof responseLike?.clone === "function" ? responseLike.clone() : responseLike;
    if (typeof response?.json === "function") {
      const payload = await response.json().catch(() => null);
      if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
        throw new Error((payload as { error: string }).error);
      }
    }
    const message = (error as { message?: unknown }).message;
    throw new Error(typeof message === "string" && message ? message : "Printify sync failed.");
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

function usd(value: number | null): string {
  return value == null ? "—" : `US$ ${value.toFixed(2)}`;
}

function zar(value: number | null): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        minimumFractionDigits: 2,
      }).format(value);
}

export function PrintifySyncPanel({ onSynced }: { onSynced?: () => void }) {
  const [preview, setPreview] = useState<PrintifyPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configuringAutomation, setConfiguringAutomation] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  function showError(error: unknown, fallback: string) {
    const candidate = (error as { message?: unknown } | null)?.message;
    const message = typeof candidate === "string" && candidate ? candidate : fallback;
    setLastError(message);
    toast.error(message);
  }

  async function previewPrintify() {
    setLastError(null);
    setPreviewing(true);
    try {
      const result = await invokePrintify<PrintifyPreview>("preview");
      setPreview(result);
      toast.success(`Connected to ${result.shop.title}`, {
        description: `${result.count} Printify product${result.count === 1 ? "" : "s"} found. No Store data was changed.`,
      });
    } catch (error) {
      showError(error, "Printify preview failed.");
    } finally {
      setPreviewing(false);
    }
  }

  async function reconcileCatalogue() {
    setLastError(null);
    setSyncing(true);
    try {
      const result = await invokePrintify<PrintifyReconcileResult>("reconcile");
      toast.success("Printify catalogue reconciled", {
        description: `${result.processed} products checked; ${result.createdAsDraft} new draft${result.createdAsDraft === 1 ? "" : "s"}, ${result.keptActive} live listing${result.keptActive === 1 ? "" : "s"} safely refreshed.`,
      });
      onSynced?.();
      const refreshed = await invokePrintify<PrintifyPreview>("preview");
      setPreview(refreshed);
    } catch (error) {
      showError(error, "Printify sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function configureAutomation() {
    setLastError(null);
    setConfiguringAutomation(true);
    try {
      const result = await invokePrintify<PrintifyWebhookResult>("configure_webhooks");
      toast.success("Automatic Printify sync enabled", {
        description: `${result.subscriptions.length} signed product-event subscription${result.subscriptions.length === 1 ? "" : "s"} now point to the secure Cossa receiver.`,
      });
    } catch (error) {
      showError(error, "Automatic Printify sync could not be enabled.");
    } finally {
      setConfiguringAutomation(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold">Printify POD connection</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Reconcile genuine products from the connected Printify shop into the existing Cossa catalogue. New or incomplete items stay Draft; only valid existing live listings are refreshed. Customer prices remain ZAR while provider source prices remain USD.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void previewPrintify()} disabled={previewing || syncing || configuringAutomation}>
            <Eye className="mr-2 h-4 w-4" aria-hidden />
            {previewing ? "Checking Printify…" : "Preview Printify"}
          </Button>
          <Button type="button" onClick={() => void reconcileCatalogue()} disabled={previewing || syncing || configuringAutomation}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
            {syncing ? "Reconciling…" : "Reconcile catalogue"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void configureAutomation()} disabled={previewing || syncing || configuringAutomation}>
            <Zap className="mr-2 h-4 w-4" aria-hidden />
            {configuringAutomation ? "Enabling…" : "Enable automatic sync"}
          </Button>
        </div>
      </div>

      {lastError ? (
        <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {lastError}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><strong>Shop:</strong> {preview.shop.title}</span>
            <span><strong>Shop ID:</strong> {preview.shop.id}</span>
            <span><strong>Products:</strong> {preview.count}</span>
            <span><strong>FX:</strong> US$1 = R{preview.currency.fxRate.toFixed(4)}</span>
          </div>
          {preview.products.length ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Printify product</th>
                    <th className="px-3 py-2">Variants</th>
                    <th className="px-3 py-2">Available variants</th>
                    <th className="px-3 py-2">Ready</th>
                    <th className="px-3 py-2">Lowest retail USD</th>
                    <th className="px-3 py-2">Store retail ZAR</th>
                    <th className="px-3 py-2">Lowest cost USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.products.map((product) => (
                    <tr key={product.printifyProductId}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{product.title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{product.printifyProductId}</div>
                      </td>
                      <td className="px-3 py-2">{product.enabledVariantCount}</td>
                      <td className="px-3 py-2">{product.availableVariantCount}</td>
                      <td className="px-3 py-2">{product.valid ? "Yes" : product.validationReasons.join(", ")}</td>
                      <td className="px-3 py-2">{usd(product.minRetailUsd)}</td>
                      <td className="px-3 py-2 font-medium">{zar(product.minRetailZar)}</td>
                      <td className="px-3 py-2">{usd(product.minCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No products were returned by Printify.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Printify remains the USD source of truth. Cossa Store stores matching ZAR retail prices per option and checkout validates the selected variant server-side. Automatic sync only accepts signed Printify product events.
          </p>
        </div>
      ) : null}
    </section>
  );
}
