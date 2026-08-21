import { useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PrintifyPreviewProduct = {
  printifyProductId: string;
  title: string;
  visibleInPrintify: boolean;
  enabledVariantCount: number;
  minRetailCents: number | null;
  minCostCents: number | null;
};

type PrintifyPreview = {
  shop: {
    id: string;
    title: string;
    salesChannel?: unknown;
  };
  count: number;
  products: PrintifyPreviewProduct[];
};

type PrintifyStageResult = {
  shop: {
    id: string;
    title: string;
  };
  count: number;
  staged: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    supplier_product_ref: string;
    enabledVariantCount: number;
    minRetailCents: number | null;
    minCostCents: number | null;
  }>;
};

async function invokePrintify<T>(action: "preview" | "stage_drafts"): Promise<T> {
  const { data, error } = await supabase.functions.invoke("printify-sync", {
    body: { action },
  });

  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

function cents(value: number | null): string {
  return value == null ? "—" : `${(value / 100).toFixed(2)} provider-currency`;
}

export function PrintifySyncPanel({ onSynced }: { onSynced?: () => void }) {
  const [preview, setPreview] = useState<PrintifyPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function previewPrintify() {
    setPreviewing(true);
    try {
      const result = await invokePrintify<PrintifyPreview>("preview");
      setPreview(result);
      toast.success(`Connected to ${result.shop.title}`, {
        description: `${result.count} Printify product${result.count === 1 ? "" : "s"} found. No Store data was changed.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Printify preview failed.");
    } finally {
      setPreviewing(false);
    }
  }

  async function syncDrafts() {
    setSyncing(true);
    try {
      const result = await invokePrintify<PrintifyStageResult>("stage_drafts");
      toast.success("Printify products staged", {
        description: `${result.count} product${result.count === 1 ? "" : "s"} synced into the Cossa catalogue. New products remain Draft.`,
      });
      onSynced?.();
      const refreshed = await invokePrintify<PrintifyPreview>("preview");
      setPreview(refreshed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Printify sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold">Printify POD connection</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Read the real products in the connected Printify shop and stage them in Cossa Store. New Printify items remain Draft until pricing, variants and fulfilment are reviewed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void previewPrintify()} disabled={previewing || syncing}>
            <Eye className="mr-2 h-4 w-4" aria-hidden />
            {previewing ? "Checking Printify…" : "Preview Printify"}
          </Button>
          <Button type="button" onClick={() => void syncDrafts()} disabled={previewing || syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
            {syncing ? "Syncing drafts…" : "Sync Printify drafts"}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><strong>Shop:</strong> {preview.shop.title}</span>
            <span><strong>Shop ID:</strong> {preview.shop.id}</span>
            <span><strong>Products:</strong> {preview.count}</span>
          </div>
          {preview.products.length ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Printify product</th>
                    <th className="px-3 py-2">Variants</th>
                    <th className="px-3 py-2">Printify visible</th>
                    <th className="px-3 py-2">Lowest retail</th>
                    <th className="px-3 py-2">Lowest cost</th>
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
                      <td className="px-3 py-2">{product.visibleInPrintify ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{cents(product.minRetailCents)}</td>
                      <td className="px-3 py-2">{cents(product.minCostCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No products were returned by Printify.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Printify product prices/costs are shown only as provider-currency cents here. They are not converted into ZAR automatically yet, so the sync does not invent a Cossa selling price.
          </p>
        </div>
      ) : null}
    </section>
  );
}
