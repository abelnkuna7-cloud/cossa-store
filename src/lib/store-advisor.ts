export type CossaService = "construction" | "facility" | "tech" | "store";

export interface AdvisorProduct {
  name: string;
  slug: string;
  selling_price: number;
  estimated_delivery?: string | null;
}

export interface AdvisorPlan {
  service: CossaService;
  serviceName: string;
  searchTerm: string | null;
  guidance: string;
  calculation: string | null;
  safetyNote: string | null;
}

const CONSTRUCTION = [
  "paint", "painting", "peel", "peeling", "tile", "tiles", "tiling", "grout",
  "cabinet", "cupboard", "door", "hinge", "roof", "ceiling", "wall", "plaster",
  "drywall", "floor", "renovation", "build", "building", "construction", "leak",
];
const FACILITY = [
  "clean", "cleaning", "stain", "hygiene", "sanitation", "washroom", "office cleaning",
  "deep clean", "carpet", "couch", "sofa", "waste", "garden", "pest",
];
const TECH = [
  "wifi", "wi-fi", "internet", "router", "network", "cctv", "camera", "security",
  "smart home", "smart-home", "computer", "laptop", "website", "technology", "tech",
  "plug", "switch", "smart bulb",
];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function serviceFor(text: string): Pick<AdvisorPlan, "service" | "serviceName"> {
  if (includesAny(text, FACILITY)) return { service: "facility", serviceName: "Cossa Facility Services" };
  if (includesAny(text, TECH)) return { service: "tech", serviceName: "Cossa Tech" };
  if (includesAny(text, CONSTRUCTION)) return { service: "construction", serviceName: "Cossa Nexus Construction" };
  return { service: "store", serviceName: "Cossa Store" };
}

function tileCalculation(text: string): string | null {
  if (!/tile|tiling/.test(text)) return null;
  const area = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|square\s*met(?:er|re)s?)/i);
  const tile = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm)?/i);
  if (!area || !tile) {
    return "For an accurate tile estimate, tell me the floor/wall area in m² and the tile size (for example 600 × 600 mm). I can then include a planning waste allowance.";
  }
  const areaM2 = Number(area[1].replace(",", "."));
  let width = Number(tile[1].replace(",", "."));
  let height = Number(tile[2].replace(",", "."));
  const unit = (tile[3] || (width > 10 || height > 10 ? "mm" : "m")).toLowerCase();
  if (unit === "mm") { width /= 1000; height /= 1000; }
  if (unit === "cm") { width /= 100; height /= 100; }
  const tileArea = width * height;
  if (!Number.isFinite(areaM2) || !Number.isFinite(tileArea) || areaM2 <= 0 || tileArea <= 0) return null;
  const base = Math.ceil(areaM2 / tileArea);
  const withWaste = Math.ceil(base * 1.1);
  return `Planning estimate: ${areaM2.toLocaleString()} m² using ${tile[1]} × ${tile[2]} ${tile[3] || "mm"} tiles needs about ${base.toLocaleString()} tiles before waste, or about ${withWaste.toLocaleString()} tiles with a 10% allowance. Confirm the actual tile dimensions and tiles/m² or box coverage before ordering.`;
}

function paintCalculation(text: string): string | null {
  if (!/paint|painting/.test(text)) return null;
  const area = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|square\s*met(?:er|re)s?)/i);
  if (!area) return "For a paint estimate, tell me the paintable wall/ceiling area in m² (or room dimensions), whether it is interior or exterior, and how many coats you plan to apply.";
  const areaM2 = Number(area[1].replace(",", "."));
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return null;
  const litres = Math.ceil((areaM2 * 2) / 10);
  return `Planning estimate: for ${areaM2.toLocaleString()} m² and two coats, roughly ${litres} L of paint would be needed at an assumed 10 m²/L per coat. Actual coverage varies by product, surface and preparation, so use the selected paint manufacturer's stated coverage before ordering.`;
}

