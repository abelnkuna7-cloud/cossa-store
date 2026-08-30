/**
 * Approved Cossa operating categories which intentionally share an existing
 * customer-facing Store department. This is a presentation mapping only: the
 * source product keeps its authoritative Cossa category.
 */
export const STORE_DEPARTMENT_ALIASES: Record<string, string> = {
  "travel & tech": "travel-luggage",
};

export function normaliseStoreDepartmentKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function storeDepartmentSlugFor(value: string): string {
  const normalized = normaliseStoreDepartmentKey(value);
  return STORE_DEPARTMENT_ALIASES[normalized] ?? normalized;
}
