import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  PRINTIFY_PRODUCT_WEBHOOK_TOPICS,
  PRINTIFY_SHOP_ID,
  archivePrintifyProduct,
  fetchPrintifyProduct,
  syncOnePrintifyProduct,
} from "../_shared/printify-catalogue.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

async function validSignature(rawBody: string, supplied: string | null, secret: string) {
  const digest = supplied?.trim().replace(/^sha256=/i, "") ?? "";
  const actual = hexToBytes(digest);
  if (!actual) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );
  return constantTimeEqual(signature, actual);
}

function productIdFromEvent(event: unknown) {
  if (!event || typeof event !== "object") return null;
  const resource = (event as { resource?: unknown }).resource;
  if (!resource || typeof resource !== "object") return null;
  const id = (resource as { id?: unknown }).id;
  return typeof id === "string" && /^[a-zA-Z0-9_-]{3,}$/.test(id) ? id : null;
}

function isExpectedProductEvent(event: unknown) {
  if (!event || typeof event !== "object") return false;
  const raw = event as { type?: unknown; resource?: { type?: unknown; data?: { shop_id?: unknown } } };
  return (
    typeof raw.type === "string" &&
    (PRINTIFY_PRODUCT_WEBHOOK_TOPICS as readonly string[]).includes(raw.type) &&
    raw.resource?.type === "product" &&
    String(raw.resource?.data?.shop_id ?? "") === PRINTIFY_SHOP_ID
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const webhookSecret = Deno.env.get("PRINTIFY_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const printifyToken = Deno.env.get("PRINTIFY_API_TOKEN");
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey || !printifyToken) {
    return json({ error: "Printify webhook is not configured." }, 503);
  }

  const rawBody = await request.text();
  if (!(await validSignature(rawBody, request.headers.get("x-pfy-signature"), webhookSecret))) {
    return json({ error: "Invalid webhook signature." }, 401);
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid webhook body." }, 400);
  }
  if (!isExpectedProductEvent(event)) return json({ ignored: true });

  const productId = productIdFromEvent(event);
  if (!productId) return json({ error: "Invalid Printify product event." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const type = (event as { type: string }).type;
  try {
    if (type === "product:deleted") {
      const archived = await archivePrintifyProduct(admin, productId);
      return json({ received: true, archived });
    }
    const product = await fetchPrintifyProduct(PRINTIFY_SHOP_ID, productId, printifyToken);
    const result = await syncOnePrintifyProduct(admin, product);
    return json({ received: true, outcome: result.outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printify webhook sync failed.";
    console.error(JSON.stringify({ event: "printify_webhook_failed", productId, message }));
    return json({ error: "Printify webhook sync failed." }, 500);
  }
});
