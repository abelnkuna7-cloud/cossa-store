/**
 * Cossa Store internal catalogue management.
 *
 * STAFF / ADMIN ONLY
 * ------------------
 *
 * This service powers the no-code Catalogue Manager used to create and manage:
 *
 * - Cossa-owned stock
 * - local supplier products
 * - white-label supplier products
 * - local dropshipping products
 * - international dropshipping products
 * - print-on-demand products
 * - affiliate / partner offers
 * - digital products
 * - service-supported products
 * - quote-only products
 * - project kits / bundles
 *
 * SECURITY
 * --------
 *
 * Every request runs as the currently authenticated Supabase user.
 *
 * Row-level security remains authoritative.
 *
 * Private supplier costs, provider identifiers and fulfilment information
 * must never be exposed through the public storefront catalogue service.
 */

import { supabase } from "@/integrations/supabase/client";

import type {
  PublicationState,
} from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* SHARED TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type PodProvider =
  | "printify"
  | "gelato"
  | "printful"
  | "other";

export type SupplierType =
  | "own_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital"
  | "service";

/* -------------------------------------------------------------------------- */
/* ADMIN PRODUCT LIST                                                         */
/* -------------------------------------------------------------------------- */

export interface AdminProductRow {
  id: string;

  sku: string;

  name: string;

  slug: string;

  item_type: string | null;

  sourcing_model: string;

  product_type: string;

  publication_state: PublicationState;

  status: string;

  visibility: string;

  is_featured: boolean;

  requires_quote: boolean;

  requires_shipping: boolean;

  sourcing_enabled: boolean;

  updated_at: string;

  category: {
    slug: string;
    name: string;
  } | null;

  collection: {
    slug: string;
    name: string;
  } | null;

  variantCount: number;

  activeVariantCount: number;

  publicPrice: number | null;

  supplierCount: number;

  hasAffiliateOffer: boolean;
}

