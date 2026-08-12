/**
 * Core Cossa Store commerce-domain types.
 *
 * This file is the shared application contract between:
 *
 * - Supabase catalogue data
 * - catalogue.service.ts
 * - React Query
 * - product pages
 * - cart
 * - quote basket
 * - checkout
 * - project commerce
 * - supplier / fulfilment workflows
 * - future Cossa AI commerce support
 *
 * IMPORTANT ARCHITECTURE
 * ----------------------
 *
 * A commercial item has several separate concepts:
 *
 * 1. Product type
 *    What is the underlying thing being sold?
 *
 * 2. Fulfilment type
 *    How will it be supplied or delivered?
 *
 * 3. Availability
 *    Can the customer obtain it now, and by what route?
 *
 * 4. Publication state
 *    May it appear publicly?
 *
 * 5. Visibility
 *    Who may see it?
 *
 * 6. Price presentation
 *    Is it fixed-price, "from", quotation-based, etc.?
 *
 * These concepts must remain separate.
 */

/* -------------------------------------------------------------------------- */
/* PRODUCT TYPE                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors the current Supabase `product_type` enum.
 *
 * Project kits should normally use:
 *
 * product_type = "bundle"
 *
 * with project-specific metadata / catalogue classification rather than
 * creating a conflicting database product type.
 */
export type ProductType =
  | "physical"
  | "digital"
  | "service"
  | "bundle"
  | "affiliate";

/* -------------------------------------------------------------------------- */
/* CATALOGUE ENTRY TYPE                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Higher-level Store classification.
 *
 * This is intentionally broader than Supabase product_type.
 *
 * It supports the future Catalogue Manager question:
 *
 * "What are you adding?"
 */
export type CatalogueEntryType =
  | "cossa_stocked_product"
  | "local_supplier_product"
  | "dropshipping_product"
  | "print_on_demand_product"
  | "affiliate_partner_offer"
  | "digital_product"
  | "service_supported_product"
  | "quote_only_product"
  | "project_kit";

export const CATALOGUE_ENTRY_LABELS: Record<
  CatalogueEntryType,
  string
> = {
  cossa_stocked_product:
    "Cossa stocked product",

  local_supplier_product:
    "Local supplier product",

  dropshipping_product:
    "Dropshipping product",

  print_on_demand_product:
    "Print-on-demand product",

  affiliate_partner_offer:
    "Affiliate / partner offer",

  digital_product:
    "Digital product",

  service_supported_product:
    "Service-supported product",

  quote_only_product:
    "Quote-only product",

  project_kit:
    "Project kit",
};

/* -------------------------------------------------------------------------- */
/* FULFILMENT                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Application-level fulfilment model.
 *
 * Most values map directly from Supabase `sourcing_model`.
 *
 * `quote_only` and `project_kit` are application-level commercial states,
 * not current Supabase sourcing_model enum values.
 */
export type FulfilmentType =
  | "cossa_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital"
  | "service"
  | "quote_only"
  | "project_kit";

export const FULFILMENT_LABELS: Record<
  FulfilmentType,
  string
> = {
  cossa_stock:
    "Cossa stock",

  local_supplier:
    "Ships from local supplier",

  local_dropshipping:
    "Dropshipped from local supplier",

  international_dropshipping:
    "International fulfilment",

  print_on_demand:
    "Produced after ordering",

  affiliate:
    "Partner offer",

  digital:
    "Digital delivery",

  service:
    "Service",

  quote_only:
    "Quotation required",

  project_kit:
    "Project kit",
};

/* -------------------------------------------------------------------------- */
/* VAT / TAX                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Customer-facing VAT interpretation.
 *
 * catalog.service.ts derives this from:
 *
 * products.tax_class
 * +
 * product_prices.vat_inclusive
 */
export type VatStatus =
  | "vat_inclusive"
  | "vat_exclusive"
  | "zero_rated"
  | "exempt";

/* -------------------------------------------------------------------------- */
/* STOCK                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Physical inventory state.
 *
 * Primarily meaningful for Cossa-owned stock or inventory where an
 * authoritative quantity exists.
 */
export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "backorder"
  | "made_to_order";

/* -------------------------------------------------------------------------- */
/* COMMERCIAL AVAILABILITY                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Broader customer-facing availability.
 *
 * IMPORTANT:
 * This is an application/domain field.
 *
 * It is NOT currently a direct `products` table column.
 *
 * It can be derived from sourcing model, supplier information,
 * product type, stock and quotation requirements.
 */
export type AvailabilityStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "backorder"
  | "made_to_order"
  | "available_from_supplier"
  | "available_to_order"
  | "digital_available"
  | "service_available"
  | "partner_offer"
  | "quote_required"
  | "coming_soon";

