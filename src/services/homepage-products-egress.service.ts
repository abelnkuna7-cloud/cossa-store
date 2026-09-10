import { MERCH_TAGS, MERCHANDISING } from "@/config/merchandising";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductsByIds } from "@/services/store-products.service";
import type { Product } from "@/types/catalog";

const db = supabase as unknown as { from: (table: string) => any };

type HomepageCandidateRow = {
  id: string;
  product_type: "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
  fulfilment_model: string | null;
  merchandising_tags: string[] | null;
  featured: boolean;
  price: number | string;
  compare_at_price: number | string | null;
  created_at: string;
};

const HOMEPAGE_CANDIDATE_SELECT =
  "id,product_type,fulfilment_model,merchandising_tags,featured,price,compare_at_price,created_at";

function tags(row: HomepageCandidateRow): string[] {
  return Array.isArray(row.merchandising_tags) ? row.merchandising_tags : [];
}

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isAffiliate(row: HomepageCandidateRow): boolean {
  return row.product_type === "affiliate" || row.fulfilment_model === "affiliate";
}

function isDigital(row: HomepageCandidateRow): boolean {
  return row.product_type === "digital" || row.fulfilment_model === "digital";
}

function isNewArrival(row: HomepageCandidateRow, now: number): boolean {
  if (tags(row).includes(MERCH_TAGS.newArrival)) return true;
  const published = Date.parse(row.created_at);
  if (!Number.isFinite(published)) return false;
  const windowMs = MERCHANDISING.newArrivalWindowDays * 24 * 60 * 60 * 1000;
  return published <= now && now - published <= windowMs;
}

function hasSale(row: HomepageCandidateRow): boolean {
  const price = asNumber(row.price);
  const compareAt = row.compare_at_price == null ? 0 : asNumber(row.compare_at_price);
  return tags(row).includes(MERCH_TAGS.sale) && price > 0 && compareAt > price;
}

function pick(
  rows: HomepageCandidateRow[],
  predicate: (row: HomepageCandidateRow) => boolean,
): string[] {
  return rows.filter(predicate).slice(0, MERCHANDISING.sectionLimit).map((row) => row.id);
}

/**
 * Homepage-specific catalogue loader.
 *
 * The homepage renders many merchandising sections but only up to 12 cards per
 * section. Loading every complete product row, image array and variant record
 * therefore wastes Supabase egress. This function reads one compact candidate
 * projection, selects only the IDs needed to populate every homepage section,
 * then hydrates the union of those IDs through the existing public mapper.
 *
 * No product data is changed and no merchandising rule is invented here; the
 * predicates mirror the customer-facing rules in lib/merchandising.ts.
 */
export async function listHomepageProductsEgressSafe(): Promise<Product[]> {
  const { data, error } = await db
    .from("store_customer_products")
    .select(HOMEPAGE_CANDIDATE_SELECT)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Cossa Store] Failed to load compact homepage candidates", error);
    throw error;
  }

  const rows = (data ?? []) as HomepageCandidateRow[];
  if (rows.length === 0) return [];

  const now = Date.now();
  const newest = [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const sectionIds = [
    ...pick(newest, (row) => isNewArrival(row, now)),
    ...pick(rows, (row) => tags(row).includes(MERCH_TAGS.trending)),
    ...pick(rows, (row) => tags(row).includes(MERCH_TAGS.bestSeller)),
    ...pick(rows, hasSale),
    ...pick(rows, (row) => row.product_type === "physical" && row.fulfilment_model === "cossa_stock"),
    ...pick(rows, (row) => row.fulfilment_model === "local_dropshipping"),
    ...pick(rows, isAffiliate),
    ...pick(rows, (row) => row.fulfilment_model === "international_dropshipping" && !isAffiliate(row)),
    ...pick(rows, (row) => row.featured),
    ...pick(rows, (row) => row.fulfilment_model === "print_on_demand"),
    ...pick(rows, (row) => tags(row).includes(MERCH_TAGS.popular) && !tags(row).includes(MERCH_TAGS.bestSeller)),
    ...pick(rows, isDigital),
    ...pick(rows, (row) => asNumber(row.price) <= 0 || tags(row).includes(MERCH_TAGS.businessDeal)),
    ...newest.slice(0, MERCHANDISING.sectionLimit).map((row) => row.id),
  ];

  const ids = Array.from(new Set(sectionIds));
  return fetchProductsByIds(ids);
}
