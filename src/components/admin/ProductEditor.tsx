import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { LoadingBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatZar } from "@/lib/format";
import { uploadProductMedia } from "@/lib/media";
import { parsePastedProduct } from "@/lib/printify-paste";
import {
  addProductMedia,
  addProductPrice,
  createProduct,
  createVariant,
  deactivateVariant,
  fetchAdminProduct,
  isProductCodeTaken,
  isSlugTaken,
  isVariantSkuTaken,
  listAllCollections,
  listBrands,
  listCommerceCategories,
  listProductMedia,
  listProductPrices,
  listVariants,
  removeProductMedia,
  removeProductPrice,
  setPublicationState,
  updateProduct,
  upsertPodDetails,
  type PodProvider,
  type ProductDraftInput,
} from "@/services/catalogue.admin";
import type { PublicationState } from "@/types/catalog";

const POD_PROVIDERS: PodProvider[] = ["printify", "gelato", "printful", "other"];
const SOURCING_MODELS = [
  "print_on_demand",
  "own_stock",
  "local_supplier",
  "local_dropshipping",
  "international_dropshipping",
  "affiliate",
  "digital",
  "service",
];

const EMPTY: ProductDraftInput = {
  name: "",
  sku: "",
  slug: "",
  short_description: "",
  full_description: "",
  category_id: null,
  brand_id: null,
  collection_id: null,
  item_type: "",
  sourcing_model: "print_on_demand",
  product_type: "physical",
  visibility: "public",
  is_featured: false,
  requires_shipping: true,
  requires_quote: false,
  is_customisable: false,
  sourcing_enabled: false,
  campaign_name: null,
  design_name: null,
  slogan: null,
  product_story: null,
  audience: null,
  tags: [],
  features: [],
  care_instructions: null,
  warranty: null,
  return_policy: null,
  seo_title: null,
  seo_description: null,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ProductEditor({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const access = useCatalogueAccess();
  const [form, setForm] = useState<ProductDraftInput>(EMPTY);
  const [state, setState] = useState<PublicationState>("draft");
  const [saving, setSaving] = useState(false);

  const existing = useQuery({
    queryKey: ["admin", "product", productId],
    enabled: Boolean(productId),
    queryFn: () => fetchAdminProduct(productId as string),
  });
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: listCommerceCategories });
  const brands = useQuery({ queryKey: ["admin", "brands"], queryFn: listBrands });
  const collections = useQuery({ queryKey: ["admin", "collections"], queryFn: listAllCollections });

  useEffect(() => {
    const row = existing.data as Record<string, unknown> | null | undefined;
    if (!row) return;
    setForm({
      ...EMPTY,
      ...(Object.fromEntries(
        Object.keys(EMPTY).map((key) => [key, (row as Record<string, unknown>)[key] ?? EMPTY[key as keyof ProductDraftInput]]),
      ) as unknown as ProductDraftInput),
    });
    setState((row.publication_state as PublicationState) ?? "draft");
  }, [existing.data]);

  const set = <K extends keyof ProductDraftInput>(key: K, value: ProductDraftInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function validate(): Promise<string | null> {
    if (!form.name.trim()) return "A product name is required.";
    if (!form.sku.trim()) return "A product code is required.";
    if (!form.slug.trim()) return "A slug is required.";
    if (!form.item_type.trim()) return "An item type is required.";
    if (!form.short_description.trim()) return "A short description is required.";
    if (await isProductCodeTaken(form.sku.trim(), productId)) return "That product code is already used.";
    if (await isSlugTaken(form.slug.trim(), productId)) return "That slug is already used.";
    return null;
  }

  async function save() {
    setSaving(true);
    try {
      const problem = await validate();
      if (problem) {
        toast.error(problem);
        return;
      }
      const payload = { ...form, sku: form.sku.trim(), slug: form.slug.trim() };
      if (productId) {
        await updateProduct(productId, payload);
        toast.success("Draft saved");
        queryClient.invalidateQueries({ queryKey: ["admin"] });
      } else {
        const id = await createProduct(payload);
        toast.success("Draft created");
        queryClient.invalidateQueries({ queryKey: ["admin"] });
        navigate({ to: "/admin/catalogue/$id", params: { id } });
      }
    } catch {
      toast.error("The product could not be saved with your current permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function transition(next: PublicationState) {
    if (!productId) return;
    try {
      await setPublicationState(productId, next);
      setState(next);
      toast.success(`Product ${next.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error("Could not change the status", {
        description: /required|administrator/i.test(message)
          ? message
          : "Check the publication requirements and your permissions.",
      });
    }
  }

  if (productId && existing.isPending) return <LoadingBlock label="Loading product…" />;

  return (
    <div className="space-y-6">
      <PasteHelper
        onApply={(details) => {
          setForm((prev) => ({
            ...prev,
            name: details.title ?? prev.name,
            full_description: details.description ?? prev.full_description,
            features: details.features?.length ? details.features : prev.features,
            care_instructions: details.care_instructions ?? prev.care_instructions,
          }));
          toast.success("Suggested fields applied. Review before saving.");
        }}
      />

      <Section title="1 · Core information">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Product name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Product code" hint="For example CAF-CASE-0001. Must be unique.">
            <Input value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Slug" hint="Used in the public URL /products/…">
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            />
          </Field>
          <Field label="Item type" hint="tee, hoodie, mug, phone case, tote, notebook…">
            <Input value={form.item_type} onChange={(e) => set("item_type", e.target.value)} />
          </Field>
          <Field label="Collection">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={form.collection_id ?? ""}
              onChange={(e) => set("collection_id", e.target.value || null)}
            >
              <option value="">None</option>
              {(collections.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value || null)}
            >
              <option value="">None</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={form.brand_id ?? ""}
              onChange={(e) => set("brand_id", e.target.value || null)}
            >
              <option value="">None</option>
              {(brands.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Primary fulfilment model">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={form.sourcing_model}
              onChange={(e) => set("sourcing_model", e.target.value)}
            >
              {SOURCING_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Short description">
          <Textarea rows={2} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
        </Field>
        <Field label="Full description">
          <Textarea rows={5} value={form.full_description} onChange={(e) => set("full_description", e.target.value)} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Featured" value={form.is_featured} onChange={(v) => set("is_featured", v)} />
          <Toggle label="Requires shipping" value={form.requires_shipping} onChange={(v) => set("requires_shipping", v)} />
          <Toggle label="Requires quote" value={form.requires_quote} onChange={(v) => set("requires_quote", v)} />
          <Toggle label="Customisable" value={form.is_customisable} onChange={(v) => set("is_customisable", v)} />
          <Toggle label="Sourcing enabled" value={form.sourcing_enabled} onChange={(v) => set("sourcing_enabled", v)} />
        </div>
      </Section>

      <Section title="3 · Collections and merchandising">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label="Featured on storefront"
            value={form.is_featured}
            onChange={(v) => set("is_featured", v)}
          />
          <Toggle
            label="Trending now"
            value={form.tags.includes("trending")}
            onChange={(v) =>
              set(
                "tags",
                v
                  ? Array.from(new Set([...form.tags, "trending"]))
                  : form.tags.filter((t) => t !== "trending"),
              )
            }
          />
          <Toggle
            label="Business buying deal"
            value={form.tags.includes("business-deal")}
            onChange={(v) =>
              set(
                "tags",
                v
                  ? Array.from(new Set([...form.tags, "business-deal"]))
                  : form.tags.filter((t) => t !== "business-deal"),
              )
            }
          />
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          “New arrival” is derived automatically from the real publication date (
          {30}-day window) and cannot be set manually. Trending is a deliberate staff selection —
          never an invented popularity claim.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Campaign name">
            <Input value={form.campaign_name ?? ""} onChange={(e) => set("campaign_name", e.target.value || null)} />
          </Field>
          <Field label="Design name">
            <Input value={form.design_name ?? ""} onChange={(e) => set("design_name", e.target.value || null)} />
          </Field>
          <Field label="Slogan">
            <Input value={form.slogan ?? ""} onChange={(e) => set("slogan", e.target.value || null)} />
          </Field>
          <Field label="Audience">
            <Input value={form.audience ?? ""} onChange={(e) => set("audience", e.target.value || null)} />
          </Field>
          <Field label="Tags" hint="Comma separated">
            <Input
              value={form.tags.join(", ")}
              onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            />
          </Field>
          <Field label="Features" hint="Comma separated">
            <Input
              value={form.features.join(", ")}
              onChange={(e) => set("features", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            />
          </Field>
          <Field label="SEO title">
            <Input value={form.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value || null)} />
          </Field>
          <Field label="SEO description">
            <Input value={form.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value || null)} />
          </Field>
        </div>
        <Field label="Product story">
          <Textarea rows={3} value={form.product_story ?? ""} onChange={(e) => set("product_story", e.target.value || null)} />
        </Field>
        <Field label="Care instructions">
          <Textarea rows={2} value={form.care_instructions ?? ""} onChange={(e) => set("care_instructions", e.target.value || null)} />
        </Field>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : productId ? "Save draft" : "Create draft"}
        </Button>
        {productId ? (
          <Button variant="outline" onClick={() => navigate({ to: "/admin/catalogue" })}>
            Back to catalogue
          </Button>
        ) : null}
      </div>

      {productId ? (
        <>
          <PodSection productId={productId} />
          <MediaSection productId={productId} productName={form.name} itemType={form.item_type} />
          <VariantSection productId={productId} isAdmin={access.isAdmin} />
          <PricingSection productId={productId} />
          <Section title="7 · Publication">
            <p className="text-sm text-muted-foreground">
              Current status: <strong className="capitalize">{state.replace(/_/g, " ")}</strong>
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Name, code, slug, item type and short description are required.</li>
              <li>At least one public image is required.</li>
              <li>At least one active variant is required when the product has variants.</li>
              <li>A public price is required unless the product is quote-only.</li>
              <li>Only an administrator may approve, publish, unpublish or archive.</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => transition("pending_review")}>
                Submit for review
              </Button>
              <Button variant="outline" disabled={!access.isAdmin} onClick={() => transition("approved")}>
                Approve
              </Button>
              <Button disabled={!access.isAdmin} onClick={() => transition("published")}>
                Publish
              </Button>
              <Button variant="outline" disabled={!access.isAdmin} onClick={() => transition("unpublished")}>
                Unpublish
              </Button>
              <Button variant="ghost" disabled={!access.isAdmin} onClick={() => transition("archived")}>
                Archive
              </Button>
            </div>
          </Section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Save the draft to add print-on-demand details, images, variants and pricing.
        </p>
      )}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

/* ---------------- paste helper ---------------- */

function PasteHelper({ onApply }: { onApply: (details: ReturnType<typeof parsePastedProduct>) => void }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const parsed = useMemo(() => parsePastedProduct(raw), [raw]);
  const hasSuggestions = Object.keys(parsed).length > 0;

  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">Paste product details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. Paste labelled text copied from Printify (Title:, Description:, Features:, Care
            instructions:, Variants:, Production cost:, Retail price:, Provider SKU:). Nothing is saved
            or published until you review and confirm.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Open"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Title: ..." />
          {hasSuggestions ? (
            <div className="rounded-md border border-border p-3 text-xs">
              <p className="mb-2 font-semibold uppercase tracking-wide">Review suggestions</p>
              <pre className="whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(parsed, null, 2)}
              </pre>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  onApply(parsed);
                  setOpen(false);
                }}
              >
                Apply to form
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No labelled fields detected yet. Nothing will be filled in automatically.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

/* ---------------- POD ---------------- */

function PodSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: ["admin", "pod", productId],
    queryFn: () => fetchAdminProduct(productId),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = ((existing.data as any)?.product_pod_details?.[0] ?? {}) as Record<string, unknown>;
  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => setForm(current), [existing.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = (key: string) => (form[key] as string) ?? "";
  const set = (key: string, v: unknown) => setForm((prev) => ({ ...prev, [key]: v }));

  const save = useMutation({
    mutationFn: () =>
      upsertPodDetails(productId, {
        provider: (value("provider") || "printify") as PodProvider,
        external_product_id: value("external_product_id") || null,
        external_blueprint_id: value("external_blueprint_id") || null,
        external_print_provider_id: value("external_print_provider_id") || null,
        provider_product_url: value("provider_product_url") || null,
        provider_dashboard_url: value("provider_dashboard_url") || null,
        production_region: value("production_region") || null,
        production_time_estimate: value("production_time_estimate") || null,
        shipping_estimate: value("shipping_estimate") || null,
        fulfilment_notes: value("fulfilment_notes") || null,
        manual_fulfilment_required: form.manual_fulfilment_required !== false,
        api_integration_status: value("api_integration_status") || "manual",
        last_reviewed_at: value("last_reviewed_at") || null,
      }),
    onSuccess: () => {
      toast.success("Print-on-demand details saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "pod", productId] });
    },
    onError: () => toast.error("Those details could not be saved."),
  });

  const invalidUrl = ["provider_product_url", "provider_dashboard_url"].some(
    (key) => value(key) && !/^https?:\/\//i.test(value(key)),
  );

  return (
    <Section title="2 · Print-on-demand details (internal only)">
      <p className="inline-flex rounded-full border border-warning/50 px-2 py-0.5 text-[11px] text-warning">
        Manual POD fulfilment
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Provider">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={value("provider") || "printify"}
            onChange={(e) => set("provider", e.target.value)}
          >
            {POD_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        {[
          ["external_product_id", "External product ID"],
          ["external_blueprint_id", "External blueprint ID"],
          ["external_print_provider_id", "External print provider ID"],
          ["provider_product_url", "Provider product URL"],
          ["provider_dashboard_url", "Provider dashboard URL"],
          ["production_region", "Production country or region"],
          ["production_time_estimate", "Production time estimate"],
          ["shipping_estimate", "Shipping estimate"],
          ["api_integration_status", "API integration status"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={value(key)} onChange={(e) => set(key, e.target.value)} />
          </Field>
        ))}
      </div>
      <Field label="Fulfilment notes">
        <Textarea rows={3} value={value("fulfilment_notes")} onChange={(e) => set("fulfilment_notes", e.target.value)} />
      </Field>
      <Toggle
        label="Manual fulfilment required"
        value={form.manual_fulfilment_required !== false}
        onChange={(v) => set("manual_fulfilment_required", v)}
      />
      {invalidUrl ? <p className="text-xs text-destructive">Provider URLs must start with http:// or https://</p> : null}
      <Button size="sm" disabled={invalidUrl || save.isPending} onClick={() => save.mutate()}>
        Save print-on-demand details
      </Button>
    </Section>
  );
}

/* ---------------- media ---------------- */

function MediaSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const media = useQuery({ queryKey: ["admin", "media", productId], queryFn: () => listProductMedia(productId) });
  const [alt, setAlt] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "media", productId] });
  const rows = media.data ?? [];

  async function addExternal() {
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Enter a valid image URL starting with http:// or https://");
      return;
    }
    setBusy(true);
    try {
      await addProductMedia({
        product_id: productId,
        url,
        alt_text: alt || null,
        display_order: rows.length,
        is_primary: rows.length === 0,
        is_public: true,
      });
      setUrl("");
      setAlt("");
      refresh();
    } catch {
      toast.error("That image could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      const path = await uploadProductMedia(file, productId);
      await addProductMedia({
        product_id: productId,
        url: path,
        alt_text: alt || null,
        display_order: rows.length,
        is_primary: rows.length === 0,
        is_public: true,
      });
      setAlt("");
      refresh();
      toast.success("Image uploaded");
    } catch {
      toast.error("That image could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="4 · Media">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Alt text (applied to the next image added)">
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
        </Field>
        <Field label="Upload image file">
          <Input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </Field>
        <Field label="Or add a provider mockup URL">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <div className="flex items-end">
          <Button size="sm" disabled={busy} onClick={addExternal}>
            Add image URL
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet. At least one public image is required to publish.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
              <span className="truncate">
                {m.is_primary ? "★ " : ""}
                {m.url}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {m.is_public ? "public" : "private"}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await removeProductMedia(m.id);
                    refresh();
                  }}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ---------------- variants ---------------- */

const EMPTY_VARIANT = {
  name: "",
  variant_sku: "",
  colour: "",
  size: "",
  finish: "",
  phone_model: "",
  material: "",
  retail_price: "",
  compare_at_price: "",
  shipping_estimate: "",
  provider_sku: "",
  external_variant_id: "",
  production_cost: "",
  provider_currency: "USD",
};

function VariantSection({ productId, isAdmin }: { productId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const variants = useQuery({ queryKey: ["admin", "variants", productId], queryFn: () => listVariants(productId) });
  const [draft, setDraft] = useState({ ...EMPTY_VARIANT });
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof EMPTY_VARIANT, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function add() {
    const price = draft.retail_price ? Number(draft.retail_price) : null;
    const cost = draft.production_cost ? Number(draft.production_cost) : null;
    if (!draft.name.trim() || !draft.variant_sku.trim()) {
      toast.error("A variant name and SKU are required.");
      return;
    }
    if ((price !== null && price < 0) || (cost !== null && cost < 0)) {
      toast.error("Prices and costs cannot be negative.");
      return;
    }
    if (await isVariantSkuTaken(draft.variant_sku.trim())) {
      toast.error("That variant SKU is already used.");
      return;
    }
    setBusy(true);
    try {
      await createVariant(
        productId,
        {
          name: draft.name.trim(),
          variant_sku: draft.variant_sku.trim().toUpperCase(),
          colour: draft.colour || null,
          size: draft.size || null,
          finish: draft.finish || null,
          phone_model: draft.phone_model || null,
          material: draft.material || null,
          retail_price: price,
          compare_at_price: draft.compare_at_price ? Number(draft.compare_at_price) : null,
          shipping_estimate: draft.shipping_estimate || null,
          currency: "ZAR",
          is_active: true,
        },
        {
          provider: "printify",
          external_variant_id: draft.external_variant_id || null,
          provider_sku: draft.provider_sku || null,
          production_cost: cost,
          provider_currency: draft.provider_currency || "USD",
          manual_order_instructions: null,
          last_verified_at: new Date().toISOString(),
        },
      );
      setDraft({ ...EMPTY_VARIANT });
      queryClient.invalidateQueries({ queryKey: ["admin", "variants", productId] });
      toast.success("Variant added");
    } catch {
      toast.error("That variant could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="5 · Variants">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["name", "Variant name"],
            ["variant_sku", "Variant SKU"],
            ["colour", "Colour"],
            ["size", "Size"],
            ["finish", "Surface / finish"],
            ["phone_model", "Phone model"],
            ["material", "Material"],
            ["retail_price", "Retail price (ZAR)"],
            ["compare_at_price", "Compare-at price (ZAR)"],
            ["shipping_estimate", "Shipping estimate"],
            ["provider_sku", "Provider SKU (private)"],
            ["external_variant_id", "Provider variant ID (private)"],
            ["production_cost", "Production cost (private)"],
            ["provider_currency", "Provider currency"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={draft[key]} onChange={(e) => set(key, e.target.value)} />
          </Field>
        ))}
      </div>
      <Button size="sm" disabled={busy} onClick={add}>
        Add variant
      </Button>

      {(variants.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No variants captured yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {(variants.data ?? []).map((v) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const provider = (v as any).product_variant_provider_details?.[0];
            return (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <span>
                  <strong>{v.name}</strong>{" "}
                  <span className="font-mono text-xs text-muted-foreground">{v.variant_sku}</span>
                  {v.retail_price ? ` · ${formatZar(Number(v.retail_price))}` : ""}
                  {!v.is_active ? " · inactive" : ""}
                  {isAdmin && provider?.production_cost
                    ? ` · cost ${provider.provider_currency} ${provider.production_cost}`
                    : ""}
                </span>
                {v.is_active ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await deactivateVariant(v.id);
                      queryClient.invalidateQueries({ queryKey: ["admin", "variants", productId] });
                    }}
                  >
                    Deactivate
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ---------------- pricing ---------------- */

function PricingSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const prices = useQuery({ queryKey: ["admin", "prices", productId], queryFn: () => listProductPrices(productId) });
  const [type, setType] = useState<"retail" | "promotional" | "business">("retail");
  const [amount, setAmount] = useState("");
  const [minimum, setMinimum] = useState("1");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");

  async function add() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid, non-negative amount.");
      return;
    }
    try {
      await addProductPrice({
        product_id: productId,
        price_type: type,
        amount: value,
        currency: "ZAR",
        minimum_quantity: Math.max(1, Number(minimum) || 1),
        starts_at: from ? new Date(from).toISOString() : null,
        ends_at: until ? new Date(until).toISOString() : null,
        vat_inclusive: true,
      });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["admin", "prices", productId] });
      toast.success("Price added");
    } catch {
      toast.error("That price could not be saved.");
    }
  }

  return (
    <Section title="6 · Pricing (ZAR)">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Price type">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as never)}
          >
            <option value="retail">Retail</option>
            <option value="promotional">Promotional</option>
            <option value="business">Business</option>
          </select>
        </Field>
        <Field label="Amount (ZAR, incl. VAT)">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Minimum quantity">
          <Input value={minimum} onChange={(e) => setMinimum(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Valid from">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Valid until">
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      </div>
      <Button size="sm" onClick={add}>
        Add price
      </Button>

      {(prices.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No prices captured. Quote-only products may publish without a price.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {(prices.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
              <span className="capitalize">
                {p.price_type} · {formatZar(Number(p.amount))} · min {p.minimum_quantity}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await removeProductPrice(p.id);
                  queryClient.invalidateQueries({ queryKey: ["admin", "prices", productId] });
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
