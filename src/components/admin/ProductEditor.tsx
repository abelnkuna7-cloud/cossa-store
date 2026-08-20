import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const db = supabase as any;

type ProductType = "physical" | "digital" | "service" | "bundle" | "affiliate";
type FulfilmentModel =
  | "cossa_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital"
  | "service";

type ProductStatus = "draft" | "active" | "archived";

interface StoreProductForm {
  name: string;
  slug: string;
  sku: string;
  product_type: ProductType;
  fulfilment_model: FulfilmentModel;
  status: ProductStatus;
  short_description: string;
  description: string;
  category: string;
  brand: string;
  supplier_name: string;
  supplier_product_ref: string;
  supplier_url: string;
  affiliate_url: string;
  cost_price: string;
  price: string;
  compare_at_price: string;
  track_inventory: boolean;
  stock_quantity: string;
  unlimited_stock: boolean;
  featured: boolean;
  image_urls: string;
  seo_title: string;
  seo_description: string;
  digital_file_path: string;
  digital_file_name: string;
  digital_download_limit: string;
  digital_access_days: string;
}

const EMPTY: StoreProductForm = {
  name: "",
  slug: "",
  sku: "",
  product_type: "physical",
  fulfilment_model: "cossa_stock",
  status: "draft",
  short_description: "",
  description: "",
  category: "",
  brand: "",
  supplier_name: "",
  supplier_product_ref: "",
  supplier_url: "",
  affiliate_url: "",
  cost_price: "0",
  price: "",
  compare_at_price: "",
  track_inventory: false,
  stock_quantity: "0",
  unlimited_stock: false,
  featured: false,
  image_urls: "",
  seo_title: "",
  seo_description: "",
  digital_file_path: "",
  digital_file_name: "",
  digital_download_limit: "",
  digital_access_days: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function nullable(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProductEditor({ productId }: { productId?: string; mode?: "create" | "edit" }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<StoreProductForm>(EMPTY);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const isDigital = form.product_type === "digital" || form.fulfilment_model === "digital";
  const isAffiliate = form.product_type === "affiliate" || form.fulfilment_model === "affiliate";

  useEffect(() => {
    if (!productId) return;

    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await db
        .from("store_products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        toast.error("This product could not be loaded.");
        setLoading(false);
        return;
      }

      setForm({
        name: data.name ?? "",
        slug: data.slug ?? "",
        sku: data.sku ?? "",
        product_type: (data.product_type ?? "physical") as ProductType,
        fulfilment_model: (data.fulfilment_model ?? "cossa_stock") as FulfilmentModel,
        status: (data.status ?? "draft") as ProductStatus,
        short_description: data.short_description ?? "",
        description: data.description ?? "",
        category: data.category ?? "",
        brand: data.brand ?? "",
        supplier_name: data.supplier_name ?? "",
        supplier_product_ref: data.supplier_product_ref ?? "",
        supplier_url: data.supplier_url ?? "",
        affiliate_url: data.affiliate_url ?? "",
        cost_price: String(data.cost_price ?? 0),
        price: String(data.price ?? ""),
        compare_at_price: data.compare_at_price == null ? "" : String(data.compare_at_price),
        track_inventory: Boolean(data.track_inventory),
        stock_quantity: String(data.stock_quantity ?? 0),
        unlimited_stock: Boolean(data.unlimited_stock),
        featured: Boolean(data.featured),
        image_urls: Array.isArray(data.image_urls) ? data.image_urls.join("\n") : "",
        seo_title: data.seo_title ?? "",
        seo_description: data.seo_description ?? "",
        digital_file_path: data.digital_file_path ?? "",
        digital_file_name: data.digital_file_name ?? "",
        digital_download_limit: data.digital_download_limit == null ? "" : String(data.digital_download_limit),
        digital_access_days: data.digital_access_days == null ? "" : String(data.digital_access_days),
      });
      setSlugEdited(true);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  const imageUrls = useMemo(
    () =>
      form.image_urls
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean),
    [form.image_urls],
  );

  const set = <K extends keyof StoreProductForm>(key: K, value: StoreProductForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (publish = false) => {
    const name = form.name.trim();
    const slug = form.slug.trim();
    const price = Number(form.price);

    if (!name) {
      toast.error("Product name is required.");
      return;
    }
    if (!slug) {
      toast.error("Product URL slug is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid selling price.");
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Please sign in again before saving.");

      const payload = {
        organisation_id: ORGANISATION_ID,
        name,
        slug,
        sku: nullable(form.sku),
        product_type: form.product_type,
        fulfilment_model: form.fulfilment_model,
        status: publish ? "active" : form.status,
        short_description: nullable(form.short_description),
        description: nullable(form.description),
        category: nullable(form.category),
        brand: nullable(form.brand),
        supplier_name: nullable(form.supplier_name),
        supplier_product_ref: nullable(form.supplier_product_ref),
        supplier_url: nullable(form.supplier_url),
        affiliate_url: nullable(form.affiliate_url),
        currency: "ZAR",
        cost_price: numberOrNull(form.cost_price) ?? 0,
        price,
        compare_at_price: numberOrNull(form.compare_at_price),
        track_inventory: form.track_inventory,
        stock_quantity: Math.max(0, Math.floor(numberOrNull(form.stock_quantity) ?? 0)),
        unlimited_stock: form.unlimited_stock,
        featured: form.featured,
        image_urls: imageUrls,
        seo_title: nullable(form.seo_title),
        seo_description: nullable(form.seo_description),
        digital_file_path: isDigital ? nullable(form.digital_file_path) : null,
        digital_file_name: isDigital ? nullable(form.digital_file_name) : null,
        digital_download_limit: isDigital ? numberOrNull(form.digital_download_limit) : null,
        digital_access_days: isDigital ? numberOrNull(form.digital_access_days) : null,
        updated_by: authData.user.id,
        updated_at: new Date().toISOString(),
      };

      if (productId) {
        const { error } = await db.from("store_products").update(payload).eq("id", productId);
        if (error) throw error;
        toast.success(publish ? "Product published." : "Product saved.");
      } else {
        const { data, error } = await db
          .from("store_products")
          .insert({ ...payload, created_by: authData.user.id })
          .select("id")
          .single();
        if (error) throw error;
        toast.success(publish ? "Product created and published." : "Product saved as draft.");
        await navigate({ to: "/admin/catalogue/$id", params: { id: data.id } });
      }
    } catch (error: any) {
      const message = error?.message ?? "The product could not be saved.";
      toast.error(message.includes("duplicate") ? "SKU or product URL is already in use." : message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading product…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">1. Product basics</h2>
        <p className="mt-1 text-sm text-muted-foreground">Start with the information customers need to identify the product.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Product name" required>
            <Input
              value={form.name}
              onChange={(event) => {
                const value = event.target.value;
                set("name", value);
                if (!slugEdited) set("slug", slugify(value));
              }}
              placeholder="e.g. Cossa Business Starter Pack"
            />
          </Field>
          <Field label="SKU / product code">
            <Input value={form.sku} onChange={(event) => set("sku", event.target.value.toUpperCase())} placeholder="COS-DIG-001" />
          </Field>
          <Field label="Product URL slug" required>
            <Input
              value={form.slug}
              onChange={(event) => {
                setSlugEdited(true);
                set("slug", slugify(event.target.value));
              }}
              placeholder="cossa-business-starter-pack"
            />
          </Field>
          <Field label="Product type">
            <Select value={form.product_type} onChange={(value) => set("product_type", value as ProductType)}>
              <option value="physical">Physical product</option>
              <option value="digital">Digital product</option>
              <option value="service">Service-supported product</option>
              <option value="bundle">Bundle / project kit</option>
              <option value="affiliate">Affiliate offer</option>
            </Select>
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={(event) => set("category", event.target.value)} placeholder="Digital Products" />
          </Field>
          <Field label="Brand">
            <Input value={form.brand} onChange={(event) => set("brand", event.target.value)} placeholder="Cossa Store" />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">2. Description</h2>
        <div className="mt-5 grid gap-4">
          <Field label="Short description">
            <Textarea value={form.short_description} onChange={(event) => set("short_description", event.target.value)} placeholder="Short storefront summary" />
          </Field>
          <Field label="Full description">
            <Textarea className="min-h-40" value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Explain what the customer receives, key benefits and important details." />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">3. Pricing & fulfilment</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Selling price (R)" required>
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={(event) => set("price", event.target.value)} placeholder="99.00" />
          </Field>
          <Field label="Cost price (R)">
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={form.cost_price} onChange={(event) => set("cost_price", event.target.value)} />
          </Field>
          <Field label="Compare-at price (R)">
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={form.compare_at_price} onChange={(event) => set("compare_at_price", event.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Fulfilment model">
            <Select value={form.fulfilment_model} onChange={(value) => set("fulfilment_model", value as FulfilmentModel)}>
              <option value="cossa_stock">Cossa stock</option>
              <option value="local_supplier">Local supplier</option>
              <option value="local_dropshipping">Local dropshipping</option>
              <option value="international_dropshipping">International dropshipping</option>
              <option value="print_on_demand">Print on demand</option>
              <option value="affiliate">Affiliate / partner</option>
              <option value="digital">Digital delivery</option>
              <option value="service">Service</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(value) => set("status", value as ProductStatus)}>
              <option value="draft">Draft</option>
              <option value="active">Active / live</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Toggle label="Featured product" checked={form.featured} onChange={(checked) => set("featured", checked)} />
          <Toggle label="Track inventory" checked={form.track_inventory} onChange={(checked) => set("track_inventory", checked)} />
          <Toggle label="Unlimited stock" checked={form.unlimited_stock} onChange={(checked) => set("unlimited_stock", checked)} />
        </div>

        {form.track_inventory && !form.unlimited_stock ? (
          <div className="mt-4 max-w-xs">
            <Field label="Stock quantity">
              <Input type="number" min="0" inputMode="numeric" value={form.stock_quantity} onChange={(event) => set("stock_quantity", event.target.value)} />
            </Field>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">4. Supplier / partner details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Supplier name">
            <Input value={form.supplier_name} onChange={(event) => set("supplier_name", event.target.value)} placeholder="Supplier or fulfilment partner" />
          </Field>
          <Field label="Supplier product reference">
            <Input value={form.supplier_product_ref} onChange={(event) => set("supplier_product_ref", event.target.value)} placeholder="Supplier SKU / ID" />
          </Field>
          <Field label="Supplier URL">
            <Input type="url" value={form.supplier_url} onChange={(event) => set("supplier_url", event.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Affiliate URL">
            <Input type="url" value={form.affiliate_url} onChange={(event) => set("affiliate_url", event.target.value)} placeholder={isAffiliate ? "Required for affiliate offers" : "Optional"} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">5. Product images</h2>
        <p className="mt-1 text-sm text-muted-foreground">For now, paste one hosted image URL per line. Direct mobile image upload can be added next without changing the catalogue database.</p>
        <div className="mt-5">
          <Field label="Image URLs">
            <Textarea className="min-h-28" value={form.image_urls} onChange={(event) => set("image_urls", event.target.value)} placeholder="https://example.com/product-image.jpg" />
          </Field>
        </div>
      </section>

      {isDigital ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold">6. Digital delivery</h2>
          <p className="mt-1 text-sm text-muted-foreground">These fields connect the product to its private downloadable file after the file is uploaded to storage.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Private file path">
              <Input value={form.digital_file_path} onChange={(event) => set("digital_file_path", event.target.value)} placeholder="digital-products/cos-dig-001.zip" />
            </Field>
            <Field label="Download file name">
              <Input value={form.digital_file_name} onChange={(event) => set("digital_file_name", event.target.value)} placeholder="Cossa-Business-Starter-Pack.zip" />
            </Field>
            <Field label="Download limit">
              <Input type="number" min="1" inputMode="numeric" value={form.digital_download_limit} onChange={(event) => set("digital_download_limit", event.target.value)} placeholder="5" />
            </Field>
            <Field label="Access days">
              <Input type="number" min="1" inputMode="numeric" value={form.digital_access_days} onChange={(event) => set("digital_access_days", event.target.value)} placeholder="30" />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">{isDigital ? "7" : "6"}. Search visibility</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="SEO title">
            <Input value={form.seo_title} onChange={(event) => set("seo_title", event.target.value)} />
          </Field>
          <Field label="SEO description">
            <Textarea value={form.seo_description} onChange={(event) => set("seo_description", event.target.value)} />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Button disabled={saving} onClick={() => void save(false)}>
          {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save product
        </Button>
        <Button variant="outline" disabled={saving} onClick={() => void save(true)}>
          Save & publish
        </Button>
        <Button variant="ghost" disabled={saving} onClick={() => navigate({ to: "/admin/catalogue" })}>
          Back to catalogue
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={value} onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
