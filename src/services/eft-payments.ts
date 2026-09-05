import { supabase } from "@/integrations/supabase/client";

export type EftPayment = {
  id: string;
  purpose: "store_order" | "growth_subscription" | "nexdocs_subscription";
  reference: string;
  amount: number;
  currency: "ZAR";
  status:
    "awaiting_payment" | "proof_submitted" | "approved" | "rejected" | "expired" | "cancelled";
  expiresAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  proofUploaded: boolean;
  createdAt: string;
};

export type EftInstructions = {
  accountHolder: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  branchCode: string;
  exactAmount: number;
  currency: "ZAR";
  reference: string;
  instruction: string;
};

export type EftOrder = {
  orderNumber: string;
  orderStatus: string;
  subtotal: number;
  shippingTotal: number;
  shippingMethod: string | null;
  requiresDelivery: boolean;
  total: number;
  items: Array<{
    productName: string;
    variantTitle?: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
} | null;

export type EftPaymentDetail = {
  payment: EftPayment;
  instructions: EftInstructions;
  order?: EftOrder;
};

/**
 * The staff review endpoint deliberately returns the public payment fields at
 * the top level, together with reviewer-only details. Keeping that wire shape
 * explicit prevents a pending proof from crashing the approvals screen.
 */
export type EftReviewPayment = EftPayment & {
  payerEmail: string | null;
  payerNote: string | null;
  proofFileName: string | null;
  proofContentType: string | null;
  proofUrl: string | null;
  order: EftOrder;
};

export type StoreCheckoutQuote = {
  quote: {
    subtotal: number;
    shippingTotal: number;
    shippingMethod: string | null;
    requiresDelivery: boolean;
    total: number;
  };
};

export type StoreDeliveryConfirmation = {
  confirmation: {
    classification: "STANDARD_RATE_ELIGIBLE";
    verifiedAt: string;
    expiresAt: string;
    deliveryMethod: string | null;
    deliveryAmount: number | null;
  };
  quote: StoreCheckoutQuote["quote"] | null;
};

export type StoreDeliveryQuoteRequest = {
  id: string;
  status: "requested" | "quoted" | "rejected" | "cancelled";
  deliveryMethod: string | null;
  deliveryAmount: number | null;
  currency: "ZAR" | null;
  staffNote: string | null;
  createdAt: string | null;
  quotedAt: string | null;
  expiresAt: string | null;
};

export type AdminStoreDeliveryQuoteRequest = StoreDeliveryQuoteRequest & {
  customerName: string;
  customerPhone: string | null;
  requesterEmail: string | null;
  items: Array<{ productId?: string; name?: string; quantity?: number }>;
  shippingAddress: Partial<StoreShippingAddress>;
};

type CheckoutLine = { productId: string; variantId?: string | null; quantity: number };

export type StoreShippingAddress = {
  address1: string;
  address2?: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
  country: "ZA";
  deliveryInstructions?: string;
};

async function errorMessage(error: unknown, data: unknown, fallback: string): Promise<string> {
  const remote = data as { error?: unknown } | null;
  if (typeof remote?.error === "string" && remote.error) return remote.error;

  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;

  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown } | null;
      if (typeof body?.error === "string" && body.error.trim()) return body.error.trim();
    } catch {
      try {
        const body = await context.clone().text();
        if (body.trim()) return body.trim().slice(0, 300);
      } catch {
        // Fall through to the SDK error/fallback below.
      }
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("eft-payments", { body });
  if (error)
    throw new Error(await errorMessage(error, data, "The EFT payment service is unavailable."));
  if (!data) throw new Error("The EFT payment service returned no result.");
  return data as T;
}

function preserveVariantIdentity(cart: CheckoutLine[]): CheckoutLine[] {
  if (typeof window === "undefined") return cart;

  try {
    const raw = window.localStorage.getItem("cossa.commerce.v2");
    if (!raw) return cart;
    const saved = JSON.parse(raw) as {
      cart?: Array<{ product_id?: unknown; variant_id?: unknown; quantity?: unknown }>;
    };
    if (!Array.isArray(saved.cart)) return cart;

    return cart.map((line) => {
      // Never overwrite a valid in-memory selection. Browser storage is only a
      // compatibility fallback for older/stale cart hydration.
      if (typeof line.variantId === "string" && line.variantId.trim()) return line;

      const matches = saved.cart.filter((stored) => stored?.product_id === line.productId);
      if (matches.length !== 1) return line;

      const storedVariant = matches[0]?.variant_id;
      return {
        ...line,
        variantId:
          typeof storedVariant === "string" && storedVariant.trim() ? storedVariant.trim() : null,
      };
    });
  } catch {
    return cart;
  }
}

export async function startStoreEftPayment(input: {
  customerName: string;
  customerPhone: string;
  cart: CheckoutLine[];
  clientRequestId: string;
  shippingAddress?: StoreShippingAddress;
}): Promise<EftPaymentDetail> {
  const payload = { action: "create", ...input, cart: preserveVariantIdentity(input.cart) };
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", { body: payload });
  if (error)
    throw new Error(await errorMessage(error, data, "The secure Store checkout is unavailable."));
  if (!data) throw new Error("The secure Store checkout returned no result.");
  return data as EftPaymentDetail;
}

export async function quoteStoreEftCheckout(input: {
  customerName: string;
  customerPhone: string;
  cart: CheckoutLine[];
  clientRequestId: string;
  shippingAddress?: StoreShippingAddress;
}): Promise<StoreCheckoutQuote> {
  const payload = { action: "quote", ...input, cart: preserveVariantIdentity(input.cart) };
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", { body: payload });
  if (error)
    throw new Error(await errorMessage(error, data, "The secure Store checkout is unavailable."));
  if (!data) throw new Error("The secure Store checkout returned no delivery quote.");
  return data as StoreCheckoutQuote;
}

