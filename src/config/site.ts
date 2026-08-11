export const SITE = {
  /**
   * Trading name used for the e-commerce division.
   */
  name: "Cossa Store",

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
   * Parent company domain and corporate website.
   */
  domain: "cossanexusholdings.co.za",
  corporateWebsite: "https://cossanexusholdings.co.za",

  /**
   * Current live Cossa Store URL.
   *
   * Replace this value when the permanent Cossa Store
   * custom domain/subdomain is connected.
   */
  storeWebsite: "https://cossa-store.vercel.app",

  /**
   * Brand positioning.
   */
  positioning:
    "Products, services and intelligent solutions for building, maintaining and improving homes and businesses.",

  /**
   * Official central Cossa Nexus Holdings email.
   * Use this email consistently across Cossa Store,
   * policies, merchant accounts and customer support.
   */
  email: "cossa@cossanexusholdings.co.za",

  /**
   * Official central phone and WhatsApp number.
   */
  phoneDisplay: "067 801 1907",
  phoneHref: "tel:+27678011907",
  phoneInternational: "+27 67 801 1907",

  whatsappNumber: "27678011907",
  whatsappDisplay: "WhatsApp 067 801 1907",

  /**
   * Customer-facing location.
   *
   * This avoids publishing the detailed street/unit
   * information unnecessarily on general website pages.
   */
  publicAddress:
    "Olivenoutbosch, Centurion, Gauteng, South Africa",

  /**
   * Formal CIPC registered-office address.
   *
   * Use this version only where the complete registered
   * address is legally, contractually or commercially required,
   * including merchant verification, formal agreements,
   * regulatory documents and other official records.
   *
   * Keep this aligned with CIPC records.
   */
  registeredAddress:
    "EXT 27 OLIVENOUTBOUCH 163, 163 CENTURION OLIVENOUTBOUSCH, CENTURION, GAUTENG, 0187",

  /**
   * Country of registration.
   */
  country: "South Africa",

  /**
   * Default store currency.
   */
  currency: "ZAR",
} as const;

export function whatsappLink(
  message = "Hello Cossa Store, I need assistance."
): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}

/**
 * Prefilled WhatsApp quick options used by the support popup.
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
    description: "Find something not listed in the store",
    message:
      "Hello Cossa Store, I am looking for a product that I cannot find in the store.",
    event: "whatsapp_opened",
  },
  {
    id: "quotation",
    label: "Request a quotation",
    description: "Products or services quotation",
    message:
      "Hello Cossa Store, I would like a quotation for products or services.",
    event: "whatsapp_quote_clicked",
  },
  {
    id: "business",
    label: "Business buying",
    description: "Bulk and business purchasing",
    message:
      "Hello Cossa Store, I need help with bulk or business purchasing.",
    event: "whatsapp_opened",
  },
  {
    id: "services",
    label: "Cossa services",
    description: "Products together with a Cossa service",
    message:
      "Hello Cossa Store, I need products together with a Cossa service.",
    event: "whatsapp_opened",
  },
] as const;

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

export const CALLBACK_REASONS = [
  "Product information",
  "Product sourcing",
  "Quote follow-up",
  "Business account",
  "Supplier enquiry",
  "Cossa Nexus Construction service",
  "Cossa Facility Services",
  "Cossa Tech support",
  "General enquiry",
] as const;

export const SERVICE_ECOSYSTEM = [
  {
    name: "Cossa Nexus Construction",
    need: "Need installation, building or renovation work?",
    description:
      "Installation, construction, renovation and related support for suitable products purchased through Cossa Store.",
  },
  {
    name: "Cossa Facility Services",
    need: "Need professional cleaning or facility management?",
    description:
      "Contract cleaning, hygiene management and facility maintenance for homes, offices and commercial sites.",
  },
  {
    name: "Cossa Tech",
    need: "Need technology setup or support?",
    description:
      "Technology, smart solutions, digital services and related setup and support.",
  },
  {
    name: "Cossa Logistics",
    need: "Delivery and distribution",
    description:
      "Planned Cossa Logistics delivery and distribution services. Not yet operational.",
    planned: true,
  },
  {
    name: "Cossa AI & Cossa Marketing",
    need: "Intelligent and growth solutions",
    description:
      "Planned integrations for intelligent procurement assistance and marketing support. Not yet connected.",
    planned: true,
  },
] as const;