import { useEffect, useMemo, useState } from "react";
import { Eye, Link2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";

type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  brand: string | null;
};

type VariantOption = {
  id: string;
  product_id: string;
  sku: string | null;
  title: string;
  is_available: boolean;
};

type MappingPreview = {
  product: {
    id: string;
    sku: string | null;
    name: string;
    status: string;
    brand: string | null;
    product_type: string;
    fulfilment_model: string;
  };
  variant: VariantOption | null;
  printify: {
    productId: string;
    title: string;
    images: string[];
    availableVariantCount: number;
    variant: {
      id: string;
      title: string;
      sku: string | null;
      sourceCost: number | null;
      sourcePrice: number | null;
      options: unknown[];
    } | null;
  };
  existingMapping: {
    id: string;
    provider_product_id: string;
    provider_variant_id: string | null;
    artwork_asset_ref: string | null;
    fulfilment_status: string;
    sync_status: string;
    updated_at: string;
  } | null;
  readyToMap: boolean;
};

type MappingResponse = {
  action: "preview" | "save";
  preview?: MappingPreview;
  mapping?: Record<string, unknown>;
  error?: string;
};

async function invokeMapping(body: Record<string, unknown>): Promise<MappingResponse> {
  const { data, error } = await supabase.functions.invoke("printify-fulfilment-mapping", { body });
  if (error) {
    const context = (error as { context?: unknown }).context as {
      clone?: () => { json?: () => Promise<unknown> };
      json?: () => Promise<unknown>;
    } | null;
    const response = typeof context?.clone === "function" ? context.clone() : context;
    if (typeof response?.json === "function") {
      const payload = await response.json().catch(() => null);
      const message = payload && typeof payload === "object" ? (payload as { error?: unknown }).error : null;
      if (typeof message === "string" && message) throw new Error(message);
    }
    throw new Error((error as { message?: string }).message || "Printify mapping request failed.");
  }
  if (data?.error) throw new Error(String(data.error));
  return data as MappingResponse;
}

function money(value: number | null): string {
  return value == null ? "—" : `US$ ${value.toFixed(2)}`;
}

