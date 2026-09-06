export type YocoWebhookSubscription = Record<string, unknown>;

/** Parse the official Yoco GET /api/webhooks response without guessing on shape. */
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

export function hasCossaLiveWebhookDuplicate(
  subscriptions: YocoWebhookSubscription[],
  webhookUrl: string,
): boolean {
  return subscriptions.some((row) => row.name === "cossa-store-yoco-live" || row.url === webhookUrl);
}
