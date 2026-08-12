/**
 * Public Cossa Store catalogue data-access layer.
 *
 * PURPOSE
 * -------
 * This service is the public storefront boundary between Supabase and the
 * Cossa Store application domain.
 *
 * SECURITY
 * --------
 * Public catalogue reads must never expose:
 *
 * - supplier costs
 * - supplier internal notes
 * - provider credentials
 * - provider production costs
 * - private supplier identifiers
 * - draft products
 * - hidden products
 * - internal approval/review information
 *
 * Supabase RLS remains the authoritative database security boundary.
 * Explicit application filters below provide additional defence in depth.
 *
 * COMMERCE MODEL
 * --------------
 * This mapper normalises Supabase data into the public Product domain used by:
 *
 * - product pages
 * - search
 * - categories
 * - project commerce
 * - cart
 * - quote basket
 * - homepage merchandising
 * - future Cossa AI commerce support
 */

import { supabase } from "@/integrations/supabase/client";

import {
  CATEGORIES,
  PROJECTS,
  getCategory,
  getProject,
} from "@/data/categories";

import {
  DEMO_STOREFRONT,
  findDemoProductBySlug,
} from "@/data/demo-catalogue";

import type {
  AvailabilityStatus,
  Category,
  CatalogueEntryType,
  FulfilmentType,
  PriceDisplayMode,
  Product,
  ProductVariantPublic,
  ProjectBundle,
  StockStatus,
  VatStatus,
} from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* PRODUCT QUERY                                                              */
/* -------------------------------------------------------------------------- */

export interface ProductQuery {
  category?: string;

  subcategory?: string;

  search?: string;

  collection?: string;

  sort?:
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "name_asc";
}

/* -------------------------------------------------------------------------- */
/* PUBLIC SELECT                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Customer-safe Supabase projection.
 *
 * IMPORTANT:
 * Do NOT add fields such as:
 *
 * - supplier_products.supplier_cost
 * - suppliers.internal_notes
 * - product_variant_provider_details.production_cost
 * - provider dashboard URLs
 * - private catalogue review information
 */
const SELECT = `
  id,
  sku,
  name,
  slug,
  short_description,
  full_description,
  item_type,
  product_story,
  care_instructions,
  requires_quote,
  sourcing_model,
  warranty,
  return_policy,
  seo_title,
  seo_description,
  created_at,
  updated_at,
  features,
  product_type,
  is_featured,
  tags,
  published_at,
  publication_state,
  visibility,
  status,
  tax_class,

  commerce_categories:category_id (
    slug,
    name
  ),

  brands:brand_id (
    name
  ),

  commerce_collections:collection_id (
    name,
    slug
  ),

  product_media (
    id,
    url,
    alt_text,
    display_order,
    is_primary,
    media_type,
    is_public
  ),

  product_variants (
    id,
    name,
    variant_sku,
    colour,
    size,
    finish,
    phone_model,
    material,
    retail_price,
    compare_at_price,
    shipping_estimate,
    is_active,
    stock_quantity
  ),

  product_prices (
    amount,
    price_type,
    is_active,
    minimum_quantity,
    starts_at,
    ends_at,
    vat_inclusive
  ),

  product_attributes (
    label,
    value,
    display_order
  ),

  affiliate_offers (
    partner_name,
    tracking_url,
    disclosure_text,
    is_active
  )
`;

/* -------------------------------------------------------------------------- */
/* FULFILMENT                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Maps the current Supabase sourcing_model enum into the Store domain.
 */
