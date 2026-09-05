import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_WEBHOOK_AGE_MS = 3 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function base64Bytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

async function validYocoSignature(
  rawBody: string,
  webhookId: string,
  timestamp: string,
  signatures: string,
  webhookSecret: string,
) {
  if (!webhookSecret.startsWith("whsec_")) return false;
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_WEBHOOK_AGE_MS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    base64Bytes(webhookSecret.slice("whsec_".length)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSignature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${webhookId}.${timestamp}.${rawBody}`),
    ),
  );

  return signatures.split(/\s+/).some((versionedSignature) => {
    const [, encodedSignature] = versionedSignature.split(",", 2);
    if (!encodedSignature) return false;
    try {
      return constantTimeEqual(expectedSignature, base64Bytes(encodedSignature));
    } catch {
      return false;
    }
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Yoco webhook is not configured." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: webhookSecret, error: secretError } = await admin.rpc(
    "get_yoco_test_webhook_secret",
  );
  if (secretError || !webhookSecret) {
    return json({ error: "Yoco webhook is not configured." }, 503);
  }

  const rawBody = await request.text();
  const webhookId = text(request.headers.get("webhook-id"), 240);
  const timestamp = text(request.headers.get("webhook-timestamp"), 40);
  const signatures = text(request.headers.get("webhook-signature"), 4000);
  if (!webhookId || !timestamp || !signatures) {
    return json({ error: "Missing webhook signature headers." }, 400);
  }
  if (!(await validYocoSignature(rawBody, webhookId, timestamp, signatures, webhookSecret))) {
    return json({ error: "Invalid webhook signature." }, 403);
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid webhook body." }, 400);
  }
  const payload =
    event.payload && typeof event.payload === "object"
      ? (event.payload as Record<string, unknown>)
      : {};
  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? (payload.metadata as Record<string, unknown>)
      : {};
  const checkoutId = text(metadata.checkoutId, 240);

  // One endpoint is used for Yoco test and live events. This integration is
  // intentionally test-only, so live events are acknowledged but ignored.
  if (!checkoutId || text(payload.mode, 20) !== "test") return json({ ignored: true });

  const { data: attempt, error: attemptError } = await admin
    .from("store_yoco_test_payment_attempts")
    .select("id")
    .eq("yoco_checkout_id", checkoutId)
    .maybeSingle();
  if (attemptError || !attempt) return json({ ignored: true });

  const { error } = await admin.rpc("record_store_yoco_test_payment_event", {
    p_event_id: text(event.id, 240),
    p_checkout_id: checkoutId,
    p_payment_id: text(payload.id, 240),
    p_amount_cents: Math.trunc(Number(payload.amount)),
    p_currency: text(payload.currency, 3).toUpperCase(),
    p_mode: text(payload.mode, 20),
    p_event_type: text(event.type, 80),
    p_payment_status: text(payload.status, 80),
    p_payload: event,
  });
  if (error) {
    console.error(
      JSON.stringify({
        event: "yoco_webhook_processing_failed",
        webhookId,
        message: error.message,
      }),
    );
    return json({ error: "Webhook could not be processed." }, 500);
  }
  return json({ received: true });
});
