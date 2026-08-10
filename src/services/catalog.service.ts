/**
 * Public catalogue data-access layer.
 *
 * Reads ONLY the safe, published catalogue exposed by row-level security:
 * published + active + public products, their public media, active variants
 * and customer-facing prices. Supplier costs, provider identifiers, internal
 * notes and draft records are never selected here.
 */
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, PROJECTS, getCategory, getProject } from "@/data/categories";
import { DEMO_STOREFRONT, findDemoProductBySlug } from "@/data/demo-catalogue";
import type {
  Category,
  FulfilmentType,
  Product,
  ProductVariantPublic,
  ProjectBundle,
  StockStatus,
} from "@/types/catalog";

export interface ProductQuery {
  category?: string;
  subcategory?: string;
  search?: string;
  collection?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "name_asc";
}

const SELECT = `
  id, sku, name, slug, short_description, full_description, item_type,
  product_story, care_instructions, requires_quote, sourcing_model, warranty,
  return_policy, seo_title, seo_description, created_at, updated_at, features,
  product_type, is_featured, tags, published_at,
  commerce_categories:category_id ( slug, name ),
  brands:brand_id ( name ),
  commerce_collections:collection_id ( name, slug ),
  product_media ( id, url, alt_text, display_order, is_primary, media_type, is_public ),
  product_variants ( id, name, variant_sku, colour, size, finish, phone_model, material, retail_price, compare_at_price, shipping_estimate, is_active, stock_quantity ),
  product_prices ( amount, price_type, is_active, minimum_quantity ),
  product_attributes ( label, value, display_order ),
  affiliate_offers ( partner_name, tracking_url, disclosure_text, is_active )
`;

