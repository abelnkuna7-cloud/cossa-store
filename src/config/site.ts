/**
 * Cossa Store public business, identity and platform configuration.
 *
 * IMPORTANT:
 * - This file is for public/business identity and customer-facing configuration.
 * - Do not place secrets, API keys or private supplier credentials here.
 * - Avoid duplicating these values across individual pages.
 * - SEO, structured data, footer, contact, AI context and other public
 *   components should consume these shared values wherever practical.
 */

export const SITE = {
  /**
   * Customer-facing trading name.
   */
  name: "Cossa Store",

  /**
   * Formal store descriptor.
   *
   * Useful for structured data, AI/search understanding,
   * metadata and business descriptions.
   */
  legalTradingDescription:
    "Cossa Store is the e-commerce and project-commerce division operated by Cossa Nexus Holdings (Pty) Ltd.",

  /**
   * Registered legal entity operating Cossa Store.
   */
  parent: "Cossa Nexus Holdings (Pty) Ltd",

  /**
   * CIPC company registration number for the legal operator
   * of Cossa Store.
   */
  registrationNumber: "2026/504313/07",

  /**
   * Company registration date.
   */
  registrationDate: "29 June 2026",

  /**
   * Country of registration and primary operating market.
   */
  country: "South Africa",
  countryCode: "ZA",

  /**
   * Primary store currency.
   */
  currency: "ZAR",

  /**
   * Parent-company domain.
   */
  domain: "cossanexusholdings.co.za",

  /**
   * Parent-company corporate website.
   */
  corporateWebsite: "https://cossanexusholdings.co.za",

  /**
   * Permanent public Cossa Store production URL.
   *
   * This is the canonical customer-facing Store domain.
   *
   * The underlying Vercel deployment URLs are infrastructure only
   * and must not be used as the public Store identity in:
   * - canonical URLs
   * - sitemap URLs
   * - structured data
   * - Open Graph URLs
   * - social profiles
   * - marketing links
   * - Search Console references
   */
  storeWebsite: "https://store.cossanexusholdings.co.za",

  /**
   * Approved Cossa Store brand asset.
   *
   * This absolute URL is used wherever a browser, search engine or social
   * platform needs the Store identity outside the rendered application.
   */
  logoUrl:
    "https://store.cossanexusholdings.co.za/assets/logos/cossa-store-brand.jpg",
  logoAlt:
    "Cossa Store — Shop Smarter. Live Better. Build More.",

  /**
   * Related public Cossa digital platforms.
   *
   * These remain secondary to Cossa Store in the
   * customer-facing Store experience.
   */
  platforms: {
    corporate: "https://cossanexusholdings.co.za",
    growth: "https://growth.cossanexusholdings.co.za",
    nexdocs: "https://nexdocs.cossanexusholdings.co.za",
  },

  /**
   * Primary Store positioning.
   *
   * Keep this accurate and evidence-based.
   * Avoid unverified claims such as "trusted worldwide".
   */
  positioning:
    "Products, project solutions and business procurement for homes, projects and businesses.",

  /**
   * Expanded Store description.
   *
   * This can support:
   * - OnlineStore / Organization structured data
   * - AI knowledge context
   * - About content
   * - metadata
   * - search descriptions
   */
  description:
    "Cossa Store is a South African hybrid e-commerce and project-commerce platform offering physical products, local supplier products, print-on-demand products, selected partner and affiliate offers, digital products, project-based buying and business procurement solutions.",

  /**
   * Core customer promise.
   */
  customerPromise:
    "Buy the products. Plan the project. Get the job done.",

  /**
   * Official central Cossa Nexus Holdings email.
   *
   * Use consistently across Cossa Store,
   * merchant verification and customer support.
   */
  email: "cossa@cossanexusholdings.co.za",

  /**
   * Public Cossa Store customer-support mailbox.
   *
   * Use for orders, delivery, returns and ordinary Store enquiries.
   * Keep the central company email above for legal, privacy, merchant and
   * corporate administration.
   */
  supportEmail: "store@cossanexusholdings.co.za",

  /**
   * Official central phone / WhatsApp number.
   */
  phoneDisplay: "067 801 1907",
  phoneHref: "tel:+27678011907",
  phoneInternational: "+27 67 801 1907",

  whatsappNumber: "27678011907",
  whatsappDisplay: "WhatsApp 067 801 1907",

  /**
   * Customer-facing location.
   *
   * Use on ordinary public pages where the full registered-office
   * address is unnecessary.
   */
  publicAddress:
    "Olivenoutbosch, Centurion, Gauteng, South Africa",

  /**
   * Formal CIPC registered-office address.
   *
   * Use only where the complete registered address is
   * legally, contractually or commercially required,
   * including merchant verification and official documents.
   *
   * Keep aligned with CIPC records.
   */
  registeredAddress:
    "EXT 27 OLIVENOUTBOUCH 163, 163 CENTURION OLIVENOUTBOUSCH, CENTURION, GAUTENG, 0187",

  /**
   * Primary Cossa Store social profiles.
   *
   * Footer and structured data should consume these values
   * rather than hard-coding them elsewhere.
   */
  social: {
    instagram: "https://www.instagram.com/cossa_nexus_store",
    facebook: "https://www.facebook.com/Cossastore",
  },

  /**
   * Parent-company social profiles.
   *
   * These are secondary to Store social channels and should only
   * appear where parent-company context is useful.
   */
  parentSocial: {
    instagram: "https://www.instagram.com/cossa_nexus_holdings",
    facebook: "https://www.facebook.com/Cossanexusholdings",
    x: "https://x.com/cossa_nexus",
    tiktok: "https://www.tiktok.com/@cossa_nexus_holdings",
  },

  /**
   * Search / AI entity aliases.
   *
   * These are canonical identity terms, not keyword stuffing.
   * They can support structured data and approved AI context.
   */
  alternateNames: [
    "Cossa Store",
    "Cossa Nexus Store",
    "Cossa Nexus Holdings Store",
  ],

  /**
   * High-level Store subject areas.
   *
   * Use carefully for search, AI context and internal classification.
   */
  topics: [
    "e-commerce",
    "project commerce",
    "construction and DIY products",
    "cleaning and facility supplies",
    "technology products",
    "business procurement",
    "print-on-demand",
    "digital products",
    "supplier-fulfilled products",
    "dropshipping",
    "affiliate products",
    "project kits",
  ],

  /**
   * Stable structured-data identifier for Cossa Store.
   */
  structuredDataId:
    "https://store.cossanexusholdings.co.za/#online-store",

  /**
   * Stable parent-company structured-data identifier.
   */
  parentStructuredDataId:
    "https://cossanexusholdings.co.za/#organization",
} as const;

