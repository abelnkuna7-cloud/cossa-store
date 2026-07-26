export const SITE = {
  name: "Cossa Store",
  parent: "Cossa Nexus Holdings",
  domain: "cossanexusholdings.co.za",
  website: "https://cossanexusholdings.co.za",
  positioning:
    "Products, services and intelligent solutions for building, maintaining and improving homes and businesses.",
  email: "store@cossanexusholdings.co.za",
  /** Official Cossa Store contact number (phone and WhatsApp). */
  phoneDisplay: "067 801 1907",
  phoneHref: "tel:+27678011907",
  whatsappNumber: "27678011907",
  whatsappDisplay: "WhatsApp 067 801 1907",
} as const;

export function whatsappLink(message = "Hello Cossa Store, I need assistance."): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Prefilled WhatsApp quick options used by the support popup. */
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
    message: "Hello Cossa Store, I would like a quotation for products or services.",
    event: "whatsapp_quote_clicked",
  },
  {
    id: "business",
    label: "Business buying",
    description: "Bulk and business purchasing",
    message: "Hello Cossa Store, I need help with bulk or business purchasing.",
    event: "whatsapp_opened",
  },
  {
    id: "services",
    label: "Cossa services",
    description: "Products together with a Cossa service",
    message: "Hello Cossa Store, I need products together with a Cossa service.",
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
  "Cossa Construction service",
  "Cossa Facility Services",
  "Cossa Tech support",
  "General enquiry",
] as const;

export const SERVICE_ECOSYSTEM = [
  {
    name: "Cossa Construction & DIY",
    need: "Need installation, building or renovation work?",
    description:
      "Installation, construction and DIY support for the products you buy from Cossa Store.",
  },
  {
    name: "Cossa Facility Services",
    need: "Need professional cleaning or facility management?",
    description:
      "Contract cleaning, hygiene management and facility maintenance for offices and commercial sites.",
  },
  {
    name: "Cossa Tech",
    need: "Need technology setup or support?",
    description:
      "Smart-home, security and workplace technology installation, configuration and support.",
  },
  {
    name: "Cossa Logistics",
    need: "Delivery and distribution",
    description: "Planned Cossa Logistics delivery services. Not yet operational.",
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