/**
 * An administrator can attest to the carrier's eligibility check for this
 * exact cart and destination. The browser supplies evidence only; the server
 * still resolves the rate, parcel requirements and supplier configuration.
 */
export async function confirmStoreDelivery(input: {
  cart: CheckoutLine[];
  shippingAddress: StoreShippingAddress;
  evidenceNote: string;
}): Promise<StoreDeliveryConfirmation> {
  const payload = {
    action: "confirm_delivery",
    cart: preserveVariantIdentity(input.cart),
    shippingAddress: input.shippingAddress,
    deliveryConfirmation: {
      eligibilityClassification: "STANDARD_RATE_ELIGIBLE",
      evidenceNote: input.evidenceNote,
    },
  };
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", { body: payload });
  if (error)
    throw new Error(
      await errorMessage(error, data, "The secure delivery confirmation service is unavailable."),
    );
  if (!data) throw new Error("The secure delivery confirmation service returned no result.");
  return data as StoreDeliveryConfirmation;
}

/**
 * Submits the exact server-validated cart and address for a staff quote. The
 * client provides no delivery amount, supplier, rate or eligibility result.
 */
export async function requestStoreDeliveryQuote(input: {
  customerName: string;
  customerPhone: string;
  cart: CheckoutLine[];
  clientRequestId: string;
  shippingAddress: StoreShippingAddress;
}): Promise<{ request: StoreDeliveryQuoteRequest }> {
  const payload = {
    action: "request_delivery_quote",
    ...input,
    cart: preserveVariantIdentity(input.cart),
  };
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", { body: payload });
  if (error)
    throw new Error(
      await errorMessage(error, data, "The delivery quote request service is unavailable."),
    );
  if (!data) throw new Error("The delivery quote request service returned no result.");
  return data as { request: StoreDeliveryQuoteRequest };
}

export async function listMyStoreDeliveryQuoteRequests(): Promise<{
  requests: StoreDeliveryQuoteRequest[];
}> {
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", {
    body: { action: "list_my_delivery_quote_requests" },
  });
  if (error)
    throw new Error(
      await errorMessage(error, data, "Your delivery quote requests could not be loaded."),
    );
  if (!data) throw new Error("The delivery quote service returned no result.");
  return data as { requests: StoreDeliveryQuoteRequest[] };
}

export async function listStoreDeliveryQuoteQueue(): Promise<{
  requests: AdminStoreDeliveryQuoteRequest[];
}> {
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", {
    body: { action: "list_delivery_quote_requests" },
  });
  if (error)
    throw new Error(
      await errorMessage(error, data, "The delivery quote queue could not be loaded."),
    );
  if (!data) throw new Error("The delivery quote queue returned no result.");
  return data as { requests: AdminStoreDeliveryQuoteRequest[] };
}

export async function approveStoreDeliveryQuote(input: {
  requestId: string;
  deliveryAmount: number;
  deliveryMethod: string;
  evidenceNote: string;
  staffNote?: string;
}): Promise<{ request: StoreDeliveryQuoteRequest }> {
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", {
    body: { action: "approve_delivery_quote", ...input },
  });
  if (error)
    throw new Error(
      await errorMessage(error, data, "The verified delivery quote could not be saved."),
    );
  if (!data) throw new Error("The delivery quote service returned no result.");
  return data as { request: StoreDeliveryQuoteRequest };
}

export async function rejectStoreDeliveryQuote(input: {
  requestId: string;
  staffNote: string;
}): Promise<{ request: StoreDeliveryQuoteRequest }> {
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", {
    body: { action: "reject_delivery_quote", ...input },
  });
  if (error)
    throw new Error(
      await errorMessage(error, data, "The delivery quote request could not be rejected."),
    );
  if (!data) throw new Error("The delivery quote service returned no result.");
  return data as { request: StoreDeliveryQuoteRequest };
}

export async function listMyEftPayments(): Promise<{ payments: EftPaymentDetail[] }> {
  return invoke<{ payments: EftPaymentDetail[] }>({ action: "list_my_payments" });
}

export async function getMyEftProofUrl(paymentId: string): Promise<{
  url: string;
  expiresInSeconds: number;
  fileName: string | null;
}> {
  return invoke({ action: "get_my_payment_proof_url", paymentId });
}

export async function listEftReviewQueue(): Promise<{ payments: EftReviewPayment[] }> {
  return invoke<{ payments: EftReviewPayment[] }>({ action: "review_queue" });
}

export async function reviewEftPayment(input: {
  paymentId: string;
  decision: "approve" | "reject";
  reviewerNote: string;
}): Promise<{ payment: EftPayment; message: string }> {
  return invoke({
    action: input.decision === "approve" ? "approve_payment" : "reject_payment",
    paymentId: input.paymentId,
    reviewerNote: input.reviewerNote,
  });
}

export async function submitEftProof(input: {
  paymentId: string;
  proof: File;
  payerNote: string;
}): Promise<{ payment: EftPayment; message: string }> {
  const body = new FormData();
  body.set("paymentId", input.paymentId);
  body.set("proof", input.proof);
  body.set("payerNote", input.payerNote);

  const { data, error } = await supabase.functions.invoke("eft-payments", { body });
  if (error)
    throw new Error(
      await errorMessage(error, data, "Your proof of payment could not be uploaded."),
    );
  if (!data) throw new Error("The payment service returned no result.");
  return data as { payment: EftPayment; message: string };
}
