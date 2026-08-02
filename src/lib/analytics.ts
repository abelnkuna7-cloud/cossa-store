/**
 * Analytics layer.
 *
 * Ships a GA4-compatible dataLayer/gtag bridge plus the Cossa support events.
 * GA4 only initialises when a measurement ID is configured, so no third-party
 * script is loaded (and no page weight is added) until Cossa supplies one.
 *
 * To go live: set VITE_GA_MEASUREMENT_ID (G-XXXXXXX) and the ecommerce events
 * below start flowing automatically — no component changes required.
 */
const MEASUREMENT_ID = import.meta.env["VITE_GA_MEASUREMENT_ID"] as string | undefined;

export const ANALYTICS_CONNECTED = Boolean(MEASUREMENT_ID);

export type AnalyticsEvent =
  | "whatsapp_opened"
  | "whatsapp_product_help_clicked"
  | "whatsapp_quote_clicked"
  | "callback_opened"
  | "callback_submitted"
  | "quote_opened"
  | "quote_submitted"
  | "chatbot_opened"
  | "chatbot_message_sent"
  | "chatbot_message_saved"
  | "chatbot_conversation_started"
  | "human_support_requested"
  | "business_account_submitted"
  | "supplier_application_submitted"
  | "phone_call_clicked"
  | "website_link_clicked"
  | "service_cross_sell_clicked"
  | "product_card_view"
  | "product_card_click"
  | "carousel_view"
  | "carousel_product_click"
  | "affiliate_link_click"
  | "quote_request_click"
  | "availability_request_click"
  /* GA4 recommended ecommerce events */
  | "view_item"
  | "view_item_list"
  | "select_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "add_to_wishlist"
  | "view_cart"
  | "begin_checkout"
  | "add_payment_info"
  | "purchase"
  | "search"
  | "generate_lead"
  | "view_project_kit"
  | "add_project_kit_to_cart";

export interface TrackedEvent {
  name: AnalyticsEvent;
  payload?: Record<string, unknown>;
  at: string;
}

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

const buffer: TrackedEvent[] = [];
let initialised = false;

/** Loads gtag.js once, only if a measurement ID exists. */
export function initAnalytics(): void {
  if (initialised || !MEASUREMENT_ID || typeof window === "undefined") return;
  initialised = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  const gtag: GtagFn = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, { send_page_view: false, currency: "ZAR" });
}

/** SPA page view — call on route change. */
export function trackPageView(path: string, title?: string): void {
  if (!MEASUREMENT_ID || typeof window === "undefined") return;
  window.gtag?.("event", "page_view", { page_path: path, page_title: title });
}

export function trackEvent(name: AnalyticsEvent, payload?: Record<string, unknown>): void {
  const event: TrackedEvent = { name, payload, at: new Date().toISOString() };
  buffer.push(event);
  if (buffer.length > 100) buffer.shift();

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, payload ?? {});
  } else if (import.meta.env.DEV) {
    console.debug("[analytics:pending]", event.name, event.payload ?? {});
  }
}

/** GA4 ecommerce item shape. */
export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
}

export function trackEcommerce(
  name: Extract<
    AnalyticsEvent,
    | "view_item"
    | "view_item_list"
    | "select_item"
    | "add_to_cart"
    | "remove_from_cart"
    | "add_to_wishlist"
    | "view_cart"
    | "begin_checkout"
    | "add_payment_info"
    | "purchase"
  >,
  items: EcommerceItem[],
  extra?: Record<string, unknown>,
): void {
  const value = items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
  trackEvent(name, { currency: "ZAR", value: Math.round(value * 100) / 100, items, ...extra });
}

export function bufferedEvents(): readonly TrackedEvent[] {
  return buffer;
}
