/**
 * Contact-message and newsletter submissions.
 *
 * Contact messages are recorded through the central Cossa Growth lead intake.
 * Newsletter sign-ups remain local until a dedicated consent-aware subscription
 * service is connected.
 */
import { submitCentralStoreLead } from "@/services/centralLeadIntake";

export const BACKEND_CONNECTED = true;

export interface PendingSubmission {
  reference: string;
  status: "received" | "pending_backend";
  received_at: string;
}

const STORAGE_KEY = "cossa.pending-submissions.v1";

function reference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${stamp}`;
}

function persist(kind: string, reference: string, payload: unknown) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({ kind, reference, payload, received_at: new Date().toISOString() });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — the pending state is still shown to the user */
  }
}

async function submit(kind: string, prefix: string, payload: unknown): Promise<PendingSubmission> {
  const ref = reference(prefix);
  persist(kind, ref, payload);
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
