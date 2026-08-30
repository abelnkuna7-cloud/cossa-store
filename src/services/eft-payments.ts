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

export type StoreCheckoutQuote = {
  quote: {
    subtotal: number;
    shippingTotal: number;
    shippingMethod: string | null;
    requiresDelivery: boolean;
    total: number;
  };
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

export async function listMyEftPayments(): Promise<{ payments: EftPaymentDetail[] }> {
  return invoke<{ payments: EftPaymentDetail[] }>({ action: "list_my_payments" });
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
