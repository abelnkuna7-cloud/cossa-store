/* -------------------------------------------------------------------------- */
/* CATEGORY                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Cossa Store hybrid-commerce department taxonomy.
 *
 * IMPORTANT:
 * - These are STORE departments, not Cossa Nexus Holdings subsidiaries.
 * - Cossa Nexus Construction, Cossa Facility Services and Cossa Tech remain
 *   specialist group companies and support suitable customer requirements.
 * - Store departments must be broad enough for retail, dropshipping,
 *   affiliate, print-on-demand, digital and business-procurement expansion.
 *
 * This taxonomy powers:
 * - storefront departments
 * - category pages
 * - mega navigation
 * - product classification
 * - project commerce
 * - catalogue manager
 * - internal search
 * - SEO
 * - future Cossa AI product discovery
 */
/* -------------------------------------------------------------------------- */
/* FULFILMENT                                                                 */
/* -------------------------------------------------------------------------- */

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
  cossa_stock: "Cossa stock",
  local_supplier: "Ships from local supplier",
  local_dropshipping: "Dropshipped from local supplier",
  international_dropshipping: "International fulfilment",
  print_on_demand: "Produced after ordering",
  affiliate: "Partner offer",
  digital: "Digital delivery",
  service: "Service",
  quote_only: "Quotation required",
  project_kit: "Project kit",
};
export type CategorySlug =
  | "construction-diy"
  | "home-living"
  | "cleaning-household"
  | "technology-electronics"
  | "women"
  | "men"
  | "kids-baby"
  | "automotive"
  | "office-business"
  | "health-personal-care"
  | "beauty-grooming"
  | "sports-fitness"
  | "outdoor-garden"
  | "pet-supplies"
  | "digital-products"
  | "print-on-demand"
  | "gifts-personalised"
  | "security-smart-home"
  | "tools-industrial"
  | "school-education"
  | "travel-luggage"
  | "mobile-accessories"
  | "gaming-entertainment";
export type CategorySlug =
  | "construction-diy"
  | "home-living"
  | "cleaning-household"
  | "technology-electronics"
  | "women"
  | "men"
  | "kids-baby"
  | "automotive"
  | "office-business"
  | "health-personal-care"
  | "beauty-grooming"
  | "sports-fitness"
  | "outdoor-garden"
  | "pet-supplies"
  | "digital-products"
  | "print-on-demand"
  | "gifts-personalised"
  | "security-smart-home"
  | "tools-industrial"
  | "school-education"
  | "travel-luggage"
  | "mobile-accessories"
  | "gaming-entertainment"

  /*
   * Temporary legacy compatibility.
   *
   * Existing project/category records still reference these values.
   * Remove only after the catalogue migration is complete.
   */
  | "cleaning-facility-supplies"
  | "technology-smart-solutions";
