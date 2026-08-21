import { supabase } from "@/integrations/supabase/client";

export type EftPayment = {
  id: string;
  purpose: "store_order" | "growth_subscription" | "nexdocs_subscription";
  reference: string;
  amount: number;
  currency: "ZAR";
  status: "awaiting_payment" | "proof_submitted" | "approved" | "rejected" | "expired" | "cancelled";
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

function errorMessage(error: unknown, data: unknown, fallback: string): string {
  const remote = data as { error?: unknown } | null;
  if (typeof remote?.error === "string" && remote.error) return remote.error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("eft-payments", { body });
  if (error) throw new Error(errorMessage(error, data, "The EFT payment service is unavailable."));
  if (!data) throw new Error("The EFT payment service returned no result.");
  return data as T;
}

export async function startStoreEftPayment(input: {
  customerName: string;
  customerPhone: string;
  cart: Array<{ productId: string; variantId?: string | null; quantity: number }>;
  clientRequestId: string;
}): Promise<EftPaymentDetail> {
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", { body: input });
  if (error) throw new Error(errorMessage(error, data, "The secure Store checkout is unavailable."));
  if (!data) throw new Error("The secure Store checkout returned no result.");
  return data as EftPaymentDetail;
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
  if (error) throw new Error(errorMessage(error, data, "Your proof of payment could not be uploaded."));
  if (!data) throw new Error("The payment service returned no result.");
  return data as { payment: EftPayment; message: string };
}