const FULFILMENT_MAP: Record<string, FulfilmentType> = {
  own_stock: "cossa_stock",
  local_supplier: "local_supplier",
  local_dropshipping: "local_dropshipping",
  international_dropshipping: "international_dropshipping",
  print_on_demand: "print_on_demand",
  affiliate: "affiliate",
  digital: "digital",
  service: "service",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(row: any): Product {
  const variants: ProductVariantPublic[] = (row.product_variants ?? [])
    .filter((v: any) => v.is_active)
    .map((v: any) => ({
      id: v.id,
      name: v.name,
      sku: v.variant_sku,
      colour: v.colour,
      size: v.size,
      finish: v.finish,
      phone_model: v.phone_model,
      material: v.material,
      retail_price: v.retail_price === null ? null : Number(v.retail_price),
      compare_at_price: v.compare_at_price === null ? null : Number(v.compare_at_price),
      shipping_estimate: v.shipping_estimate,
      is_active: v.is_active,
    }));

  const retail = (row.product_prices ?? [])
    .filter((p: any) => p.is_active && (p.price_type === "retail" || p.price_type === "promotional"))
    .map((p: any) => Number(p.amount))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  const variantPrices = variants
    .map((v) => v.retail_price)
    .filter((n): n is number => typeof n === "number" && n > 0);

  const prices = [...retail, ...variantPrices];
  const sellingPrice = prices.length ? Math.min(...prices) : 0;
  const compareAt = variants.map((v) => v.compare_at_price).find((n) => typeof n === "number" && n > 0);

  const sourcing = String(row.sourcing_model ?? "own_stock");
  const productType = (row.product_type ?? "physical") as Product["product_type"];
  const madeToOrder = sourcing === "print_on_demand";
  const stockQty = (row.product_variants ?? []).reduce(
    (total: number, v: any) => total + (v.is_active ? Number(v.stock_quantity ?? 0) : 0),
    0,
  );
  const physicalStocked = sourcing === "own_stock" && productType === "physical";
  const stockStatus: StockStatus = madeToOrder
    ? "made_to_order"
    : !physicalStocked
      ? "made_to_order"
      : stockQty > 0
        ? "in_stock"
        : "out_of_stock";

  const affiliateRow = (row.affiliate_offers ?? []).find((o: any) => o.is_active) ?? null;

  const media = (row.product_media ?? [])
    .filter((m: any) => m.is_public && m.media_type === "image")
    .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order);

  const categorySlug = row.commerce_categories?.slug ?? "uncategorised";

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    short_description: row.short_description ?? "",
    full_description: row.full_description ?? "",
    category: categorySlug,
    subcategory: categorySlug,
    brand: row.brands?.name ?? null,
    supplier_id: null,
    supplier_sku: null,
    cost_price: null,
    selling_price: sellingPrice,
    compare_at_price: compareAt ?? null,
    vat_status: "vat_inclusive",
    stock_status: stockStatus,
    stock_quantity: null,
    fulfilment_type: FULFILMENT_MAP[sourcing] ?? "cossa_stock",
    estimated_delivery:
      variants.find((v) => v.shipping_estimate)?.shipping_estimate ??
      (madeToOrder ? "Made to order — estimate confirmed on request" : "Confirmed on request"),
    images: media.map((m: any) => ({ url: m.url as string | null, alt: m.alt_text ?? row.name })),
    specifications: (row.product_attributes ?? [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((a: any) => ({ label: a.label, value: a.value })),
    features: row.features ?? [],
    warranty: row.warranty ?? null,
    return_eligibility: row.return_policy ?? "Standard Cossa Store returns policy applies.",
    status: "active",
    seo_title: row.seo_title ?? `${row.name} | Cossa Store`,
    seo_description: row.seo_description ?? row.short_description ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    collection: row.commerce_collections
      ? { name: row.commerce_collections.name, slug: row.commerce_collections.slug }
      : null,
    item_type: row.item_type ?? null,
    product_story: row.product_story ?? null,
    care_instructions: row.care_instructions ?? null,
    requires_quote: Boolean(row.requires_quote),
    made_to_order: madeToOrder,
    variants,
    product_type: productType,
    is_featured: Boolean(row.is_featured),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    published_at: row.published_at ?? null,
    stock_available: physicalStocked && stockQty > 0,
    affiliate: affiliateRow
      ? {
          partner_name: affiliateRow.partner_name,
          tracking_url: affiliateRow.tracking_url,
          disclosure_text: affiliateRow.disclosure_text ?? null,
        }
      : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------------- taxonomy (static navigation structure) ---------------- */

export async function listCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function fetchCategory(slug: string): Promise<Category | null> {
  return getCategory(slug) ?? null;
}

export async function listProjects(): Promise<ProjectBundle[]> {
  return PROJECTS;
}

export async function fetchProject(slug: string): Promise<ProjectBundle | null> {
  return getProject(slug) ?? null;
}

/* ---------------- catalogue ---------------- */

export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;

  let results = [...(data ?? []).map(mapProduct), ...DEMO_STOREFRONT];

  if (query.category) results = results.filter((p) => p.category === query.category);
  if (query.subcategory) results = results.filter((p) => p.subcategory === query.subcategory);
  if (query.collection) results = results.filter((p) => p.collection?.slug === query.collection);

  if (query.search) {
    const term = query.search.trim().toLowerCase();
    if (term) {
      results = results.filter((p) =>
        [p.name, p.short_description, p.brand ?? "", p.sku, p.collection?.name ?? "", p.item_type ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
  }

  switch (query.sort) {
    case "price_asc":
      results = [...results].sort((a, b) => a.selling_price - b.selling_price);
      break;
    case "price_desc":
      results = [...results].sort((a, b) => b.selling_price - a.selling_price);
      break;
    case "name_asc":
      results = [...results].sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }

  return results;
}

export async function listProjectProducts(slug: string): Promise<Product[]> {
  const project = getProject(slug);
  if (!project) return [];
  const all = await listProducts();
  return all.filter(
    (p) =>
      (p.project_slugs ?? []).includes(slug) || project.categories.includes(p.category as never),
  );
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const demo = findDemoProductBySlug(slug);
  if (demo) return demo;
  const { data, error } = await supabase.from("products").select(SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const demo = DEMO_STOREFRONT.filter((p) => ids.includes(p.id));
  const realIds = ids.filter((id) => !demo.some((p) => p.id === id));
  if (realIds.length === 0) return demo;
  const { data, error } = await supabase.from("products").select(SELECT).in("id", realIds);
  if (error) throw error;
  return [...(data ?? []).map(mapProduct), ...demo];
}

export async function listFeaturedProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const demoFeatured = DEMO_STOREFRONT.filter((p) => p.is_featured);
  return [...(data ?? []).map(mapProduct), ...demoFeatured].slice(0, limit);
}

export async function listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await listProducts();
  const explicit = (product.related_slugs ?? [])
    .map((id) => all.find((p) => p.id === id || p.slug === id))
    .filter((p): p is Product => Boolean(p) && p!.id !== product.id);
  const sameCollection = all.filter(
    (p) => p.id !== product.id && product.collection && p.collection?.slug === product.collection.slug,
  );
  const sameCategory = all.filter(
    (p) => p.id !== product.id && p.category === product.category && !sameCollection.includes(p),
  );
  const merged = [...explicit, ...sameCollection, ...sameCategory];
  return Array.from(new Map(merged.map((p) => [p.id, p])).values()).slice(0, limit);
}

export async function listPublicCollections() {
  const { data, error } = await supabase
    .from("commerce_collections")
    .select("id, name, slug, description, hero_image_url, campaign_name, status, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Single storefront read used to build the homepage merchandising sections.
 * Row-level security already limits this to published, public products.
 */
export async function listStorefrontProducts(limit = 120): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return [...(data ?? []).map(mapProduct), ...DEMO_STOREFRONT].slice(0, limit);
}
