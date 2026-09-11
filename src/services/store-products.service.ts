import { supabase } from "@/integrations/supabase/client";
import {
  normaliseStoreDepartmentKey,
  storeDepartmentSlugFor,
} from "@/config/store-departments";
import { CATEGORIES } from "@/data/categories";
import { customerAffiliateOffer } from "@/lib/customer-facing-store";
import { matchesStoreSearch } from "@/lib/store-search";
import type { FulfilmentType, Product, ProductVariantPublic } from "@/types/catalog";

const db = supabase as unknown as { from: (table: string) => any };

export interface ProductQuery {
  category?: string;
  subcategory?: string;
  search?: string;
  collection?: string;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "name_asc";
}

type PublicStoreProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  product_type: "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
  status: "active";
  short_description: string | null;
  description: string | null;
  category: string | null;
  additional_categories: string[] | null;
  merchandising_tags: string[] | null;
  fulfilment_model: string | null;
  brand: string | null;
  affiliate_url: string | null;
  currency: "ZAR";
  price: number | string;
  compare_at_price: number | string | null;
  track_inventory: boolean;
  stock_quantity: number;
  unlimited_stock: boolean;
  featured: boolean;
  image_urls: string[];
  seo_title: string | null;
  seo_description: string | null;
  customer_features: unknown;
  customer_specifications: unknown;
  customer_delivery_notice: string | null;
  customer_returns_notice: string | null;
  customer_warranty_notice: string | null;
  created_at: string;
  updated_at: string;
};

type StoreVariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  title: string;
  price_zar: number | string;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
};

type SupplierAvailabilityRow = {
  product_id: string;
  supplier_stock_state: "in_stock" | "out_of_stock" | "stale" | "unknown" | string;
  is_fresh: boolean;
  supplier_available: boolean;
  last_stock_checked_at: string | null;
};

const PUBLIC_PRODUCT_SELECT =
  "id,name,slug,sku,product_type,status,short_description,description,category,additional_categories,merchandising_tags,fulfilment_model,brand,affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at,customer_features,customer_specifications,customer_delivery_notice,customer_returns_notice,customer_warranty_notice";

const PUBLIC_VARIANT_SELECT =
  "id,product_id,sku,title,price_zar,is_default,is_available,sort_order";

const ALL_PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function fulfilmentFor(row: PublicStoreProductRow): FulfilmentType {
  switch (row.fulfilment_model) {
    case "digital": return "digital";
    case "affiliate": return "affiliate";
    case "print_on_demand": return "print_on_demand";
    case "local_supplier": return "local_supplier";
    case "local_dropshipping": return "local_dropshipping";
    case "international_dropshipping": return "international_dropshipping";
    case "cossa_stock": return "cossa_stock";
    default:
      switch (row.product_type) {
        case "digital": return "digital";
        case "affiliate": return "affiliate";
        case "pod": return "print_on_demand";
        case "dropshipping": return "international_dropshipping";
        default: return "cossa_stock";
      }
  }
}

function supplierManaged(fulfilment: FulfilmentType) {
  return fulfilment === "local_supplier" ||
    fulfilment === "local_dropshipping" ||
    fulfilment === "international_dropshipping";
}

function stockStatusFor(
  row: PublicStoreProductRow,
  supplierAvailability: SupplierAvailabilityRow | null,
) {
  const fulfilment = fulfilmentFor(row);
  if (supplierManaged(fulfilment)) {
    if (supplierAvailability?.supplier_stock_state === "out_of_stock") return "out_of_stock" as const;
    return "backorder" as const;
  }
  switch (fulfilment) {
    case "digital":
    case "affiliate":
    case "print_on_demand":
      return "made_to_order" as const;
    case "cossa_stock":
    default:
      if (row.unlimited_stock) return "in_stock" as const;
      if (!row.track_inventory) return "made_to_order" as const;
      if (row.stock_quantity <= 0) return "out_of_stock" as const;
      if (row.stock_quantity <= 5) return "low_stock" as const;
      return "in_stock" as const;
  }
}

