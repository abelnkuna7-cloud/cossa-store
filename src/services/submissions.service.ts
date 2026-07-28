/**
 * Contact-message and newsletter submissions.
 *
 * These two surfaces have no dedicated backend table yet, so they still record
 * locally and report an honest pending state. Quotations, business-account and
 * supplier applications are handled by the connected services in
 * `@/services/quotes`, `@/services/businessAccounts` and `@/services/suppliers`.
 */
export const BACKEND_CONNECTED = false;

export interface PendingSubmission {
  reference: string;
  status: "pending_backend";
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

export function submitContactMessage(input: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}) {
  return submit("contact_message", "CM", input);
}

export function submitNewsletterSignup(input: { email: string }) {
  return submit("newsletter_signup", "NL", input);
}
