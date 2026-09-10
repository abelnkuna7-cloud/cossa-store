import { supabase } from "@/integrations/supabase/client";
import { matchesStoreSearch } from "@/lib/store-search";
import {
  fetchProductsByIds,
  listProducts,
  type ProductQuery,
} from "@/services/store-products.service";
import type { Product } from "@/types/catalog";

const db = supabase as unknown as { from: (table: string) => any };

type ProductIdRow = { id: string };

type SearchCandidateRow = {
  id: string;
  name: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  merchandising_tags: string[] | null;
};

const SEARCH_CANDIDATE_SELECT =
  "id,name,sku,short_description,description,brand,category,merchandising_tags";

function uniqueIds(rows: ProductIdRow[]): string[] {
  return Array.from(new Set(rows.map((row) => row.id).filter(Boolean)));
}

async function queryPrimaryCategoryIds(category: string): Promise<string[]> {
  const { data, error } = await db
    .from("store_customer_products")
    .select("id")
    .eq("category", category);

  if (error) {
    console.error("[Cossa Store] Failed to filter primary category IDs", error);
    throw error;
  }

  return uniqueIds((data ?? []) as ProductIdRow[]);
}

async function queryAdditionalCategoryIds(category: string): Promise<string[]> {
  const { data, error } = await db
    .from("store_customer_products")
    .select("id")
    .contains("additional_categories", [category]);

  if (error) {
    console.error("[Cossa Store] Failed to filter additional category IDs", error);
    throw error;
  }

  return uniqueIds((data ?? []) as ProductIdRow[]);
}

async function queryCollectionIds(collection: string): Promise<string[]> {
  const { data, error } = await db
    .from("store_customer_products")
    .select("id")
    .contains("merchandising_tags", [collection]);

  if (error) {
    console.error("[Cossa Store] Failed to filter collection IDs", error);
    throw error;
  }

  return uniqueIds((data ?? []) as ProductIdRow[]);
}

async function querySearchIds(search: string): Promise<string[]> {
  const { data, error } = await db
    .from("store_customer_products")
    .select(SEARCH_CANDIDATE_SELECT);

  if (error) {
    console.error("[Cossa Store] Failed to load compact search candidates", error);
    throw error;
  }

  return ((data ?? []) as SearchCandidateRow[])
    .filter((row) =>
      matchesStoreSearch(
        {
          name: row.name,
          sku: row.sku,
          short_description: row.short_description,
          full_description: row.description,
          brand: row.brand,
          category: row.category,
          tags: row.merchandising_tags,
        },
        search,
      ),
    )
    .map((row) => row.id);
}

function intersectIds(groups: string[][]): string[] {
  const populated = groups.filter((group) => group.length > 0);
  if (populated.length === 0) return [];

  const [first, ...rest] = populated;
  return first.filter((id) => rest.every((group) => group.includes(id)));
}

function sortProducts(products: Product[], sort: ProductQuery["sort"]): Product[] {
  const sorted = [...products];

  switch (sort) {
    case "newest":
      sorted.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      break;
    case "price_asc":
      sorted.sort((a, b) => a.selling_price - b.selling_price);
      break;
    case "price_desc":
      sorted.sort((a, b) => b.selling_price - a.selling_price);
      break;
    case "name_asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }

  return sorted;
}

/**
 * Egress-conscious storefront listing.
 *
 * The legacy service is intentionally retained as the compatibility fallback.
 * For category, collection and search requests we first retrieve only IDs (or
 * compact searchable text), then hydrate full customer product rows + variants
 * for the matching products. This prevents normal browsing from downloading
 * the full catalogue payload and every variant before filtering in the browser.
 */
export async function listProductsEgressSafe(query: ProductQuery = {}): Promise<Product[]> {
  if (query.subcategory) {
    return listProducts(query);
  }

  const filters: string[][] = [];

  if (query.category) {
    const [primary, additional] = await Promise.all([
      queryPrimaryCategoryIds(query.category),
      queryAdditionalCategoryIds(query.category),
    ]);
    filters.push(Array.from(new Set([...primary, ...additional])));
  }

  if (query.collection) {
    filters.push(await queryCollectionIds(query.collection));
  }

  if (query.search?.trim()) {
    filters.push(await querySearchIds(query.search.trim()));
  }

  if (filters.length === 0) {
    return listProducts(query);
  }

  if (filters.some((group) => group.length === 0)) {
    return [];
  }

  const ids = intersectIds(filters);
  if (ids.length === 0) return [];

  return sortProducts(await fetchProductsByIds(ids), query.sort);
}

export async function listFeaturedProductsEgressSafe(limit = 8): Promise<Product[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 24));
  const { data, error } = await db
    .from("store_customer_products")
    .select("id")
    .eq("featured", true)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("[Cossa Store] Failed to load featured product IDs", error);
    throw error;
  }

  const ids = uniqueIds((data ?? []) as ProductIdRow[]);
  return fetchProductsByIds(ids);
}

export async function listRelatedProductsEgressSafe(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const departments = Array.from(
    new Set(
      [
        product.category,
        ...((product as Product & { additional_categories?: string[] }).additional_categories ?? []),
      ].filter(Boolean),
    ),
  );

  if (departments.length === 0) return [];

  const idGroups = await Promise.all(
    departments.map(async (department) => {
      const [primary, additional] = await Promise.all([
        queryPrimaryCategoryIds(department),
        queryAdditionalCategoryIds(department),
      ]);
      return [...primary, ...additional];
    }),
  );

  const ids = Array.from(new Set(idGroups.flat()))
    .filter((id) => id !== product.id)
    .slice(0, Math.max(limit * 3, limit));

  if (ids.length === 0) return [];

  const products = await fetchProductsByIds(ids);
  const departmentSet = new Set(departments);

  return products
    .filter((candidate) => {
      const candidateDepartments = [
        candidate.category,
        ...((candidate as Product & { additional_categories?: string[] }).additional_categories ?? []),
      ];
      return candidateDepartments.some((department) => departmentSet.has(department));
    })
    .slice(0, limit);
}
