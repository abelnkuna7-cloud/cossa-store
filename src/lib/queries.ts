import { queryOptions } from "@tanstack/react-query";

import {
  fetchCategory,
  fetchProductBySlug,
  fetchProject,
  listFeaturedProducts,
  listPublicCollections,
  listProducts,
  listProjectProducts,
  listRelatedProducts,
  listStorefrontProducts,
  type ProductQuery,
} from "@/services/catalog.service";
import { fetchProductsByIds } from "@/services/catalog.service";
import type { Product } from "@/types/catalog";

export const featuredProductsQuery = (limit = 8) =>
  queryOptions({
    queryKey: ["products", "featured", limit],
    queryFn: () => listFeaturedProducts(limit),
  });

export const storefrontProductsQuery = () =>
  queryOptions({
    queryKey: ["products", "storefront"],
    queryFn: () => listStorefrontProducts(),
  });

export const publicCollectionsQuery = () =>
  queryOptions({
    queryKey: ["collections", "public"],
    queryFn: () => listPublicCollections(),
  });

export const productsQuery = (query: ProductQuery) =>
  queryOptions({
    queryKey: ["products", "list", query],
    queryFn: () => listProducts(query),
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["products", "detail", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

export const relatedProductsQuery = (product: Product) =>
  queryOptions({
    queryKey: ["products", "related", product.id],
    queryFn: () => listRelatedProducts(product),
  });

export const productsByIdsQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["products", "byIds", [...ids].sort()],
    queryFn: () => fetchProductsByIds(ids),
  });

export const categoryQuery = (slug: string) =>
  queryOptions({
    queryKey: ["categories", slug],
    queryFn: () => fetchCategory(slug),
  });

export const projectQuery = (slug: string) =>
  queryOptions({
    queryKey: ["projects", slug],
    queryFn: async () => ({
      project: await fetchProject(slug),
      products: await listProjectProducts(slug),
    }),
  });
