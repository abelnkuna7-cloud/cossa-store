/**
 * Cossa Store analytics bridge.
 *
 * Production behaviour:
 * - If VITE_GTM_CONTAINER_ID is configured (GTM-XXXXXXX), GTM is the primary
 *   analytics transport and all Store events are pushed into dataLayer.
 * - If GTM is not configured but VITE_GA_MEASUREMENT_ID is configured
 *   (G-XXXXXXX), the Store loads GA4 directly through gtag.js.
 * - If neither identifier is configured, no Google script is loaded.
 *
 * GTM takes precedence when both values exist so the same event is not sent
 * twice. A GTM container can then route the ecommerce events to GA4 and other
 * authorised measurement destinations without changing Store components.
 */
const GTM_CONTAINER_ID = import.meta.env["VITE_GTM_CONTAINER_ID"] as string | undefined;
const GA_MEASUREMENT_ID = import.meta.env["VITE_GA_MEASUREMENT_ID"] as string | undefined;

const VALID_GTM_ID = GTM_CONTAINER_ID && /^GTM-[A-Z0-9]+$/i.test(GTM_CONTAINER_ID)
  ? GTM_CONTAINER_ID
  : undefined;
const VALID_GA_ID = GA_MEASUREMENT_ID && /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID)
  ? GA_MEASUREMENT_ID
  : undefined;

export const ANALYTICS_CONNECTED = Boolean(VALID_GTM_ID || VALID_GA_ID);
export const ANALYTICS_MODE = VALID_GTM_ID ? "gtm" : VALID_GA_ID ? "ga4" : "disabled";

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
  | "add_project_kit_to_cart"
  | "project_calculator_started"
  | "project_calculator_completed"
  | "project_saved"
  | "project_shared"
  | "project_kit_added"
  | "project_quote_requested"
  | "project_reset"
  | "whatsapp_clicked"
  | "service_add_on_selected"
  | "empty_state_cta_clicked"
  | "search_no_results";

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

function pushDataLayer(value: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(value);
}

function loadGtm(containerId: string): void {
  window.dataLayer = window.dataLayer || [];
  pushDataLayer({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  script.dataset.cossaAnalytics = "gtm";
  document.head.appendChild(script);
}

function loadDirectGa4(measurementId: string): void {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.cossaAnalytics = "ga4";
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  const gtag: GtagFn = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", measurementId, {
    send_page_view: false,
    currency: "ZAR",
  });
}

/** Initialise exactly one Google measurement transport. */
export function initAnalytics(): void {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  if (VALID_GTM_ID) {
    loadGtm(VALID_GTM_ID);
    return;
  }

  if (VALID_GA_ID) {
    loadDirectGa4(VALID_GA_ID);
  }
}

/** SPA page view — called by the TanStack router after a route resolves. */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === "undefined" || !ANALYTICS_CONNECTED) return;

  const payload = {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  };

  if (VALID_GTM_ID) {
    pushDataLayer({ event: "page_view", ...payload });
    return;
  }

  window.gtag?.("event", "page_view", payload);
}

export function trackEvent(name: AnalyticsEvent, payload?: Record<string, unknown>): void {
  const event: TrackedEvent = { name, payload, at: new Date().toISOString() };
  buffer.push(event);
  if (buffer.length > 100) buffer.shift();

  if (typeof window === "undefined" || !ANALYTICS_CONNECTED) {
    if (import.meta.env.DEV) console.debug("[analytics:pending]", event.name, event.payload ?? {});
    return;
  }

  if (VALID_GTM_ID) {
    pushDataLayer({ event: name, ...(payload ?? {}) });
    return;
  }

  window.gtag?.("event", name, payload ?? {});
}

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
  const value = items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
  trackEvent(name, {
    currency: "ZAR",
    value: Math.round(value * 100) / 100,
    items,
    ...extra,
  });
}

export function bufferedEvents(): readonly TrackedEvent[] {
  return buffer;
}
