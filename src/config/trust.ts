/**
 * Trust, compliance, payment and fulfilment configuration.
 *
 * IMPORTANT: nothing in this file may be fabricated. Values that depend on
 * verification (registration numbers, ratings, completed-project counts) are
 * left null until Cossa Nexus Holdings supplies the confirmed figure. The UI
 * renders a clean "awaiting confirmation" state rather than a fake number.
 */

import { companyConfig } from "@/config/company";

export const TRUST_STRAPLINE =
  "South African owned & operated · Real people support · Transparent delivery & returns";

export interface TrustStat {
  id: string;
  label: string;
  /** Confirmed value. Null until Cossa supplies the verified figure. */
  value: string | null;
  pending: string;
}

export const TRUST_STATS: TrustStat[] = [
  {
    id: "projects",
    label: "Projects supplied",
    value: null,
    pending: "Verified count publishing soon",
  },
  {
    id: "experience",
    label: "Years in operation",
    value: null,
    pending: "Confirmed on registration documents",
  },
  {
    id: "support",
    label: "Human support",
    value: "Mon–Fri, real people",
    pending: "",
  },
  {
    id: "coverage",
    label: "Delivery coverage",
    value: "All 9 SA provinces",
    pending: "",
  },
];

export interface ComplianceBadge {
  id: string;
  code: string;
  name: string;
  /** Registration/reference number once verified. */
  reference: string | null;
  status: "verified" | "in_progress";
  note: string;
}

export const COMPLIANCE_BADGES: ComplianceBadge[] = [
  {
    id: "cipc",
    code: "CIPC",
    name: "Companies and Intellectual Property Commission",
    reference: companyConfig.parentCompany.registrationNumber,
    status: "verified",
    note: `${companyConfig.parentCompany.name} — registration ${companyConfig.parentCompany.registrationNumber}. Operating company ${companyConfig.construction.name} — registration ${companyConfig.construction.registrationNumber}.`,
  },
  {
    id: "bbbee",
    code: "B-BBEE",
    name: "Broad-Based Black Economic Empowerment",
    reference: companyConfig.parentCompany.bbbee,
    status: "verified",
    note: `${companyConfig.parentCompany.bbbee} contributor across Cossa Nexus Holdings and Cossa Nexus Construction.`,
  },
  {
    id: "cidb",
    code: "CIDB",
    name: "Construction Industry Development Board",
    reference: null,
    status: "in_progress",
    note: "CIDB grading applies to Cossa Construction project work.",
  },
];

/** Payment gateways. `live` stays false until merchant keys are verified. */
export interface PaymentGateway {
  id: "payfast" | "ozow" | "yoco";
  name: string;
  method: string;
  description: string;
  /** Secrets that must be present before the gateway can be switched on. */
  requiredKeys: string[];
  live: boolean;
}

export const PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: "payfast",
    name: "PayFast",
    method: "Credit & debit cards",
    description:
      "Visa, Mastercard, Instant EFT and SnapScan through PayFast's South African merchant gateway.",
    requiredKeys: ["PAYFAST_MERCHANT_ID", "PAYFAST_MERCHANT_KEY", "PAYFAST_PASSPHRASE"],
    live: false,
  },
  {
    id: "ozow",
    name: "Ozow",
    method: "Instant EFT",
    description:
      "Pay directly from your South African bank account. No card required, cleared instantly.",
    requiredKeys: ["OZOW_SITE_CODE", "OZOW_PRIVATE_KEY", "OZOW_API_KEY"],
    live: false,
  },
  {
    id: "yoco",
    name: "Yoco",
    method: "Credit & debit cards",
    description: "Secure Yoco-hosted card checkout. Test mode only while validation is in progress.",
    requiredKeys: ["YOCO_TEST_PUBLIC_KEY", "YOCO_TEST_SECRET_KEY"],
    live: false,
  },
];

export const PAYMENTS_LIVE = PAYMENT_GATEWAYS.some((g) => g.live);

/** Realistic courier windows for SA. Business days, excluding public holidays. */
export const PROVINCIAL_DELIVERY = [
  { province: "Gauteng", metro: "1–2 business days", outlying: "2–4 business days" },
  { province: "Western Cape", metro: "2–3 business days", outlying: "3–5 business days" },
  { province: "KwaZulu-Natal", metro: "2–3 business days", outlying: "3–5 business days" },
  { province: "Eastern Cape", metro: "3–4 business days", outlying: "4–6 business days" },
  { province: "Free State", metro: "2–4 business days", outlying: "4–6 business days" },
  { province: "Mpumalanga", metro: "2–4 business days", outlying: "4–6 business days" },
  { province: "Limpopo", metro: "3–4 business days", outlying: "4–7 business days" },
  { province: "North West", metro: "2–4 business days", outlying: "4–6 business days" },
  { province: "Northern Cape", metro: "3–5 business days", outlying: "5–8 business days" },
] as const;

export const GUARANTEES = [
  {
    title: "Priced in rand, VAT shown",
    body: "Every price is in ZAR and VAT inclusive. No currency surprises, no hidden add-ons at checkout.",
  },
  {
    title: "Told before you buy",
    body: "Fulfilment route, stock status and realistic delivery window appear on the product before you pay.",
  },
  {
    title: "A real person answers",
    body: "Call or WhatsApp 067 801 1907 and speak to the Cossa team — not an offshore ticket queue.",
  },
  {
    title: "Consumer Protection Act rights",
    body: "Faulty, damaged or incorrect goods are replaced, repaired or refunded in line with the CPA.",
  },
  {
    title: "Quote before commitment",
    body: "Large, bulk and project orders are quoted in writing first. Nothing is charged before you approve it.",
  },
] as const;
