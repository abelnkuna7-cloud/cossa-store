/**
 * Pure project-calculator engine.
 *
 * Everything here is deterministic and side-effect free so calculator results
 * can be recomputed instantly on every keystroke, on the server, or when a
 * saved project is reopened.
 */
import type {
  ProjectBundle,
  ProjectCalculator,
  ProjectField,
  ProjectFieldValues,
} from "@/types/catalog";

export interface KitLine {
  id: string;
  label: string;
  /** Final quantity including any waste allowance. */
  quantity: number;
  unit: string;
  /** Waste units included in `quantity`, if any. */
  waste: number;
  availability: "product" | "quote" | "coming_soon";
}

export function defaultValues(calculator: ProjectCalculator): ProjectFieldValues {
  const values: ProjectFieldValues = {};
  for (const field of calculator.fields) values[field.id] = field.defaultValue;
  return values;
}

/** Clamps and cleans a raw input so a calculator can never produce nonsense. */
export function sanitiseField(field: ProjectField, raw: unknown): number | string {
  if (field.type === "select") {
    const value = String(raw ?? "");
    const allowed = field.options?.some((o) => o.value === value);
    return allowed ? value : String(field.defaultValue);
  }
  if (raw === "" || raw === null || raw === undefined) return "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return field.defaultValue;
  const min = field.min ?? 0;
  const max = field.max ?? Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(parsed, Math.max(min, 0)), max);
}

/** Merges saved or partial values onto the calculator defaults, safely. */
export function normaliseValues(
  calculator: ProjectCalculator,
  values: ProjectFieldValues | undefined,
): ProjectFieldValues {
  const next: ProjectFieldValues = {};
  for (const field of calculator.fields) {
    const raw = values?.[field.id];
    next[field.id] = raw === undefined ? field.defaultValue : sanitiseField(field, raw);
  }
  return next;
}

function round(value: number, roundUp?: boolean): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return roundUp ? Math.ceil(value) : Math.round(value * 10) / 10;
}

export function computeKit(
  calculator: ProjectCalculator,
  values: ProjectFieldValues,
): KitLine[] {
  const safe = normaliseValues(calculator, values);
  const lines: KitLine[] = [];

  for (const output of calculator.outputs) {
    let base = 0;
    try {
      base = output.compute(safe);
    } catch {
      base = 0;
    }
    if (!Number.isFinite(base) || base <= 0) continue;

    const withWaste = base * (1 + (output.wastePercent ?? 0));
    const quantity = round(withWaste, output.roundUp);
    if (quantity <= 0) continue;

    const waste = Math.max(0, round(quantity - round(base, output.roundUp), output.roundUp));
    lines.push({
      id: output.id,
      label: output.label,
      quantity,
      unit: output.resultUnit,
      waste,
      availability: output.availability ?? "quote",
    });
  }

  return lines;
}

/** Human-readable "Wall height: 2.7 m" lines for summaries and WhatsApp. */
export function summariseValues(
  calculator: ProjectCalculator,
  values: ProjectFieldValues,
): string[] {
  const safe = normaliseValues(calculator, values);
  return calculator.fields.map((field) => {
    const raw = safe[field.id];
    if (field.type === "select") {
      const option = field.options?.find((o) => o.value === String(raw));
      return `${field.label}: ${option?.label ?? raw}`;
    }
    return `${field.label}: ${raw}${field.unit ? ` ${field.unit}` : ""}`;
  });
}

export function summariseKit(lines: KitLine[]): string[] {
  return lines.map((line) => `${line.label}: ${line.quantity} ${line.unit}`);
}

/** Honest label for how complete a project's catalogue currently is. */
export function availabilityLabel(project: ProjectBundle): string {
  switch (project.availability) {
    case "products_available":
      return "Products available";
    case "coming_soon":
      return "Coming soon";
    default:
      return "Quote required";
  }
}

export const KIT_DISCLAIMER =
  "These quantities are estimates generated from the values you entered. Confirm them with our team before purchasing — site conditions, product coverage and pack sizes vary.";
