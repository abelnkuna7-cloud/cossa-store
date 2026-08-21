import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Download,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  Package,
  Save,
  Shirt,
  Store,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";

const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const IMAGE_BUCKET = "store-product-images";
const DIGITAL_BUCKET = "store-digital-products";
const db = supabase as any;

type ProductType = "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
type FulfilmentModel =
  | "cossa_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital";
type ProductStatus = "draft" | "active" | "archived";
type ProductMode =
  | "physical"
  | "supplier"
  | "dropshipping"
  | "pod"
  | "affiliate"
  | "digital";

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
  track_inventory: true,
  stock_quantity: "0",
  unlimited_stock: false,
  featured: false,
  image_urls: "",
  seo_title: "",
  seo_description: "",
  digital_file_path: "",
  digital_file_name: "",
  digital_download_limit: "5",
  digital_access_days: "30",
};

const MODE_OPTIONS: Array<{
  value: ProductMode;
  label: string;
  description: string;
  icon: typeof Package;
}> = [
  { value: "physical", label: "Physical product", description: "Stock Cossa owns and ships directly.", icon: Package },
  { value: "supplier", label: "Supplier product", description: "A real item supplied by a local partner.", icon: Store },
  { value: "dropshipping", label: "Dropshipping", description: "Supplier fulfils the order for Cossa Store.", icon: Truck },
  { value: "pod", label: "Print on demand", description: "Made after purchase by Printify, Printful or another POD provider.", icon: Shirt },
  { value: "affiliate", label: "Affiliate product", description: "Customer buys on the partner website through your tracked link.", icon: ExternalLink },
  { value: "digital", label: "Digital product", description: "Downloads, templates, guides, files and digital tools.", icon: Download },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['â€™]/g, "")
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

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

function modeFromProduct(type: ProductType, fulfilment: FulfilmentModel): ProductMode {
  if (type === "digital" || fulfilment === "digital") return "digital";
  if (type === "affiliate" || fulfilment === "affiliate") return "affiliate";
  if (fulfilment === "print_on_demand") return "pod";
  if (fulfilment === "local_dropshipping" || fulfilment === "international_dropshipping") return "dropshipping";
  if (fulfilment === "local_supplier") return "supplier";
  return "physical";
}

/**
 * Storefront filters use department slugs, while staff should see familiar
 * department names. Resolve either form to the single stored slug so a
 * product always appears under the department selected in the Store.
 */
function canonicalCategory(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return "";

  const normalized = clean.toLocaleLowerCase();
  return (
    CATEGORIES.find(
      (category) =>
        category.slug === normalized ||
        category.name.toLocaleLowerCase() === normalized,
    )?.slug ?? clean
  );
}

export function ProductEditor({ productId }: { productId?: string; mode?: "create" | "edit" }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<StoreProductForm>(EMPTY);
  const [productMode, setProductMode] = useState<ProductMode>("physical");
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const isDigital = productMode === "digital";
  const isAffiliate = productMode === "affiliate";
  const isPod = productMode === "pod";
  const isSupplier = productMode === "supplier" || productMode === "dropshipping" || isPod;
  const usesPartner = isSupplier || isAffiliate;
  const isPhysicalStock = productMode === "physical";
  const needsInventory = isPhysicalStock;

  useEffect(() => {
    if (!productId) return;

    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await db.from("store_products").select("*").eq("id", productId).maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error("This product could not be loaded.");
        setLoading(false);
        return;
      }

      const type = (data.product_type ?? "physical") as ProductType;
      const fulfilment = (data.fulfilment_model ?? "cossa_stock") as FulfilmentModel;
      setProductMode(modeFromProduct(type, fulfilment));
      setForm({
        name: data.name ?? "",
        slug: data.slug ?? "",
        sku: data.sku ?? "",
        product_type: type,
        fulfilment_model: fulfilment,
        status: (data.status ?? "draft") as ProductStatus,
        short_description: data.short_description ?? "",
        description: data.description ?? "",
        category: canonicalCategory(data.category),
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
        digital_download_limit: data.digital_download_limit == null ? "5" : String(data.digital_download_limit),
        digital_access_days: data.digital_access_days == null ? "30" : String(data.digital_access_days),
      });
      setSlugEdited(true);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  const imageUrls = useMemo(
    () => form.image_urls.split(/\n|,/).map((value) => value.trim()).filter(Boolean),
    [form.image_urls],
  );

  const publicationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!form.sku.trim() && !isAffiliate) issues.push("SKU");
    if (!form.category.trim()) issues.push("category");
    if (!form.description.trim()) issues.push("description");
    if (imageUrls.length === 0) issues.push("product image");
    if (!isAffiliate && Number(form.price) <= 0) issues.push("selling price");

    if (isDigital && !form.digital_file_path.trim()) issues.push("digital file");
    if (isAffiliate) {
      if (!form.supplier_name.trim()) issues.push("partner or merchant name");
      if (!/^https?:\/\//i.test(form.affiliate_url.trim())) issues.push("legitimate affiliate URL");
    }
    if (isPod) {
      if (!form.supplier_name.trim()) issues.push("POD provider");
      if (!form.supplier_product_ref.trim()) issues.push("provider product reference");
    }
    if (productMode === "dropshipping") {
      if (!form.supplier_name.trim()) issues.push("supplier");
      if (!form.supplier_product_ref.trim() && !form.supplier_url.trim()) issues.push("supplier reference or URL");
    }
    if (needsInventory && form.track_inventory && !form.unlimited_stock && Number(form.stock_quantity) <= 0) {
      issues.push("available stock quantity");
    }
    return issues;
  }, [form, imageUrls.length, isAffiliate, isDigital, isPod, needsInventory, productMode]);

  const set = <K extends keyof StoreProductForm>(key: K, value: StoreProductForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectMode = (next: ProductMode) => {
    setProductMode(next);
    setForm((current) => {
      const patch: Partial<StoreProductForm> = {};
      switch (next) {
        case "physical":
          Object.assign(patch, { product_type: "physical", fulfilment_model: "cossa_stock", track_inventory: true, unlimited_stock: false });
          break;
        case "supplier":
          Object.assign(patch, { product_type: "physical", fulfilment_model: "local_supplier", track_inventory: false, unlimited_stock: false });
          break;
        case "dropshipping":
          Object.assign(patch, { product_type: "dropshipping", fulfilment_model: "local_dropshipping", track_inventory: false, unlimited_stock: false });
          break;
        case "pod":
          Object.assign(patch, { product_type: "pod", fulfilment_model: "print_on_demand", track_inventory: false, unlimited_stock: true });
          break;
        case "affiliate":
          Object.assign(patch, { product_type: "affiliate", fulfilment_model: "affiliate", track_inventory: false, unlimited_stock: true, cost_price: "0" });
          break;
        case "digital":
          Object.assign(patch, {
            product_type: "digital",
            fulfilment_model: "digital",
            track_inventory: false,
            unlimited_stock: true,
            category: current.category || "digital-products",
            cost_price: current.cost_price || "0",
          });
          break;
      }
      return { ...current, ...patch };
    });
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingImages(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Please sign in again before uploading images.");

      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
        const folder = form.slug || slugify(form.name) || "new-product";
        const path = `${ORGANISATION_ID}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
        const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }

      setForm((current) => ({
        ...current,
        image_urls: [...current.image_urls.split(/\n|,/).map((v) => v.trim()).filter(Boolean), ...uploaded].join("\n"),
      }));
      toast.success(`${uploaded.length} product image${uploaded.length === 1 ? "" : "s"} uploaded.`);
    } catch (error: any) {
      toast.error(error?.message ?? "Product images could not be uploaded.");
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadDigitalFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Digital product files must be 100 MB or smaller for now.");
      return;
    }

    setUploadingDigital(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Please sign in again before uploading the digital product.");
      const folder = form.slug || slugify(form.name) || "new-digital-product";
      const path = `${ORGANISATION_ID}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from(DIGITAL_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      set("digital_file_path", path);
      set("digital_file_name", file.name);
      toast.success("Digital product file uploaded securely.");
    } catch (error: any) {
      toast.error(error?.message ?? "The digital product file could not be uploaded.");
    } finally {
      setUploadingDigital(false);
    }
  };

  const save = async (publish = false) => {
    const name = form.name.trim();
    const slug = form.slug.trim();
    const price = Number(form.price);

    if (!name) return void toast.error("Product name is required.");
    if (!slug) return void toast.error("Product URL slug is required.");
    if (!Number.isFinite(price) || price < 0) return void toast.error("Enter a valid selling price.");
    if (publish && publicationIssues.length > 0) {
      return void toast.error(`Complete before publishing: ${publicationIssues.join(", ")}.`);
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
        category: nullable(canonicalCategory(form.category)),
        brand: nullable(form.brand),
        supplier_name: usesPartner ? nullable(form.supplier_name) : null,
        supplier_product_ref: isSupplier ? nullable(form.supplier_product_ref) : null,
        supplier_url: isSupplier ? nullable(form.supplier_url) : null,
        affiliate_url: isAffiliate ? nullable(form.affiliate_url) : null,
        currency: "ZAR",
        cost_price: numberOrNull(form.cost_price) ?? 0,
        price,
        compare_at_price: numberOrNull(form.compare_at_price),
        track_inventory: needsInventory ? form.track_inventory : false,
        stock_quantity: needsInventory ? Math.max(0, Math.floor(numberOrNull(form.stock_quantity) ?? 0)) : 0,
        unlimited_stock: needsInventory ? form.unlimited_stock : true,
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
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading productâ€¦
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Start here</p>
        <h2 className="mt-1 text-xl font-semibold">What are you adding?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose one. Cossa Store will automatically configure the product type, fulfilment, stock rules and relevant fields.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = productMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => selectMode(option.value)}
                className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}
                aria-pressed={active}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">{option.label}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">1. Product basics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Product name" required>
            <Input
              value={form.name}
              onChange={(event) => {
                const value = event.target.value;
                set("name", value);
                if (!slugEdited) set("slug", slugify(value));
              }}
              placeholder={isDigital ? "e.g. Small Business Quotation & Invoice Toolkit" : "e.g. 18V Cordless Drill"}
            />
          </Field>
          <Field label="SKU / product code">
            <Input value={form.sku} onChange={(event) => set("sku", event.target.value.toUpperCase())} placeholder="COS-DIG-002" />
          </Field>
          <Field label="Product URL slug" required>
            <Input
              value={form.slug}
              onChange={(event) => {
                setSlugEdited(true);
                set("slug", slugify(event.target.value));
              }}
              placeholder="product-name"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(event) => set("category", event.target.value)}
              className="flex h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="" disabled>
                Select a department
              </option>
              {CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              This keeps the product aligned with the Store navigation and department pages.
            </p>
          </Field>
          <Field label="Brand">
            <Input value={form.brand} onChange={(event) => set("brand", event.target.value)} placeholder="Cossa Store or product brand" />
          </Field>
          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
            <p className="font-medium">Configured automatically</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Type: <strong className="text-foreground">{form.product_type}</strong> Â· Fulfilment: <strong className="text-foreground">{form.fulfilment_model.replace(/_/g, " ")}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">2. Description</h2>
        <div className="mt-5 grid gap-4">
          <Field label="Short description">
            <Textarea value={form.short_description} onChange={(event) => set("short_description", event.target.value)} placeholder="One clear sentence explaining what the customer gets." />
          </Field>
          <Field label="Full description">
            <Textarea className="min-h-40" value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Benefits, contents, specifications, what is included and important buying information." />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">3. Price & availability</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Selling price (R)" required>
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={(event) => set("price", event.target.value)} placeholder="99.00" />
          </Field>
          {!isAffiliate ? (
            <Field label="Your cost (R)">
              <Input type="number" min="0" step="0.01" inputMode="decimal" value={form.cost_price} onChange={(event) => set("cost_price", event.target.value)} placeholder="0.00" />
            </Field>
          ) : null}
          <Field label="Was / compare-at price (R)">
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={form.compare_at_price} onChange={(event) => set("compare_at_price", event.target.value)} placeholder="Optional" />
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
          {needsInventory ? (
            <>
              <Toggle label="Track inventory" checked={form.track_inventory} onChange={(checked) => set("track_inventory", checked)} />
              <Toggle label="Unlimited stock" checked={form.unlimited_stock} onChange={(checked) => set("unlimited_stock", checked)} />
            </>
          ) : (
            <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground sm:col-span-2">
              Stock controls are handled automatically for {MODE_OPTIONS.find((item) => item.value === productMode)?.label.toLowerCase()}.
            </div>
          )}
        </div>

        {needsInventory && form.track_inventory && !form.unlimited_stock ? (
          <div className="mt-4 max-w-xs">
            <Field label="Stock quantity">
              <Input type="number" min="0" inputMode="numeric" value={form.stock_quantity} onChange={(event) => set("stock_quantity", event.target.value)} />
            </Field>
          </div>
        ) : null}

        {productMode === "dropshipping" ? (
          <div className="mt-4 max-w-md">
            <Field label="Dropshipping location">
              <Select value={form.fulfilment_model} onChange={(value) => set("fulfilment_model", value as FulfilmentModel)}>
                <option value="local_dropshipping">South African / local dropshipping</option>
                <option value="international_dropshipping">International dropshipping</option>
              </Select>
            </Field>
          </div>
        ) : null}
      </section>

      {isSupplier ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold">4. {isPod ? "Print-on-demand provider" : "Supplier / fulfilment partner"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPod ? "Enter Printify, Printful, Gelato or the provider that will produce this item." : "Keep the real supplier reference with the product so sourcing stays organised."}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={isPod ? "POD provider" : "Supplier name"} required>
              <Input value={form.supplier_name} onChange={(event) => set("supplier_name", event.target.value)} placeholder={isPod ? "Printify" : "Supplier or fulfilment partner"} />
            </Field>
            <Field label="Supplier product reference">
              <Input value={form.supplier_product_ref} onChange={(event) => set("supplier_product_ref", event.target.value)} placeholder="Supplier SKU / product ID" />
            </Field>
            <Field label="Supplier product URL">
              <Input type="url" value={form.supplier_url} onChange={(event) => set("supplier_url", event.target.value)} placeholder="https://..." />
            </Field>
          </div>
        </section>
      ) : null}

      {isAffiliate ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold">4. Affiliate / partner purchase link</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the real tracked link supplied by the affiliate programme. The customer will leave Cossa Store to complete the purchase.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Partner / merchant name" required>
              <Input value={form.supplier_name} onChange={(event) => set("supplier_name", event.target.value)} placeholder="Retailer or affiliate programme" />
            </Field>
            <Field label="Affiliate URL" required>
              <Input type="url" value={form.affiliate_url} onChange={(event) => set("affiliate_url", event.target.value)} placeholder="https://partner.example/product?..." />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">{isSupplier || isAffiliate ? "5" : "4"}. Product images</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload real product images directly from your phone or computer. The first image becomes the main storefront image.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {uploadingImages ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploadingImages ? "Uploadingâ€¦" : "Upload images"}
            <input className="sr-only" type="file" accept="image/*" multiple disabled={uploadingImages} onChange={(event) => void uploadImages(event.target.files)} />
          </label>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP and other browser image formats Â· max 8 MB each</span>
        </div>

        {imageUrls.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {imageUrls.map((url, index) => (
              <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-border bg-secondary/30">
                <img src={url} alt={`Product upload ${index + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
                {index === 0 ? <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold">Main</span> : null}
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => set("image_urls", imageUrls.filter((_, imageIndex) => imageIndex !== index).join("\n"))}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <details className="mt-4 rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Advanced: paste hosted image URLs</summary>
          <div className="mt-3">
            <Textarea className="min-h-24" value={form.image_urls} onChange={(event) => set("image_urls", event.target.value)} placeholder="One image URL per line" />
          </div>
        </details>
      </section>

      {isDigital ? (
        <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold">5. Digital delivery</h2>
          <p className="mt-1 text-sm text-muted-foreground">Upload the real file customers will receive after purchase. It is stored privately, not exposed as a public download URL.</p>
          <div className="mt-5">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {uploadingDigital ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploadingDigital ? "Uploadingâ€¦" : form.digital_file_path ? "Replace digital file" : "Upload digital product"}
              <input className="sr-only" type="file" disabled={uploadingDigital} onChange={(event) => void uploadDigitalFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>

          {form.digital_file_path ? (
            <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 text-sm">
              <p className="font-medium">File ready</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{form.digital_file_name || form.digital_file_path}</p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Customer download name">
              <Input value={form.digital_file_name} onChange={(event) => set("digital_file_name", event.target.value)} placeholder="Cossa-Business-Toolkit.zip" />
            </Field>
            <Field label="Download limit">
              <Input type="number" min="1" inputMode="numeric" value={form.digital_download_limit} onChange={(event) => set("digital_download_limit", event.target.value)} />
            </Field>
            <Field label="Access days">
              <Input type="number" min="1" inputMode="numeric" value={form.digital_access_days} onChange={(event) => set("digital_access_days", event.target.value)} />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">{isDigital ? "6" : isSupplier || isAffiliate ? "6" : "5"}. Search visibility</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="SEO title">
            <Input value={form.seo_title} onChange={(event) => set("seo_title", event.target.value)} placeholder={form.name || "Product page title"} />
          </Field>
          <Field label="SEO description">
            <Textarea value={form.seo_description} onChange={(event) => set("seo_description", event.target.value)} placeholder="Short Google/search description for this product." />
          </Field>
        </div>
      </section>

      <section className={`rounded-xl border p-4 sm:p-5 ${publicationIssues.length ? "border-warning/50 bg-warning/5" : "border-primary/40 bg-primary/5"}`}>
        <h2 className="text-lg font-semibold">Publication readiness</h2>
        {publicationIssues.length ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">This product remains a draft until these items are completed.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
              {publicationIssues.map((issue) => <li key={issue}>Missing {issue}</li>)}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">This product has the information required for publishing. The database will perform the same checks when you publish.</p>
        )}
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Button disabled={saving || uploadingImages || uploadingDigital} onClick={() => void save(false)}>
          {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save draft
        </Button>
        <Button variant="outline" disabled={saving || uploadingImages || uploadingDigital} onClick={() => void save(true)}>
          Save & publish
        </Button>
        <Button variant="ghost" disabled={saving} onClick={() => navigate({ to: "/admin/catalogue" })}>
          Back to catalogue
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
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

