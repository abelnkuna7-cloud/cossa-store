/**
 * Submission data-access layer (quotes, applications, contact, newsletter).
 *
 * NO BACKEND IS CONNECTED IN PHASE 1. These functions deliberately do not
 * pretend a submission was processed: they record the payload locally and
 * return a `pending` reference so the UI can show an honest pending state.
 * Phase 2 replaces the bodies with Supabase inserts.
 */
import type {
  BusinessAccountApplicationInput,
  QuoteRequestInput,
  SupplierApplicationInput,
} from "@/types/catalog";

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
  // Simulated latency only; no network call is made because no backend exists yet.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { reference: ref, status: "pending_backend", received_at: new Date().toISOString() };
}

export function submitQuoteRequest(input: QuoteRequestInput) {
  return submit("quote_request", "QR", input);
}

export function submitBusinessAccountApplication(input: BusinessAccountApplicationInput) {
  return submit("business_account_application", "BA", input);
}

export function submitSupplierApplication(input: SupplierApplicationInput) {
  return submit("supplier_application", "SA", input);
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
