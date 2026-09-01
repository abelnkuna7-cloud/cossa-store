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
  fulfilment_model: Extract<
    FulfilmentType,
    | "cossa_stock"
    | "local_supplier"
    | "local_dropshipping"
    | "international_dropshipping"
    | "print_on_demand"
    | "affiliate"
    | "digital"
  >;
  status: "active";
  short_description: string | null;
  description: string | null;
  category: string | null;
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
  created_at: string;
  updated_at: string;
};

type StoreVariantRow = {
  id: string;
  product_id: string;
  provider: string;
  provider_variant_id: string;
  sku: string | null;
  title: string;
  price_zar: number | string;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
};

const PUBLIC_PRODUCT_SELECT =
  "id,name,slug,sku,product_type,status,short_description,description,category,brand,affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at,fulfilment_model";

const PUBLIC_VARIANT_SELECT =
  "id,product_id,provider,provider_variant_id,sku,title,price_zar,is_default,is_available,sort_order";

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

function fulfilmentFor(row: PublicStoreProductRow): FulfilmentType {
  return row.fulfilment_model;
}

function stockStatusFor(row: PublicStoreProductRow) {
  switch (row.fulfilment_model) {
    case "digital":
    case "affiliate":
    case "print_on_demand":
      return "made_to_order" as const;
    case "local_supplier":
    case "local_dropshipping":
    case "international_dropshipping":
      return "backorder" as const;
    case "cossa_stock":
    default:
      if (row.unlimited_stock) return "in_stock" as const;
      if (!row.track_inventory) return "made_to_order" as const;
      if (row.stock_quantity <= 0) return "out_of_stock" as const;
      if (row.stock_quantity <= 5) return "low_stock" as const;
      return "in_stock" as const;
  }
}

function availabilityFor(row: PublicStoreProductRow) {
  switch (row.fulfilment_model) {
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

function estimatedDeliveryFor(row: PublicStoreProductRow) {
  switch (row.fulfilment_model) {
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

function mapRow(row: PublicStoreProductRow, variantRows: StoreVariantRow[] = []): Product {
  const variants = variantRows
    .filter((variant) => variant.product_id === row.id && variant.is_available)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(mapVariant);
  const sellingPrice = asNumber(row.price);
  const compareAt = row.compare_at_price == null ? null : asNumber(row.compare_at_price);
  const fulfilment = fulfilmentFor(row);
  const category = storefrontCategory(row);
  const stockStatus = stockStatusFor(row);
  const availability = availabilityFor(row);
  const stockAvailable =
    fulfilment === "digital" || fulfilment === "affiliate" || fulfilment === "print_on_demand" ||
    fulfilment === "local_supplier" || fulfilment === "local_dropshipping" ||
    fulfilment === "international_dropshipping" || row.unlimited_stock || !row.track_inventory || row.stock_quantity > 0;

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
    subcategory: "",
    display_category: category.name,
    // Affiliate source identities are operational data, not product brands.
    // Keep an independently recorded brand on Cossa-sold product records,
    // but never use an affiliate partner as customer-facing brand copy.
    brand: fulfilment === "affiliate" ? null : row.brand,
    collection: null,
    images,
    variants,
    features: [],
    specifications: [],
    attributes: [],
    tags: row.featured ? ["featured"] : [],
    affiliate,
    supplier_name: null,
    requires_quote: sellingPrice <= 0,
    service_included: false,
    service_description: null,
    digital_download: fulfilment === "digital",
    estimated_delivery: estimatedDeliveryFor(row),
    province_availability: fulfilment === "digital" ? [] : ALL_PROVINCES,
    lead_time: fulfilment === "print_on_demand" ? "production time varies by product" : null,
    customisation_options: [],
    kit_items: [],
    project_slugs: [],
    related_product_ids: [],
    frequently_together_ids: [],
    warranty: null,
    return_policy: fulfilment === "digital" ? "Digital products are subject to the Cossa Store digital-products and returns terms." : null,
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

async function loadVariants(productIds: string[]): Promise<StoreVariantRow[]> {
  if (productIds.length === 0) return [];
  const { data, error } = await db
    .from("store_product_variants")
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

async function loadRows(): Promise<PublicStoreProductRow[]> {
  const { data, error } = await db.from("store_public_products").select(PUBLIC_PRODUCT_SELECT).order("updated_at", { ascending: false });
  if (error) {
    console.error("[Cossa Store] Failed to load public products", error);
    throw error;
  }
  return (data ?? []) as PublicStoreProductRow[];
}

async function mapRowsWithVariants(rows: PublicStoreProductRow[]): Promise<Product[]> {
  const variants = await loadVariants(rows.map((row) => row.id));
  return rows.map((row) => mapRow(row, variants));
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
  if (query.category) products = products.filter((product) => product.category === query.category);
  if (query.subcategory) products = products.filter((product) => product.subcategory === query.subcategory);
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
  const { data, error } = await db.from("store_public_products").select(PUBLIC_PRODUCT_SELECT).eq("slug", normalizedSlug).maybeSingle();
  if (error) {
    console.error("[Cossa Store] Failed to load product", error);
    throw error;
  }
  if (!data) return null;
  const variants = await loadVariants([data.id]);
  return mapRow(data as PublicStoreProductRow, variants);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  const { data, error } = await db.from("store_public_products").select(PUBLIC_PRODUCT_SELECT).in("id", uniqueIds);
  if (error) {
    console.error("[Cossa Store] Failed to load products by IDs", error);
    throw error;
  }
  const rows = (data ?? []) as PublicStoreProductRow[];
  const variants = await loadVariants(uniqueIds);
  const mapped = rows.map((row) => mapRow(row, variants));
  const byId = new Map(mapped.map((product) => [product.id, product]));
  return uniqueIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
}

export async function listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const products = await listStorefrontProducts();
  return products.filter((candidate) => candidate.id !== product.id && candidate.category === product.category).slice(0, limit);
}
