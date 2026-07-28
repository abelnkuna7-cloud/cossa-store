/**
 * Shared result shape, safe error mapping and anonymous session helpers for
 * every Cossa Store support / lead-capture service.
 *
 * Raw Postgres, PostgREST or Supabase messages are NEVER surfaced to
 * customers: they are mapped to a small set of plain-language messages.
 */
import { SITE } from "@/config/site";

export interface SubmissionSuccess {
  success: true;
  id: string;
  referenceNumber: string;
}

export interface SubmissionFailure {
  success: false;
  error: string;
}

export type SubmissionResult = SubmissionSuccess | SubmissionFailure;

export const CONTACT_FALLBACK = `Please contact Cossa Store on WhatsApp or call ${SITE.phoneDisplay}.`;

export const ERROR_MESSAGES = {
  validation: "Please check the information and try again.",
  submit: "We could not submit your request right now.",
  network: "We could not reach Cossa Store right now. Please check your connection and try again.",
} as const;

/** Validation problems raised by the database RPCs (e.g. "Email is required"). */
const VALIDATION_HINTS = [
  "is required",
  "consent",
  "invalid",
  "check constraint",
  "violates check",
];

/**
 * Maps any thrown value / Supabase error into a customer-safe message.
 * Never returns SQL, RPC names, table names, policy text or stack traces.
 */
export function mapSubmissionError(error: unknown): string {
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : typeof error === "string"
        ? error
        : "";
  const lowered = raw.toLowerCase();

  if (import.meta.env.DEV && raw) console.debug("[cossa:submission-error]", raw);

  if (lowered.includes("failed to fetch") || lowered.includes("networkerror")) {
    return `${ERROR_MESSAGES.network} ${CONTACT_FALLBACK}`;
  }
  if (VALIDATION_HINTS.some((hint) => lowered.includes(hint))) {
    return ERROR_MESSAGES.validation;
  }
  return `${ERROR_MESSAGES.submit} ${CONTACT_FALLBACK}`;
}

export function failure(error: unknown): SubmissionFailure {
  return { success: false, error: mapSubmissionError(error) };
}

/* ---------------- context helpers ---------------- */

export function currentPage(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.pathname;
}

export function campaignSource(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("utm_source") ?? params.get("ref");
}

const SESSION_ID_KEY = "cossa.session-id.v1";

/** Anonymous, non-identifying browser-session token (sessionStorage only). */
export function anonymousSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.sessionStorage.setItem(SESSION_ID_KEY, token);
    return token;
  } catch {
    return null;
  }
}

/** South African mobile/landline validation (local or +27 format). */
export function isValidSaPhone(value: string): boolean {
  const digits = value.replace(/[\s()-]/g, "");
  return /^(\+?27|0)[1-8][0-9]{8}$/.test(digits);
}

/**
 * The generated Supabase types declare every RPC argument as non-nullable,
 * while the underlying SQL functions accept NULL for optional inputs. This
 * keeps call sites readable without weakening the return-type inference.
 */
export function rpcArgs<T extends Record<string, unknown>>(args: T): never {
  return args as unknown as never;
}