const LIST_SELECT = `
  id,
  sku,
  name,
  slug,
  item_type,
  sourcing_model,
  product_type,
  publication_state,
  status,
  visibility,
  is_featured,
  requires_quote,
  requires_shipping,
  sourcing_enabled,
  updated_at,

  commerce_categories:category_id (
    slug,
    name
  ),

  commerce_collections:collection_id (
    slug,
    name
  ),

  product_variants (
    id,
    is_active,
    retail_price
  ),

  product_prices (
    amount,
    price_type,
    is_active
  ),

  supplier_products (
    id,
    is_active
  ),

  affiliate_offers (
    id,
    is_active
  )
`;

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapAdminProductRow(
  row: any,
): AdminProductRow {
  const retailPrices = (
    row.product_prices ?? []
  )
    .filter(
      (price: any) =>
        price.is_active &&
        (
          price.price_type === "retail" ||
          price.price_type === "promotional"
        ),
    )
    .map(
      (price: any) =>
        Number(price.amount),
    )
    .filter(
      (amount: number) =>
        Number.isFinite(amount) &&
        amount > 0,
    );

  const variantPrices = (
    row.product_variants ?? []
  )
    .filter(
      (variant: any) =>
        variant.is_active,
    )
    .map(
      (variant: any) =>
        variant.retail_price === null
          ? null
          : Number(
              variant.retail_price,
            ),
    )
    .filter(
      (
        amount: number | null,
      ): amount is number =>
        typeof amount === "number" &&
        Number.isFinite(amount) &&
        amount > 0,
    );

  const publicPrices = [
    ...retailPrices,
    ...variantPrices,
  ];

  const suppliers = (
    row.supplier_products ?? []
  ).filter(
    (supplier: any) =>
      supplier.is_active,
  );

  const affiliateOffers = (
    row.affiliate_offers ?? []
  ).filter(
    (offer: any) =>
      offer.is_active,
  );

  return {
    id: row.id,

    sku: row.sku,

    name: row.name,

    slug: row.slug,

    item_type:
      row.item_type ?? null,

    sourcing_model:
      row.sourcing_model,

    product_type:
      row.product_type,

    publication_state:
      row.publication_state,

    status:
      row.status,

    visibility:
      row.visibility,

    is_featured:
      Boolean(
        row.is_featured,
      ),

    requires_quote:
      Boolean(
        row.requires_quote,
      ),

    requires_shipping:
      Boolean(
        row.requires_shipping,
      ),

    sourcing_enabled:
      Boolean(
        row.sourcing_enabled,
      ),

    updated_at:
      row.updated_at,

    category:
      row.commerce_categories ??
      null,

    collection:
      row.commerce_collections ??
      null,

    variantCount:
      (
        row.product_variants ??
        []
      ).length,

    activeVariantCount:
      (
        row.product_variants ??
        []
      ).filter(
        (variant: any) =>
          variant.is_active,
      ).length,

    publicPrice:
      publicPrices.length > 0
        ? Math.min(
            ...publicPrices,
          )
        : null,

    supplierCount:
      suppliers.length,

    hasAffiliateOffer:
      affiliateOffers.length >
      0,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listAdminProducts(): Promise<
  AdminProductRow[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .order(
      "updated_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).map(
    mapAdminProductRow,
  );
}

/* -------------------------------------------------------------------------- */
/* PRODUCT DETAIL                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchAdminProduct(
  id: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(`
      *,
      product_pod_details(*),
      affiliate_offers(*),
      supplier_products(
        *,
        suppliers(*)
      )
    `)
    .eq(
      "id",
      id,
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/* PRODUCT INPUT                                                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* PRODUCT CREATE / UPDATE                                                    */
/* -------------------------------------------------------------------------- */

export async function createProduct(
  input: ProductDraftInput,
) {
  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error(
      "You must be signed in to create catalogue products.",
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("products")
    // Supabase-generated types may lag migrations temporarily.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      ...(input as any),

      created_by:
        authData.user.id,

      publication_state:
        "draft",

      status:
        "draft",

      published_at:
        null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductDraftInput>,
) {
  const {
    error,
  } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(
      patch as any,
    )
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* PUBLICATION WORKFLOW                                                       */
/* -------------------------------------------------------------------------- */

export async function setPublicationState(
  id: string,
  state: PublicationState,
) {
  const patch: Record<
    string,
    unknown
  > = {
    publication_state:
      state,
  };

  switch (state) {
    case "draft":
      patch.status =
        "draft";

      patch.published_at =
        null;

      break;

    case "pending_review":
      patch.status =
        "draft";

      break;

    case "approved":
      /**
       * Approved does not automatically mean publicly live.
       *
       * Publishing remains a separate deliberate action.
       */
      patch.status =
        "draft";

      break;

    case "published":
      patch.status =
        "active";

      patch.published_at =
        new Date().toISOString();

      break;

    case "unpublished":
      patch.status =
        "draft";

      patch.published_at =
        null;

      break;

    case "archived":
      patch.status =
        "archived";

      break;
  }

  const {
    error,
  } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(
      patch as any,
    )
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* DUPLICATE PRODUCT                                                          */
/* -------------------------------------------------------------------------- */

export async function duplicateProduct(
  id: string,
) {
  const source =
    await fetchAdminProduct(
      id,
    );

  if (!source) {
    throw new Error(
      "Product not found",
    );
  }

  const suffix =
    Date.now()
      .toString(36)
      .slice(-5)
      .toUpperCase();

  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error(
      "You must be signed in to duplicate a product.",
    );
  }

  /**
   * Deliberately copy only recognised product fields.
   *
   * Do NOT copy:
   *
   * - database IDs
   * - publication timestamps
   * - approval metadata
   * - POD details
   * - supplier links
   * - affiliate links
   * - variants
   * - prices
   * - media
   *
   * Those are separate commercial records.
   */

  const duplicate = {
    name:
      `${source.name} (copy)`,

    sku:
      `${source.sku}-C${suffix}`,

    slug:
      `${source.slug}-copy-${suffix.toLowerCase()}`,

    short_description:
      source.short_description ??
      "",

    full_description:
      source.full_description ??
      "",

    category_id:
      source.category_id ??
      null,

    brand_id:
      source.brand_id ??
      null,

    collection_id:
      source.collection_id ??
      null,

    item_type:
      source.item_type ??
      "",

    sourcing_model:
      source.sourcing_model,

    product_type:
      source.product_type,

    visibility:
      source.visibility,

    is_featured:
      false,

    requires_shipping:
      source.requires_shipping,

    requires_quote:
      source.requires_quote,

    is_customisable:
      source.is_customisable,

    sourcing_enabled:
      source.sourcing_enabled,

    campaign_name:
      source.campaign_name ??
      null,

    design_name:
      source.design_name ??
      null,

    slogan:
      source.slogan ??
      null,

    product_story:
      source.product_story ??
      null,

    audience:
      source.audience ??
      null,

    tags:
      source.tags ?? [],

    features:
      source.features ?? [],

    care_instructions:
      source.care_instructions ??
      null,

    warranty:
      source.warranty ??
      null,

    return_policy:
      source.return_policy ??
      null,

    seo_title:
      null,

    seo_description:
      source.seo_description ??
      null,

    created_by:
      authData.user.id,

    publication_state:
      "draft",

    status:
      "draft",

    published_at:
      null,

    approved_at:
      null,

    approved_by:
      null,

    reviewed_at:
      null,

    reviewed_by:
      null,

    review_notes:
      null,
  };

  const {
    data,
    error,
  } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(
      duplicate as any,
    )
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

/* -------------------------------------------------------------------------- */
/* UNIQUENESS VALIDATION                                                      */
/* -------------------------------------------------------------------------- */

async function isTaken(
  column:
    | "sku"
    | "slug",
  value: string,
  ignoreId?: string,
) {
  let query =
    supabase
      .from("products")
      .select("id")
      .eq(
        column,
        value,
      )
      .limit(1);

  if (ignoreId) {
    query =
      query.neq(
        "id",
        ignoreId,
      );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).length > 0;
}

export const isProductCodeTaken = (
  value: string,
  ignoreId?: string,
) =>
  isTaken(
    "sku",
    value,
    ignoreId,
  );

export const isSlugTaken = (
  value: string,
  ignoreId?: string,
) =>
  isTaken(
    "slug",
    value,
    ignoreId,
  );

export async function isVariantSkuTaken(
  value: string,
  ignoreId?: string,
) {
  let query =
    supabase
      .from(
        "product_variants",
      )
      .select("id")
      .eq(
        "variant_sku",
        value,
      )
      .limit(1);

  if (ignoreId) {
    query =
      query.neq(
        "id",
        ignoreId,
      );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).length > 0;
}

/* -------------------------------------------------------------------------- */
/* PRINT-ON-DEMAND                                                            */
/* -------------------------------------------------------------------------- */

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

export async function upsertPodDetails(
  productId: string,
  input: PodDetailsInput,
) {
  const {
    error,
  } = await supabase
    .from(
      "product_pod_details",
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(
      {
        product_id:
          productId,

        ...(input as any),
      },
      {
        onConflict:
          "product_id",
      },
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* VARIANTS                                                                   */
/* -------------------------------------------------------------------------- */

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

export async function listVariants(
  productId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "product_variants",
    )
    .select(`
      *,
      product_variant_provider_details(*)
    `)
    .eq(
      "product_id",
      productId,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createVariant(
  productId: string,
  variant: VariantInput,
  provider:
    | VariantProviderInput
    | null,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "product_variants",
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      product_id:
        productId,

      options: {},

      ...(variant as any),
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  if (provider) {
    const {
      error:
        providerError,
    } = await supabase
      .from(
        "product_variant_provider_details",
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(
        {
          variant_id:
            data.id,

          product_id:
            productId,

          ...(provider as any),
        },
        {
          onConflict:
            "variant_id",
        },
      );

    if (providerError) {
      throw providerError;
    }
  }

  return data.id as string;
}

export async function updateVariant(
  variantId: string,
  productId: string,
  variant:
    Partial<VariantInput>,
  provider:
    | VariantProviderInput
    | null,
) {
  const {
    error,
  } = await supabase
    .from(
      "product_variants",
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(
      variant as any,
    )
    .eq(
      "id",
      variantId,
    );

  if (error) {
    throw error;
  }

  if (provider) {
    const {
      error:
        providerError,
    } = await supabase
      .from(
        "product_variant_provider_details",
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(
        {
          variant_id:
            variantId,

          product_id:
            productId,

          ...(provider as any),
        },
        {
          onConflict:
            "variant_id",
        },
      );

    if (providerError) {
      throw providerError;
    }
  }
}

export async function deactivateVariant(
  variantId: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "product_variants",
    )
    .update({
      is_active:
        false,
    })
    .eq(
      "id",
      variantId,
    );

  if (error) {
    throw error;
  }
}

export async function activateVariant(
  variantId: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "product_variants",
    )
    .update({
      is_active:
        true,
    })
    .eq(
      "id",
      variantId,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* MEDIA                                                                      */
/* -------------------------------------------------------------------------- */

export async function listProductMedia(
  productId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "product_media",
    )
    .select("*")
    .eq(
      "product_id",
      productId,
    )
    .order(
      "display_order",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addProductMedia(
  input: {
    product_id: string;

    url: string;

    alt_text:
      | string
      | null;

    display_order:
      number;

    is_primary:
      boolean;

    is_public:
      boolean;

    variant_id?:
      | string
      | null;
  },
) {
  const {
    error,
  } = await supabase
    .from(
      "product_media",
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      media_type:
        "image",

      ...(input as any),
    });

  if (error) {
    throw error;
  }
}

export async function removeProductMedia(
  id: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "product_media",
    )
    .delete()
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

export async function updateProductMediaAlt(
  id: string,
  altText:
    | string
    | null,
) {
  const {
    error,
  } = await supabase
    .from(
      "product_media",
    )
    .update({
      alt_text:
        altText,
    })
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

export async function setPrimaryProductMedia(
  productId: string,
  mediaId: string,
) {
  /**
   * Remove the previous primary image first.
   */
  const {
    error:
      resetError,
  } = await supabase
    .from(
      "product_media",
    )
    .update({
      is_primary:
        false,
    })
    .eq(
      "product_id",
      productId,
    );

  if (resetError) {
    throw resetError;
  }

  const {
    error,
  } = await supabase
    .from(
      "product_media",
    )
    .update({
      is_primary:
        true,
    })
    .eq(
      "id",
      mediaId,
    )
    .eq(
      "product_id",
      productId,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* PRICES                                                                     */
/* -------------------------------------------------------------------------- */

export async function listProductPrices(
  productId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "product_prices",
    )
    .select("*")
    .eq(
      "product_id",
      productId,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addProductPrice(
  input: {
    product_id: string;

    price_type:
      | "retail"
      | "promotional"
      | "business"
      | "cost";

    amount: number;

    currency: string;

    minimum_quantity:
      number;

    starts_at:
      | string
      | null;

    ends_at:
      | string
      | null;

    vat_inclusive:
      boolean;
  },
) {
  const {
    error,
  } = await supabase
    .from(
      "product_prices",
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(
      input as any,
    );

  if (error) {
    throw error;
  }
}

export async function removeProductPrice(
  id: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "product_prices",
    )
    .delete()
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* AFFILIATE / PARTNER OFFERS                                                 */
/* -------------------------------------------------------------------------- */

export interface AffiliateOfferInput {
  partner_name: string;

  partner_network:
    | string
    | null;

  tracking_url: string;

  commission_type:
    string;

  commission_rate:
    | number
    | null;

  disclosure_text:
    | string
    | null;

  is_active: boolean;
}

export async function listAffiliateOffers(
  productId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "affiliate_offers",
    )
    .select(`
      id,
      product_id,
      partner_name,
      partner_network,
      tracking_url,
      commission_type,
      commission_rate,
      disclosure_text,
      is_active,
      created_at,
      updated_at
    `)
    .eq(
      "product_id",
      productId,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createAffiliateOffer(
  productId: string,
  input: AffiliateOfferInput,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "affiliate_offers",
    )
    .insert({
      product_id:
        productId,

      partner_name:
        input.partner_name,

      partner_network:
        input.partner_network,

      tracking_url:
        input.tracking_url,

      commission_type:
        input.commission_type,

      commission_rate:
        input.commission_rate,

      disclosure_text:
        input.disclosure_text,

      is_active:
        input.is_active,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function updateAffiliateOffer(
  id: string,
  patch:
    Partial<AffiliateOfferInput>,
) {
  const {
    error,
  } = await supabase
    .from(
      "affiliate_offers",
    )
    .update(patch)
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

export async function deactivateAffiliateOffer(
  id: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "affiliate_offers",
    )
    .update({
      is_active:
        false,
    })
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

export async function removeAffiliateOffer(
  id: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "affiliate_offers",
    )
    .delete()
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* SUPPLIERS / WHITE LABEL                                                    */
/* -------------------------------------------------------------------------- */

export interface SupplierOption {
  id: string;

  name: string;

  slug: string;

  supplier_type:
    SupplierType;

  country: string;

  website:
    | string
    | null;

  contact_person:
    | string
    | null;

  email:
    | string
    | null;

  phone:
    | string
    | null;

  delivery_areas:
    | string
    | null;

  minimum_order:
    | string
    | null;

  average_lead_time_days:
    | number
    | null;

  payment_terms:
    | string
    | null;

  reliability_rating:
    | number
    | null;

  is_active: boolean;
}

export async function listSuppliers(): Promise<
  SupplierOption[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("suppliers")
    .select(`
      id,
      name,
      slug,
      supplier_type,
      country,
      website,
      contact_person,
      email,
      phone,
      delivery_areas,
      minimum_order,
      average_lead_time_days,
      payment_terms,
      reliability_rating,
      is_active
    `)
    .eq(
      "is_active",
      true,
    )
    .order(
      "name",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ) as SupplierOption[];
}

export async function listAllSuppliers() {
  const {
    data,
    error,
  } = await supabase
    .from("suppliers")
    .select("*")
    .order(
      "name",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* SUPPLIER PRODUCT LINKS                                                     */
/* -------------------------------------------------------------------------- */

export interface SupplierProductInput {
  supplier_id: string;

  supplier_sku:
    | string
    | null;

  supplier_cost:
    | number
    | null;

  currency: string;

  supplier_stock:
    | number
    | null;

  minimum_order_quantity:
    | number
    | null;

  supplier_lead_time_days:
    | number
    | null;

  is_preferred: boolean;

  is_active: boolean;

  variant_id:
    | string
    | null;
}

export async function listProductSuppliers(
  productId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "supplier_products",
    )
    .select(`
      id,
      product_id,
      variant_id,
      supplier_id,
      supplier_sku,
      supplier_cost,
      currency,
      supplier_stock,
      minimum_order_quantity,
      supplier_lead_time_days,
      is_preferred,
      is_active,
      created_at,
      updated_at,
      suppliers (
        id,
        name,
        slug,
        supplier_type,
        country,
        website,
        contact_person,
        email,
        phone,
        delivery_areas,
        minimum_order,
        average_lead_time_days,
        payment_terms,
        reliability_rating,
        is_active
      )
    `)
    .eq(
      "product_id",
      productId,
    )
    .order(
      "is_preferred",
      {
        ascending: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addProductSupplier(
  productId: string,
  input:
    SupplierProductInput,
) {
  /**
   * Prevent accidental duplicate supplier/product/variant rows
   * through the admin UI.
   */
  let existingQuery =
    supabase
      .from(
        "supplier_products",
      )
      .select("id")
      .eq(
        "product_id",
        productId,
      )
      .eq(
        "supplier_id",
        input.supplier_id,
      )
      .limit(1);

  if (input.variant_id) {
    existingQuery =
      existingQuery.eq(
        "variant_id",
        input.variant_id,
      );
  } else {
    existingQuery =
      existingQuery.is(
        "variant_id",
        null,
      );
  }

  const {
    data: existing,
    error:
      existingError,
  } = await existingQuery;

  if (existingError) {
    throw existingError;
  }

  if (
    existing &&
    existing.length > 0
  ) {
    throw new Error(
      "This supplier is already connected to this product or variant.",
    );
  }

  if (
    input.is_preferred
  ) {
    await clearPreferredSupplier(
      productId,
      input.variant_id,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "supplier_products",
    )
    .insert({
      product_id:
        productId,

      supplier_id:
        input.supplier_id,

      supplier_sku:
        input.supplier_sku,

      supplier_cost:
        input.supplier_cost,

      currency:
        input.currency,

      supplier_stock:
        input.supplier_stock,

      minimum_order_quantity:
        input.minimum_order_quantity,

      supplier_lead_time_days:
        input.supplier_lead_time_days,

      is_preferred:
        input.is_preferred,

      is_active:
        input.is_active,

      variant_id:
        input.variant_id,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function updateProductSupplier(
  id: string,
  productId: string,
  patch:
    Partial<SupplierProductInput>,
) {
  if (
    patch.is_preferred ===
    true
  ) {
    const {
      data: existing,
      error:
        existingError,
    } = await supabase
      .from(
        "supplier_products",
      )
      .select("variant_id")
      .eq(
        "id",
        id,
      )
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    await clearPreferredSupplier(
      productId,
      existing?.variant_id ??
        null,
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "supplier_products",
    )
    .update(patch)
    .eq(
      "id",
      id,
    )
    .eq(
      "product_id",
      productId,
    );

  if (error) {
    throw error;
  }
}

export async function setPreferredSupplier(
  productId: string,
  supplierProductId: string,
) {
  const {
    data: target,
    error:
      targetError,
  } = await supabase
    .from(
      "supplier_products",
    )
    .select(
      "variant_id",
    )
    .eq(
      "id",
      supplierProductId,
    )
    .eq(
      "product_id",
      productId,
    )
    .maybeSingle();

  if (targetError) {
    throw targetError;
  }

  if (!target) {
    throw new Error(
      "Supplier product link not found.",
    );
  }

  await clearPreferredSupplier(
    productId,
    target.variant_id ??
      null,
  );

  const {
    error,
  } = await supabase
    .from(
      "supplier_products",
    )
    .update({
      is_preferred:
        true,
    })
    .eq(
      "id",
      supplierProductId,
    )
    .eq(
      "product_id",
      productId,
    );

  if (error) {
    throw error;
  }
}

async function clearPreferredSupplier(
  productId: string,
  variantId:
    | string
    | null,
) {
  let query =
    supabase
      .from(
        "supplier_products",
      )
      .update({
        is_preferred:
          false,
      })
      .eq(
        "product_id",
        productId,
      );

  if (variantId) {
    query =
      query.eq(
        "variant_id",
        variantId,
      );
  } else {
    query =
      query.is(
        "variant_id",
        null,
      );
  }

  const {
    error,
  } = await query;

  if (error) {
    throw error;
  }
}

export async function deactivateProductSupplier(
  id: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "supplier_products",
    )
    .update({
      is_active:
        false,

      is_preferred:
        false,
    })
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

export async function removeProductSupplier(
  id: string,
) {
  const {
    error,
  } = await supabase
    .from(
      "supplier_products",
    )
    .delete()
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE / MANAGE SUPPLIER                                                   */
/* -------------------------------------------------------------------------- */

export interface SupplierInput {
  name: string;

  slug: string;

  supplier_type:
    SupplierType;

  country: string;

  website:
    | string
    | null;

  contact_person:
    | string
    | null;

  email:
    | string
    | null;

  phone:
    | string
    | null;

  delivery_areas:
    | string
    | null;

  minimum_order:
    | string
    | null;

  average_lead_time_days:
    | number
    | null;

  payment_terms:
    | string
    | null;

  reliability_rating:
    | number
    | null;

  internal_notes:
    | string
    | null;

  is_active: boolean;
}

export async function createSupplier(
  input: SupplierInput,
) {
  const {
    data,
    error,
  } = await supabase
    .from("suppliers")
    .insert(input)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function updateSupplier(
  id: string,
  patch:
    Partial<SupplierInput>,
) {
  const {
    error,
  } = await supabase
    .from("suppliers")
    .update(patch)
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

export async function deactivateSupplier(
  id: string,
) {
  const {
    error,
  } = await supabase
    .from("suppliers")
    .update({
      is_active:
        false,
    })
    .eq(
      "id",
      id,
    );

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* COLLECTIONS                                                                */
/* -------------------------------------------------------------------------- */

export async function listAllCollections() {
  const {
    data,
    error,
  } = await supabase
    .from(
      "commerce_collections",
    )
    .select("*")
    .order(
      "sort_order",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createCollection(
  input: {
    name: string;

    slug: string;

    description:
      | string
      | null;

    campaign_name:
      | string
      | null;

    status:
      | "draft"
      | "active"
      | "inactive"
      | "archived";

    sort_order: number;
  },
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "commerce_collections",
    )
    .insert(input)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

/* -------------------------------------------------------------------------- */
/* CATEGORIES                                                                 */
/* -------------------------------------------------------------------------- */

export async function listCommerceCategories() {
  const {
    data,
    error,
  } = await supabase
    .from(
      "commerce_categories",
    )
    .select(`
      id,
      name,
      slug,
      parent_id,
      description,
      display_order,
      is_active
    `)
    .eq(
      "is_active",
      true,
    )
    .order(
      "display_order",
      {
        ascending: true,
      },
    )
    .order(
      "name",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* BRANDS                                                                     */
/* -------------------------------------------------------------------------- */

export async function listBrands() {
  const {
    data,
    error,
  } = await supabase
    .from("brands")
    .select(`
      id,
      name,
      slug,
      logo_url,
      is_active
    `)
    .eq(
      "is_active",
      true,
    )
    .order(
      "name",
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createBrand(
  input: {
    name: string;

    slug: string;

    description?:
      | string
      | null;

    logo_url?:
      | string
      | null;
  },
) {
  const {
    data,
    error,
  } = await supabase
    .from("brands")
    .insert({
      name:
        input.name,

      slug:
        input.slug,

      description:
        input.description ??
        null,

      logo_url:
        input.logo_url ??
        null,

      is_active:
        true,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}
