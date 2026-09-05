import { SITE } from "@/config/site";

/**
 * Central Cossa company configuration.
 *
 * PURPOSE
 * -------
 * This file describes the Cossa Nexus Holdings group relationships,
 * public brand assets and public-facing company positioning used by
 * Cossa Store.
 *
 * IMPORTANT ARCHITECTURE
 * ----------------------
 * - Cossa Store remains the customer-facing commerce platform.
 * - Cossa Nexus Holdings (Pty) Ltd is the legal operator / parent.
 * - Group companies support Cossa Store contextually where their
 *   specialist services help complete the customer's requirement.
 * - Do not turn Cossa Store into a public directory of every legal,
 *   tax or regulatory detail belonging to every subsidiary.
 * - Do not put secrets, credentials, private supplier information,
 *   director identity numbers or other private records here.
 *
 * SITE is the authoritative source for Store-wide contact details,
 * public URLs and the Holdings registration number.
 */

export const companyConfig = {
  /* ---------------------------------------------------------------------- */
  /* PARENT COMPANY                                                         */
  /* ---------------------------------------------------------------------- */

  parentCompany: {
    name: SITE.parent,
    shortName: "Cossa Nexus Holdings",

    /**
     * Public CIPC registration format used consistently across Cossa Store.
     */
    registrationNumber: SITE.registrationNumber,

    /**
     * Do not prominently expose tax references across normal Store pages.
     *
     * Retained here because existing internal/public components may still
     * reference it during migration. Remove from customer-facing components
     * unless there is a genuine legal/commercial reason to display it.
     */
    taxReference: "9466437234",

    bbbee: "Level 1 — 135% recognition",

    website: SITE.corporateWebsite,

    role:
      "Parent company providing group strategy, governance, shared capabilities and oversight across the Cossa business ecosystem.",

    logo: "/assets/logos/cossa-nexus-holdings.png",

    logoAlt: "Cossa Nexus Holdings (Pty) Ltd logo",
  },

  /* ---------------------------------------------------------------------- */
  /* COSSA STORE                                                             */
  /* ---------------------------------------------------------------------- */

  store: {
    name: SITE.name,

    /**
     * Cossa Store is a commerce platform operated by Holdings.
     *
     * Avoid calling it a legal division unless that structure has been
     * formally adopted and needs to be represented that way.
     */
    legalNote:
      "Cossa Store is a hybrid e-commerce and project-commerce platform operated by Cossa Nexus Holdings (Pty) Ltd.",

    parentText:
      "A Cossa Nexus Holdings company platform",

    tagline:
      "Products. Projects. Procurement. Specialist support.",

    website: SITE.storeWebsite,

    /**
     * One central contact identity across the Cossa ecosystem.
     */
    email: SITE.email,

    phoneDisplay: SITE.phoneDisplay,
    phoneHref: SITE.phoneHref,
    whatsappNumber: SITE.whatsappNumber,

    logo: "/assets/logos/cossa-store.png",

    logoAlt:
      "Cossa Store — project commerce and hybrid e-commerce platform",

    /**
     * High-level customer needs served by the Store.
     *
     * This is not meant to represent every possible future catalogue
     * category.
     */
    serves: [
      "Construction and DIY products",
      "Cleaning and facility supplies",
      "Technology and smart solutions",
      "Home and property products",
      "Business procurement",
      "Project kits",
      "Print-on-demand products",
      "Digital products",
      "Supplier-fulfilled products",
      "Partner and affiliate offers",
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* COSSA NEXUS CONSTRUCTION                                                */
  /* ---------------------------------------------------------------------- */

  construction: {
    name: "Cossa Nexus Construction (Pty) Ltd",
    shortName: "Cossa Nexus Construction",

    /**
     * Valid group-company information retained in the group configuration.
     *
     * IMPORTANT:
     * These details are NOT included in Cossa Store's public registry card.
     */
    registrationNumber: "K2026604283",
    taxReference: "9029015345",
    bbbee: "Level 1 — 135% recognition",

    role:
      "Specialist Cossa group company supporting suitable construction, renovation, installation, maintenance and project requirements connected to Cossa Store customers.",

    /**
     * Use the group mark until the final dedicated Construction asset
     * is confirmed in the repository.
     */
    logo: "/assets/logos/cossa-nexus-holdings.png",

    logoAlt:
      "Cossa Nexus Construction — part of Cossa Nexus Holdings",

    specialities: [
      "Construction",
      "Renovations",
      "Building maintenance",
      "Ceiling installation",
      "Drywall",
      "Painting",
      "Roofing",
      "Tiling",
      "Plumbing",
      "General building",
      "Commercial projects",
      "Residential projects",
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* COSSA FACILITY SERVICES                                                 */
  /* ---------------------------------------------------------------------- */

  facility: {
    name: "Cossa Facility Services",
    shortName: "Cossa Facility Services",

    role:
      "Specialist Cossa group business supporting suitable cleaning, hygiene, facility-management, property-care and recurring service requirements connected to Cossa Store customers.",

    /**
     * Temporary safe fallback.
     *
     * Replace only when a confirmed Facility Services logo path exists
     * in the repository. Do not invent a file path.
     */
    logo: "/assets/logos/cossa-nexus-holdings.png",

    logoAlt:
      "Cossa Facility Services — part of Cossa Nexus Holdings",

    specialities: [
      "Residential cleaning",
      "Commercial cleaning",
      "Industrial cleaning",
      "Deep cleaning",
      "Office cleaning",
      "Hygiene and sanitation",
      "Window cleaning",
      "Facility support",
      "Property maintenance",
      "Recurring consumables support",
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* COSSA TECH                                                              */
  /* ---------------------------------------------------------------------- */

  tech: {
    name: "Cossa Tech",
    shortName: "Cossa Tech",

    role:
      "Specialist Cossa group business supporting suitable technology, smart solutions, digital services, setup and technical requirements connected to Cossa Store customers.",

    /**
     * Temporary safe fallback.
     *
     * Replace only when a confirmed Cossa Tech logo path exists.
     */
    logo: "/assets/logos/cossa-nexus-holdings.png",

    logoAlt:
      "Cossa Tech — part of Cossa Nexus Holdings",

    specialities: [
      "Technology products",
      "Smart solutions",
      "Digital services",
      "Technology setup",
      "Product configuration",
      "Web and digital solutions",
      "AI-enabled solutions",
      "Business technology support",
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* FOUNDER                                                                 */
  /* ---------------------------------------------------------------------- */

  founder: {
    name: "Abel Nkuna",

    title:
      "Founder and Chief Executive Officer",

    image: "/assets/founder/abel-nkuna.jpg",

    imageAlt:
      "Abel Nkuna, Founder and Chief Executive Officer of Cossa Nexus Holdings",

    body:
      "Cossa Nexus Holdings was founded with a long-term vision of building a connected African business group across commerce, construction, facilities, technology, logistics, hospitality and innovation. The group is built around shared capabilities, responsible growth, customer value and collaboration between its businesses.",
  },

  /* ---------------------------------------------------------------------- */
  /* SHARED BACKGROUNDS                                                      */
  /* ---------------------------------------------------------------------- */

  backgrounds: {
    heroEagle:
      "/assets/backgrounds/cossa-eagle-hero.webp",
    heroEagleVideo:
      "/assets/backgrounds/eagle-nexus-hero-video.mp4",
  },

  /* ---------------------------------------------------------------------- */
  /* BRAND                                                                   */
  /* ---------------------------------------------------------------------- */

  brand: {
    black: "#000000",
    gold: "#D4AF37",
    white: "#FFFFFF",
    charcoal: "#1A1A1A",
    deepGold: "#8C6A16",
    softGold: "#F2D16B",
  },

  /* ---------------------------------------------------------------------- */
  /* STORE SOCIAL / CONTACT LINKS                                            */
  /* ---------------------------------------------------------------------- */

  /**
   * Store-first public channels.
   *
   * Holdings channels may appear elsewhere when parent-company
   * context is appropriate.
   */
  social: [
    {
      label: "Cossa Store",
      href: SITE.storeWebsite,
    },
    {
      label: "Instagram",
      href: SITE.social.instagram,
    },
    {
      label: "Facebook",
      href: SITE.social.facebook,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/${SITE.whatsappNumber}`,
    },
    {
      label: "Email",
      href: `mailto:${SITE.email}`,
    },
  ],

  /* ---------------------------------------------------------------------- */
  /* FOOTER                                                                  */
  /* ---------------------------------------------------------------------- */

  footer: {
    copyright:
      "Cossa Nexus Holdings (Pty) Ltd. All rights reserved.",
  },
} as const;

/* -------------------------------------------------------------------------- */
/* STORE PUBLIC COMPANY REGISTRY                                              */
/* -------------------------------------------------------------------------- */

/**
 * Public legal-operator information shown on Cossa Store.
 *
 * IMPORTANT:
 * Cossa Nexus Holdings is the legal operator of Cossa Store.
 *
 * Subsidiary registration numbers, tax references and other legal
 * identifiers are intentionally NOT repeated in the Store registry.
 *
 * Subsidiaries remain visible contextually through products,
 * projects and service-support pathways.
 */
export const COMPANY_REGISTRY = [
  {
    role: "Store operator",

    name: companyConfig.parentCompany.name,

    registrationNumber:
      companyConfig.parentCompany.registrationNumber,

    bbbee:
      companyConfig.parentCompany.bbbee,

    logo:
      companyConfig.parentCompany.logo,

    logoAlt:
      companyConfig.parentCompany.logoAlt,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* CONTEXTUAL GROUP SUPPORT                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Maps Store commercial needs to the appropriate Cossa specialist
 * business.
 *
 * This can later help power:
 * - category badges
 * - product service cross-sells
 * - project recommendations
 * - Cossa AI routing
 * - quote routing into Growth
 *
 * It is NOT a substitute for Growth/Supabase workflow routing.
 */
export const GROUP_SUPPORT = {
  construction: {
    company:
      companyConfig.construction.shortName,

    label:
      "Construction & Project Support",

    description:
      "Installation, renovation, building, maintenance and related project support.",
  },

  facility: {
    company:
      companyConfig.facility.shortName,

    label:
      "Cleaning & Facility Support",

    description:
      "Cleaning, hygiene, facility-management and recurring property support.",
  },

  tech: {
    company:
      companyConfig.tech.shortName,

    label:
      "Technology & Smart Solutions",

    description:
      "Technology selection, setup, configuration and specialist digital support.",
  },
} as const;
