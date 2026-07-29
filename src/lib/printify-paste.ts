/**
 * Structured "paste product details" helper.
 *
 * Parses labelled text copied from a print-on-demand provider dashboard into
 * suggested field values. It NEVER invents missing data: absent labels simply
 * produce no suggestion, and nothing is applied until staff confirm.
 */
export interface PastedProductDetails {
  title?: string;
  description?: string;
  features?: string[];
  care_instructions?: string;
  variants?: string[];
  production_cost?: number;
  retail_price?: number;
  provider_sku?: string;
}

const LABELS: Record<string, keyof PastedProductDetails> = {
  title: "title",
  name: "title",
  description: "description",
  features: "features",
  "care instructions": "care_instructions",
  care: "care_instructions",
  variants: "variants",
  "production cost": "production_cost",
  cost: "production_cost",
  "retail price": "retail_price",
  price: "retail_price",
  "provider sku": "provider_sku",
  sku: "provider_sku",
};

function toNumber(value: string): number | undefined {
  const match = value.replace(/[, ]/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parsePastedProduct(raw: string): PastedProductDetails {
  const result: PastedProductDetails = {};
  if (!raw.trim()) return result;

  let current: keyof PastedProductDetails | null = null;
  const buckets = new Map<keyof PastedProductDetails, string[]>();

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z ]{2,24})\s*:\s*(.*)$/);
    const key = match ? LABELS[match[1].trim().toLowerCase()] : undefined;
    if (key) {
      current = key;
      const rest = match?.[2]?.trim() ?? "";
      buckets.set(key, rest ? [rest] : []);
    } else if (current && line.trim()) {
      buckets.set(current, [...(buckets.get(current) ?? []), line.trim()]);
    }
  }

  for (const [key, lines] of buckets) {
    const joined = lines.join("\n").trim();
    if (!joined) continue;
    if (key === "features" || key === "variants") {
      result[key] = lines
        .flatMap((l) => (l.includes(",") && !l.startsWith("-") ? l.split(",") : [l]))
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);
    } else if (key === "production_cost" || key === "retail_price") {
      const value = toNumber(joined);
      if (value !== undefined) result[key] = value;
    } else {
      result[key] = joined;
    }
  }

  return result;
}
