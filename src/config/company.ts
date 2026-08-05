/**
 * Central Cossa company configuration.
 *
 * Single source of truth for group structure, registration details, brand
 * assets and founder information. Components import from here rather than
 * hardcoding company data.
 *
 * Only information safe for public display is included: registered company
 * names, company registration numbers, income tax reference numbers, B-BBEE
 * status, public contact details and websites. Director identity numbers,
 * residential addresses and other private CoR15.1 details are excluded.
 */

export const companyConfig = {
  parentCompany: {
    name: "Cossa Nexus Holdings (Pty) Ltd",
    shortName: "Cossa Nexus Holdings",
    registrationNumber: "K2026504313",
    taxReference: "9466437234",
    bbbee: "Level 1 — 135%",
    website: "https://cossanexusholdings.co.za",
    role: "Parent company responsible for strategy, governance and the companies operating under it.",
    logo: "/assets/logos/cossa-nexus-holdings.png",
    logoAlt: "Cossa Nexus Holdings (Pty) Ltd logo",
  },

  store: {
    name: "Cossa Store",
    legalNote: "Cossa Store is a division of Cossa Nexus Holdings (Pty) Ltd.",
    parentText: "A proud member of Cossa Nexus Holdings",
    tagline: "Construction. Tech. Facility Services.",
    website: "https://cossanexusholdings.co.za",
    email: "store@cossanexusholdings.co.za",
    phoneDisplay: "067 801 1907",
    phoneHref: "tel:+27678011907",
    whatsappNumber: "27678011907",
    logo: "/assets/logos/cossa-store.png",
    logoAlt: "Cossa Store — Construction, Tech and Facility Services",
    serves: [
      "Construction",
      "Facility Services",
      "Technology",
      "Smart Buildings",
      "Offices",
      "Homes",
      "Businesses",
    ],
  },

  construction: {
    name: "Cossa Nexus Construction (Pty) Ltd",
    shortName: "Cossa Nexus Construction",
    registrationNumber: "K2026604283",
    taxReference: "9029015345",
    bbbee: "Level 1 — 135%",
    /** Group mark, used until a dedicated construction logo is supplied. */
    logo: "/assets/logos/cossa-nexus-holdings.png",
    logoAlt: "Cossa Nexus Construction (Pty) Ltd — part of Cossa Nexus Holdings",
    specialities: [
      "Construction",
      "Renovations",
      "Building Maintenance",
      "Ceiling Installation",
      "Drywall",
      "Painting",
      "Roofing",
      "Tiling",
      "Plumbing",
      "General Building",
      "Commercial Projects",
      "Residential Projects",
    ],
  },

  founder: {
    name: "Abel Nkuna",
    title: "Founder and Chief Executive Officer",
    image: "/assets/founder/abel-nkuna.jpg",
    imageAlt: "Abel Nkuna, Founder and Chief Executive Officer of Cossa Nexus Holdings",
    body: "Cossa Nexus Holdings was founded with a long-term vision of building one of Africa's leading business groups across construction, facilities, technology, logistics, commerce and innovation. The company is driven by a commitment to integrity, excellence, customer success and sustainable growth.",
  },

  backgrounds: {
    heroEagle: "/assets/backgrounds/hero-eagle.jpg",
  },

  brand: {
    black: "#000000",
    gold: "#D4AF37",
    white: "#FFFFFF",
    charcoal: "#1A1A1A",
    deepGold: "#8C6A16",
    softGold: "#F2D16B",
  },

  social: [
    { label: "Website", href: "https://cossanexusholdings.co.za" },
    { label: "WhatsApp", href: "https://wa.me/27678011907" },
    { label: "Email", href: "mailto:store@cossanexusholdings.co.za" },
  ],

  footer: {
    copyright: "Cossa Nexus Holdings (Pty) Ltd. All rights reserved.",
  },
} as const;

/** Public registry rows rendered by the Company information card. */
export const COMPANY_REGISTRY = [
  {
    role: "Parent company",
    name: companyConfig.parentCompany.name,
    registrationNumber: companyConfig.parentCompany.registrationNumber,
    taxReference: companyConfig.parentCompany.taxReference,
    bbbee: companyConfig.parentCompany.bbbee,
    logo: companyConfig.parentCompany.logo,
    logoAlt: companyConfig.parentCompany.logoAlt,
  },
  {
    role: "Construction company",
    name: companyConfig.construction.name,
    registrationNumber: companyConfig.construction.registrationNumber,
    taxReference: companyConfig.construction.taxReference,
    bbbee: companyConfig.construction.bbbee,
    logo: companyConfig.construction.logo,
    logoAlt: companyConfig.construction.logoAlt,
  },
] as const;
