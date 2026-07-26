/**
 * Catalogue data-access layer.
 *
 * Phase 1 reads from clearly-marked development seed data. Every function is
 * async and returns the same shapes the Supabase-backed implementation will
 * return, so Phase 2 only replaces the bodies of these functions.
 */
import { DEV_SEED_PRODUCTS } from "@/data/dev-seed-products";
import { CATEGORIES, PROJECTS, getCategory, getProject } from "@/data/categories";
import type { Category, Product, ProjectBundle } from "@/types/catalog";

export interface ProductQuery {
  category?: string;
  subcategory?: string;
  search?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "name_asc";
}

function activeProducts(): Product[] {
  return DEV_SEED_PRODUCTS.filter((p) => p.status === "active");
}

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

export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  let results = activeProducts();

  if (query.category) results = results.filter((p) => p.category === query.category);
  if (query.subcategory) results = results.filter((p) => p.subcategory === query.subcategory);

  if (query.search) {
    const term = query.search.trim().toLowerCase();
    if (term) {
      results = results.filter((p) =>
        [p.name, p.short_description, p.brand ?? "", p.sku, p.subcategory]
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
  return activeProducts().filter((p) => project.subcategories.includes(p.subcategory));
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  return activeProducts().find((p) => p.slug === slug) ?? null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  return activeProducts().filter((p) => ids.includes(p.id));
}

export async function listFeaturedProducts(limit = 8): Promise<Product[]> {
  return activeProducts()
    .filter((p) => p.stock_status === "in_stock")
    .slice(0, limit);
}

export async function listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  return activeProducts()
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, limit);
}