/* -------------------------------------------------------------------------- */
/* PRODUCT STATUS                                                             */
/* -------------------------------------------------------------------------- */

export type ProductStatus =
  | "draft"
  | "active"
  | "archived";

/* -------------------------------------------------------------------------- */
/* PUBLICATION                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors Supabase `product_publication_state`.
 */
export type PublicationState =
  | "draft"
  | "pending_review"
  | "approved"
  | "published"
  | "unpublished"
  | "archived";

/* -------------------------------------------------------------------------- */
/* VISIBILITY                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors the actual Supabase `product_visibility` enum.
 *
 * Do not use "private" here.
 */
export type ProductVisibility =
  | "public"
  | "business_only"
  | "hidden";

/* -------------------------------------------------------------------------- */
/* PRICE PRESENTATION                                                         */
/* -------------------------------------------------------------------------- */

export type PriceDisplayMode =
  | "fixed"
  | "from"
  | "quote"
  | "free"
  | "not_applicable";

/* -------------------------------------------------------------------------- */
/* CATEGORY                                                                   */
/* -------------------------------------------------------------------------- */

export type CategorySlug =
  | "construction-diy"
  | "cleaning-facility-supplies"
  | "technology-smart-solutions";

/* -------------------------------------------------------------------------- */
/* PRODUCT VARIANTS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Public application representation of a Supabase product variant.
 *
 * IMPORTANT MAPPING
 * -----------------
 *
 * Database:
 * product_variants.variant_sku
 *
 * Application:
 * ProductVariantPublic.sku
 *
 * catalog.service.ts performs that mapping.
 */
export interface ProductVariantPublic {
  id: string;

  name: string;

  sku: string;

  colour: string | null;

  size: string | null;

  finish: string | null;

  phone_model: string | null;

  material: string | null;

  retail_price: number | null;

  compare_at_price: number | null;

  shipping_estimate: string | null;

  is_active: boolean;
}

/* -------------------------------------------------------------------------- */
/* COLLECTIONS                                                                */
/* -------------------------------------------------------------------------- */

export interface Collection {
  id: string;

  name: string;

  slug: string;

  description: string | null;

  hero_image_url: string | null;

  campaign_name: string | null;

  status:
    | "draft"
    | "active"
    | "inactive"
    | "archived";

  sort_order: number;
}

/* -------------------------------------------------------------------------- */
/* PRODUCT MEDIA / SPECIFICATIONS                                             */
/* -------------------------------------------------------------------------- */

export interface ProductImage {
  url: string | null;

  alt: string;
}

export interface ProductSpecification {
  label: string;

  value: string;
}

/* -------------------------------------------------------------------------- */
/* AFFILIATE OFFER                                                            */
/* -------------------------------------------------------------------------- */

export interface AffiliateOfferPublic {
  partner_name: string;

  tracking_url: string;

  disclosure_text: string | null;
}

/* -------------------------------------------------------------------------- */
/* PRODUCT                                                                    */
/* -------------------------------------------------------------------------- */

export interface Product {
  id: string;

  sku: string;

  name: string;

  slug: string;

  short_description: string;

  full_description: string;

  category: string;

  subcategory: string;

  brand: string | null;

  /* ---------------------------------------------------------------------- */
  /* PUBLIC SUPPLIER SAFETY                                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * These remain for compatibility with older tooling.
   *
   * Public catalogue services must return null.
   *
   * Never expose supplier cost information through storefront reads.
   */
  supplier_id: string | null;

  supplier_sku: string | null;

  cost_price: number | null;

  /* ---------------------------------------------------------------------- */
  /* PRICING                                                                */
  /* ---------------------------------------------------------------------- */

  selling_price: number;

  compare_at_price: number | null;

  /**
   * How the displayed selling price should be interpreted.
   *
   * Optional during migration.
   */
  price_display_mode?: PriceDisplayMode;

  /**
   * Minimum quantity connected to a displayed customer price,
   * where applicable.
   */
  minimum_quantity?: number | null;

  vat_status: VatStatus;

  /* ---------------------------------------------------------------------- */
  /* AVAILABILITY / STOCK                                                   */
  /* ---------------------------------------------------------------------- */

  /**
   * Legacy / physical inventory state.
   */
  stock_status: StockStatus;

  /**
   * Broader commerce availability.
   *
   * Derived at application level.
   */
  availability_status?: AvailabilityStatus;

  stock_quantity: number | null;

  stock_available: boolean;

  /* ---------------------------------------------------------------------- */
  /* FULFILMENT                                                             */
  /* ---------------------------------------------------------------------- */

  fulfilment_type: FulfilmentType;

  estimated_delivery: string;

