import { supabase } from "@/integrations/supabase/client";
import type { StoreShippingAddress } from "@/services/eft-payments";

type CheckoutLine = { productId: string; variantId?: string | null; quantity: number };

export type YocoTestPaymentAttempt = {
  id: string;
  status: "created" | "succeeded" | "failed" | "cancelled" | "expired";
  returnState: "success" | "cancelled" | "failed" | null;
  yocoCheckoutId: string | null;
  paymentId: string | null;
  amountCents: number;
  currency: "ZAR";
  verifiedAt: string | null;
};

export type YocoLivePaymentAttempt = {
  id: string;
  status: "created" | "processing" | "succeeded" | "failed" | "cancelled" | "expired";
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  amountCents: number;
  currency: "ZAR";
  verifiedAt: string | null;
};

type CheckoutInput = {
  customerName: string;
  customerPhone: string;
  cart: CheckoutLine[];
  clientRequestId: string;
  shippingAddress?: StoreShippingAddress;
};

async function errorMessage(error: unknown, data: unknown, fallback: string): Promise<string> {
  const remote = data as { error?: unknown } | null;
  if (typeof remote?.error === "string" && remote.error.trim()) return remote.error.trim();
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;
  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown } | null;
      if (typeof body?.error === "string" && body.error.trim()) return body.error.trim();
    } catch {
      // Use the SDK error below when the remote response cannot be parsed.
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("store-eft-checkout", { body });
  if (error) throw new Error(await errorMessage(error, data, "Yoco checkout is unavailable."));
  if (!data) throw new Error("Yoco checkout returned no result.");
  return data as T;
}

export function startStoreYocoLiveCheckout(input: CheckoutInput) {
  return invoke<{ attempt: YocoLivePaymentAttempt; redirectUrl: string }>({
    action: "yoco_live_create",
    ...input,
  });
}

export function startStoreYocoTestCheckout(input: CheckoutInput) {
  return invoke<{ attempt: YocoTestPaymentAttempt; redirectUrl: string }>({
    action: "yoco_create",
    ...input,
  });
}

export function getStoreYocoTestAttempt(attemptId: string) {
  return invoke<{ attempt: YocoTestPaymentAttempt }>({ action: "yoco_status", attemptId });
}

export async function getStoreYocoLiveAttempt(attemptId: string) {
  const { data, error } = await supabase
    .from("store_payment_attempts")
    .select("id,status,provider_checkout_id,provider_payment_id,amount_cents,verified_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (error) {
    throw new Error(await errorMessage(error, data, "The live Yoco payment status is unavailable."));
  }
  if (!data) throw new Error("The live Yoco payment attempt was not found.");
  const attempt = data as Record<string, unknown>;
  return {
    attempt: {
      id: String(attempt.id),
      status: String(attempt.status) as YocoLivePaymentAttempt["status"],
      providerCheckoutId:
        typeof attempt.provider_checkout_id === "string" ? attempt.provider_checkout_id : null,
      providerPaymentId:
        typeof attempt.provider_payment_id === "string" ? attempt.provider_payment_id : null,
      amountCents: Number(attempt.amount_cents),
      currency: "ZAR" as const,
      verifiedAt: typeof attempt.verified_at === "string" ? attempt.verified_at : null,
    },
  };
}

export function recordStoreYocoTestReturn(
  attemptId: string,
  returnState: "success" | "cancelled" | "failed",
) {
  return invoke<{ attempt: YocoTestPaymentAttempt }>({
    action: "yoco_return",
    attemptId,
    returnState,
  });
}
