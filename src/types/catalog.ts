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
}

export interface ProjectCalculator {
  /** e.g. "Room size", "Team size", "Floor area" */
  label: string;
  /** e.g. "m²", "people", "workstations" */
  unit: string;
  /** Sensible starting value shown in the input. */
  defaultValue: number;
  min: number;
  max: number;
  /** Line items derived from the input value. */
  outputs: ProjectCalculatorOutput[];
  note?: string;
}

export interface ProjectCalculatorOutput {
  label: string;
  /** Units required per one unit of input. */
  perUnit: number;
  /** Unit of the result, e.g. "litres", "sets", "rolls". */
  resultUnit: string;
  /** Round result up to whole units. */
  roundUp?: boolean;
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