export const SITE = {
  name: "Cossa Store",
  parent: "Cossa Nexus Holdings",
  domain: "store.cossanexusholdings.co.za",
  positioning:
    "Products, services and intelligent solutions for building, maintaining and improving homes and businesses.",
  email: "store@cossanexusholdings.co.za",
  /** Placeholder support number — replace with the live business number before launch. */
  whatsappNumber: "27000000000",
  whatsappDisplay: "WhatsApp support",
} as const;

export function whatsappLink(message = "Hello Cossa Store, I need assistance."): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

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