export function CossaLifestylePrintifyMappingPanel() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [storeProductId, setStoreProductId] = useState("");
  const [storeVariantId, setStoreVariantId] = useState("");
  const [providerProductId, setProviderProductId] = useState("");
  const [providerVariantId, setProviderVariantId] = useState("");
  const [artworkAssetRef, setArtworkAssetRef] = useState("");
  const [blueprintId, setBlueprintId] = useState("");
  const [printProviderId, setPrintProviderId] = useState("");
  const [preview, setPreview] = useState<MappingPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoadingProducts(true);
    void db
      .from("store_products")
      .select("id,name,sku,status,brand")
      .eq("organisation_id", ORGANISATION_ID)
      .ilike("brand", "Cossa Lifestyle")
      .order("name", { ascending: true })
      .then(({ data, error }: any) => {
        if (!alive) return;
        if (error) {
          setLastError(error.message || "Cossa Lifestyle products could not be loaded.");
          setProducts([]);
        } else {
          setProducts((data ?? []) as ProductOption[]);
        }
        setLoadingProducts(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setStoreVariantId("");
    setVariants([]);
    setPreview(null);
    if (!storeProductId) return;
    let alive = true;
    setLoadingVariants(true);
    void db
      .from("store_product_variants")
      .select("id,product_id,sku,title,is_available")
      .eq("product_id", storeProductId)
      .order("sort_order", { ascending: true })
      .then(({ data, error }: any) => {
        if (!alive) return;
        if (error) {
          setLastError(error.message || "Product variants could not be loaded.");
          setVariants([]);
        } else {
          setVariants((data ?? []) as VariantOption[]);
        }
        setLoadingVariants(false);
      });
    return () => {
      alive = false;
    };
  }, [storeProductId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === storeProductId) ?? null,
    [products, storeProductId],
  );

  function body(action: "preview" | "save") {
    return {
      action,
      storeProductId,
      storeVariantId: storeVariantId || null,
      providerProductId: providerProductId.trim(),
      providerVariantId: providerVariantId.trim() || null,
      artworkAssetRef: artworkAssetRef.trim() || null,
      blueprintId: blueprintId.trim() || null,
      printProviderId: printProviderId.trim() || null,
    };
  }

  async function runPreview() {
    if (!storeProductId || !providerProductId.trim()) {
      toast.error("Choose a Cossa Lifestyle product and enter a Printify product ID first.");
      return;
    }
    if (storeVariantId && !providerVariantId.trim()) {
      toast.error("This Cossa variant needs a matching Printify variant ID.");
      return;
    }
    setLastError(null);
    setPreviewing(true);
    try {
      const result = await invokeMapping(body("preview"));
      if (!result.preview) throw new Error("Printify did not return a mapping preview.");
      setPreview(result.preview);
      toast.success("Hidden fulfilment mapping validated", {
        description: "No Store or Printify data was changed.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mapping preview failed.";
      setLastError(message);
      setPreview(null);
      toast.error(message);
    } finally {
      setPreviewing(false);
    }
  }

  async function saveMapping() {
    if (!preview?.readyToMap) {
      toast.error("Preview and validate the mapping before saving it.");
      return;
    }
    setLastError(null);
    setSaving(true);
    try {
      await invokeMapping(body("save"));
      toast.success("Cossa Lifestyle fulfilment mapping saved", {
        description: "The customer-facing product remains Cossa Lifestyle; Printify stays hidden behind fulfilment.",
      });
      const refreshed = await invokeMapping(body("preview"));
      setPreview(refreshed.preview ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mapping could not be saved.";
      setLastError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" aria-hidden />
            <h2 className="font-semibold">Cossa Lifestyle → Printify hidden fulfilment</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Keep the customer-facing title, mockups, brand and retail price owned by Cossa Lifestyle while mapping the physical production product and variant to Printify behind the scenes.
          </p>
        </div>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
          Preview is read-only. Save remains blocked unless the server flag <code>PRINTIFY_MAPPING_WRITES_ENABLED=true</code> is deliberately enabled.
        </div>
      </div>

      {lastError ? (
        <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {lastError}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Cossa Lifestyle product</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={storeProductId}
            disabled={loadingProducts}
            onChange={(event) => setStoreProductId(event.target.value)}
          >
            <option value="">{loadingProducts ? "Loading products…" : "Choose product"}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}{product.sku ? ` · ${product.sku}` : ""} · {product.status}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Cossa variant</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={storeVariantId}
            disabled={!storeProductId || loadingVariants}
            onChange={(event) => {
              setStoreVariantId(event.target.value);
              setPreview(null);
            }}
          >
            <option value="">{loadingVariants ? "Loading variants…" : "Whole product / default"}</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id} disabled={!variant.is_available}>
                {variant.title}{variant.sku ? ` · ${variant.sku}` : ""}{variant.is_available ? "" : " · unavailable"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Printify product ID</span>
          <Input
            value={providerProductId}
            placeholder="e.g. 65abc…"
            onChange={(event) => {
              setProviderProductId(event.target.value);
              setPreview(null);
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Printify variant ID</span>
          <Input
            value={providerVariantId}
            placeholder={storeVariantId ? "Required for selected variant" : "Optional for default mapping"}
            onChange={(event) => {
              setProviderVariantId(event.target.value);
              setPreview(null);
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground xl:col-span-2">
          <span>Production artwork reference</span>
          <Input
            value={artworkAssetRef}
            placeholder="Internal asset URL/path for production-ready artwork"
            onChange={(event) => setArtworkAssetRef(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Printify blueprint ID</span>
          <Input value={blueprintId} placeholder="Optional" onChange={(event) => setBlueprintId(event.target.value)} />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Print provider ID</span>
          <Input value={printProviderId} placeholder="Optional" onChange={(event) => setPrintProviderId(event.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={previewing || saving} onClick={() => void runPreview()}>
          <Eye className="mr-2 h-4 w-4" aria-hidden />
          {previewing ? "Validating…" : "Preview hidden mapping"}
        </Button>
        <Button type="button" disabled={previewing || saving || !preview?.readyToMap} onClick={() => void saveMapping()}>
          <Save className="mr-2 h-4 w-4" aria-hidden />
          {saving ? "Saving…" : preview?.existingMapping ? "Update mapping" : "Save mapping"}
        </Button>
      </div>

      {!loadingProducts && products.length === 0 ? (
        <p className="mt-4 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
          No products are currently branded exactly <strong>Cossa Lifestyle</strong>. Create the first Cossa Lifestyle listing as Draft before mapping it to Printify.
        </p>
      ) : null}

      {preview ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer-facing Cossa product</div>
            <div className="mt-2 font-medium">{preview.product.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">SKU: {preview.product.sku ?? "—"} · Status: {preview.product.status} · Brand: {preview.product.brand ?? "—"}</div>
            {preview.variant ? <div className="mt-2">Variant: <strong>{preview.variant.title}</strong></div> : <div className="mt-2 text-muted-foreground">Default / product-level mapping</div>}
          </div>

          <div className="rounded-md border border-border p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hidden Printify production target</div>
            <div className="mt-2 font-medium">{preview.printify.title}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{preview.printify.productId}</div>
            <div className="mt-2">Available variants: <strong>{preview.printify.availableVariantCount}</strong></div>
            {preview.printify.variant ? (
              <div className="mt-2 rounded-md bg-secondary/40 p-2">
                <div><strong>{preview.printify.variant.title}</strong></div>
                <div className="text-xs text-muted-foreground">Variant ID {preview.printify.variant.id} · Cost {money(preview.printify.variant.sourceCost)} · Provider retail {money(preview.printify.variant.sourcePrice)}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-border p-3 text-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>{preview.readyToMap ? "Mapping validated" : "Mapping incomplete"}</strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  {preview.existingMapping
                    ? `Existing hidden mapping found; last status ${preview.existingMapping.fulfilment_status}/${preview.existingMapping.sync_status}.`
                    : "No existing hidden mapping was found for this Cossa product/variant."}
                </p>
              </div>
              <span className="rounded-full border border-border px-2 py-1 text-xs">{preview.readyToMap ? "Ready" : "Not ready"}</span>
            </div>
          </div>
        </div>
      ) : selectedProduct ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Selected: {selectedProduct.name}. Enter the matching Printify production product ID, then preview before any mapping write is attempted.
        </p>
      ) : null}
    </section>
  );
}
