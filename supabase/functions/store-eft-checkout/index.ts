import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const PRINTIFY_BASE = "https://api.printify.com/v1";
const PRINTIFY_SHOP_ID = "28233755";
const DEFAULT_USD_ZAR = 16.0141;
const SOUTH_AFRICAN_PROVINCES = new Set([
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
]);

function cors(request: Request): HeadersInit {
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
      ...cors(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

type ShippingAddress = {
  address1: string;
  address2: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
  country: "ZA";
  deliveryInstructions: string;
};

type ResolvedCartLine = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
};

function readShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const address1 = text(raw.address1, 180);
  const address2 = text(raw.address2, 180);
  const suburb = text(raw.suburb, 100);
  const city = text(raw.city, 100);
  const region = text(raw.region, 100);
  const zip = text(raw.zip, 20);
  const country = text(raw.country, 2).toUpperCase();
  const deliveryInstructions = text(raw.deliveryInstructions, 500);
  if (
    address1.length < 4 ||
    suburb.length < 2 ||
    city.length < 2 ||
    !SOUTH_AFRICAN_PROVINCES.has(region) ||
    !/^\d{4}$/.test(zip) ||
    country !== "ZA"
  ) {
    return null;
  }
  return {
    address1,
    address2,
    suburb,
    city,
    region,
    zip,
    country: "ZA",
    deliveryInstructions,
  };
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || fullName,
    lastName: parts.slice(1).join(" ") || "Customer",
  };
}

