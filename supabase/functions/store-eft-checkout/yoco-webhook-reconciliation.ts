export const LIVE_WEBHOOK_NAME = "cossa-store-yoco-live";
export const LIVE_WEBHOOK_URL =
  "https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/yoco-live-webhook";

export type YocoWebhookSubscription = Record<string, unknown>;

export function parseYocoWebhookSubscriptions(body: unknown): YocoWebhookSubscription[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Unexpected Yoco webhook list response.");
  }
  const subscriptions = (body as Record<string, unknown>).subscriptions;
  if (!Array.isArray(subscriptions) || subscriptions.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error("Unexpected Yoco webhook list response.");
  }
  return subscriptions as YocoWebhookSubscription[];
}

export function matchingCossaLiveWebhooks(
  subscriptions: YocoWebhookSubscription[],
  webhookUrl = LIVE_WEBHOOK_URL,
): YocoWebhookSubscription[] {
  return subscriptions.filter((row) => row.name === LIVE_WEBHOOK_NAME || row.url === webhookUrl);
}

export function reconcileVaultAndYoco(
  vaultSecretPresent: boolean,
  subscriptions: YocoWebhookSubscription[],
  webhookUrl = LIVE_WEBHOOK_URL,
): "ready" | "configured" | "reconciliation_required" {
  const matching = matchingCossaLiveWebhooks(subscriptions, webhookUrl);
  if (matching.length > 1) return "reconciliation_required";
  if (vaultSecretPresent && matching.length === 1) return "configured";
  if (vaultSecretPresent !== (matching.length === 1)) return "reconciliation_required";
  return "ready";
}

export function validateCreatedWebhookResponse(
  body: unknown,
  webhookUrl = LIVE_WEBHOOK_URL,
): { id: string; secret: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Yoco webhook registration response was invalid.");
  }
  const row = body as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const secret = typeof row.secret === "string" ? row.secret.trim() : "";
  if (!id || !secret.startsWith("whsec_") || row.name !== LIVE_WEBHOOK_NAME || row.url !== webhookUrl || (row.mode !== undefined && row.mode !== "live")) {
    throw new Error("Yoco webhook registration response was invalid.");
  }
  return { id, secret };
}

export function isSafelyRetryableVaultError(error: unknown): boolean {
  const row = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const code = typeof row.code === "string" ? row.code : "";
  const status = typeof row.status === "number" ? row.status : 0;
  return status === 429 || status >= 500 || ["PGRST001", "PGRST003", "08000", "08003", "08006", "53300", "57014"].includes(code);
}

export async function persistOrCompensateWebhookSecret(options: {
  webhookId: string;
  storeSecret: () => Promise<{ error?: unknown }>;
  deleteWebhook: (webhookId: string) => Promise<boolean>;
}): Promise<"configured" | "rolled_back" | "reconciliation_required"> {
  let stored = await options.storeSecret();
  if (stored.error && isSafelyRetryableVaultError(stored.error)) stored = await options.storeSecret();
  if (!stored.error) return "configured";
  return (await options.deleteWebhook(options.webhookId)) ? "rolled_back" : "reconciliation_required";
}

export function hasCossaLiveWebhookDuplicate(
  subscriptions: YocoWebhookSubscription[],
  webhookUrl = LIVE_WEBHOOK_URL,
): boolean {
  return matchingCossaLiveWebhooks(subscriptions, webhookUrl).length > 0;
}
