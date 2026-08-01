/**
 * Internal catalogue management (staff / admin only).
 *
 * Every call runs as the signed-in user, so row-level security decides what
 * may be read or written. Provider costs and provider identifiers live in
 * dedicated staff-only tables and are never returned to the storefront.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PublicationState } from "@/types/catalog";

export type PodProvider = "printify" | "gelato" | "printful" | "other";

export interface AdminProductRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  item_type: string | null;
  sourcing_model: string;
  publication_state: PublicationState;
  status: string;
  visibility: string;
  is_featured: boolean;
  requires_quote: boolean;
  updated_at: string;
  category: { slug: string; name: string } | null;
  collection: { slug: string; name: string } | null;
  variantCount: number;
  publicPrice: number | null;
}

const LIST_SELECT = `
  id, sku, name, slug, item_type, sourcing_model, publication_state, status,
  visibility, is_featured, requires_quote, updated_at,
  commerce_categories:category_id ( slug, name ),
  commerce_collections:collection_id ( slug, name ),
  product_variants ( id, is_active, retail_price ),
  product_prices ( amount, price_type, is_active )
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(row: any): AdminProductRow {
  const retail = (row.product_prices ?? [])
    .filter((p: any) => p.is_active && (p.price_type === "retail" || p.price_type === "promotional"))
    .map((p: any) => Number(p.amount));
  const variantPrices = (row.product_variants ?? [])
    .map((v: any) => (v.retail_price === null ? null : Number(v.retail_price)))
    .filter((n: number | null): n is number => typeof n === "number");
  const prices = [...retail, ...variantPrices].filter((n) => Number.isFinite(n) && n > 0);
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    item_type: row.item_type,
    sourcing_model: row.sourcing_model,
    publication_state: row.publication_state,
    status: row.status,
    visibility: row.visibility,
    is_featured: row.is_featured,
    requires_quote: row.requires_quote,
    updated_at: row.updated_at,
    category: row.commerce_categories ?? null,
    collection: row.commerce_collections ?? null,
    variantCount: (row.product_variants ?? []).length,
    publicPrice: prices.length ? Math.min(...prices) : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listAdminProducts(): Promise<AdminProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function fetchAdminProduct(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_pod_details(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface ProductDraftInput {
  name: string;
  sku: string;
  slug: string;
  short_description: string;
  full_description: string;
  category_id: string | null;
  brand_id: string | null;
  collection_id: string | null;
  item_type: string;
  sourcing_model: string;
  product_type: string;
  visibility: string;
  is_featured: boolean;
  requires_shipping: boolean;
  requires_quote: boolean;
  is_customisable: boolean;
  sourcing_enabled: boolean;
  campaign_name: string | null;
  design_name: string | null;
  slogan: string | null;
  product_story: string | null;
  audience: string | null;
  tags: string[];
  features: string[];
  care_instructions: string | null;
  warranty: string | null;
  return_policy: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export async function createProduct(input: ProductDraftInput) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      ...(input as any),
      created_by: auth.user?.id ?? null,
      publication_state: "draft",
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateProduct(id: string, patch: Partial<ProductDraftInput>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("products").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function setPublicationState(id: string, state: PublicationState) {
  const patch: Record<string, unknown> = { publication_state: state };
  if (state === "archived") patch.status = "archived";
  if (state === "unpublished") patch.status = "draft";
  const { error } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", id);
  if (error) throw error;
}

export async function duplicateProduct(id: string) {
  const source = await fetchAdminProduct(id);
  if (!source) throw new Error("Product not found");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = source as any;
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const copy = { ...row };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.published_at;
  delete copy.approved_at;
  delete copy.approved_by;
  delete copy.product_pod_details;
  delete copy.reviewed_at;
  delete copy.reviewed_by;
  copy.review_notes = null;
  const { data: auth } = await supabase.auth.getUser();
  copy.created_by = auth.user?.id ?? row.created_by ?? null;
  copy.sku = `${row.sku}-C${suffix}`;
  copy.slug = `${row.slug}-copy-${suffix.toLowerCase()}`;
  copy.name = `${row.name} (copy)`;
  copy.publication_state = "draft";
  copy.status = "draft";
  const { data, error } = await supabase.from("products").insert(copy).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/* ---------------- uniqueness validation ---------------- */

async function isTaken(column: "sku" | "slug", value: string, ignoreId?: string) {
  let query = supabase.from("products").select("id").eq(column, value).limit(1);
  if (ignoreId) query = query.neq("id", ignoreId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).length > 0;
}

export const isProductCodeTaken = (value: string, ignoreId?: string) => isTaken("sku", value, ignoreId);
export const isSlugTaken = (value: string, ignoreId?: string) => isTaken("slug", value, ignoreId);

