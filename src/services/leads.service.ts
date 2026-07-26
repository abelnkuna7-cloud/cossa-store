/**
 * Lead capture layer for support workflows (callback, quick quote, chatbot
 * handoff).
 *
 * NO BACKEND IS CONNECTED. Nothing is transmitted anywhere: payloads are kept
 * in the current browser only so the UI can honestly report a pending state.
 * Phase 2 replaces the bodies with Cossa CRM / Lovable Cloud writes.
 */

export const LEADS_BACKEND_CONNECTED = false;

export type EnquiryType =
  | "callback"
  | "quick_quote"
  | "product_sourcing"
  | "human_support"
  | "service_request";

export type PreferredContactMethod = "phone" | "whatsapp" | "email";

/** Shape prepared for future CRM integration. */
export interface LeadRecord {
  source_page: string;
  name: string;
  phone: string;
  email: string | null;
  location: string | null;
  enquiry_type: EnquiryType;
  interest: string | null;
  preferred_contact_method: PreferredContactMethod;
  campaign_source: string | null;
  created_at: string;
  status: "pending_backend";
  details: Record<string, unknown>;
}

export interface CallbackRequestInput {
  full_name: string;
  phone: string;
  email: string | null;
  preferred_time: string;
  reason: string;
  product_category: string;
  location: string;
  consent: boolean;
}

export type QuickQuoteScope =
  | "products_only"
  | "services_only"
  | "products_and_services"
  | "bulk_order"
  | "product_sourcing";

export interface QuickQuoteInput {
  name: string;
  company: string | null;
  phone: string;
  email: string;
  location: string;
  scope: QuickQuoteScope;
  requirements: string;
  estimated_quantity: string;
  required_date: string;
  budget: string | null;
  additional_information: string;
}

export type LeadResult =
  | { status: "pending_backend" }
  | { status: "submitted"; reference: string };

const STORAGE_KEY = "cossa.support-leads.v1";

function currentPage(): string {
  return typeof window === "undefined" ? "server" : window.location.pathname;
}

function campaignSource(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("utm_source") ?? params.get("ref");
}

function persist(record: LeadRecord) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as LeadRecord[]) : [];
    list.push(record);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — the pending state is still shown honestly */
  }
}

export function buildLead(
  enquiry_type: EnquiryType,
  base: {
    name: string;
    phone: string;
    email?: string | null;
    location?: string | null;
    interest?: string | null;
    preferred_contact_method?: PreferredContactMethod;
  },
  details: Record<string, unknown> = {},
): LeadRecord {
  return {
    source_page: currentPage(),
    name: base.name,
    phone: base.phone,
    email: base.email ?? null,
    location: base.location ?? null,
    enquiry_type,
    interest: base.interest ?? null,
    preferred_contact_method: base.preferred_contact_method ?? "phone",
    campaign_source: campaignSource(),
    created_at: new Date().toISOString(),
    status: "pending_backend",
    details,
  };
}

export async function createLead(record: LeadRecord): Promise<LeadResult> {
  persist(record);
  await new Promise((resolve) => setTimeout(resolve, 350));
  // No backend: never report a successful submission.
  return { status: "pending_backend" };
}

export function requestCallback(input: CallbackRequestInput): Promise<LeadResult> {
  return createLead(
    buildLead(
      "callback",
      {
        name: input.full_name,
        phone: input.phone,
        email: input.email,
        location: input.location,
        interest: input.product_category,
        preferred_contact_method: "phone",
      },
      { preferred_time: input.preferred_time, reason: input.reason, consent: input.consent },
    ),
  );
}

export function requestQuote(input: QuickQuoteInput): Promise<LeadResult> {
  return createLead(
    buildLead(
      "quick_quote",
      {
        name: input.name,
        phone: input.phone,
        email: input.email,
        location: input.location,
        interest: input.requirements,
        preferred_contact_method: "email",
      },
      {
        company: input.company,
        scope: input.scope,
        estimated_quantity: input.estimated_quantity,
        required_date: input.required_date,
        budget: input.budget,
        additional_information: input.additional_information,
      },
    ),
  );
}

/** South African mobile/landline validation (local or +27 format). */
export function isValidSaPhone(value: string): boolean {
  const digits = value.replace(/[\s()-]/g, "");
  return /^(\+?27|0)[1-8][0-9]{8}$/.test(digits);
}