function availabilityFor(
  row: PublicStoreProductRow,
  supplierAvailability: SupplierAvailabilityRow | null,
) {
  const fulfilment = fulfilmentFor(row);
  if (supplierManaged(fulfilment) && supplierAvailability?.supplier_stock_state === "out_of_stock") {
    return "out_of_stock" as const;
  }
  switch (fulfilment) {
    case "digital": return "digital_available" as const;
    case "affiliate": return "partner_offer" as const;
    case "print_on_demand": return "made_to_order" as const;
    case "local_supplier": return "available_from_supplier" as const;
    case "local_dropshipping":
    case "international_dropshipping": return "available_to_order" as const;
    case "cossa_stock":
    default:
      if (row.unlimited_stock || !row.track_inventory) return "available_to_order" as const;
      if (row.stock_quantity <= 0) return "out_of_stock" as const;
      if (row.stock_quantity <= 5) return "low_stock" as const;
      return "in_stock" as const;
  }
}

function estimatedDeliveryFor(
  row: PublicStoreProductRow,
  supplierAvailability: SupplierAvailabilityRow | null,
) {
  const fulfilment = fulfilmentFor(row);
  if (supplierManaged(fulfilment)) {
    if (supplierAvailability?.supplier_stock_state === "out_of_stock") {
      return "Currently unavailable from the supplier. This page remains visible so you can check again later.";
    }
    if (supplierAvailability?.supplier_stock_state === "stale" || supplierAvailability?.supplier_stock_state === "unknown") {
      return "Supplier availability must be rechecked before payment is accepted.";
    }
  }
  switch (fulfilment) {
    case "digital": return "Digital access after successful payment confirmation.";
    case "affiliate": return "Delivery and fulfilment are handled by the partner retailer.";
    case "print_on_demand": return "Made to order. Production and delivery timing is confirmed during checkout.";
    case "local_supplier": return "Local supplier availability and delivery timing are confirmed before dispatch.";
    case "local_dropshipping": return "Ships directly from a local fulfilment partner after order confirmation.";
    case "international_dropshipping": return "International supplier delivery timing and any applicable import handling are confirmed before processing.";
    case "cossa_stock":
    default: return "Delivery timing is confirmed during checkout or before dispatch.";
  }
}

function storefrontCategory(row: PublicStoreProductRow) {
  const raw = row.category?.trim();
  if (!raw) return { slug: "digital-products", name: "Digital Products" };
  const normalized = normaliseStoreDepartmentKey(raw);
  const departmentSlug = storeDepartmentSlugFor(raw);
  const category = CATEGORIES.find(
    (candidate) =>
      candidate.slug === departmentSlug ||
      candidate.slug === normalized ||
      candidate.name.toLocaleLowerCase() === normalized,
  );
  return category ? { slug: category.slug, name: category.name } : { slug: raw, name: raw };
}

function normalisedDepartmentSlug(value: string): string {
  const trimmed = value.trim();
  return storeDepartmentSlugFor(trimmed) ?? normaliseStoreDepartmentKey(trimmed);
}

function additionalDepartmentSlugs(row: PublicStoreProductRow): string[] {
  return Array.from(
    new Set(strings(row.additional_categories).map(normalisedDepartmentSlug).filter(Boolean)),
  );
}

