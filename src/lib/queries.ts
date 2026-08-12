import { queryOptions } from "@tanstack/react-query";

import {
  fetchCategory,
  fetchProductBySlug,
  fetchProductsByIds,
  fetchProject,
  listFeaturedProducts,
  listProducts,
  listProjectProducts,
  listPublicCollections,
  listRelatedProducts,
  listStorefrontProducts,
  type ProductQuery,
} from "@/services/catalog.service";

import type { Product } from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* PRODUCTS                                                                   */
/* -------------------------------------------------------------------------- */

export const featuredProductsQuery = (
  limit = 8,
) =>
  queryOptions({
    queryKey: [
      "products",
      "featured",
      limit,
    ],

    queryFn: () =>
      listFeaturedProducts(
        limit,
      ),
  });

export const storefrontProductsQuery = () =>
  queryOptions({
    queryKey: [
      "products",
      "storefront",
    ],

    queryFn: () =>
      listStorefrontProducts(),
  });

export const productsQuery = (
  query: ProductQuery,
) =>
  queryOptions({
    queryKey: [
      "products",
      "list",
      query,
    ],

    queryFn: () =>
      listProducts(
        query,
      ),
  });

export const productQuery = (
  slug: string,
) =>
  queryOptions({
    queryKey: [
      "products",
      "detail",
      slug,
    ],

    queryFn: () =>
      fetchProductBySlug(
        slug,
      ),
  });

export const relatedProductsQuery = (
  product: Product,
) =>
  queryOptions({
    queryKey: [
      "products",
      "related",
      product.id,
    ],

    queryFn: () =>
      listRelatedProducts(
        product,
      ),
  });

/**
 * Fetch public product records for cart, wishlist and quote-basket lines.
 *
 * Product IDs are sorted in the query key so:
 *
 * ["a", "b"]
 *
 * and
 *
 * ["b", "a"]
 *
 * use the same React Query cache entry.
 *
 * The original IDs are still passed to the service because the service
 * remains responsible for resolving the actual catalogue records.
 */
export const productsByIdsQuery = (
  ids: string[],
) => {
  const stableIds =
    Array.from(
      new Set(ids),
    ).sort();

  return queryOptions({
    queryKey: [
      "products",
      "byIds",
      stableIds,
    ],

    queryFn: () =>
      fetchProductsByIds(
        stableIds,
      ),
  });
};

/* -------------------------------------------------------------------------- */
/* COLLECTIONS                                                                */
/* -------------------------------------------------------------------------- */

export const publicCollectionsQuery = () =>
  queryOptions({
    queryKey: [
      "collections",
      "public",
    ],

    queryFn: () =>
      listPublicCollections(),
  });

/* -------------------------------------------------------------------------- */
/* CATEGORIES                                                                 */
/* -------------------------------------------------------------------------- */

export const categoryQuery = (
  slug: string,
) =>
  queryOptions({
    queryKey: [
      "categories",
      slug,
    ],

    queryFn: () =>
      fetchCategory(
        slug,
      ),
  });

/* -------------------------------------------------------------------------- */
/* PROJECT COMMERCE                                                           */
/* -------------------------------------------------------------------------- */

export const projectQuery = (
  slug: string,
) =>
  queryOptions({
    queryKey: [
      "projects",
      slug,
    ],

    queryFn: async () => ({
      project:
        await fetchProject(
          slug,
        ),

      products:
        await listProjectProducts(
          slug,
        ),
    }),
  });
