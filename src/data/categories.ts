import type { Category, ProjectBundle } from "@/types/catalog";

export const CATEGORIES: Category[] = [
  {
    slug: "construction-diy",
    name: "Construction & DIY",
    tagline: "Tools, hardware and site equipment",
    description:
      "Equipment and consumables for contractors, maintenance teams and hands-on homeowners — from measuring and safety gear to hardware, paint and storage.",
    subcategories: [
      { slug: "tools-accessories", name: "Tools and accessories" },
      { slug: "measuring-equipment", name: "Measuring equipment" },
      { slug: "safety-ppe", name: "Safety and PPE" },
      { slug: "hardware", name: "Hardware" },
      { slug: "painting-supplies", name: "Painting supplies" },
      { slug: "home-improvement", name: "Home-improvement products" },
      { slug: "storage-organisation", name: "Storage and organisation" },
    ],
  },
  {
    slug: "cleaning-facility-supplies",
    name: "Cleaning & Facility Supplies",
    tagline: "Janitorial, hygiene and facility consumables",
    description:
      "Everything facility and office teams need to keep sites clean, hygienic and compliant — supplied for both once-off and repeat business purchasing.",
    subcategories: [
      { slug: "cleaning-tools", name: "Cleaning tools" },
      { slug: "janitorial-supplies", name: "Janitorial supplies" },
      { slug: "cleaning-equipment", name: "Cleaning equipment" },
      { slug: "hygiene-products", name: "Hygiene products" },
      { slug: "waste-management", name: "Waste-management products" },
      { slug: "ppe", name: "PPE" },
      { slug: "office-commercial", name: "Office and commercial cleaning supplies" },
    ],
  },
  {
    slug: "technology-smart-solutions",
    name: "Technology & Smart Solutions",
    tagline: "Smart home, security and workplace technology",
    description:
      "Practical technology for homes, sites and offices: smart control, security and monitoring, accessories and productivity equipment.",
    subcategories: [
      { slug: "smart-home", name: "Smart-home products" },
      { slug: "security-monitoring", name: "Security and monitoring products" },
      { slug: "computer-mobile-accessories", name: "Computer and mobile accessories" },
      { slug: "productivity-equipment", name: "Productivity equipment" },
      { slug: "smart-construction-tech", name: "Smart construction technology" },
      { slug: "smart-facility-tech", name: "Smart facility-management technology" },
    ],
  },
];

export const PROJECTS: ProjectBundle[] = [
  {
    slug: "paint-a-room",
    name: "Paint a room",
    description: "Preparation, application and protection supplies for a clean interior repaint.",
    categories: ["construction-diy"],
    subcategories: ["painting-supplies", "tools-accessories", "safety-ppe"],
  },
  {
    slug: "clean-an-office",
    name: "Clean an office",
    description: "Daily and periodic cleaning consumables for commercial office space.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["cleaning-tools", "office-commercial", "janitorial-supplies"],
  },
  {
    slug: "equip-a-construction-team",
    name: "Equip a construction team",
    description: "Core tools, measuring gear and PPE to get a crew productive on site.",
    categories: ["construction-diy"],
    subcategories: ["tools-accessories", "measuring-equipment", "safety-ppe", "hardware"],
  },
  {
    slug: "improve-workplace-hygiene",
    name: "Improve workplace hygiene",
    description: "Hygiene, waste and sanitation products for healthier workplaces.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["hygiene-products", "waste-management", "ppe"],
  },
  {
    slug: "upgrade-a-smart-home",
    name: "Upgrade a smart home",
    description: "Smart control, lighting and monitoring products for residential upgrades.",
    categories: ["technology-smart-solutions"],
    subcategories: ["smart-home", "security-monitoring"],
  },
  {
    slug: "set-up-a-productive-workspace",
    name: "Set up a productive workspace",
    description: "Desk technology, accessories and organisation for focused work.",
    categories: ["technology-smart-solutions", "construction-diy"],
    subcategories: [
      "productivity-equipment",
      "computer-mobile-accessories",
      "storage-organisation",
    ],
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getProject(slug: string): ProjectBundle | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export function subcategoryName(categorySlug: string, subSlug: string): string {
  return (
    getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug)?.name ?? subSlug
  );
}