  /* ---------------------------------------------------------------------- */
  /* PUBLIC CONTENT                                                         */
  /* ---------------------------------------------------------------------- */

  images: ProductImage[];

  specifications: ProductSpecification[];

  features: string[];

  warranty: string | null;

  return_eligibility: string;

  /* ---------------------------------------------------------------------- */
  /* CATALOGUE STATE                                                        */
  /* ---------------------------------------------------------------------- */

  status: ProductStatus;

  /**
   * These two fields mirror the actual Supabase catalogue workflow.
   *
   * They are optional temporarily so demo/migration records do not break
   * while the catalogue is being normalised.
   *
   * Real database products should populate them.
   */
  publication_state?: PublicationState;

  visibility?: ProductVisibility;

  /* ---------------------------------------------------------------------- */
  /* SEO                                                                    */
  /* ---------------------------------------------------------------------- */

  seo_title: string;

  seo_description: string;

  /* ---------------------------------------------------------------------- */
  /* TIMESTAMPS                                                             */
  /* ---------------------------------------------------------------------- */

  created_at: string;

  updated_at: string;

  published_at: string | null;

  /* ---------------------------------------------------------------------- */
  /* MERCHANDISING                                                          */
  /* ---------------------------------------------------------------------- */

  collection: {
    name: string;
    slug: string;
  } | null;

  item_type: string | null;

  catalogue_entry_type?: CatalogueEntryType;

  product_story: string | null;

  care_instructions: string | null;

  requires_quote: boolean;

  made_to_order: boolean;

  variants: ProductVariantPublic[];

  product_type: ProductType;

  is_featured: boolean;

  tags: string[];

  affiliate: AffiliateOfferPublic | null;

  /* ---------------------------------------------------------------------- */
  /* DEVELOPMENT / MIGRATION                                                */
  /* ---------------------------------------------------------------------- */

  /**
   * DEMO PRODUCT — REPLACE BEFORE LAUNCH.
   *
   * Demo catalogue records may remain available for explicit Store-building
   * and preview workflows but must never be treated as real inventory.
   */
  is_demo?: boolean;

  /**
   * Legacy demo publication marker.
   *
   * Real catalogue records should use publication_state.
   */
  publication_status?:
    | "draft"
    | "published";

  supplier_name?: string | null;

  supplier_reference?: string | null;

  province_availability?: string[];

  project_slugs?: string[];

  /**
   * Specialist support options associated with a product.
   *
   * Example:
   * installation / facility support / technology setup.
   */
  service_options?: string[];

  related_slugs?: string[];

  frequently_together?: string[];

  digital_download?: boolean;

  affiliate_url?: string | null;

  printify_product_id?: string | null;

  dropship_reference?: string | null;

  service_included?: boolean;

  lead_time?: string | null;

  customisation_options?: string[];

  kit_items?: {
    label: string;
    quantity: string;
  }[];

  /**
   * Human-readable demo/migration taxonomy.
   *
   * Example:
   * "Print-on-Demand Apparel"
   */
  display_category?: string;
}

/* -------------------------------------------------------------------------- */
/* CATEGORY                                                                   */
/* -------------------------------------------------------------------------- */

export interface Subcategory {
  slug: string;

  name: string;
}

export interface Category {
  slug: CategorySlug;

  name: string;

  tagline: string;

  description: string;

  subcategories: Subcategory[];
}

/* -------------------------------------------------------------------------- */
/* PROJECT COMMERCE                                                           */
/* -------------------------------------------------------------------------- */

export interface ProjectBundle {
  slug: string;

  name: string;

  description: string;

  categories: CategorySlug[];

  subcategories: string[];

  /**
   * Plain-language description of the project/job.
   */
  job?: string;

  /**
   * Quantity / size calculator.
   */
  calculator?: ProjectCalculator;

  /**
   * Project-hub filtering.
   */
  themes: ProjectTheme[];

  audiences: ProjectAudience[];

  /**
   * Honest project-catalogue readiness.
   */
  availability: ProjectAvailability;

  /**
   * 1 = easiest
   * 5 = most involved
   */
  effort:
    | 1
    | 2
    | 3
    | 4
    | 5;

  budgetBand: ProjectBudgetBand;

  /**
   * Internal relative sorting signal.
   *
   * Do not represent this as real sales popularity unless supported by
   * actual customer/transaction data.
   */
  popularity: number;

  /**
   * ISO publication date.
   */
  addedAt: string;

  /**
   * Appropriate specialist support within the Cossa group.
   */
  services?: ProjectServiceOption[];

  accessories?: string[];
}

export type ProjectTheme =
  | "construction"
  | "cleaning"
  | "technology"
  | "workplace";

export type ProjectAudience =
  | "home"
  | "business"
  | "personal"
  | "women"
  | "men"
  | "kids"
  | "toddlers";

