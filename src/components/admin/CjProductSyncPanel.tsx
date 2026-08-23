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
};

type CjSyncResult = {
  requested: number;
  createdAsDraft: number;
  refreshed: number;
  skipped: number;
  products: CjSyncProduct[];
};

async function invokeCjSync(): Promise<CjSyncResult> {
  const { data, error } = await supabase.functions.invoke("cj-product-sync", {
    body: { action: "sync" },
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
    throw new Error(typeof message === "string" && message ? message : "CJ catalogue sync failed.");
  }

  if (data?.error) throw new Error(String(data.error));
  return data as CjSyncResult;
}

export function CjProductSyncPanel({ onSynced }: { onSynced?: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<CjSyncResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  async function syncCjProducts() {
    setLastError(null);
    setSyncing(true);
    try {
      const next = await invokeCjSync();
      setResult(next);
      toast.success("CJ catalogue synced", {
        description: `${next.createdAsDraft} new draft${next.createdAsDraft === 1 ? "" : "s"}, ${next.refreshed} refreshed, ${next.skipped} skipped.`,
      });
      onSynced?.();
    } catch (error) {
      const candidate = (error as { message?: unknown } | null)?.message;
      const message = typeof candidate === "string" && candidate ? candidate : "CJ catalogue sync failed.";
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
            Pull a small controlled batch of real CJ products into the existing Cossa catalogue. New CJ products stay Draft until Cossa pricing and publication are approved.
          </p>
        </div>
        <Button type="button" onClick={() => void syncCjProducts()} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
          {syncing ? "Syncing CJ…" : "Sync CJ Products"}
        </Button>
      </div>

      {lastError ? (
        <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {lastError}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong>Requested:</strong> {result.requested}</span>
            <span><strong>New drafts:</strong> {result.createdAsDraft}</span>
            <span><strong>Refreshed:</strong> {result.refreshed}</span>
            <span><strong>Skipped:</strong> {result.skipped}</span>
          </div>
          {result.products.length ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">CJ product</th>
                    <th className="px-3 py-2">Variants</th>
                    <th className="px-3 py-2">Available variants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.products.map((product) => (
                    <tr key={product.productId}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{product.title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{product.productId}</div>
                      </td>
                      <td className="px-3 py-2">{product.variants}</td>
                      <td className="px-3 py-2">{product.availableVariants}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            CJ supplier costs remain source data only. Cossa selling prices are not invented or auto-published by this sync.
          </p>
        </div>
      ) : null}
    </section>
  );
}
