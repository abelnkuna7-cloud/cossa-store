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
   * CIPC company registration number.
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
   * Primary currency.
   */
  currency: "ZAR",

  /**
   * Parent-company domain.
   */
  domain: "cossanexusholdings.co.za",

  /**
   * Corporate website.
   */
  corporateWebsite: "https://cossanexusholdings.co.za",

  /**
   * Permanent public Cossa Store production URL.
   *
   * This is the canonical customer-facing Store domain.
   *
   * The underlying Vercel URL is deployment infrastructure only
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
   * Related public Cossa digital platforms.
   *
   * These should remain secondary to Cossa Store in the
   * customer experience.
   */
  platforms: {
    corporate: "https://cossanexusholdings.co.za",
    growth: "https://growth.cossanexusholdings.co.za",
    nexdocs: "https://nexdocs.cossanexusholdings.co.za",
  },

  /**
   * Primary public Store positioning.
   *
   * Keep this accurate and evidence-based.
   * Avoid unverified claims such as "trusted worldwide".
   */
  positioning:
    "Products, project solutions and business procurement for homes, projects and businesses.",

  /**
   * Expanded business description.
   *
   * This can later support:
   * - Organization / OnlineStore structured data
   * - AI knowledge context
   * - About content
   * - metadata
   * - search descriptions
   */
  description:
    "Cossa Store is a South African hybrid e-commerce and project-commerce platform offering physical products, local supplier products, print-on-demand products, selected partner and affiliate offers, digital products, project-based buying and business procurement solutions.",

  /**
   * Core customer promise.
   *
   * This can support hero, metadata or structured descriptions,
   * but should not automatically be used everywhere.
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
   * Use on ordinary public pages where a full registered-office
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
   * Store social media.
   *
   * These are the primary social profiles for Cossa Store.
   * Footer and structured data should consume these values
   * instead of hard-coding social URLs.
   */
  social: {
    instagram: "https://www.instagram.com/cossa_nexus_store",
    facebook: "https://www.facebook.com/Cossastore",
  },

  /**
   * Parent-company social profiles.
   *
   * These are secondary to Store social media and should only
   * appear where parent-company context is useful.
   */
  parentSocial: {
    instagram: "https://www.instagram.com/cossa_nexus_holdings",
    facebook: "https://www.facebook.com/Cossanexusholdings",
    x: "https://x.com/cossa_nexus",
    tiktok: "https://www.tiktok.com/@cossa_nexus_holdings",
  },

  /**
   * Search / AI identity aliases.
   *
   * These are NOT a ranking trick.
   * They are canonical names and descriptive terms we can use
   * consistently in structured data, metadata and AI context.
   */
  alternateNames: [
    "Cossa Store",
    "Cossa Nexus Store",
    "Cossa Nexus Holdings Store",
  ],

  /**
   * High-level subject areas represented by the Store.
   *
   * Use carefully for metadata, internal search and AI context.
   * Do not keyword-stuff page titles/descriptions.
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
    "project kits",
  ],

  /**
   * Future structured-data entity identifier.
   *
   * This gives our Organization / OnlineStore schema a stable
   * internal @id once we implement JSON-LD.
   */
  structuredDataId:
    "https://store.cossanexusholdings.co.za/#online-store",

  /**
   * Parent-company structured-data identifier.
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
 * These should eventually feed the same central customer-support /
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
 * Keep Store-first.
 * Requests that need specialist Cossa services can be routed
 * internally after qualification rather than forcing customers
 * to understand the group structure.
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
  "Technical product support",
  "General enquiry",
] as const;

/**
 * Store-relevant professional support pathways.
 *
 * IMPORTANT:
 * These are customer needs, not a corporate directory.
 *
 * We deliberately do not expose subsidiary registration details here.
 * The Store can route qualified requests to the appropriate Cossa
 * business internally through Growth / customer-support workflows.
 */
export const STORE_SUPPORT_PATHWAYS = [
  {
    id: "installation_project_support",
    name: "Installation & project support",
    need: "Need help installing, building, renovating or completing a project?",
    description:
      "Cossa Store can help route suitable product-related project enquiries to the appropriate professional support team where available.",
  },
  {
    id: "facility_support",
    name: "Cleaning & facility support",
    need: "Need help with cleaning, hygiene or facility requirements?",
    description:
      "Business and property customers can request support for suitable cleaning, hygiene, facility and recurring procurement requirements.",
  },
  {
    id: "technology_support",
    name: "Technology support",
    need: "Need help selecting, setting up or supporting technology?",
    description:
      "Customers can request support for suitable technology products, smart solutions and related setup requirements.",
  },
] as const;

/**
 * Backward-compatible alias.
 *
 * Keep temporarily if existing components still import
 * SERVICE_ECOSYSTEM.
 *
 * Once the repository-wide migration is complete, update those
 * imports to STORE_SUPPORT_PATHWAYS and remove this alias.
 */
export const SERVICE_ECOSYSTEM = STORE_SUPPORT_PATHWAYS;