export type ProjectAvailability =
  | "products_available"
  | "quote_required"
  | "coming_soon";

export type ProjectBudgetBand =
  | "low"
  | "medium"
  | "high";

/* -------------------------------------------------------------------------- */
/* GROUP SERVICE SUPPORT                                                      */
/* -------------------------------------------------------------------------- */

export type ProjectServiceProvider =
  | "Cossa Nexus Construction"
  | "Cossa Facility Services"
  | "Cossa Tech";

export interface ProjectServiceOption {
  id: string;

  name: string;

  provider: ProjectServiceProvider;

  description: string;
}

/* -------------------------------------------------------------------------- */
/* PROJECT CALCULATOR                                                         */
/* -------------------------------------------------------------------------- */

export interface ProjectField {
  id: string;

  label: string;

  type:
    | "number"
    | "select";

  unit?: string;

  defaultValue:
    | number
    | string;

  min?: number;

  max?: number;

  step?: number;

  options?: {
    value: string;
    label: string;
  }[];

  help?: string;
}

export type ProjectFieldValues = Record<
  string,
  number | string
>;

export interface ProjectOutput {
  id: string;

  label: string;

  resultUnit: string;

  /**
   * Pure calculation from customer-entered values.
   */
  compute: (
    values: ProjectFieldValues,
  ) => number;

  roundUp?: boolean;

  /**
   * Additional material allowance.
   *
   * Example:
   * 0.10 = 10%
   */
  wastePercent?: number;

  availability?:
    | "product"
    | "quote"
    | "coming_soon";
}

export interface ProjectCalculator {
  label: string;

  fields: ProjectField[];

  outputs: ProjectOutput[];

  note?: string;
}

/* -------------------------------------------------------------------------- */
/* SAVED PROJECT                                                              */
/* -------------------------------------------------------------------------- */

export interface SavedProject {
  id: string;

  slug: string;

  name: string;

  values: ProjectFieldValues;

  lines: {
    label: string;
    quantity: number;
    unit: string;
  }[];

  services: string[];

  notes: string;

  status:
    | "planning"
    | "quote_requested"
    | "ordered"
    | "complete";

  quoteReference: string | null;

  createdAt: string;

  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* CART                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Product + variant forms cart-line identity.
 *
 * `variant_id: null` means there is no selected variant.
 */
export interface CartLine {
  product_id: string;

  quantity: number;

  variant_id?: string | null;
}

/* -------------------------------------------------------------------------- */
/* QUOTE BASKET                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Product + variant forms quotation-line identity.
 */
export interface QuoteLine {
  product_id: string;

  quantity: number;

  variant_id?: string | null;
}

/* -------------------------------------------------------------------------- */
/* QUOTE REQUEST                                                              */
/* -------------------------------------------------------------------------- */

export type QuoteScope =
  | "products_only"
  | "services_only"
  | "products_and_services"
  | "bulk_order"
  | "product_sourcing";

export interface QuoteRequestInput {
  contact_name: string;

  company: string | null;

  email: string;

  phone: string;

  location: string | null;

  scope: QuoteScope;

  /**
   * Customer-described project / purchasing requirement.
   *
   * New quote services use `requirements`.
   */
  requirements: string;

  estimated_quantity?: string | null;

  required_date?: string | null;

  budget?: string | null;

  additional_information?: string | null;

  items: QuoteLine[];
}

/* -------------------------------------------------------------------------- */
/* BUSINESS ACCOUNT                                                           */
/* -------------------------------------------------------------------------- */

export interface BusinessAccountApplicationInput {
  registered_name: string;

  trading_name: string | null;

  registration_number: string;

  vat_number: string | null;

  contact_person: string;

  email: string;

  phone: string;

  billing_address: string;

  delivery_address: string;

  industry: string;

  estimated_monthly_spend: string;

  required_categories: string[];

  bulk_requirements: string;

  preferred_payment_method: string;
}

/* -------------------------------------------------------------------------- */
/* SUPPLIER APPLICATION                                                       */
/* -------------------------------------------------------------------------- */

export interface SupplierApplicationInput {
  company_name: string;

  registration_details: string;

  contact_person: string;

  email: string;

  phone: string;

  website: string | null;

  product_categories: string[];

  brands_supplied: string;

  wholesale_available: boolean;

  dropshipping_available: boolean;

  minimum_order: string;

  delivery_areas: string;

  lead_times: string;

  catalogue_upload_available: boolean;

  feed_capability: string;
}

/* -------------------------------------------------------------------------- */
/* FORM SUBMISSION STATE                                                      */
/* -------------------------------------------------------------------------- */

export type SubmissionState =
  | "idle"
  | "submitting"
  | "pending"
  | "error";
