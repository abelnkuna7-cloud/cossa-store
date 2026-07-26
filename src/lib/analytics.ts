/**
 * Analytics event preparation.
 *
 * NO ANALYTICS PROVIDER IS CONNECTED. `trackEvent` only buffers events in
 * memory (and logs them in development) so the event names are ready for a
 * future Cossa Marketing / Cossa CRM integration.
 */
export const ANALYTICS_CONNECTED = false;

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
  | "human_support_requested"
  | "phone_call_clicked"
  | "website_link_clicked"
  | "service_cross_sell_clicked";

export interface TrackedEvent {
  name: AnalyticsEvent;
  payload?: Record<string, string | number | boolean | null>;
  at: string;
}

const buffer: TrackedEvent[] = [];

export function trackEvent(
  name: AnalyticsEvent,
  payload?: Record<string, string | number | boolean | null>,
): void {
  const event: TrackedEvent = { name, payload, at: new Date().toISOString() };
  buffer.push(event);
  if (buffer.length > 100) buffer.shift();
  if (import.meta.env.DEV) {
    console.debug("[analytics:pending]", event.name, event.payload ?? {});
  }
}

export function bufferedEvents(): readonly TrackedEvent[] {
  return buffer;
}
