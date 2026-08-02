import { whatsappLink } from "@/config/site";

/**
 * Builds a WhatsApp deep link that carries the customer's page context so they
 * never have to re-explain what they were looking at.
 */
export interface WhatsAppContext {
  /** Where the customer is: product, cart, quote, project, category, page. */
  subject: string;
  /** Optional bullet detail lines, e.g. SKU, quantity, kit contents. */
  details?: (string | null | undefined)[];
  /** Absolute or relative page URL. */
  url?: string;
}

export function contextualWhatsAppLink({ subject, details, url }: WhatsAppContext): string {
  const lines = ["Hello Cossa Store,", "", subject];
  const clean = (details ?? []).filter((d): d is string => Boolean(d && d.trim()));
  if (clean.length) {
    lines.push("");
    lines.push(...clean.map((d) => `• ${d}`));
  }
  const href = url ?? (typeof window !== "undefined" ? window.location.href : undefined);
  if (href) {
    lines.push("", `Page: ${href}`);
  }
  return whatsappLink(lines.join("\n"));
}