async function printifyShipping(
  token: string,
  lineItems: Array<{ product_id: string; variant_id: number; quantity: number }>,
  address: ShippingAddress,
  customerName: string,
  email: string,
  phone: string,
) {
  const { firstName, lastName } = splitName(customerName);
  const response = await fetch(`${PRINTIFY_BASE}/shops/${PRINTIFY_SHOP_ID}/orders/shipping.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "CossaStore/1.0",
    },
    body: JSON.stringify({
      line_items: lineItems,
      address_to: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        country: address.country,
        region: address.region,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        zip: address.zip,
      },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error(
      `[store-eft-checkout] Printify shipping quote failed with HTTP ${response.status}`,
    );
    throw new Error(
      `Printify could not quote delivery to this address (${response.status}). Please check the delivery details and try again.`,
    );
  }

  const result = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  const candidates: Array<[string, unknown]> = [
    ["standard", result.standard],
    ["economy", result.economy],
    ["priority", result.priority],
    ["express", result.express],
    ["printify_express", result.printify_express],
  ];
  const selected = candidates.find(
    ([, value]) => Number.isFinite(Number(value)) && Number(value) >= 0,
  );
  if (!selected) {
    throw new Error(
      "Printify did not return an available shipping method for this order and South African address.",
    );
  }
  return { method: selected[0], centsUsd: Number(selected[1]) };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(request) });
  }
  if (request.method !== "POST") {
    return json(request, { error: "Method not allowed." }, 405);
  }

  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(request, { error: "Origin not allowed." }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const printifyToken = Deno.env.get("PRINTIFY_API_TOKEN");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(request, { error: "Checkout is not configured." }, 503);
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let stage = "authentication";

  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) throw new Error("Sign in is required to continue.");
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      throw new Error("Your session could not be verified. Please sign in again.");
    }

    stage = "cart_validation";
    const body = (await request.json()) as Record<string, unknown>;
    const action =
      body.action === "quote"
        ? "quote"
        : body.action === "create" || !body.action
          ? "create"
          : null;
    if (!action) throw new Error("Unsupported checkout action.");
    const customerName = text(body.customerName, 140);
    const customerPhone = text(body.customerPhone, 40);
    const clientRequestId = text(body.clientRequestId, 64);
    if (customerName.length < 2 || !uuid(clientRequestId)) {
      throw new Error("Please provide your name and a valid checkout session.");
    }

    const cart = Array.isArray(body.cart)
      ? body.cart.map((raw) => {
          const line = raw as Record<string, unknown>;
          return {
            product_id: text(line.productId, 64),
            variant_id: text(line.variantId, 64) || null,
            quantity: Number(line.quantity),
          };
        })
      : [];
    if (!cart.length) throw new Error("Your cart is empty.");

    const resolvedCart: ResolvedCartLine[] = [];
    const printifyLines: Array<{
      product_id: string;
      variant_id: number;
      quantity: number;
    }> = [];
    const unquotedPhysicalProducts: string[] = [];
    let requiresDelivery = false;
    let fxRate = DEFAULT_USD_ZAR;
    let subtotal = 0;

    for (const line of cart) {
      stage = "product_validation";
      if (
        !uuid(line.product_id) ||
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 25
      ) {
        throw new Error("One or more cart items are invalid.");
      }

      const { data: product, error: productError } = await admin
        .from("store_products")
        .select(
          "id,name,status,product_type,fulfilment_model,supplier_name,supplier_product_ref,fx_rate_to_zar,price",
        )
        .eq("id", line.product_id)
        .maybeSingle();

      if (productError || !product || product.status !== "active") {
        throw new Error("One or more products are no longer available.");
      }

      const physical =
        product.product_type !== "digital" &&
        product.fulfilment_model !== "digital" &&
        product.product_type !== "affiliate" &&
        product.fulfilment_model !== "affiliate";
      requiresDelivery ||= physical;
      const productPrice = Number(product.price);
      if (!Number.isFinite(productPrice) || productPrice <= 0) {
        throw new Error(`${product.name}: a confirmed checkout price is not currently available.`);
      }
      subtotal = money(subtotal + productPrice * line.quantity);

      let resolvedVariantId = line.variant_id;

      if (product.supplier_name === "Printify" && product.fulfilment_model === "print_on_demand") {
        if (!printifyToken) {
          throw new Error("Printify delivery quoting is temporarily unavailable.");
        }

        stage = "variant_validation";
        let variant: {
          id: string;
          provider_variant_id: string;
          is_available: boolean;
          fx_rate_to_zar: number | null;
        } | null = null;

        if (resolvedVariantId && uuid(resolvedVariantId)) {
          const { data, error } = await admin
            .from("store_product_variants")
            .select("id,provider_variant_id,is_available,fx_rate_to_zar")
            .eq("id", resolvedVariantId)
            .eq("product_id", product.id)
            .eq("provider", "Printify")
            .maybeSingle();
          if (error || !data || !data.is_available) {
            throw new Error(
              `${product.name}: the selected Printify option is no longer available. Please choose another option.`,
            );
          }
          variant = data;
        } else {
          const { data, error } = await admin
            .from("store_product_variants")
            .select("id,provider_variant_id,is_available,fx_rate_to_zar")
            .eq("product_id", product.id)
            .eq("provider", "Printify")
            .eq("is_available", true)
            .order("sort_order", { ascending: true });

          if (error) {
            throw new Error(`${product.name}: product options could not be verified.`);
          }
          const available = data ?? [];
          if (available.length === 1) {
            variant = available[0];
            resolvedVariantId = variant.id;
          } else if (available.length === 0) {
            throw new Error(`${product.name}: no Printify option is currently available.`);
          } else {
            throw new Error(
              `${product.name}: please return to the product or cart and select a size/colour option before checkout.`,
            );
          }
        }

        const providerVariantId = Number(variant.provider_variant_id);
        if (!product.supplier_product_ref || !Number.isInteger(providerVariantId)) {
          throw new Error(`${product.name}: fulfilment information is incomplete.`);
        }

        fxRate =
          Number(variant.fx_rate_to_zar ?? product.fx_rate_to_zar ?? DEFAULT_USD_ZAR) ||
          DEFAULT_USD_ZAR;
        printifyLines.push({
          product_id: product.supplier_product_ref,
          variant_id: providerVariantId,
          quantity: line.quantity,
        });
      } else if (physical) {
        unquotedPhysicalProducts.push(product.name);
      }

      resolvedCart.push({
        product_id: product.id,
        variant_id: resolvedVariantId && uuid(resolvedVariantId) ? resolvedVariantId : null,
        quantity: line.quantity,
      });
    }

    stage = "delivery_validation";
    const shippingAddress = requiresDelivery ? readShippingAddress(body.shippingAddress) : null;
    if (requiresDelivery && !shippingAddress) {
      throw new Error("Enter a complete South African delivery address for physical products.");
    }

    let shippingTotal = 0;
    let shippingMethod = "none";
    if (printifyLines.length) {
      stage = "printify_shipping_quote";
      const quote = await printifyShipping(
        printifyToken!,
        printifyLines,
        shippingAddress!,
        customerName,
        userData.user.email,
        customerPhone,
      );
      shippingMethod = quote.method;
      shippingTotal = money((quote.centsUsd / 100) * fxRate);
    }

    if (unquotedPhysicalProducts.length) {
      throw new Error(
        "Delivery pricing is not configured for one or more physical products. A verified customer-paid delivery quote is required before an EFT payment request can be issued.",
      );
    }

    const total = money(subtotal + shippingTotal);
    if (action === "quote") {
      return json(request, {
        quote: {
          subtotal,
          shippingTotal,
          shippingMethod: requiresDelivery ? shippingMethod : null,
          requiresDelivery,
          total,
        },
      });
    }

    stage = "eft_order_creation";
    const { data: paymentData, error: paymentError } = await admin.rpc(
      "create_store_eft_payment_request_with_shipping",
      {
        p_payer_user_id: userData.user.id,
        p_payer_email: userData.user.email,
        p_customer_name: customerName,
        p_customer_phone: customerPhone || null,
        p_items: resolvedCart,
        p_client_request_id: clientRequestId,
        p_shipping_total: shippingTotal,
        p_shipping_address: shippingAddress ?? {},
        p_shipping_method: shippingMethod,
      },
    );
    if (paymentError || !paymentData) {
      throw new Error(paymentError?.message || "Your EFT order could not be created.");
    }
    const payment = Array.isArray(paymentData) ? paymentData[0] : paymentData;

    stage = "eft_instructions";
    const { data: settings, error: settingsError } = await admin
      .from("eft_payment_settings")
      .select(
        "enabled,account_holder,bank_name,account_type,account_number,branch_code,payment_instruction",
      )
      .eq("id", true)
      .eq("enabled", true)
      .maybeSingle();
    if (settingsError || !settings) {
      throw new Error("EFT payment is temporarily unavailable.");
    }

    const { data: order } = await admin
      .from("store_orders")
      .select(
        "order_number,status,subtotal,shipping_total,total,store_order_items(product_name,sku,quantity,unit_price,line_total,metadata)",
      )
      .eq("id", payment.store_order_id)
      .maybeSingle();

    return json(request, {
      payment: {
        id: payment.id,
        purpose: payment.purpose,
        reference: payment.reference,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        expiresAt: payment.expires_at,
        submittedAt: payment.submitted_at,
        reviewedAt: payment.reviewed_at,
        reviewerNote: payment.reviewer_note,
        createdAt: payment.created_at,
      },
      instructions: {
        accountHolder: settings.account_holder,
        bankName: settings.bank_name,
        accountType: settings.account_type,
        accountNumber: settings.account_number,
        branchCode: settings.branch_code,
        exactAmount: Number(payment.amount),
        currency: payment.currency,
        reference: payment.reference,
        instruction:
          settings.payment_instruction ||
          "Pay the exact amount using the unique reference, then upload proof of payment for review.",
      },
      order: order
        ? {
            orderNumber: order.order_number,
            orderStatus: order.status,
            subtotal: Number(order.subtotal ?? 0),
            shippingTotal: Number(order.shipping_total ?? 0),
            shippingMethod: requiresDelivery ? shippingMethod : null,
            requiresDelivery,
            total: Number(order.total),
            items: (order.store_order_items ?? []).map((item: any) => ({
              productName: item.product_name,
              variantTitle: item.metadata?.variant_title ?? null,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: Number(item.unit_price ?? 0),
              lineTotal: Number(item.line_total ?? 0),
            })),
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be completed.";
    console.error(`[store-eft-checkout] stage=${stage} error=${message}`);
    return json(request, { error: message, stage }, 400);
  }
});
