import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

import { PRINTIFY_SHOP_ID, printifyRequest } from "../_shared/printify-catalogue.ts";

const COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

type AdminClient = ReturnType<typeof createClient>;
type PaymentRequest = {
  id: string;
  organisation_id: string;
  payer_email: string;
  purpose: string;
  store_order_id: string | null;
  status: string;
};
type StoreOrderItem = {
  id?: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  metadata: Record<string, unknown> | null;
};
type StoreOrder = {
  id: string;
  organisation_id: string;
  order_number: string;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_method?: string | null;
  metadata: Record<string, unknown> | null;
  store_order_items: StoreOrderItem[];
};
type ShippingAddress = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2: string;
  city: string;
  zip: string;
};

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
function text(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function uuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "Customer", lastName: parts.slice(1).join(" ") || "Customer" };
}
function shippingMethodCode(value: unknown) {
  const method = text(value, 40).toLowerCase();
  if (method === "economy") return 4;
  if (method === "printify_express") return 3;
  if (method === "priority" || method === "express") return 2;
  return 1;
}
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function requireUser(request: Request, client: ReturnType<typeof createClient>): Promise<User> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sign in is required.");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Your session could not be verified.");
  return data.user;
}

async function requireAdmin(admin: AdminClient, userId: string) {
  const [membership, role] = await Promise.all([
    admin
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin", "manager"]),
    admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
  ]);
  if (membership.error || role.error || (!(membership.data ?? []).length && !(role.data ?? []).length)) {
    throw new Error("An authorised Cossa Store administrator is required.");
  }
}

async function loadApprovedStorePayment(admin: AdminClient, paymentId: string) {
  if (!uuid(paymentId)) throw new Error("Invalid payment reference.");
  const { data, error } = await admin
    .from("eft_payment_requests")
    .select("id,organisation_id,payer_email,purpose,store_order_id,status")
    .eq("id", paymentId)
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .maybeSingle();
  if (error || !data) throw new Error("Payment request was not found.");
  const payment = data as PaymentRequest;
  if (payment.purpose !== "store_order" || !payment.store_order_id) {
    throw new Error("This payment is not a Cossa Store order payment.");
  }
  if (payment.status !== "approved") {
    throw new Error("Printify fulfilment is blocked until payment is approved.");
  }
  return payment;
}

async function loadPaidStoreOrder(admin: AdminClient, storeOrderId: string) {
  const { data, error } = await admin
    .from("store_orders")
    .select(
      "id,organisation_id,order_number,status,customer_name,customer_phone,shipping_method,metadata,store_order_items(id,product_id,product_name,sku,quantity,metadata)",
    )
    .eq("id", storeOrderId)
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .maybeSingle();
  if (error || !data) throw new Error("The Store order could not be loaded for fulfilment.");
  const order = data as unknown as StoreOrder;
  if (order.status !== "paid") {
    throw new Error("Printify fulfilment is blocked until the Store order is marked paid.");
  }
  if (!(order.store_order_items ?? []).length) throw new Error("The Store order has no fulfilment items.");
  return order;
}

async function resolvePrintifyLine(admin: AdminClient, item: StoreOrderItem) {
  const metadata = asObject(item.metadata);
  let storeProductId = uuid(item.product_id)
    ? String(item.product_id)
    : uuid(metadata.store_product_id)
      ? String(metadata.store_product_id)
      : null;
  let storeVariantId = uuid(metadata.variant_id)
    ? String(metadata.variant_id)
    : uuid(metadata.store_variant_id)
      ? String(metadata.store_variant_id)
      : null;

  if (!storeVariantId && item.sku) {
    const { data: variants, error } = await admin
      .from("store_product_variants")
      .select("id,product_id")
      .eq("sku", item.sku)
      .eq("is_available", true)
      .limit(2);
    if (error) throw error;
    if ((variants ?? []).length === 1) {
      storeVariantId = variants![0].id;
      storeProductId = storeProductId || variants![0].product_id;
    }
  }

  if (!storeProductId && item.sku) {
    const { data: products, error } = await admin
      .from("store_products")
      .select("id")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .eq("sku", item.sku)
      .limit(2);
    if (error) throw error;
    if ((products ?? []).length === 1) storeProductId = products![0].id;
  }

  if (!storeProductId) {
    throw new Error(`${item.product_name}: Cossa product mapping could not be resolved safely.`);
  }

  let mappingQuery = admin
    .from("store_product_fulfilment_mappings")
    .select("id,provider_product_id,provider_variant_id,store_variant_id")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .eq("store_product_id", storeProductId)
    .eq("provider", "Printify")
    .eq("fulfilment_status", "active");

  mappingQuery = storeVariantId
    ? mappingQuery.eq("store_variant_id", storeVariantId)
    : mappingQuery.is("store_variant_id", null);

  const { data: mappings, error } = await mappingQuery.limit(2);
  if (error || !mappings || mappings.length !== 1) {
    throw new Error(`${item.product_name}: exactly one active Printify fulfilment mapping is required.`);
  }

  const mapping = mappings[0] as {
    provider_product_id: string;
    provider_variant_id: string | null;
    store_variant_id: string | null;
  };

  let providerVariantId = mapping.provider_variant_id;
  if (!providerVariantId && mapping.store_variant_id) {
    const { data: variant, error: variantError } = await admin
      .from("store_product_variants")
      .select("provider_variant_id,is_available")
      .eq("id", mapping.store_variant_id)
      .maybeSingle();
    if (variantError || !variant || !variant.is_available) {
      throw new Error(`${item.product_name}: mapped Printify variant is unavailable.`);
    }
    providerVariantId = variant.provider_variant_id;
  }

  const numericVariantId = Number(providerVariantId);
  if (!mapping.provider_product_id || !Number.isInteger(numericVariantId) || numericVariantId <= 0) {
    throw new Error(`${item.product_name}: Printify fulfilment IDs are incomplete.`);
  }

  return {
    product_id: mapping.provider_product_id,
    variant_id: numericVariantId,
    quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
    external_id: item.id || `${storeProductId}:${storeVariantId || "default"}`,
  };
}