const FULFILMENT_MAP: Record<string, FulfilmentType> = {
  own_stock: "cossa_stock",

  local_supplier: "local_supplier",

  local_dropshipping: "local_dropshipping",

  international_dropshipping:
    "international_dropshipping",

  print_on_demand:
    "print_on_demand",

  affiliate: "affiliate",

  digital: "digital",

  service: "service",
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function asNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function isCurrentPrice(
  price: {
    starts_at?: string | null;
    ends_at?: string | null;
  },
): boolean {
  const now =
    Date.now();

  if (price.starts_at) {
    const start =
      Date.parse(
        price.starts_at,
      );

    if (
      Number.isFinite(start) &&
      start > now
    ) {
      return false;
    }
  }

  if (price.ends_at) {
    const end =
      Date.parse(
        price.ends_at,
      );

    if (
      Number.isFinite(end) &&
      end < now
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Convert actual Supabase tax fields into the Store's customer-facing
 * VAT representation.
 *
 * Source:
 *
 * products.tax_class
 * +
 * product_prices.vat_inclusive
 */
function mapVatStatus(
  taxClass: unknown,
  vatInclusive:
    | boolean
    | null
    | undefined,
): VatStatus {
  if (
    taxClass ===
    "zero_rated"
  ) {
    return "zero_rated";
  }

  if (
    taxClass ===
    "exempt"
  ) {
    return "exempt";
  }

  /**
   * Standard-rated products use the authoritative price-level
   * vat_inclusive flag.
   *
   * The current Supabase schema stores this as a boolean.
   */
  if (
    vatInclusive === false
  ) {
    return "vat_exclusive";
  }

  return "vat_inclusive";
}

/**
 * Additional application-side public-product check.
 *
 * RLS must still enforce these rules independently.
 */
function isPublicRow(
  row: any,
): boolean {
  return (
    row?.status ===
      "active" &&
    row?.publication_state ===
      "published" &&
    row?.visibility ===
      "public"
  );
}

/* -------------------------------------------------------------------------- */
/* CATALOGUE ENTRY TYPE                                                       */
/* -------------------------------------------------------------------------- */

function deriveCatalogueEntryType(
  sourcing: string,
  productType: Product["product_type"],
  requiresQuote: boolean,
): CatalogueEntryType {
  if (requiresQuote) {
    return "quote_only_product";
  }

  switch (sourcing) {
    case "own_stock":
      return "cossa_stocked_product";

    case "local_supplier":
      return "local_supplier_product";

    case "local_dropshipping":
    case "international_dropshipping":
      return "dropshipping_product";

    case "print_on_demand":
      return "print_on_demand_product";

    case "affiliate":
      return "affiliate_partner_offer";

    case "digital":
      return "digital_product";

    case "service":
      return "service_supported_product";

    default:
      return productType === "digital"
        ? "digital_product"
        : "local_supplier_product";
  }
}

/* -------------------------------------------------------------------------- */
/* PRICE DISPLAY                                                              */
/* -------------------------------------------------------------------------- */

function derivePriceDisplayMode(
  requiresQuote: boolean,
  productType: Product["product_type"],
  sellingPrice: number,
  hasMultiplePrices: boolean,
): PriceDisplayMode {
  if (requiresQuote) {
    return "quote";
  }

  if (
    productType ===
      "service" &&
    sellingPrice <= 0
  ) {
    return "quote";
  }

  if (
    sellingPrice <= 0
  ) {
    return "quote";
  }

  if (hasMultiplePrices) {
    return "from";
  }

  return "fixed";
}

/* -------------------------------------------------------------------------- */
/* AVAILABILITY                                                               */
/* -------------------------------------------------------------------------- */

function deriveAvailability(
  sourcing: string,
  productType: Product["product_type"],
  requiresQuote: boolean,
  stockQuantity: number,
): AvailabilityStatus {
  if (requiresQuote) {
    return "quote_required";
  }

  switch (sourcing) {
    case "own_stock":
      if (
        productType !==
        "physical"
      ) {
        return "available_to_order";
      }

      return stockQuantity > 0
        ? "in_stock"
        : "out_of_stock";

    case "local_supplier":
      return "available_from_supplier";

    case "local_dropshipping":
    case "international_dropshipping":
      return "available_to_order";

    case "print_on_demand":
      return "made_to_order";

    case "affiliate":
      return "partner_offer";

    case "digital":
      return "digital_available";

    case "service":
      return "service_available";

    default:
      if (
        productType ===
        "digital"
      ) {
        return "digital_available";
      }

      if (
        productType ===
        "service"
      ) {
        return "service_available";
      }

      if (
        productType ===
        "affiliate"
      ) {
        return "partner_offer";
      }

      return "available_to_order";
  }
}

/* -------------------------------------------------------------------------- */
/* STOCK STATUS                                                               */
/* -------------------------------------------------------------------------- */

/**
 * StockStatus is retained for compatibility with existing Store components.
 *
 * AvailabilityStatus is the more accurate customer-facing commercial state.
 */
function deriveStockStatus(
  sourcing: string,
  productType: Product["product_type"],
  stockQuantity: number,
): StockStatus {
  if (
    sourcing ===
    "print_on_demand"
  ) {
    return "made_to_order";
  }

  if (
    sourcing ===
      "own_stock" &&
    productType ===
      "physical"
  ) {
    return stockQuantity > 0
      ? "in_stock"
      : "out_of_stock";
  }

  /**
   * Supplier/dropshipping products are NOT Cossa-owned inventory.
   *
   * We must not claim they are physically "in stock" at Cossa.
   */
  if (
    sourcing ===
      "local_supplier" ||
    sourcing ===
      "local_dropshipping" ||
    sourcing ===
      "international_dropshipping"
  ) {
    return "backorder";
  }

  /**
   * Digital/service/affiliate items do not have meaningful physical
   * inventory quantities.
   *
   * This compatibility field is secondary to availability_status.
   */
  return "made_to_order";
}

/* -------------------------------------------------------------------------- */
/* DELIVERY                                                                   */
/* -------------------------------------------------------------------------- */

function deriveDeliveryText(
  sourcing: string,
  variants: ProductVariantPublic[],
): string {
  const variantEstimate =
    variants.find(
      (variant) =>
        Boolean(
          variant.shipping_estimate,
        ),
    )?.shipping_estimate;

  if (variantEstimate) {
    return variantEstimate;
  }

  switch (sourcing) {
    case "own_stock":
      return "Delivery estimate confirmed before payment.";

    case "local_supplier":
      return "Supplier availability and delivery estimate confirmed before order processing.";

    case "local_dropshipping":
      return "Local supplier delivery estimate confirmed before order processing.";

    case "international_dropshipping":
      return "International fulfilment and delivery estimate confirmed before order processing.";

    case "print_on_demand":
      return "Made to order — production and delivery estimate confirmed before fulfilment.";

    case "affiliate":
      return "Delivery and fulfilment are handled by the partner retailer.";

    case "digital":
      return "Digital delivery details are provided after successful order processing.";

    case "service":
      return "Service scheduling is confirmed after your request.";

    default:
      return "Delivery estimate confirmed before payment.";
  }
}

/* -------------------------------------------------------------------------- */
/* PRODUCT MAPPER                                                             */
/* -------------------------------------------------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapProduct(
  row: any,
): Product {
  /* ---------------------------------------------------------------------- */
  /* VARIANTS                                                               */
  /* ---------------------------------------------------------------------- */

  const variants: ProductVariantPublic[] =
    (
      row.product_variants ??
      []
    )
      .filter(
        (variant: any) =>
          Boolean(
            variant.is_active,
          ),
      )
      .map(
        (
          variant: any,
        ): ProductVariantPublic => ({
          id:
            String(
              variant.id,
            ),

          name:
            String(
              variant.name ??
                "",
            ),

          /**
           * IMPORTANT DOMAIN MAPPING:
           *
           * Supabase:
           * variant_sku
           *
           * Store:
           * sku
           */
          sku:
            String(
              variant.variant_sku ??
                "",
            ),

          colour:
            variant.colour ??
            null,

          size:
            variant.size ??
            null,

          finish:
            variant.finish ??
            null,

          phone_model:
            variant.phone_model ??
            null,

          material:
            variant.material ??
            null,

          retail_price:
            asNumber(
              variant.retail_price,
            ),

          compare_at_price:
            asNumber(
              variant.compare_at_price,
            ),

          shipping_estimate:
            variant.shipping_estimate ??
            null,

          is_active:
            true,
        }),
      );

  /* ---------------------------------------------------------------------- */
  /* ACTIVE PRICES                                                          */
  /* ---------------------------------------------------------------------- */

  const activePrices =
    (
      row.product_prices ??
      []
    ).filter(
      (price: any) =>
        Boolean(
          price.is_active,
        ) &&
        isCurrentPrice(
          price,
        ),
    );

  /**
   * Customer-facing retail/promotional prices only.
   *
   * Cost prices are intentionally ignored.
   */
  const customerPrices =
    activePrices.filter(
      (price: any) =>
        price.price_type ===
          "retail" ||
        price.price_type ===
          "promotional",
    );

  const productPriceValues =
    customerPrices
      .map(
        (price: any) =>
          asNumber(
            price.amount,
          ),
      )
      .filter(
        (
          value: number | null,
        ): value is number =>
          typeof value ===
            "number" &&
          value > 0,
      );

  const variantPriceValues =
    variants
      .map(
        (variant) =>
          variant.retail_price,
      )
      .filter(
        (
          value,
        ): value is number =>
          typeof value ===
            "number" &&
          value > 0,
      );

  const availablePrices = [
    ...productPriceValues,
    ...variantPriceValues,
  ];

  const sellingPrice =
    availablePrices.length >
    0
      ? Math.min(
          ...availablePrices,
        )
      : 0;

  const uniquePriceValues =
    Array.from(
      new Set(
        availablePrices,
      ),
    );

  /* ---------------------------------------------------------------------- */
  /* COMPARE-AT PRICE                                                       */
  /* ---------------------------------------------------------------------- */

  const compareCandidates =
    variants
      .map(
        (variant) =>
          variant.compare_at_price,
      )
      .filter(
        (
          value,
        ): value is number =>
          typeof value ===
            "number" &&
          Number.isFinite(
            value,
          ) &&
          value >
            sellingPrice,
      );

  const compareAtPrice =
    compareCandidates.length >
    0
      ? Math.min(
          ...compareCandidates,
        )
      : null;

  /* ---------------------------------------------------------------------- */
  /* TAX                                                                    */
  /* ---------------------------------------------------------------------- */

  /**
   * Use the customer price corresponding to the minimum visible
   * selling price where possible.
   */
  const selectedPrice =
    customerPrices.find(
      (price: any) =>
        asNumber(
          price.amount,
        ) === sellingPrice,
    ) ??
    customerPrices[0] ??
    null;

  const vatStatus =
    mapVatStatus(
      row.tax_class,
      selectedPrice
        ?.vat_inclusive,
    );

  const minimumQuantity =
    selectedPrice
      ? Math.max(
          1,
          Math.floor(
            asNumber(
              selectedPrice.minimum_quantity,
            ) ?? 1,
          ),
        )
      : null;

  /* ---------------------------------------------------------------------- */
  /* PRODUCT / SOURCING                                                     */
  /* ---------------------------------------------------------------------- */

  const sourcing =
    String(
      row.sourcing_model ??
        "own_stock",
    );

  const productType =
    (
      row.product_type ??
      "physical"
    ) as Product["product_type"];

  const requiresQuote =
    Boolean(
      row.requires_quote,
    );

  const madeToOrder =
    sourcing ===
      "print_on_demand";

  const fulfilmentType =
    requiresQuote
      ? "quote_only"
      : FULFILMENT_MAP[
          sourcing
        ] ??
        "cossa_stock";

  /* ---------------------------------------------------------------------- */
  /* STOCK                                                                  */
  /* ---------------------------------------------------------------------- */

  const activeVariantRows =
    (
      row.product_variants ??
      []
    ).filter(
      (variant: any) =>
        Boolean(
          variant.is_active,
        ),
    );

  const countedStock =
    activeVariantRows.reduce(
      (
        total: number,
        variant: any,
      ) => {
        const quantity =
          asNumber(
            variant.stock_quantity,
          );

        return (
          total +
          Math.max(
            0,
            quantity ?? 0,
          )
        );
      },
      0,
    );

  const ownsPhysicalStock =
    sourcing ===
      "own_stock" &&
    productType ===
      "physical";

  const stockStatus =
    deriveStockStatus(
      sourcing,
      productType,
      countedStock,
    );

  const availabilityStatus =
    deriveAvailability(
      sourcing,
      productType,
      requiresQuote,
      countedStock,
    );

  /* ---------------------------------------------------------------------- */
  /* AFFILIATE                                                              */
  /* ---------------------------------------------------------------------- */

  const affiliateRow =
    (
      row.affiliate_offers ??
      []
    ).find(
      (offer: any) =>
        Boolean(
          offer.is_active,
        ),
    ) ??
    null;

  /* ---------------------------------------------------------------------- */
  /* MEDIA                                                                  */
  /* ---------------------------------------------------------------------- */

  const media =
    (
      row.product_media ??
      []
    )
      .filter(
        (item: any) =>
          Boolean(
            item.is_public,
          ) &&
          item.media_type ===
            "image",
      )
      .sort(
        (
          first: any,
          second: any,
        ) =>
          Number(
            second.is_primary,
          ) -
            Number(
              first.is_primary,
            ) ||
          Number(
            first.display_order ??
              0,
          ) -
            Number(
              second.display_order ??
                0,
            ),
      );

  /* ---------------------------------------------------------------------- */
  /* SPECIFICATIONS                                                         */
  /* ---------------------------------------------------------------------- */

  const specifications =
    (
      row.product_attributes ??
      []
    )
      .sort(
        (
          first: any,
          second: any,
        ) =>
          Number(
            first.display_order ??
              0,
          ) -
          Number(
            second.display_order ??
              0,
          ),
      )
      .map(
        (attribute: any) => ({
          label:
            String(
              attribute.label ??
                "",
            ),

          value:
            String(
              attribute.value ??
                "",
            ),
        }),
      );

  /* ---------------------------------------------------------------------- */
  /* CATEGORY                                                               */
  /* ---------------------------------------------------------------------- */

  const categorySlug =
    row
      .commerce_categories
      ?.slug ??
    "uncategorised";

  /* ---------------------------------------------------------------------- */
  /* PRICING MODE                                                           */
  /* ---------------------------------------------------------------------- */

  const priceDisplayMode =
    derivePriceDisplayMode(
      requiresQuote,
      productType,
      sellingPrice,
      uniquePriceValues.length >
        1,
    );

  /* ---------------------------------------------------------------------- */
  /* CATALOGUE CLASSIFICATION                                               */
  /* ---------------------------------------------------------------------- */

  const catalogueEntryType =
    deriveCatalogueEntryType(
      sourcing,
      productType,
      requiresQuote,
    );

  /* ---------------------------------------------------------------------- */
  /* RESULT                                                                 */
  /* ---------------------------------------------------------------------- */

  return {
    id:
      String(
        row.id,
      ),

    sku:
      String(
        row.sku ??
          "",
      ),

    name:
      String(
        row.name ??
          "",
      ),

    slug:
      String(
        row.slug ??
          "",
      ),

    short_description:
      row.short_description ??
      "",

    full_description:
      row.full_description ??
      "",

    category:
      categorySlug,

    subcategory:
      categorySlug,

    brand:
      row.brands?.name ??
      null,

    /* -------------------------------------------------------------------- */
    /* PRIVATE SUPPLIER INFORMATION                                        */
    /* -------------------------------------------------------------------- */

    /**
     * Public storefront objects intentionally do not expose supplier
     * identifiers or costs.
     */
    supplier_id:
      null,

    supplier_sku:
      null,

    cost_price:
      null,

    /* -------------------------------------------------------------------- */
    /* PRICE                                                               */
    /* -------------------------------------------------------------------- */

    selling_price:
      sellingPrice,

    compare_at_price:
      compareAtPrice,

    price_display_mode:
      priceDisplayMode,

    minimum_quantity:
      minimumQuantity,

    vat_status:
      vatStatus,

    /* -------------------------------------------------------------------- */
    /* STOCK / AVAILABILITY                                                */
    /* -------------------------------------------------------------------- */

    stock_status:
      stockStatus,

    availability_status:
      availabilityStatus,

    stock_quantity:
      ownsPhysicalStock
        ? countedStock
        : null,

    stock_available:
      ownsPhysicalStock &&
      countedStock > 0,

    /* -------------------------------------------------------------------- */
    /* FULFILMENT                                                          */
    /* -------------------------------------------------------------------- */

    fulfilment_type:
      fulfilmentType,

    estimated_delivery:
      deriveDeliveryText(
        sourcing,
        variants,
      ),

    /* -------------------------------------------------------------------- */
    /* CONTENT                                                             */
    /* -------------------------------------------------------------------- */

    images:
      media.map(
        (item: any) => ({
          url:
            item.url ??
            null,

          alt:
            item.alt_text ??
            row.name ??
            "Cossa Store product",
        }),
      ),

    specifications,

    features:
      Array.isArray(
        row.features,
      )
        ? row.features
        : [],

    warranty:
      row.warranty ??
      null,

    return_eligibility:
      row.return_policy ??
      "Standard Cossa Store returns policy applies.",

    /* -------------------------------------------------------------------- */
    /* CATALOGUE STATE                                                     */
    /* -------------------------------------------------------------------- */

    status:
      row.status ===
        "active"
        ? "active"
        : row.status ===
            "archived"
          ? "archived"
          : "draft",

    publication_state:
      row.publication_state,

    visibility:
      row.visibility,

    /* -------------------------------------------------------------------- */
    /* SEO                                                                 */
    /* -------------------------------------------------------------------- */

    seo_title:
      row.seo_title ??
      `${row.name} | Cossa Store`,

    seo_description:
      row.seo_description ??
      row.short_description ??
      "",

    /* -------------------------------------------------------------------- */
    /* TIMESTAMPS                                                          */
    /* -------------------------------------------------------------------- */

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,

    published_at:
      row.published_at ??
      null,

    /* -------------------------------------------------------------------- */
    /* MERCHANDISING                                                       */
    /* -------------------------------------------------------------------- */

    collection:
      row.commerce_collections
        ? {
            name:
              row
                .commerce_collections
                .name,

            slug:
              row
                .commerce_collections
                .slug,
          }
        : null,

    item_type:
      row.item_type ??
      null,

    catalogue_entry_type:
      catalogueEntryType,

    product_story:
      row.product_story ??
      null,

    care_instructions:
      row.care_instructions ??
      null,

    requires_quote:
      requiresQuote,

    made_to_order:
      madeToOrder,

    variants,

    product_type:
      productType,

    is_featured:
      Boolean(
        row.is_featured,
      ),

    tags:
      Array.isArray(
        row.tags,
      )
        ? row.tags
        : [],

    affiliate:
      affiliateRow
        ? {
            partner_name:
              affiliateRow.partner_name,

            tracking_url:
              affiliateRow.tracking_url,

            disclosure_text:
              affiliateRow.disclosure_text ??
              null,
          }
        : null,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/* -------------------------------------------------------------------------- */
/* TAXONOMY                                                                   */
/* -------------------------------------------------------------------------- */

export async function listCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function fetchCategory(
  slug: string,
): Promise<Category | null> {
  return (
    getCategory(
      slug,
    ) ?? null
  );
}

export async function listProjects(): Promise<ProjectBundle[]> {
  return PROJECTS;
}

export async function fetchProject(
  slug: string,
): Promise<ProjectBundle | null> {
  return (
    getProject(
      slug,
    ) ?? null
  );
}

/* -------------------------------------------------------------------------- */
/* LIST PRODUCTS                                                              */
/* -------------------------------------------------------------------------- */

export async function listProducts(
  query: ProductQuery = {},
): Promise<Product[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .select(
        SELECT,
      )

      /**
       * Defence in depth.
       *
       * RLS should already enforce these requirements.
       */
      .eq(
        "status",
        "active",
      )
      .eq(
        "publication_state",
        "published",
      )
      .eq(
        "visibility",
        "public",
      )

      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    throw error;
  }

  const realProducts =
    (
      data ?? []
    )
      .filter(
        isPublicRow,
      )
      .map(
        mapProduct,
      );

  /**
   * Demo products remain intentionally available during Store construction.
   *
   * They are placeholders, not real inventory, and other Store safeguards
   * prevent them from normal checkout / search indexing.
   */
  let results: Product[] = [
    ...realProducts,
    ...DEMO_STOREFRONT,
  ];

  /* ---------------------------------------------------------------------- */
  /* CATEGORY FILTER                                                       */
  /* ---------------------------------------------------------------------- */

  if (query.category) {
    results =
      results.filter(
        (product) =>
          product.category ===
          query.category,
      );
  }

  /* ---------------------------------------------------------------------- */
  /* SUBCATEGORY FILTER                                                    */
  /* ---------------------------------------------------------------------- */

  if (query.subcategory) {
    results =
      results.filter(
        (product) =>
          product.subcategory ===
          query.subcategory,
      );
  }

  /* ---------------------------------------------------------------------- */
  /* COLLECTION FILTER                                                     */
  /* ---------------------------------------------------------------------- */

  if (query.collection) {
    results =
      results.filter(
        (product) =>
          product.collection
            ?.slug ===
          query.collection,
      );
  }

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                */
  /* ---------------------------------------------------------------------- */

  if (query.search) {
    const term =
      query.search
        .trim()
        .toLowerCase();

    if (term) {
      results =
        results.filter(
          (product) =>
            [
              product.name,

              product.short_description,

              product.brand ??
                "",

              product.sku,

              product.collection
                ?.name ??
                "",

              product.item_type ??
                "",

              ...product.tags,
            ]
              .join(
                " ",
              )
              .toLowerCase()
              .includes(
                term,
              ),
        );
    }
  }

  /* ---------------------------------------------------------------------- */
  /* SORT                                                                  */
  /* ---------------------------------------------------------------------- */

  switch (query.sort) {
    case "price_asc":
      results = [
        ...results,
      ].sort(
        (
          first,
          second,
        ) => {
          /**
           * Quote-only/zero-price products should not appear as the
           * "cheapest" product merely because their price is unknown.
           */
          const firstPrice =
            first.selling_price >
            0
              ? first.selling_price
              : Number.POSITIVE_INFINITY;

          const secondPrice =
            second.selling_price >
            0
              ? second.selling_price
              : Number.POSITIVE_INFINITY;

          return (
            firstPrice -
            secondPrice
          );
        },
      );

      break;

    case "price_desc":
      results = [
        ...results,
      ].sort(
        (
          first,
          second,
        ) =>
          second.selling_price -
          first.selling_price,
      );

      break;

    case "name_asc":
      results = [
        ...results,
      ].sort(
        (
          first,
          second,
        ) =>
          first.name.localeCompare(
            second.name,
          ),
      );

      break;

    case "relevance":
    default:
      break;
  }

  return results;
}

/* -------------------------------------------------------------------------- */
/* PROJECT PRODUCTS                                                           */
/* -------------------------------------------------------------------------- */

export async function listProjectProducts(
  slug: string,
): Promise<Product[]> {
  const project =
    getProject(
      slug,
    );

  if (!project) {
    return [];
  }

  const all =
    await listProducts();

  return all.filter(
    (product) =>
      (
        product.project_slugs ??
        []
      ).includes(
        slug,
      ) ||
      project.categories.includes(
        product.category as never,
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* PRODUCT DETAIL                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchProductBySlug(
  slug: string,
): Promise<Product | null> {
  /**
   * Demo records remain available explicitly during Store construction.
   */
  const demo =
    findDemoProductBySlug(
      slug,
    );

  if (demo) {
    return demo;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .select(
        SELECT,
      )
      .eq(
        "slug",
        slug,
      )
      .eq(
        "status",
        "active",
      )
      .eq(
        "publication_state",
        "published",
      )
      .eq(
        "visibility",
        "public",
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    !data ||
    !isPublicRow(
      data,
    )
  ) {
    return null;
  }

  return mapProduct(
    data,
  );
}

/* -------------------------------------------------------------------------- */
/* PRODUCTS BY ID                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchProductsByIds(
  ids: string[],
): Promise<Product[]> {
  const uniqueIds =
    Array.from(
      new Set(
        ids
          .map(
            (id) =>
              id.trim(),
          )
          .filter(
            Boolean,
          ),
      ),
    );

  if (
    uniqueIds.length ===
    0
  ) {
    return [];
  }

  const demo =
    DEMO_STOREFRONT.filter(
      (product) =>
        uniqueIds.includes(
          product.id,
        ),
    );

  const demoIds =
    new Set(
      demo.map(
        (product) =>
          product.id,
      ),
    );

  const realIds =
    uniqueIds.filter(
      (id) =>
        !demoIds.has(
          id,
        ),
    );

  if (
    realIds.length ===
    0
  ) {
    return demo;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .select(
        SELECT,
      )
      .in(
        "id",
        realIds,
      )
      .eq(
        "status",
        "active",
      )
      .eq(
        "publication_state",
        "published",
      )
      .eq(
        "visibility",
        "public",
      );

  if (error) {
    throw error;
  }

  const realProducts =
    (
      data ?? []
    )
      .filter(
        isPublicRow,
      )
      .map(
        mapProduct,
      );

  return [
    ...realProducts,
    ...demo,
  ];
}

/* -------------------------------------------------------------------------- */
/* FEATURED PRODUCTS                                                          */
/* -------------------------------------------------------------------------- */

export async function listFeaturedProducts(
  limit = 8,
): Promise<Product[]> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.floor(
          limit,
        ),
        100,
      ),
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .select(
        SELECT,
      )
      .eq(
        "status",
        "active",
      )
      .eq(
        "publication_state",
        "published",
      )
      .eq(
        "visibility",
        "public",
      )
      .eq(
        "is_featured",
        true,
      )
      .order(
        "published_at",
        {
          ascending: false,
          nullsFirst: false,
        },
      )
      .limit(
        safeLimit,
      );

  if (error) {
    throw error;
  }

  const realProducts =
    (
      data ?? []
    )
      .filter(
        isPublicRow,
      )
      .map(
        mapProduct,
      );

  const demoFeatured =
    DEMO_STOREFRONT.filter(
      (product) =>
        product.is_featured,
    );

  return [
    ...realProducts,
    ...demoFeatured,
  ].slice(
    0,
    safeLimit,
  );
}

/* -------------------------------------------------------------------------- */
/* RELATED PRODUCTS                                                           */
/* -------------------------------------------------------------------------- */

export async function listRelatedProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const safeLimit =
    Math.max(
      0,
      Math.floor(
        limit,
      ),
    );

  if (
    safeLimit === 0
  ) {
    return [];
  }

  const all =
    await listProducts();

  const explicit =
    (
      product.related_slugs ??
      []
    )
      .map(
        (identifier) =>
          all.find(
            (candidate) =>
              candidate.id ===
                identifier ||
              candidate.slug ===
                identifier,
          ),
      )
      .filter(
        (
          candidate,
        ): candidate is Product =>
          Boolean(
            candidate,
          ) &&
          candidate?.id !==
            product.id,
      );

  const sameCollection =
    all.filter(
      (candidate) =>
        candidate.id !==
          product.id &&
        Boolean(
          product.collection,
        ) &&
        candidate.collection
          ?.slug ===
          product.collection
            ?.slug,
    );

  const sameCategory =
    all.filter(
      (candidate) =>
        candidate.id !==
          product.id &&
        candidate.category ===
          product.category &&
        !sameCollection.some(
          (existing) =>
            existing.id ===
            candidate.id,
        ),
    );

  const merged = [
    ...explicit,
    ...sameCollection,
    ...sameCategory,
  ];

  return Array.from(
    new Map(
      merged.map(
        (candidate) => [
          candidate.id,
          candidate,
        ],
      ),
    ).values(),
  ).slice(
    0,
    safeLimit,
  );
}

/* -------------------------------------------------------------------------- */
/* PUBLIC COLLECTIONS                                                         */
/* -------------------------------------------------------------------------- */

export async function listPublicCollections() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "commerce_collections",
      )
      .select(
        `
          id,
          name,
          slug,
          description,
          hero_image_url,
          campaign_name,
          status,
          sort_order
        `,
      )
      .eq(
        "status",
        "active",
      )
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

/* -------------------------------------------------------------------------- */
/* STOREFRONT PRODUCTS                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Primary homepage merchandising read.
 *
 * Only real published/public products are read from Supabase.
 * Demo placeholders remain available during the Store build phase.
 */
export async function listStorefrontProducts(
  limit = 120,
): Promise<Product[]> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.floor(
          limit,
        ),
        250,
      ),
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .select(
        SELECT,
      )
      .eq(
        "status",
        "active",
      )
      .eq(
        "publication_state",
        "published",
      )
      .eq(
        "visibility",
        "public",
      )
      .order(
        "published_at",
        {
          ascending: false,
          nullsFirst: false,
        },
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(
        safeLimit,
      );

  if (error) {
    throw error;
  }

  const realProducts =
    (
      data ?? []
    )
      .filter(
        isPublicRow,
      )
      .map(
        mapProduct,
      );

  return [
    ...realProducts,
    ...DEMO_STOREFRONT,
  ].slice(
    0,
    safeLimit,
  );
}