export async function isVariantSkuTaken(value: string, ignoreId?: string) {
  let query = supabase.from("product_variants").select("id").eq("variant_sku", value).limit(1);
  if (ignoreId) query = query.neq("id", ignoreId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).length > 0;
}

/* ---------------- print-on-demand details ---------------- */

export interface PodDetailsInput {
  provider: PodProvider;
  external_product_id: string | null;
  external_blueprint_id: string | null;
  external_print_provider_id: string | null;
  provider_product_url: string | null;
  provider_dashboard_url: string | null;
  production_region: string | null;
  production_time_estimate: string | null;
  shipping_estimate: string | null;
  fulfilment_notes: string | null;
  manual_fulfilment_required: boolean;
  api_integration_status: string;
  last_reviewed_at: string | null;
}

export async function upsertPodDetails(productId: string, input: PodDetailsInput) {
  const { error } = await supabase
    .from("product_pod_details")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ product_id: productId, ...(input as any) }, { onConflict: "product_id" });
  if (error) throw error;
}

/* ---------------- variants ---------------- */

export interface VariantInput {
  name: string;
  variant_sku: string;
  colour: string | null;
  size: string | null;
  finish: string | null;
  phone_model: string | null;
  material: string | null;
  retail_price: number | null;
  compare_at_price: number | null;
  shipping_estimate: string | null;
  currency: string;
  is_active: boolean;
}

export interface VariantProviderInput {
  provider: PodProvider;
  external_variant_id: string | null;
  provider_sku: string | null;
  production_cost: number | null;
  provider_currency: string;
  manual_order_instructions: string | null;
  last_verified_at: string | null;
}

export async function listVariants(productId: string) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("*, product_variant_provider_details(*)")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createVariant(
  productId: string,
  variant: VariantInput,
  provider: VariantProviderInput | null,
) {
  const { data, error } = await supabase
    .from("product_variants")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ product_id: productId, options: {}, ...(variant as any) })
    .select("id")
    .single();
  if (error) throw error;
  if (provider) {
    const { error: providerError } = await supabase
      .from("product_variant_provider_details")
      .upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { variant_id: data.id, product_id: productId, ...(provider as any) },
        { onConflict: "variant_id" },
      );
    if (providerError) throw providerError;
  }
  return data.id as string;
}

export async function updateVariant(
  variantId: string,
  productId: string,
  variant: Partial<VariantInput>,
  provider: VariantProviderInput | null,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("product_variants").update(variant as any).eq("id", variantId);
  if (error) throw error;
  if (provider) {
    const { error: providerError } = await supabase
      .from("product_variant_provider_details")
      .upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { variant_id: variantId, product_id: productId, ...(provider as any) },
        { onConflict: "variant_id" },
      );
    if (providerError) throw providerError;
  }
}

export async function deactivateVariant(variantId: string) {
  const { error } = await supabase
    .from("product_variants")
    .update({ is_active: false })
    .eq("id", variantId);
  if (error) throw error;
}

/* ---------------- media ---------------- */

export async function listProductMedia(productId: string) {
  const { data, error } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addProductMedia(input: {
  product_id: string;
  url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  is_public: boolean;
  variant_id?: string | null;
}) {
  const { error } = await supabase
    .from("product_media")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ media_type: "image", ...(input as any) });
  if (error) throw error;
}

export async function removeProductMedia(id: string) {
  const { error } = await supabase.from("product_media").delete().eq("id", id);
  if (error) throw error;
}

export async function updateProductMediaAlt(id: string, altText: string | null) {
  const { error } = await supabase.from("product_media").update({ alt_text: altText }).eq("id", id);
  if (error) throw error;
}

/* ---------------- prices ---------------- */

export async function listProductPrices(productId: string) {
  const { data, error } = await supabase
    .from("product_prices")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addProductPrice(input: {
  product_id: string;
  price_type: "retail" | "promotional" | "business" | "cost";
  amount: number;
  currency: string;
  minimum_quantity: number;
  starts_at: string | null;
  ends_at: string | null;
  vat_inclusive: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("product_prices").insert(input as any);
  if (error) throw error;
}

export async function removeProductPrice(id: string) {
  const { error } = await supabase.from("product_prices").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- reference data ---------------- */

export async function listAllCollections() {
  const { data, error } = await supabase
    .from("commerce_collections")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCollection(input: {
  name: string;
  slug: string;
  description: string | null;
  campaign_name: string | null;
  status: "draft" | "active" | "inactive" | "archived";
  sort_order: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("commerce_collections").insert(input as any);
  if (error) throw error;
}

export async function listCommerceCategories() {
  const { data, error } = await supabase
    .from("commerce_categories")
    .select("id, name, slug")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listBrands() {
  const { data, error } = await supabase.from("brands").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}