function buildAddress(order: StoreOrder, payment: PaymentRequest): ShippingAddress {
  const metadata = asObject(order.metadata);
  const raw = asObject(metadata.shipping_address);
  const customerName = text(order.customer_name, 140) || text(raw.customer_name, 140) || "Cossa Customer";
  const { firstName, lastName } = splitName(customerName);
  const address: ShippingAddress = {
    first_name: firstName,
    last_name: lastName,
    email: payment.payer_email,
    phone: text(order.customer_phone, 40) || text(raw.phone, 40),
    country: text(raw.country, 2).toUpperCase() || "ZA",
    region: text(raw.region, 100),
    address1: text(raw.address1, 180),
    address2: text(raw.address2, 180),
    city: text(raw.city, 100),
    zip: text(raw.zip, 20),
  };
  if (!address.address1 || !address.city || !address.region || !address.zip) {
    throw new Error("The paid order does not contain a complete delivery address.");
  }
  return address;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "Origin not allowed." }, 403);

  if (Deno.env.get("PRINTIFY_FULFILMENT_ENABLED") !== "true") {
    return json(request, { error: "Printify fulfilment is disabled." }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const printifyToken = Deno.env.get("PRINTIFY_API_TOKEN");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !printifyToken) {
    return json(request, { error: "Printify fulfilment is not configured." }, 503);
  }

  const customerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const user = await requireUser(request, customerClient);
    await requireAdmin(admin, user.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payment = await loadApprovedStorePayment(admin, text(body.paymentId, 64));
    const order = await loadPaidStoreOrder(admin, payment.store_order_id!);

    const idempotencyKey = `printify:${order.id}`;
    const existing = await admin
      .from("store_fulfilment_orders")
      .select("id,status,provider_order_id,tracking_number,tracking_url")
      .eq("store_order_id", order.id)
      .eq("provider", "Printify")
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      return json(request, { duplicatePrevented: true, fulfilment: existing.data });
    }

    const lineItems: Array<{ product_id: string; variant_id: number; quantity: number; external_id: string }> = [];
    for (const item of order.store_order_items) {
      lineItems.push(await resolvePrintifyLine(admin, item));
    }

    const addressTo = buildAddress(order, payment);
    const shippingMethod = shippingMethodCode(order.shipping_method || asObject(order.metadata).shipping_method);
    const payload = {
      external_id: idempotencyKey,
      label: order.order_number || order.id,
      line_items: lineItems,
      shipping_method: shippingMethod,
      send_shipping_notification: false,
      address_to: addressTo,
    };

    const reservation = await admin
      .from("store_fulfilment_orders")
      .insert({
        organisation_id: COSSA_ORGANISATION_ID,
        store_order_id: order.id,
        provider: "Printify",
        idempotency_key: idempotencyKey,
        status: "submitting",
        request_payload: payload,
      })
      .select("id")
      .single();

    if (reservation.error || !reservation.data) {
      if ((reservation.error as { code?: string } | null)?.code === "23505") {
        const duplicate = await admin
          .from("store_fulfilment_orders")
          .select("id,status,provider_order_id,tracking_number,tracking_url")
          .eq("store_order_id", order.id)
          .eq("provider", "Printify")
          .maybeSingle();
        return json(request, { duplicatePrevented: true, fulfilment: duplicate.data ?? null });
      }
      throw reservation.error || new Error("Fulfilment reservation could not be created.");
    }

    try {
      const response = await printifyRequest(
        `/shops/${PRINTIFY_SHOP_ID}/orders.json`,
        printifyToken,
        { method: "POST", body: JSON.stringify(payload) },
      );
      const providerOrderId = text((response as Record<string, unknown>)?.id, 160);
      if (!providerOrderId) throw new Error("Printify created an order without returning an order ID.");

      const update = await admin
        .from("store_fulfilment_orders")
        .update({
          provider_order_id: providerOrderId,
          provider_response: response,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservation.data.id);
      if (update.error) throw update.error;

      return json(request, {
        created: true,
        fulfilment: {
          id: reservation.data.id,
          provider: "Printify",
          providerOrderId,
          status: "submitted",
        },
      });
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "Printify order submission failed.";
      await admin
        .from("store_fulfilment_orders")
        .update({ status: "failed", last_error: message.slice(0, 2000), updated_at: new Date().toISOString() })
        .eq("id", reservation.data.id);
      throw new Error(message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printify fulfilment failed.";
    console.error(JSON.stringify({ event: "printify_fulfilment_create_failed", message }));
    return json(request, { error: message }, 400);
  }
});
