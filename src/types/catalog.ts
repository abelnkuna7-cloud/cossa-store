/**
 * Core Cossa Store domain types.
 * These mirror the intended Supabase schema for Phase 2 integration.
 */

export type FulfilmentType =
  | "cossa_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital"
  | "service";

export const FULFILMENT_LABELS: Record<FulfilmentType, string> = {
  cossa_stock: "In stock",
  local_supplier: "Ships from local supplier",
  local_dropshipping: "Ships from local supplier",
  international_dropshipping: "International fulfilment",
  print_on_demand: "Made to order",
  affiliate: "Partner offer",
  digital: "Instant digital delivery",
  service: "Service available",
};

export type VatStatus = "vat_inclusive" | "vat_exclusive" | "zero_rated" | "exempt";

export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "backorder"
  | "made_to_order";

export type ProductStatus = "draft" | "active" | "archived";

export type CategorySlug =
  | "construction-diy"
  | "cleaning-facility-supplies"
  | "technology-smart-solutions";

export type PublicationState =
  | "draft"
  | "pending_review"
  | "approved"
  | "published"
  | "unpublished"
  | "archived";

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

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hero_image_url: string | null;
  campaign_name: string | null;
  status: "draft" | "active" | "inactive" | "archived";
  sort_order: number;
}

export interface ProductImage {
  url: string | null;
  alt: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface AffiliateOfferPublic {
  partner_name: string;
  tracking_url: string;
  disclosure_text: string | null;
}

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
  supplier_id: string | null;
  supplier_sku: string | null;
  cost_price: number | null;
  selling_price: number;
  compare_at_price: number | null;
  vat_status: VatStatus;
  stock_status: StockStatus;
  stock_quantity: number | null;
  fulfilment_type: FulfilmentType;
  estimated_delivery: string;
  images: ProductImage[];
  specifications: ProductSpecification[];
  features: string[];
  warranty: string | null;
  return_eligibility: string;
  status: ProductStatus;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
  /* Phase 2.1 catalogue fields */
  collection: { name: string; slug: string } | null;
  item_type: string | null;
  product_story: string | null;
  care_instructions: string | null;
  requires_quote: boolean;
  made_to_order: boolean;
  variants: ProductVariantPublic[];
  /* Phase 2.2 merchandising */
  product_type: "physical" | "digital" | "service" | "bundle" | "affiliate";
  is_featured: boolean;
  tags: string[];
  published_at: string | null;
  /** True only when real counted stock is available. */
  stock_available: boolean;
  affiliate: AffiliateOfferPublic | null;

  /* ---- Optional extended fields (used by the demo/placeholder catalogue) ---- */
  /** DEMO PRODUCT — REPLACE BEFORE LAUNCH. Never a real, sellable line. */
  is_demo?: boolean;
  /** Draft / published state for catalogue migration tooling. */
  publication_status?: "draft" | "published";
  supplier_name?: string | null;
  supplier_reference?: string | null;
  province_availability?: string[];
  project_slugs?: string[];
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
  kit_items?: { label: string; quantity: string }[];
  /** Human display label for the demo taxonomy (e.g. "Print-on-Demand Apparel"). */
  display_category?: string;
}

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

export interface ProjectBundle {
  slug: string;
  name: string;
  description: string;
  categories: CategorySlug[];
  subcategories: string[];
  /** Plain-language description of the job this kit covers. */
  job?: string;
  /** Drives the on-page project quantity/size calculator. */
  calculator?: ProjectCalculator;
  /** Hub filter themes. */
  themes: ProjectTheme[];
  /** Who the project is for. */
  audiences: ProjectAudience[];
  /** Honest catalogue readiness for this project. */
  availability: ProjectAvailability;
  /** 1 = easiest to complete, 5 = most involved. */
  effort: 1 | 2 | 3 | 4 | 5;
  budgetBand: ProjectBudgetBand;
  /** Relative interest used for "most popular" sorting only. */
  popularity: number;
  /** ISO date the project was published — drives "newest" sorting. */
  addedAt: string;
  /** Cossa services that genuinely apply to this project. */
  services?: ProjectServiceOption[];
  /** Accessories customers commonly need alongside the kit. */
  accessories?: string[];
}

export type ProjectTheme = "construction" | "cleaning" | "technology" | "workplace";

export type ProjectAudience =
  | "home"
  | "business"
  | "personal"
  | "women"
  | "men"
  | "kids"
  | "toddlers";

export type ProjectAvailability = "products_available" | "quote_required" | "coming_soon";

export type ProjectBudgetBand = "low" | "medium" | "high";

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

/** A single calculator input. */
export interface ProjectField {
  id: string;
  label: string;
  type: "number" | "select";
  unit?: string;
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  help?: string;
}

export type ProjectFieldValues = Record<string, number | string>;

/** A derived kit line. */
export interface ProjectOutput {
  id: string;
  label: string;
  resultUnit: string;
  /** Pure function of the entered field values. */
  compute: (values: ProjectFieldValues) => number;
  roundUp?: boolean;
  /** Extra allowance for cutting, spillage or breakage, e.g. 0.1 = 10%. */
  wastePercent?: number;
  /** Honest availability for this line item. */
  availability?: "product" | "quote" | "coming_soon";
}

export interface ProjectCalculator {
  /** Short name of the primary calculator, e.g. "Wall area". */
  label: string;
  fields: ProjectField[];
  outputs: ProjectOutput[];
  note?: string;
}

/** A saved project stored on the customer's device (or account, once live). */
export interface SavedProject {
  id: string;
  slug: string;
  name: string;
  values: ProjectFieldValues;
  lines: { label: string; quantity: number; unit: string }[];
  services: string[];
  notes: string;
  status: "planning" | "quote_requested" | "ordered" | "complete";
  quoteReference: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---- Commerce ---- */

export interface CartLine {
  product_id: string;
  quantity: number;
}

export interface QuoteLine {
  product_id: string;
  quantity: number;
}

export type QuoteScope = "products_only" | "products_and_services";

export interface QuoteRequestInput {
  contact_name: string;
  company: string | null;
  email: string;
  phone: string;
  location: string;
  scope: QuoteScope;
  project_description: string;
  items: QuoteLine[];
}

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

export type SubmissionState = "idle" | "submitting" | "pending" | "error";