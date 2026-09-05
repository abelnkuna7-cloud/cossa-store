/**
 * Contact-message and newsletter submissions.
 *
 * Contact messages are recorded through the central Cossa Growth lead intake.
 * Newsletter sign-ups remain in-memory until a dedicated consent-aware subscription
 * service is connected. Personal email payloads are never persisted in browser storage.
 */
import { submitCentralStoreLead } from "@/services/centralLeadIntake";

export const BACKEND_CONNECTED = true;

export interface PendingSubmission {
  reference: string;
  status: "received" | "pending_backend";
  received_at: string;
}

function reference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${stamp}`;
}

async function submit(kind: string, prefix: string, payload: unknown): Promise<PendingSubmission> {
  const ref = reference(prefix);
  void kind;
  void payload;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { reference: ref, status: "pending_backend", received_at: new Date().toISOString() };
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<PendingSubmission> {
  const ref = reference("CM");

  await submitCentralStoreLead({
    sourceRecordId: ref,
    leadType: "contact_message",
    fullName: input.name,
    email: input.email,
    phone: input.phone || null,
    service: input.subject || "Store contact",
    notes: input.message,
    rawPayload: {
      subject: input.subject,
      message: input.message,
      source_page: typeof window === "undefined" ? null : window.location.href,
    },
  });

  return {
    reference: ref,
    status: "received",
    received_at: new Date().toISOString(),
  };
}

export function submitNewsletterSignup(input: { email: string }) {
  return submit("newsletter_signup", "NL", input);
}