function searchTermFor(text: string): string | null {
  const mappings: Array<[string[], string]> = [
    [["tile", "tiling", "grout"], "tiles adhesive grout tiling"],
    [["paint", "painting", "peel", "peeling"], "paint primer sealer painting"],
    [["cabinet", "cupboard", "hinge"], "cabinet hinges hardware"],
    [["clean", "cleaning", "stain", "carpet", "couch", "sofa"], "cleaning"],
    [["wifi", "wi-fi", "router", "network"], "wifi router networking"],
    [["cctv", "camera", "security"], "security camera cctv"],
    [["smart home", "smart-home", "smart bulb", "smart plug"], "smart home"],
    [["door"], "door hardware"],
  ];
  return mappings.find(([terms]) => includesAny(text, terms))?.[1] ?? null;
}

function guidanceFor(text: string, serviceName: string): string {
  if (/paint.*peel|peel.*paint|flak/.test(text)) {
    return `Peeling paint usually needs the cause checked before repainting. Look for moisture or leaks, remove loose material, prepare the surface and use the correct primer/sealer and topcoat. ${serviceName} can inspect, repair and paint if you want the work handled professionally.`;
  }
  if (/tile.*(lift|loose|peel|come|coming)|tiles.*(lift|loose|peel|come|coming)/.test(text)) {
    return `Loose or lifting tiles can be caused by failed adhesive, movement, poor preparation or moisture. Avoid simply gluing the visible edge back down. Check how widespread the problem is, the substrate condition and any moisture source. ${serviceName} can assess and repair or retile the affected area.`;
  }
  if (/cabinet|cupboard|hinge/.test(text)) {
    return `First identify whether the problem is the hinge, handle, runner, door alignment or damaged cabinet board. Small hardware faults may only need replacement fittings; damaged doors or carcasses may need repair or replacement. ${serviceName} can assist with repair or installation.`;
  }
  if (includesAny(text, FACILITY)) {
    return `I can help identify suitable cleaning products and equipment for the job. If you would rather have the work done, ${serviceName} can assist with residential, commercial or specialist cleaning requirements.`;
  }
  if (includesAny(text, TECH)) {
    return `I can help narrow down the equipment or setup you need. ${serviceName} can assist with suitable technology, smart-home, networking, security or business technology requirements where applicable.`;
  }
  if (includesAny(text, CONSTRUCTION)) {
    return `I can help work out the materials, quantities and suitable Store products for the job. ${serviceName} can also assist with installation, repairs, renovation or project work where applicable.`;
  }
  return "Tell me what you are trying to fix, build, clean, improve or buy. I can search the live Cossa Store catalogue, help estimate quantities and route you to the right Cossa service when the job needs more than a product.";
}

function safetyFor(text: string): string | null {
  if (/structural|foundation|load.?bearing|electrical shock|sparking|burning wire|gas leak|severe mould|severe mold|flood|major leak/.test(text)) {
    return "This may involve a safety or building-risk issue. Avoid relying on a product-only fix; arrange a qualified inspection before proceeding.";
  }
  return null;
}

export function buildAdvisorPlan(input: string): AdvisorPlan {
  const text = input.trim().toLowerCase();
  const service = serviceFor(text);
  return {
    ...service,
    searchTerm: searchTermFor(text),
    guidance: guidanceFor(text, service.serviceName),
    calculation: tileCalculation(text) ?? paintCalculation(text),
    safetyNote: safetyFor(text),
  };
}

export function formatAdvisorReply(plan: AdvisorPlan, products: AdvisorProduct[]): string {
  const parts = [plan.guidance];
  if (plan.calculation) parts.push(plan.calculation);
  if (products.length) {
    const productText = products.slice(0, 3).map((product) => `${product.name} — R${Number(product.selling_price).toFixed(2)}`).join("; ");
    parts.push(`Relevant products currently in Cossa Store: ${productText}. Open the Store search to review the exact product details, availability and delivery information before ordering.`);
  } else if (plan.searchTerm) {
    parts.push("I could not find a strong live-catalogue match for that requirement right now. Cossa Store can still help source the product or prepare a quotation.");
  }
  if (plan.service !== "store") parts.push(`Need the work done as well? ${plan.serviceName} is the Cossa company aligned with this requirement. You can request a quote or callback from the support menu.`);
  if (plan.safetyNote) parts.push(plan.safetyNote);
  return parts.join("\n\n");
}
