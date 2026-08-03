import type {
  Category,
  ProjectBundle,
  ProjectFieldValues,
  ProjectServiceOption,
} from "@/types/catalog";

export const CATEGORIES: Category[] = [
  {
    slug: "construction-diy",
    name: "Cossa Nexus Construction",
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

/* ---------- calculator helpers ---------- */

/** Safe positive number read — never returns NaN or a negative value. */
const n = (v: ProjectFieldValues, key: string): number => {
  const value = Number(v[key]);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/** Safe string read for select fields. */
const s = (v: ProjectFieldValues, key: string): string => String(v[key] ?? "");

const FREQUENCY_FACTOR: Record<string, number> = {
  daily: 1,
  three_weekly: 0.6,
  weekly: 0.25,
  monthly: 0.1,
};

/* ---------- shared service options ---------- */

const INSTALL_SERVICE: ProjectServiceOption = {
  id: "installation",
  name: "Installation and site work",
  provider: "Cossa Nexus Construction",
  description: "Our team carries out the physical work using the products in your kit.",
};

const CLEANING_SERVICE: ProjectServiceOption = {
  id: "cleaning",
  name: "Cleaning and facility support",
  provider: "Cossa Facility Services",
  description: "Once-off or contract cleaning, hygiene management and facility maintenance.",
};

const TECH_SERVICE: ProjectServiceOption = {
  id: "tech_setup",
  name: "Technology setup and support",
  provider: "Cossa Tech",
  description: "Installation, configuration and ongoing support for smart and IT equipment.",
};

export const PROJECTS: ProjectBundle[] = [
  {
    slug: "paint-a-room",
    name: "Paint a room",
    description: "Preparation, application and protection supplies for a clean interior repaint.",
    job: "Repaint an interior room properly the first time — prep, protect, apply, clean up.",
    categories: ["construction-diy"],
    subcategories: ["painting-supplies", "tools-accessories", "safety-ppe"],
    themes: ["construction"],
    audiences: ["home", "personal", "business"],
    availability: "quote_required",
    effort: 2,
    budgetBand: "low",
    popularity: 96,
    addedAt: "2026-01-12",
    accessories: ["Sandpaper and filler", "Paint tray and stirrers", "Cleaning cloths"],
    services: [INSTALL_SERVICE, CLEANING_SERVICE],
    calculator: {
      label: "Wall area",
      note: "Based on roughly 6 m² coverage per litre per coat. Porous or dark walls need more.",
      fields: [
        { id: "rooms", label: "Number of rooms", type: "number", unit: "rooms", defaultValue: 1, min: 1, max: 60 },
        { id: "perimeter", label: "Wall length (perimeter of the room)", type: "number", unit: "m", defaultValue: 16, min: 1, max: 400, step: 0.5 },
        { id: "height", label: "Wall height", type: "number", unit: "m", defaultValue: 2.7, min: 1, max: 12, step: 0.1 },
        { id: "coats", label: "Number of coats", type: "select", defaultValue: "2", options: [
          { value: "1", label: "1 coat" },
          { value: "2", label: "2 coats (recommended)" },
          { value: "3", label: "3 coats" },
        ] },
        { id: "surface", label: "Surface condition", type: "select", defaultValue: "painted", options: [
          { value: "painted", label: "Previously painted, good condition" },
          { value: "new", label: "New plaster or bare wall" },
          { value: "dark", label: "Dark or heavily marked wall" },
        ] },
      ],
      outputs: [
        {
          id: "paint",
          label: "Interior wall paint",
          resultUnit: "litres",
          wastePercent: 0.1,
          availability: "quote",
          compute: (v) => {
            const area = n(v, "rooms") * n(v, "perimeter") * n(v, "height");
            const coats = Number(s(v, "coats")) || 2;
            const factor = s(v, "surface") === "dark" ? 1.25 : s(v, "surface") === "new" ? 1.15 : 1;
            return (area * coats * factor) / 6;
          },
        },
        {
          id: "primer",
          label: "Primer / undercoat",
          resultUnit: "litres",
          wastePercent: 0.05,
          availability: "quote",
          compute: (v) => {
            const area = n(v, "rooms") * n(v, "perimeter") * n(v, "height");
            return s(v, "surface") === "painted" ? area / 22 : area / 10;
          },
        },
        { id: "sleeves", label: "Roller sleeves", resultUnit: "sleeves", roundUp: true, availability: "quote", compute: (v) => (n(v, "rooms") * n(v, "perimeter") * n(v, "height")) / 45 },
        { id: "tape", label: "Masking tape", resultUnit: "rolls", roundUp: true, availability: "quote", compute: (v) => n(v, "rooms") * (n(v, "perimeter") / 25) },
        { id: "sheets", label: "Drop sheets", resultUnit: "sheets", roundUp: true, availability: "quote", compute: (v) => n(v, "rooms") },
      ],
    },
  },
  {
    slug: "clean-an-office",
    name: "Clean an office",
    description: "Daily and periodic cleaning consumables for commercial office space.",
    job: "Keep an office presentable every day without running out of consumables mid-month.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["cleaning-tools", "office-commercial", "janitorial-supplies"],
    themes: ["cleaning", "workplace"],
    audiences: ["business"],
    availability: "quote_required",
    effort: 1,
    budgetBand: "medium",
    popularity: 91,
    addedAt: "2026-01-12",
    accessories: ["Colour-coded buckets", "Wet-floor signage", "Storage trolley"],
    services: [CLEANING_SERVICE],
    calculator: {
      label: "Floor area",
      note: "Monthly consumable estimate for a standard commercial office.",
      fields: [
        { id: "length", label: "Floor length", type: "number", unit: "m", defaultValue: 20, min: 1, max: 500, step: 0.5 },
        { id: "width", label: "Floor width", type: "number", unit: "m", defaultValue: 12, min: 1, max: 500, step: 0.5 },
        { id: "people", label: "Number of people", type: "number", unit: "people", defaultValue: 30, min: 1, max: 5000 },
        { id: "frequency", label: "Cleaning frequency", type: "select", defaultValue: "daily", options: [
          { value: "daily", label: "Daily" },
          { value: "three_weekly", label: "Three times a week" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ] },
        { id: "propertyType", label: "Property type", type: "select", defaultValue: "office", options: [
          { value: "office", label: "Office" },
          { value: "retail", label: "Retail or hospitality" },
          { value: "warehouse", label: "Warehouse or industrial" },
        ] },
      ],
      outputs: [
        { id: "apc", label: "All-purpose cleaner (monthly)", resultUnit: "litres", availability: "quote", compute: (v) => (n(v, "length") * n(v, "width")) * 0.02 * (FREQUENCY_FACTOR[s(v, "frequency")] ?? 1) * (s(v, "propertyType") === "retail" ? 1.3 : 1) },
        { id: "floor", label: "Floor cleaner (monthly)", resultUnit: "litres", availability: "quote", compute: (v) => (n(v, "length") * n(v, "width")) * 0.015 * (FREQUENCY_FACTOR[s(v, "frequency")] ?? 1) },
        { id: "bags", label: "Refuse bags (monthly)", resultUnit: "bags", roundUp: true, availability: "quote", compute: (v) => n(v, "people") * 4 * (FREQUENCY_FACTOR[s(v, "frequency")] ?? 1) },
        { id: "cloths", label: "Microfibre cloths", resultUnit: "cloths", roundUp: true, availability: "quote", compute: (v) => (n(v, "length") * n(v, "width")) * 0.03 },
        { id: "mops", label: "Mop heads (quarterly)", resultUnit: "heads", roundUp: true, availability: "quote", compute: (v) => (n(v, "length") * n(v, "width")) * 0.006 },
      ],
    },
  },
  {
    slug: "equip-a-construction-team",
    name: "Equip a construction team",
    description: "Core tools, measuring gear and PPE to get a crew productive on site.",
    job: "Kit out a new crew so nobody stands idle waiting for a tool or a hard hat.",
    categories: ["construction-diy"],
    subcategories: ["tools-accessories", "measuring-equipment", "safety-ppe", "hardware"],
    themes: ["construction", "workplace"],
    audiences: ["business", "men", "women"],
    availability: "quote_required",
    effort: 3,
    budgetBand: "high",
    popularity: 88,
    addedAt: "2026-01-12",
    accessories: ["Tool storage and site box", "Extension leads", "Site first-aid kit"],
    services: [INSTALL_SERVICE],
    calculator: {
      label: "Crew size",
      note: "Consumable PPE allows for rotation and replacement over the project duration.",
      fields: [
        { id: "crew", label: "Crew size", type: "number", unit: "people", defaultValue: 6, min: 1, max: 300 },
        { id: "weeks", label: "Project duration", type: "number", unit: "weeks", defaultValue: 8, min: 1, max: 156 },
        { id: "sizeMix", label: "Clothing size range", type: "select", defaultValue: "standard", options: [
          { value: "standard", label: "Standard adult sizes (S–XXL)" },
          { value: "extended", label: "Extended sizes required" },
        ] },
      ],
      outputs: [
        { id: "hats", label: "Hard hats", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => n(v, "crew") },
        { id: "vests", label: "Hi-vis vests", resultUnit: "units", roundUp: true, wastePercent: 0.1, availability: "quote", compute: (v) => n(v, "crew") * 1.5 },
        { id: "boots", label: "Safety boots", resultUnit: "pairs", roundUp: true, availability: "quote", compute: (v) => n(v, "crew") },
        { id: "gloves", label: "Work gloves", resultUnit: "pairs", roundUp: true, availability: "quote", compute: (v) => n(v, "crew") * Math.max(1, n(v, "weeks") / 4) * 0.75 },
        { id: "toolsets", label: "Shared tool sets", resultUnit: "sets", roundUp: true, availability: "quote", compute: (v) => n(v, "crew") / 3 },
      ],
    },
  },
  {
    slug: "improve-workplace-hygiene",
    name: "Improve workplace hygiene",
    description: "Hygiene, waste and sanitation products for healthier workplaces.",
    job: "Raise hygiene standards across washrooms, kitchens and shared workspaces.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["hygiene-products", "waste-management", "ppe"],
    themes: ["cleaning", "workplace"],
    audiences: ["business"],
    availability: "quote_required",
    effort: 1,
    budgetBand: "low",
    popularity: 74,
    addedAt: "2026-01-20",
    accessories: ["Dispensers and brackets", "Sanitiser stands", "Washroom signage"],
    services: [CLEANING_SERVICE],
    calculator: {
      label: "People on site",
      fields: [
        { id: "people", label: "Number of people on site", type: "number", unit: "people", defaultValue: 40, min: 1, max: 10000 },
        { id: "washrooms", label: "Number of washrooms", type: "number", unit: "washrooms", defaultValue: 4, min: 1, max: 200 },
        { id: "frequency", label: "Servicing frequency", type: "select", defaultValue: "daily", options: [
          { value: "daily", label: "Daily" },
          { value: "three_weekly", label: "Three times a week" },
          { value: "weekly", label: "Weekly" },
        ] },
      ],
      outputs: [
        { id: "soap", label: "Hand soap (monthly)", resultUnit: "litres", availability: "quote", compute: (v) => n(v, "people") * 0.08 },
        { id: "sanitiser", label: "Hand sanitiser (monthly)", resultUnit: "litres", availability: "quote", compute: (v) => n(v, "people") * 0.06 },
        { id: "tp", label: "Toilet paper (monthly)", resultUnit: "rolls", roundUp: true, wastePercent: 0.1, availability: "quote", compute: (v) => n(v, "people") * 2.2 },
        { id: "towel", label: "Paper towel (monthly)", resultUnit: "rolls", roundUp: true, availability: "quote", compute: (v) => n(v, "people") * 0.9 },
        { id: "liners", label: "Bin liners (monthly)", resultUnit: "liners", roundUp: true, availability: "quote", compute: (v) => n(v, "washrooms") * 22 * (FREQUENCY_FACTOR[s(v, "frequency")] ?? 1) },
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
    themes: ["technology"],
    audiences: ["home", "personal"],
    availability: "quote_required",
    effort: 2,
    budgetBand: "medium",
    popularity: 82,
    addedAt: "2026-02-02",
    accessories: ["Wi-Fi mesh extender", "Surge protection", "Mounting hardware"],
    services: [TECH_SERVICE, INSTALL_SERVICE],
    calculator: {
      label: "Rooms to upgrade",
      note: "One hub typically covers a standard home. Larger properties may need a repeater.",
      fields: [
        { id: "rooms", label: "Number of rooms", type: "number", unit: "rooms", defaultValue: 4, min: 1, max: 60 },
        { id: "propertyType", label: "Property type", type: "select", defaultValue: "house", options: [
          { value: "apartment", label: "Apartment or flat" },
          { value: "house", label: "Freestanding house" },
          { value: "estate", label: "Large property or estate" },
        ] },
        { id: "level", label: "Technology requirement", type: "select", defaultValue: "standard", options: [
          { value: "basic", label: "Basic — lighting and plugs" },
          { value: "standard", label: "Standard — lighting, plugs and switches" },
          { value: "advanced", label: "Advanced — full control and monitoring" },
        ] },
      ],
      outputs: [
        { id: "bulbs", label: "Smart bulbs", resultUnit: "bulbs", roundUp: true, availability: "quote", compute: (v) => n(v, "rooms") * (s(v, "level") === "advanced" ? 3.5 : s(v, "level") === "basic" ? 1.5 : 2.5) },
        { id: "plugs", label: "Smart plugs", resultUnit: "plugs", roundUp: true, availability: "quote", compute: (v) => n(v, "rooms") },
        { id: "switches", label: "Smart switches", resultUnit: "switches", roundUp: true, availability: "quote", compute: (v) => (s(v, "level") === "basic" ? 0 : n(v, "rooms")) },
        { id: "hub", label: "Hub / gateway", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => (s(v, "propertyType") === "estate" ? 2 : 1) },
        { id: "sensors", label: "Motion / door sensors", resultUnit: "sensors", roundUp: true, availability: "quote", compute: (v) => (s(v, "level") === "advanced" ? n(v, "rooms") * 1.5 : 0) },
      ],
    },
  },
  {
    slug: "set-up-a-productive-workspace",
    name: "Set up a productive workspace",
    description: "Desk technology, accessories and organisation for focused work.",
    job: "Turn empty desks into working, cable-managed, ergonomic workstations.",
    categories: ["technology-smart-solutions", "construction-diy"],
    subcategories: ["productivity-equipment", "computer-mobile-accessories", "storage-organisation"],
    themes: ["technology", "workplace"],
    audiences: ["business", "home"],
    availability: "quote_required",
    effort: 2,
    budgetBand: "medium",
    popularity: 70,
    addedAt: "2026-02-10",
    accessories: ["Desk lamps", "Headsets", "Labelling and cable ties"],
    services: [TECH_SERVICE],
    calculator: {
      label: "Workstations",
      fields: [
        { id: "desks", label: "Number of workstations", type: "number", unit: "desks", defaultValue: 8, min: 1, max: 1000 },
        { id: "monitors", label: "Monitors per desk", type: "select", defaultValue: "1", options: [
          { value: "1", label: "One monitor" },
          { value: "2", label: "Two monitors" },
        ] },
        { id: "storage", label: "Desk storage required", type: "select", defaultValue: "yes", options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ] },
      ],
      outputs: [
        { id: "arms", label: "Monitor stands / arms", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => n(v, "desks") * (Number(s(v, "monitors")) || 1) },
        { id: "peripherals", label: "Keyboard and mouse sets", resultUnit: "sets", roundUp: true, availability: "quote", compute: (v) => n(v, "desks") },
        { id: "power", label: "Power / surge strips", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => n(v, "desks") },
        { id: "cable", label: "Cable-management kits", resultUnit: "kits", roundUp: true, availability: "quote", compute: (v) => n(v, "desks") },
        { id: "storage", label: "Desk storage units", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => (s(v, "storage") === "yes" ? n(v, "desks") : 0) },
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
    themes: ["construction", "workplace"],
    audiences: ["business"],
    availability: "quote_required",
    effort: 2,
    budgetBand: "medium",
    popularity: 66,
    addedAt: "2026-02-14",
    accessories: ["Incident register", "Emergency contact boards", "Torches"],
    services: [INSTALL_SERVICE],
    calculator: {
      label: "Workers on site",
      note: "Minimum guidance only. Your OHS risk assessment always takes precedence.",
      fields: [
        { id: "workers", label: "Number of people on site", type: "number", unit: "people", defaultValue: 12, min: 1, max: 2000 },
        { id: "weeks", label: "Project duration", type: "number", unit: "weeks", defaultValue: 12, min: 1, max: 260 },
        { id: "siteArea", label: "Site area", type: "number", unit: "m²", defaultValue: 400, min: 10, max: 100000, step: 10 },
      ],
      outputs: [
        { id: "firstaid", label: "First-aid kits", resultUnit: "kits", roundUp: true, availability: "quote", compute: (v) => Math.max(1, n(v, "workers") / 10) },
        { id: "extinguishers", label: "Fire extinguishers", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => Math.max(1, n(v, "siteArea") / 200) },
        { id: "signage", label: "Safety signage", resultUnit: "signs", roundUp: true, availability: "quote", compute: (v) => Math.max(4, n(v, "siteArea") / 100) },
        { id: "tape", label: "Barrier / hazard tape", resultUnit: "rolls", roundUp: true, wastePercent: 0.15, availability: "quote", compute: (v) => Math.max(2, n(v, "siteArea") / 150) },
        { id: "eyes", label: "Eye protection", resultUnit: "pairs", roundUp: true, availability: "quote", compute: (v) => n(v, "workers") * Math.max(1, n(v, "weeks") / 12) },
      ],
    },
  },
  {
    slug: "facility-consumables-starter-pack",
    name: "Facility consumables starter pack",
    description: "The recurring consumables a facility burns through every single month.",
    job: "Set up a predictable monthly consumables order instead of emergency buying.",
    categories: ["cleaning-facility-supplies"],
    subcategories: ["janitorial-supplies", "hygiene-products", "waste-management"],
    themes: ["cleaning", "workplace"],
    audiences: ["business"],
    availability: "quote_required",
    effort: 1,
    budgetBand: "medium",
    popularity: 61,
    addedAt: "2026-02-18",
    accessories: ["Storeroom shelving", "Stock-count sheets", "Decanting bottles"],
    services: [CLEANING_SERVICE],
    calculator: {
      label: "Building occupancy",
      fields: [
        { id: "people", label: "Building occupancy", type: "number", unit: "people", defaultValue: 60, min: 1, max: 10000 },
        { id: "area", label: "Floor area", type: "number", unit: "m²", defaultValue: 600, min: 10, max: 100000, step: 10 },
        { id: "frequency", label: "Cleaning frequency", type: "select", defaultValue: "daily", options: [
          { value: "daily", label: "Daily" },
          { value: "three_weekly", label: "Three times a week" },
          { value: "weekly", label: "Weekly" },
        ] },
      ],
      outputs: [
        { id: "bags", label: "Refuse bags (monthly)", resultUnit: "bags", roundUp: true, availability: "quote", compute: (v) => n(v, "people") * 2 * (FREQUENCY_FACTOR[s(v, "frequency")] ?? 1) * 4 },
        { id: "detergent", label: "Detergent concentrate", resultUnit: "litres", availability: "quote", compute: (v) => n(v, "area") * 0.005 },
        { id: "disinfectant", label: "Disinfectant", resultUnit: "litres", availability: "quote", compute: (v) => n(v, "area") * 0.004 },
        { id: "cloths", label: "Cleaning cloths", resultUnit: "cloths", roundUp: true, availability: "quote", compute: (v) => n(v, "people") * 0.25 },
        { id: "gloves", label: "Gloves", resultUnit: "pairs", roundUp: true, availability: "quote", compute: (v) => n(v, "people") * 0.6 },
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
    themes: ["technology"],
    audiences: ["home", "business"],
    availability: "quote_required",
    effort: 3,
    budgetBand: "high",
    popularity: 79,
    addedAt: "2026-02-22",
    accessories: ["UPS or backup power", "Network switch", "Weatherproof housings"],
    services: [TECH_SERVICE, INSTALL_SERVICE],
    calculator: {
      label: "Coverage points",
      note: "Wireless installs reduce cabling. Ask us for an on-site assessment.",
      fields: [
        { id: "points", label: "Entry points and areas to cover", type: "number", unit: "points", defaultValue: 5, min: 1, max: 300 },
        { id: "floors", label: "Number of floors or buildings", type: "number", unit: "floors", defaultValue: 1, min: 1, max: 50 },
        { id: "propertyType", label: "Property type", type: "select", defaultValue: "home", options: [
          { value: "home", label: "Home" },
          { value: "office", label: "Office or retail" },
          { value: "site", label: "Construction or industrial site" },
        ] },
        { id: "wiring", label: "Installation type", type: "select", defaultValue: "wired", options: [
          { value: "wired", label: "Wired" },
          { value: "wireless", label: "Wireless" },
        ] },
      ],
      outputs: [
        { id: "cameras", label: "Cameras", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => n(v, "points") },
        { id: "sensors", label: "Door / window sensors", resultUnit: "sensors", roundUp: true, availability: "quote", compute: (v) => n(v, "points") * 1.4 },
        { id: "recorder", label: "Recorder / storage", resultUnit: "units", roundUp: true, availability: "quote", compute: (v) => Math.max(1, n(v, "points") / 8) * n(v, "floors") },
        { id: "cabling", label: "Cabling runs", resultUnit: "runs", roundUp: true, wastePercent: 0.1, availability: "quote", compute: (v) => (s(v, "wiring") === "wired" ? n(v, "points") * n(v, "floors") : 0) },
      ],
    },
  },
  {
    slug: "brand-a-team-in-workwear",
    name: "Brand a team in workwear",
    description: "Printed and embroidered workwear for staff, crews, families and school groups.",
    job: "Get a team, crew or group into matching branded clothing without minimum-order stress.",
    categories: ["construction-diy"],
    subcategories: ["safety-ppe", "tools-accessories"],
    themes: ["workplace"],
    audiences: ["business", "men", "women", "kids", "toddlers", "personal"],
    availability: "quote_required",
    effort: 2,
    budgetBand: "medium",
    popularity: 58,
    addedAt: "2026-03-04",
    accessories: ["Name badges", "Garment bags", "Care labels"],
    services: [INSTALL_SERVICE],
    calculator: {
      label: "Garment quantity",
      note: "Print-on-demand items are made to order. Sizes and quantities are confirmed on quotation.",
      fields: [
        { id: "adults", label: "Adult garments required", type: "number", unit: "items", defaultValue: 12, min: 0, max: 5000 },
        { id: "kids", label: "Child garments required", type: "number", unit: "items", defaultValue: 0, min: 0, max: 5000 },
        { id: "toddlers", label: "Toddler garments required", type: "number", unit: "items", defaultValue: 0, min: 0, max: 5000 },
        { id: "perPerson", label: "Garments per person", type: "number", unit: "items", defaultValue: 2, min: 1, max: 20 },
        { id: "sizeMix", label: "Size range", type: "select", defaultValue: "standard", options: [
          { value: "standard", label: "Standard sizes" },
          { value: "extended", label: "Extended sizes required" },
        ] },
      ],
      outputs: [
        { id: "adultItems", label: "Adult items to produce", resultUnit: "items", roundUp: true, wastePercent: 0.05, availability: "quote", compute: (v) => n(v, "adults") * n(v, "perPerson") },
        { id: "kidItems", label: "Child items to produce", resultUnit: "items", roundUp: true, availability: "quote", compute: (v) => n(v, "kids") * n(v, "perPerson") },
        { id: "toddlerItems", label: "Toddler items to produce", resultUnit: "items", roundUp: true, availability: "quote", compute: (v) => n(v, "toddlers") * n(v, "perPerson") },
        { id: "prints", label: "Print / embroidery positions", resultUnit: "positions", roundUp: true, availability: "quote", compute: (v) => (n(v, "adults") + n(v, "kids") + n(v, "toddlers")) * n(v, "perPerson") },
      ],
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