/**
 * Creates a pre-filled Cossa Store WhatsApp link.
 */
export function whatsappLink(
  message = "Hello Cossa Store, I need assistance."
): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}

/**
 * Prefilled WhatsApp customer-support options.
 *
 * These should eventually feed the same central Customer Support /
 * Growth workflow rather than becoming isolated Store-only records.
 */
export const WHATSAPP_OPTIONS = [
  {
    id: "product_help",
    label: "Product help",
    description: "Help choosing the right product",
    message: "Hello Cossa Store, I need help choosing a product.",
    event: "whatsapp_product_help_clicked",
  },
  {
    id: "sourcing",
    label: "Product sourcing",
    description: "Find something not currently listed",
    message:
      "Hello Cossa Store, I am looking for a product that I cannot find in the store.",
    event: "whatsapp_sourcing_clicked",
  },
  {
    id: "quotation",
    label: "Request a quotation",
    description: "Products, project kits or business purchasing",
    message:
      "Hello Cossa Store, I would like a quotation for products or a project requirement.",
    event: "whatsapp_quote_clicked",
  },
  {
    id: "business",
    label: "Business buying",
    description: "Bulk, recurring and business purchasing",
    message:
      "Hello Cossa Store, I need help with bulk or business purchasing.",
    event: "whatsapp_business_clicked",
  },
  {
    id: "project_help",
    label: "Project help",
    description: "Help finding products for a project",
    message:
      "Hello Cossa Store, I need help choosing products for my project.",
    event: "whatsapp_project_help_clicked",
  },
] as const;

/**
 * Supported South African provinces.
 *
 * "Outside South Africa" remains available for enquiry/context,
 * but this does not automatically mean international shipping
 * is available for every product.
 */
export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
  "Outside South Africa",
] as const;

/**
 * Customer callback reasons.
 *
 * Keep this Store-first.
 *
 * Requests requiring specialist group-company support can be routed
 * internally after qualification through Growth / Customer Support.
 */
export const CALLBACK_REASONS = [
  "Product information",
  "Product sourcing",
  "Project buying help",
  "Quote follow-up",
  "Business account",
  "Bulk or recurring purchasing",
  "Supplier enquiry",
  "Order or delivery support",
  "Returns or refunds",
  "Installation or project support",
  "Cleaning or facility support",
  "Technology product support",
  "General enquiry",
] as const;

/**
 * Store-relevant professional support pathways.
 *
 * Cossa Store remains the primary customer-facing brand.
 *
 * These pathways identify the appropriate specialist Cossa business
 * where that business materially helps complete the customer's job.
 *
 * IMPORTANT:
 * - Do not place subsidiary registration numbers here.
 * - Do not place subsidiary tax numbers here.
 * - Do not place subsidiary B-BBEE/CIDB data here.
 * - Do not turn this into a full group-company directory.
 *
 * The purpose is commercial clarity:
 *
 * Product need -> Store -> specialist support where relevant.
 */
export const STORE_SUPPORT_PATHWAYS = [
  {
    id: "construction_support",
    name: "Installation & Project Support",
    provider: "Cossa Nexus Construction",
    need:
      "Need installation, building, renovation, maintenance or project work?",
    description:
      "Suitable product purchases and project requirements can be supported by Cossa Nexus Construction for installation, renovation, maintenance and related construction work.",
    quoteMessage:
      "Hello Cossa Store, I need products together with installation or project support.",
  },

  {
    id: "facility_support",
    name: "Cleaning & Facility Support",
    provider: "Cossa Facility Services",
    need:
      "Need professional cleaning, hygiene, facility or recurring service support?",
    description:
      "Business, commercial and property customers can combine suitable products with cleaning, hygiene, facility-management and recurring service support from Cossa Facility Services.",
    quoteMessage:
      "Hello Cossa Store, I need products together with cleaning or facility support.",
  },

  {
    id: "technology_support",
    name: "Technology & Smart Solutions",
    provider: "Cossa Tech",
    need:
      "Need technology selection, setup, configuration or technical support?",
    description:
      "Suitable technology, smart-building and digital product requirements can be supported by Cossa Tech where setup, configuration or specialist assistance is required.",
    quoteMessage:
      "Hello Cossa Store, I need products together with technology setup or technical support.",
  },
] as const;

/**
 * Backward-compatible alias.
 *
 * Existing components that still import SERVICE_ECOSYSTEM will continue
 * to work while we migrate them to STORE_SUPPORT_PATHWAYS.
 *
 * Once the repository-wide migration is complete, remove this alias.
 */
export const SERVICE_ECOSYSTEM = STORE_SUPPORT_PATHWAYS;