function inferSize(title: string): string | null {
  const match = title.match(/(?:^|\s|\/|-)(5XL|4XL|3XL|2XL|XXXL|XXL|XL|L|M|S|XS|XXS)(?:$|\s|\/|-)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function mapVariant(row: StoreVariantRow): ProductVariantPublic {
  return {
    id: row.id,
    name: row.title,
    sku: row.sku,
    colour: null,
    size: inferSize(row.title),
    finish: null,
    phone_model: null,
    material: null,
    retail_price: asNumber(row.price_zar),
    compare_at_price: null,
    shipping_estimate: null,
    is_active: row.is_available,
    stock_quantity: null,
  } as unknown as ProductVariantPublic;
}

function mapRow(
  row: PublicStoreProductRow,
  variantRows: StoreVariantRow[] = [],
  supplierAvailability: SupplierAvailabilityRow | null = null,
): Product {
  const variants = variantRows
    .filter((variant) => variant.product_id === row.id && variant.is_available)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(mapVariant);
  const sellingPrice = asNumber(row.price);
  const compareAt = row.compare_at_price == null ? null : asNumber(row.compare_at_price);
  const fulfilment = fulfilmentFor(row);
  const category = storefrontCategory(row);
  const stockStatus = stockStatusFor(row, supplierAvailability);
  const availability = availabilityFor(row, supplierAvailability);
  const stockAvailable = supplierManaged(fulfilment)
    ? supplierAvailability?.supplier_stock_state !== "out_of_stock"
    : fulfilment === "digital" || fulfilment === "affiliate" || fulfilment === "print_on_demand" ||
      row.unlimited_stock || !row.track_inventory || row.stock_quantity > 0;

  const images = (row.image_urls ?? []).map((url, index) => ({
    id: `${row.id}-image-${index + 1}`,
    url,
    alt: index === 0 ? row.name : `${row.name} image ${index + 1}`,
    display_order: index,
    is_primary: index === 0,
  }));

  const affiliate = fulfilment === "affiliate"
    ? customerAffiliateOffer(row.affiliate_url)
    : null;

  const merchandisingTags = Array.from(
    new Set([
      ...strings(row.merchandising_tags),
      ...(row.featured ? ["featured"] : []),
    ]),
  );

  return {
    id: row.id,
    sku: row.sku ?? row.id,
    name: row.name,
    slug: row.slug,
    short_description: row.short_description ?? "",
    full_description: row.description ?? row.short_description ?? "",
    product_story: null,
    care_instructions: null,
    product_type: row.product_type === "pod" ? "physical" : row.product_type,
    fulfilment_type: fulfilment,
    catalogue_entry_type:
      row.product_type === "digital" ? "digital_product" :
      row.product_type === "affiliate" ? "affiliate_partner_offer" :
      row.product_type === "pod" ? "print_on_demand_product" :
      row.product_type === "dropshipping" ? "dropshipping_product" : "cossa_stocked_product",
    price_display_mode: sellingPrice > 0 ? (variants.length > 1 ? "from" : "fixed") : "quote",
    selling_price: sellingPrice,
    compare_at_price: compareAt && compareAt > sellingPrice ? compareAt : null,
    vat_status: "vat_inclusive",
    availability_status: availability,
    stock_status: stockStatus,
    stock_available: stockAvailable,
    stock_quantity: fulfilment === "cossa_stock" && row.track_inventory ? row.stock_quantity : null,
    category: category.slug,
    additional_categories: additionalDepartmentSlugs(row),
    subcategory: "",
    display_category: category.name,
    brand: fulfilment === "affiliate" ? null : row.brand,
    collection: null,
    images,
    variants,
    features: strings(row.customer_features),
    specifications: strings(row.customer_specifications),
    attributes: [],
    tags: merchandisingTags,
    affiliate,
    supplier_name: null,
    requires_quote: sellingPrice <= 0,
    service_included: false,
    service_description: null,
    digital_download: fulfilment === "digital",
    estimated_delivery: estimatedDeliveryFor(row, supplierAvailability),
    province_availability: fulfilment === "digital" ? [] : ALL_PROVINCES,
    lead_time: fulfilment === "print_on_demand" ? "production time varies by product" : null,
    customisation_options: [],
    kit_items: [],
    project_slugs: [],
    related_product_ids: [],
    frequently_together_ids: [],
    warranty: row.customer_warranty_notice,
    return_policy: row.customer_returns_notice ??
      (fulfilment === "digital" ? "Digital products are subject to the Cossa Store digital-products and returns terms." : null),
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    is_featured: row.featured,
    is_demo: false,
    status: "active",
    publication_state: "published",
    visibility: "public",
    published_at: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as unknown as Product;
}

function productDepartmentSlugs(product: Product): string[] {
  const additional = (product as Product & { additional_categories?: string[] }).additional_categories ?? [];
  return Array.from(new Set([product.category, ...additional].filter(Boolean)));
}

function astrumModelToken(name: string) {
  return (name.match(/\b(?:MX|MZ|KT|IP|BS|NA|CL|DUOZ|BT|WATZ|ENP|KBX|WL|PB|SB|SW)[ -]?[A-Z0-9-]*\d+[A-Z0-9-]*\b/i)?.[0] ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function canonicalProductKey(product: Product) {
  const isAstrum = product.brand?.toLowerCase() === "astrum" || /\bastrum\b/i.test(product.name);
  const model = astrumModelToken(product.name);
  if (isAstrum && model) return `astrum:${model}`;
  return `id:${product.id}`;
}

function dedupeCanonicalProducts(products: Product[]) {
  const byKey = new Map<string, Product>();
  for (const product of products) {
    const key = canonicalProductKey(product);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, product);
      continue;
    }
    const chooseIncoming =
      product.selling_price > 0 &&
      (current.selling_price <= 0 || product.selling_price < current.selling_price);
    if (chooseIncoming) byKey.set(key, product);
  }
  return [...byKey.values()];
}

async function loadVariants(productIds: string[]): Promise<StoreVariantRow[]> {
  if (productIds.length === 0) return [];
  const { data, error } = await db
    .from("store_public_product_variants")
    .select(PUBLIC_VARIANT_SELECT)
    .in("product_id", productIds)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[Cossa Store] Failed to load product variants", error);
    throw error;
  }
  return (data ?? []) as StoreVariantRow[];
}

async function loadSupplierAvailability(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, SupplierAvailabilityRow>();
  const { data, error } = await db
    .from("store_supplier_availability_public")
    .select("product_id,supplier_stock_state,is_fresh,supplier_available,last_stock_checked_at")
    .in("product_id", uniqueIds);
  if (error) {
    console.error("[Cossa Store] Supplier availability projection could not be loaded", error);
    return new Map<string, SupplierAvailabilityRow>();
  }
  return new Map(
    ((data ?? []) as SupplierAvailabilityRow[]).map((row) => [row.product_id, row]),
  );
}

async function loadRows(): Promise<PublicStoreProductRow[]> {
  const { data, error } = await db.from("store_customer_products").select(PUBLIC_PRODUCT_SELECT).order("updated_at", { ascending: false });
  if (error) {
    console.error("[Cossa Store] Failed to load public products", error);
    throw error;
  }
  return (data ?? []) as PublicStoreProductRow[];
}

async function mapRowsWithVariants(rows: PublicStoreProductRow[]): Promise<Product[]> {
  const ids = rows.map((row) => row.id);
  const [variants, supplierAvailability] = await Promise.all([
    loadVariants(ids),
    loadSupplierAvailability(ids),
  ]);
  return dedupeCanonicalProducts(
    rows.map((row) => mapRow(row, variants, supplierAvailability.get(row.id) ?? null)),
  );
}

export async function listStorefrontProducts(): Promise<Product[]> {
  return mapRowsWithVariants(await loadRows());
}

export async function listFeaturedProducts(limit = 8): Promise<Product[]> {
  const products = await listStorefrontProducts();
  return products.filter((product) => product.is_featured).slice(0, limit);
}

export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  let products = await listStorefrontProducts();
  if (query.category) {
    products = products.filter((product) => productDepartmentSlugs(product).includes(query.category!));
  }
  if (query.subcategory) products = products.filter((product) => product.subcategory === query.subcategory);
  if (query.collection) products = products.filter((product) => product.tags.includes(query.collection!));
  if (query.search?.trim()) {
    products = products.filter((product) => matchesStoreSearch(product, query.search!));
  }
  switch (query.sort) {
    case "newest": products.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)); break;
    case "price_asc": products.sort((a, b) => a.selling_price - b.selling_price); break;
    case "price_desc": products.sort((a, b) => b.selling_price - a.selling_price); break;
    case "name_asc": products.sort((a, b) => a.name.localeCompare(b.name)); break;
    default: products.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }
  return products;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;
  const { data, error } = await db.from("store_customer_products").select(PUBLIC_PRODUCT_SELECT).eq("slug", normalizedSlug).maybeSingle();
  if (error) {
    console.error("[Cossa Store] Failed to load product", error);
    throw error;
  }
  if (!data) return null;
  const row = data as PublicStoreProductRow;
  const [variants, supplierAvailability] = await Promise.all([
    loadVariants([row.id]),
    loadSupplierAvailability([row.id]),
  ]);
  return mapRow(row, variants, supplierAvailability.get(row.id) ?? null);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  const { data, error } = await db.from("store_customer_products").select(PUBLIC_PRODUCT_SELECT).in("id", uniqueIds);
  if (error) {
    console.error("[Cossa Store] Failed to load products by IDs", error);
    throw error;
  }
  const rows = (data ?? []) as PublicStoreProductRow[];
  const [variants, supplierAvailability] = await Promise.all([
    loadVariants(uniqueIds),
    loadSupplierAvailability(uniqueIds),
  ]);
  const mapped = dedupeCanonicalProducts(
    rows.map((row) => mapRow(row, variants, supplierAvailability.get(row.id) ?? null)),
  );
  const byId = new Map(mapped.map((product) => [product.id, product]));
  return uniqueIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
}

export async function listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const departments = new Set(productDepartmentSlugs(product));
  const products = await listStorefrontProducts();
  return products
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        productDepartmentSlugs(candidate).some((department) => departments.has(department)),
    )
    .slice(0, limit);
}
