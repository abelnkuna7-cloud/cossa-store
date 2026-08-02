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
    job: "Repaint an interior room properly the first time — prep, protect, apply, clean up.",
    categories: ["construction-diy"],
    subcategories: ["painting-supplies", "tools-accessories", "safety-ppe"],
    calculator: {
      label: "Wall area to paint",
      unit: "m²",
      defaultValue: 40,
      min: 5,
      max: 600,
      outputs: [
        { label: "Interior paint (two coats)", perUnit: 0.18, resultUnit: "litres" },
        { label: "Primer / undercoat", perUnit: 0.09, resultUnit: "litres" },
        { label: "Roller sleeves", perUnit: 0.05, resultUnit: "sleeves", roundUp: true },
        { label: "Masking tape", perUnit: 0.12, resultUnit: "rolls", roundUp: true },
        { label: "Drop sheets", perUnit: 0.04, resultUnit: "sheets", roundUp: true },
      ],
      note: "Based on roughly 6 m² coverage per litre per coat. Porous or dark walls need more.",
    },
  },
  {
    slug: "clean-an-office",
    name: "Clean an office",
    description: "Daily and periodic cleaning consumables for commercial office space.",
    job: "Keep an office presentable every day without running out of consumables mid-month.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["cleaning-tools", "office-commercial", "janitorial-supplies"],
    calculator: {
      label: "Office floor area",
      unit: "m²",
      defaultValue: 250,
      min: 20,
      max: 5000,
      outputs: [
        { label: "All-purpose cleaner (monthly)", perUnit: 0.02, resultUnit: "litres" },
        { label: "Floor cleaner (monthly)", perUnit: 0.015, resultUnit: "litres" },
        { label: "Refuse bags (monthly)", perUnit: 0.4, resultUnit: "bags", roundUp: true },
        { label: "Microfibre cloths", perUnit: 0.03, resultUnit: "cloths", roundUp: true },
        { label: "Mop heads (quarterly)", perUnit: 0.006, resultUnit: "heads", roundUp: true },
      ],
      note: "Assumes standard daily office cleaning, five days a week.",
    },
  },
  {
    slug: "equip-a-construction-team",
    name: "Equip a construction team",
    description: "Core tools, measuring gear and PPE to get a crew productive on site.",
    job: "Kit out a new crew so nobody stands idle waiting for a tool or a hard hat.",
    categories: ["construction-diy"],
    subcategories: ["tools-accessories", "measuring-equipment", "safety-ppe", "hardware"],
    calculator: {
      label: "Crew size",
      unit: "people",
      defaultValue: 6,
      min: 1,
      max: 200,
      outputs: [
        { label: "Hard hats", perUnit: 1, resultUnit: "units", roundUp: true },
        { label: "Hi-vis vests", perUnit: 1.5, resultUnit: "units", roundUp: true },
        { label: "Safety boots", perUnit: 1, resultUnit: "pairs", roundUp: true },
        { label: "Work gloves", perUnit: 3, resultUnit: "pairs", roundUp: true },
        { label: "Shared tool sets", perUnit: 0.34, resultUnit: "sets", roundUp: true },
      ],
      note: "Vests and gloves allow for rotation and replacement across a typical month.",
    },
  },
  {
    slug: "improve-workplace-hygiene",
    name: "Improve workplace hygiene",
    description: "Hygiene, waste and sanitation products for healthier workplaces.",
    job: "Raise hygiene standards across washrooms, kitchens and shared workspaces.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["hygiene-products", "waste-management", "ppe"],
    calculator: {
      label: "People on site",
      unit: "people",
      defaultValue: 40,
      min: 1,
      max: 5000,
      outputs: [
        { label: "Hand soap (monthly)", perUnit: 0.08, resultUnit: "litres" },
        { label: "Hand sanitiser (monthly)", perUnit: 0.06, resultUnit: "litres" },
        { label: "Toilet paper (monthly)", perUnit: 2.2, resultUnit: "rolls", roundUp: true },
        { label: "Paper towel (monthly)", perUnit: 0.9, resultUnit: "rolls", roundUp: true },
        { label: "Bin liners (monthly)", perUnit: 1.6, resultUnit: "liners", roundUp: true },
      ],
    },
  },
  {
    slug: "upgrade-a-smart-home",
    name: "Upgrade a smart home",
    description: "Smart control, lighting and monitoring products for residential upgrades.",
    job: "Add smart lighting, control and monitoring to a home without a full rewire.",
    categories: ["technology-smart-solutions"],
    subcategories: ["smart-home", "security-monitoring"],
    calculator: {
      label: "Rooms to upgrade",
      unit: "rooms",
      defaultValue: 4,
      min: 1,
      max: 40,
      outputs: [
        { label: "Smart bulbs", perUnit: 2.5, resultUnit: "bulbs", roundUp: true },
        { label: "Smart plugs", perUnit: 1, resultUnit: "plugs", roundUp: true },
        { label: "Smart switches", perUnit: 1, resultUnit: "switches", roundUp: true },
        { label: "Hub / gateway", perUnit: 0.15, resultUnit: "units", roundUp: true },
      ],
      note: "One hub typically covers a standard home. Larger properties may need a repeater.",
    },
  },
  {
    slug: "set-up-a-productive-workspace",
    name: "Set up a productive workspace",
    description: "Desk technology, accessories and organisation for focused work.",
    job: "Turn empty desks into working, cable-managed, ergonomic workstations.",
    categories: ["technology-smart-solutions", "construction-diy"],
    subcategories: [
      "productivity-equipment",
      "computer-mobile-accessories",
      "storage-organisation",
    ],
    calculator: {
      label: "Workstations",
      unit: "desks",
      defaultValue: 8,
      min: 1,
      max: 500,
      outputs: [
        { label: "Monitor stands / arms", perUnit: 1, resultUnit: "units", roundUp: true },
        { label: "Keyboard & mouse sets", perUnit: 1, resultUnit: "sets", roundUp: true },
        { label: "Power / surge strips", perUnit: 1, resultUnit: "units", roundUp: true },
        { label: "Cable management kits", perUnit: 1, resultUnit: "kits", roundUp: true },
        { label: "Desk storage units", perUnit: 0.5, resultUnit: "units", roundUp: true },
      ],
    },
  },
  {
    slug: "site-safety-kit",
    name: "Site safety kit",
    description: "Signage, PPE and first-response equipment to keep a site compliant.",
    job: "Meet basic site safety obligations before an inspection, not after one.",
    categories: ["construction-diy", "cleaning-facility-supplies"],
    subcategories: ["safety-ppe", "ppe", "tools-accessories"],
    calculator: {
      label: "Workers on site",
      unit: "people",
      defaultValue: 12,
      min: 1,
      max: 500,
      outputs: [
        { label: "First aid kits", perUnit: 0.1, resultUnit: "kits", roundUp: true },
        { label: "Fire extinguishers", perUnit: 0.12, resultUnit: "units", roundUp: true },
        { label: "Safety signage", perUnit: 0.5, resultUnit: "signs", roundUp: true },
        { label: "Barrier / hazard tape", perUnit: 0.25, resultUnit: "rolls", roundUp: true },
        { label: "Eye protection", perUnit: 1.2, resultUnit: "pairs", roundUp: true },
      ],
      note: "Minimum guidance only. Your OHS risk assessment always takes precedence.",
    },
  },
  {
    slug: "facility-consumables-starter-pack",
    name: "Facility consumables starter pack",
    description: "The recurring consumables a facility burns through every single month.",
    job: "Set up a predictable monthly consumables order instead of emergency buying.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["janitorial-supplies", "hygiene-products", "waste-management"],
    calculator: {
      label: "Building occupancy",
      unit: "people",
      defaultValue: 60,
      min: 1,
      max: 5000,
      outputs: [
        { label: "Refuse bags (monthly)", perUnit: 2, resultUnit: "bags", roundUp: true },
        { label: "Detergent concentrate", perUnit: 0.05, resultUnit: "litres" },
        { label: "Disinfectant", perUnit: 0.04, resultUnit: "litres" },
        { label: "Cleaning cloths", perUnit: 0.25, resultUnit: "cloths", roundUp: true },
        { label: "Gloves", perUnit: 0.6, resultUnit: "pairs", roundUp: true },
      ],
    },
  },
  {
    slug: "secure-a-property",
    name: "Secure a property",
    description: "Cameras, sensors and access control for homes, offices and sites.",
    job: "Put visible, recorded security on a property without an enterprise budget.",
    categories: ["technology-smart-solutions"],
    subcategories: ["security-monitoring", "smart-home", "smart-facility-tech"],
    calculator: {
      label: "Entry points & areas to cover",
      unit: "points",
      defaultValue: 5,
      min: 1,
      max: 100,
      outputs: [
        { label: "Cameras", perUnit: 1, resultUnit: "units", roundUp: true },
        { label: "Door / window sensors", perUnit: 1.4, resultUnit: "sensors", roundUp: true },
        { label: "Recorder / storage", perUnit: 0.2, resultUnit: "units", roundUp: true },
        { label: "Cabling runs", perUnit: 1, resultUnit: "runs", roundUp: true },
      ],
      note: "Wireless installs reduce cabling. Ask us for an on-site assessment.",
    },
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