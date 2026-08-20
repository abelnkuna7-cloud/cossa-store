import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/types/catalog";

const db = supabase as unknown as {
  from: (table: string) => any;
};

export interface ProductQuery {
  category?: string;
  subcategory?: string;
  search?: string;
  collection?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "name_asc";
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

function fulfilmentFor(row: PublicStoreProductRow) {
  switch (row.product_type) {
    case "digital":
      return "digital" as const;
    case "affiliate":
      return "affiliate" as const;
    case "pod":
      return "print_on_demand" as const;
    case "dropshipping":
      return "local_dropshipping" as const;
    case "physical":
    default:
      return "cossa_stock" as const;
  }
}

function stockStatusFor(row: PublicStoreProductRow) {
  if (row.product_type === "digital" || row.product_type === "affiliate") {
    return "made_to_order" as const;
  }
  if (row.product_type === "pod" || row.product_type === "dropshipping") {
    return "made_to_order" as const;
  }
  if (row.unlimited_stock) return "in_stock" as const;
  if (!row.track_inventory) return "made_to_order" as const;
  if (row.stock_quantity <= 0) return "out_of_stock" as const;
  if (row.stock_quantity <= 5) return "low_stock" as const;
  return "in_stock" as const;
}

function availabilityFor(row: PublicStoreProductRow) {
  switch (row.product_type) {
    case "digital":
      return "digital_available" as const;
    case "affiliate":
      return "partner_offer" as const;
    case "pod":
      return "made_to_order" as const;
    case "dropshipping":
      return "available_to_order" as const;
    case "physical":
    default:
      if (row.unlimited_stock || !row.track_inventory) return "available_to_order" as const;
      if (row.stock_quantity <= 0) return "out_of_stock" as const;
      if (row.stock_quantity <= 5) return "low_stock" as const;
      return "in_stock" as const;
  }
}

function estimatedDeliveryFor(row: PublicStoreProductRow) {
  switch (row.product_type) {
    case "digital":
      return "Digital access after successful payment confirmation.";
    case "affiliate":
      return "Delivery and fulfilment are handled by the partner retailer.";
    case "pod":
      return "Made to order. Production and delivery timing is confirmed during checkout.";
    case "dropshipping":
      return "Supplier delivery timing is confirmed before order processing.";
    case "physical":
    default:
      return "Delivery timing is confirmed during checkout or before dispatch.";
  }
}

function mapRow(row: PublicStoreProductRow): Product {
  const sellingPrice = asNumber(row.price);
  const compareAt = row.compare_at_price == null ? null : asNumber(row.compare_at_price);
  const fulfilment = fulfilmentFor(row);
  const stockStatus = stockStatusFor(row);
  const availability = availabilityFor(row);
  const stockAvailable =
    row.product_type === "digital" ||
    row.product_type === "affiliate" ||
    row.product_type === "pod" ||
    row.product_type === "dropshipping" ||
    row.unlimited_stock ||
    !row.track_inventory ||
    row.stock_quantity > 0;

  const images = (row.image_urls ?? []).map((url, index) => ({
    id: `${row.id}-image-${index + 1}`,
    url,
    alt: index === 0 ? row.name : `${row.name} image ${index + 1}`,
    display_order: index,
    is_primary: index === 0,
  }));

  const affiliate =
    row.product_type === "affiliate" && row.affiliate_url
      ? {
          partner_name: row.brand || "Partner retailer",
          tracking_url: row.affiliate_url,
          disclosure_text:
            "This is a partner offer. Payment, delivery and returns are handled by the retailer. Cossa Store may earn a commission.",
        }
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
      row.product_type === "digital"
        ? "digital_product"
        : row.product_type === "affiliate"
          ? "affiliate_partner_offer"
          : row.product_type === "pod"
            ? "print_on_demand_product"
            : row.product_type === "dropshipping"
              ? "dropshipping_product"
              : "cossa_stocked_product",
    price_display_mode: sellingPrice > 0 ? "fixed" : "quote",
    selling_price: sellingPrice,
    compare_at_price: compareAt && compareAt > sellingPrice ? compareAt : null,
    vat_status: "vat_inclusive",
    availability_status: availability,
    stock_status: stockStatus,
    stock_available: stockAvailable,
    stock_quantity: row.track_inventory ? row.stock_quantity : null,
    category: row.category ?? "digital-products",
    subcategory: "",
    display_category: row.category ?? "Cossa Store",
    brand: row.brand,
    collection: null,
    images,
    variants: [],
    features: [],
    specifications: [],
    attributes: [],
    tags: row.featured ? ["featured"] : [],
    affiliate,
    supplier_name: null,
    requires_quote: sellingPrice <= 0,
    service_included: false,
    service_description: null,
    digital_download: row.product_type === "digital",
    estimated_delivery: estimatedDeliveryFor(row),
    province_availability: row.product_type === "digital" ? [] : ALL_PROVINCES,
    lead_time: row.product_type === "pod" ? "production time varies by product" : null,
    customisation_options: [],
    kit_items: [],
    project_slugs: [],
    related_product_ids: [],
    frequently_together_ids: [],
    warranty: null,
    return_policy:
      row.product_type === "digital"
        ? "Digital products are subject to the Cossa Store digital-products and returns terms."
        : null,
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

async function loadRows(): Promise<PublicStoreProductRow[]> {
  const { data, error } = await db
    .from("store_public_products")
    .select("id,name,slug,sku,product_type,status,short_description,description,category,brand,affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Cossa Store] Failed to load public products", error);
    throw error;
  }

  return (data ?? []) as PublicStoreProductRow[];
}

export async function listStorefrontProducts(): Promise<Product[]> {
  return (await loadRows()).map(mapRow);
}

export async function listFeaturedProducts(limit = 8): Promise<Product[]> {
  const products = await listStorefrontProducts();
  return products.filter((product) => product.is_featured).slice(0, limit);
}

export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  let products = await listStorefrontProducts();

  if (query.category) {
    products = products.filter((product) => product.category === query.category);
  }

  if (query.subcategory) {
    products = products.filter((product) => product.subcategory === query.subcategory);
  }

  if (query.search?.trim()) {
    const needle = query.search.trim().toLowerCase();
    products = products.filter((product) =>
      [product.name, product.sku, product.short_description, product.full_description, product.brand, product.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }

  switch (query.sort) {
    case "price_asc":
      products.sort((a, b) => a.selling_price - b.selling_price);
      break;
    case "price_desc":
      products.sort((a, b) => b.selling_price - a.selling_price);
      break;
    case "name_asc":
      products.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      products.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }

  return products;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const { data, error } = await db
    .from("store_public_products")
    .select("id,name,slug,sku,product_type,status,short_description,description,category,brand,affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    console.error("[Cossa Store] Failed to load product", error);
    throw error;
  }

  return data ? mapRow(data as PublicStoreProductRow) : null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await db
    .from("store_public_products")
    .select("id,name,slug,sku,product_type,status,short_description,description,category,brand,affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at")
    .in("id", uniqueIds);

  if (error) {
    console.error("[Cossa Store] Failed to load products by IDs", error);
    throw error;
  }

  const mapped = (data ?? []).map((row: PublicStoreProductRow) => mapRow(row));
  const byId = new Map(mapped.map((product) => [product.id, product]));
  return uniqueIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
}

export async function listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const products = await listStorefrontProducts();
  return products
    .filter((candidate) => candidate.id !== product.id && candidate.category === product.category)
    .slice(0, limit);
}
