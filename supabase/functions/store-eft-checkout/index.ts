import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  hasCossaLiveWebhookDuplicate,
  parseYocoWebhookSubscriptions,
} from "./yoco-webhook-reconciliation.ts";
import {
  DELIVERY_QUOTE_REQUIRED,
  resolveConfiguredDeliveryGroup,
  type ConfiguredDeliveryRate,
  type DeliveryRateEligibility,
} from "./_shared/configured-delivery.ts";
import {
  addressEligibilityFromConfirmation,
  deliveryConfirmationFingerprint,
  type DeliveryConfirmationClassification,
  type StoredDeliveryConfirmation,
} from "./_shared/delivery-confirmation.ts";

const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const VERCEL_PREVIEW_ORIGIN =
  /^https:\/\/cossa-store(?:-[a-z0-9-]+)?-abelnkuna7-5234s-projects\.vercel\.app$/i;
const PRINTIFY_BASE = "https://api.printify.com/v1";
const PRINTIFY_SHOP_ID = "28233755";
const DEFAULT_USD_ZAR = 16.0141;
const COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const DELIVERY_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
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
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin) || VERCEL_PREVIEW_ORIGIN.test(origin);
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

function yocoAttemptPublic(attempt: Record<string, unknown>) {
  return {
    id: String(attempt.id),
    status: String(attempt.status),
    returnState: attempt.return_state ?? null,
    yocoCheckoutId: attempt.yoco_checkout_id ?? null,
    paymentId: attempt.yoco_payment_id ?? null,
    amountCents: Number(attempt.amount_cents),
    currency: "ZAR",
    verifiedAt: attempt.verified_at ?? null,
  };
}

function yocoLiveAttemptPublic(attempt: Record<string, unknown>) {
  return {
    id: String(attempt.id),
    status: String(attempt.status),
    providerCheckoutId: attempt.provider_checkout_id ?? null,
    providerPaymentId: attempt.provider_payment_id ?? null,
    amountCents: Number(attempt.amount_cents),
    currency: "ZAR",
    verifiedAt: attempt.verified_at ?? null,
  };
}

function deliveryQuoteRequestPublic(request: Record<string, unknown>) {
  return {
    id: String(request.id),
    status: String(request.status),
    deliveryMethod: typeof request.delivery_method === "string" ? request.delivery_method : null,
    deliveryAmount: finiteNumber(request.delivery_amount),
    currency: typeof request.currency === "string" ? request.currency : null,
    staffNote: typeof request.staff_note === "string" ? request.staff_note : null,
    createdAt: request.created_at ?? null,
    quotedAt: request.quoted_at ?? null,
    expiresAt: request.expires_at ?? null,
  };
}

function deliveryQuoteRequestForAdmin(request: Record<string, unknown>) {
  return {
    ...deliveryQuoteRequestPublic(request),
    customerName: typeof request.customer_name === "string" ? request.customer_name : "Customer",
    customerPhone: typeof request.customer_phone === "string" ? request.customer_phone : null,
    requesterEmail: typeof request.requester_email === "string" ? request.requester_email : null,
    items: Array.isArray(request.items) ? request.items : [],
    shippingAddress:
      request.shipping_address && typeof request.shipping_address === "object"
        ? request.shipping_address
        : {},
  };
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

type ConfiguredPhysicalLine = {
  productId: string;
  name: string;
  quantity: number;
};

type DeliveryConfirmationScope = {
  cartFingerprint: string;
  addressFingerprint: string;
};

type DeliveryConfirmationTarget = {
  supplierId: string;
  fulfilmentProfileId: string;
};

type PendingStaffConfirmation = {
  target: DeliveryConfirmationTarget;
  eligibilityClassification: DeliveryConfirmationClassification;
  evidenceNote: string;
};

type LoadedDeliveryConfirmation = StoredDeliveryConfirmation & DeliveryConfirmationTarget;

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function eligibility(value: unknown): DeliveryRateEligibility {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DeliveryRateEligibility)
    : {};
}

function configuredRate(row: Record<string, unknown>): ConfiguredDeliveryRate | null {
  const price = finiteNumber(row.price);
  if (!row.id || !row.supplier_id || !row.fulfilment_profile_id || price === null) return null;
  if (row.classification !== "standard" && row.classification !== "oversized") return null;
  return {
    id: String(row.id),
    supplierId: String(row.supplier_id),
    fulfilmentProfileId: String(row.fulfilment_profile_id),
    methodCode: String(row.method_code ?? ""),
    customerLabel: String(row.customer_label ?? ""),
    price,
    currency: String(row.currency ?? ""),
    isActive: row.is_active === true,
    customerSelectable: row.customer_selectable === true,
    isDefault: row.is_default === true,
    classification: row.classification,
    eligibility: eligibility(row.eligibility_requirements),
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    sourceEvidence: typeof row.source_evidence === "string" ? row.source_evidence : null,
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
    operationalNotes: typeof row.operational_notes === "string" ? row.operational_notes : null,
  };
}

function deliveryConfirmation(row: Record<string, unknown>): LoadedDeliveryConfirmation | null {
  const eligibilityClassification = row.eligibility_classification;
  if (
    eligibilityClassification !== "STANDARD_RATE_ELIGIBLE" &&
    eligibilityClassification !== "OVERSIZED_OR_SURCHARGE_REQUIRED" &&
    eligibilityClassification !== "MANUAL_DELIVERY_QUOTE_REQUIRED"
  ) {
    return null;
  }
  if (
    !row.supplier_id ||
    !row.fulfilment_profile_id ||
    !row.evidence_note ||
    !row.verified_at ||
    !row.expires_at
  ) {
    return null;
  }
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    supplierId: String(row.supplier_id),
    fulfilmentProfileId: String(row.fulfilment_profile_id),
    eligibilityClassification,
    rateConfigurationId:
      typeof row.rate_configuration_id === "string" ? row.rate_configuration_id : null,
    deliveryMethod: typeof row.delivery_method === "string" ? row.delivery_method : null,
    deliveryAmount: finiteNumber(row.delivery_amount),
    currency: typeof row.currency === "string" ? row.currency : null,
    evidenceNote: String(row.evidence_note),
    verifiedAt: String(row.verified_at),
    expiresAt: String(row.expires_at),
  };
}

function readStaffConfirmation(value: unknown): {
  eligibilityClassification: DeliveryConfirmationClassification;
  evidenceNote: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const eligibilityClassification = raw.eligibilityClassification;
  const evidenceNote = text(raw.evidenceNote, 2000);
  if (
    eligibilityClassification !== "STANDARD_RATE_ELIGIBLE" &&
    eligibilityClassification !== "OVERSIZED_OR_SURCHARGE_REQUIRED" &&
    eligibilityClassification !== "MANUAL_DELIVERY_QUOTE_REQUIRED"
  ) {
    return null;
  }
  if (evidenceNote.length < 3) return null;
  return { eligibilityClassification, evidenceNote };
}

async function requireCossaStoreAdmin(admin: any, userId: string) {
  const [membership, role] = await Promise.all([
    admin
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
    admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
  ]);
  if (
    membership.error ||
    role.error ||
    (!(membership.data ?? []).length && !(role.data ?? []).length)
  ) {
    throw new Error("An authorised Cossa Store administrator is required to confirm delivery.");
  }
}

async function requireCossaStoreAdminAal2(admin: any, authClient: any, token: string, userId: string) {
  await requireCossaStoreAdmin(admin, userId);
  const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
  const aal = typeof claims?.claims?.aal === "string" ? claims.claims.aal : null;
  if (claimsError || aal !== "aal2") {
    throw new Error("A verified administrator authenticator is required for Yoco commissioning.");
  }
}

async function deliveryConfirmationTargets(admin: any, lines: ConfiguredPhysicalLine[]) {
  const productIds = [...new Set(lines.map((line) => line.productId))];
  const { data, error } = await admin
    .from("store_inventory_intakes")
    .select("publication_store_product_id,supplier_id,fulfilment_profile_id")
    .in("publication_store_product_id", productIds);
  if (error || !data)
    throw new Error(`${DELIVERY_QUOTE_REQUIRED} Delivery configuration is unavailable.`);

  const targets = new Map<string, DeliveryConfirmationTarget>();
  for (const productId of productIds) {
    const matches = (data as Array<Record<string, unknown>>).filter(
      (row) => row.publication_store_product_id === productId,
    );
    if (matches.length !== 1) {
      throw new Error(
        `${DELIVERY_QUOTE_REQUIRED} A unique supplier fulfilment record is required.`,
      );
    }
    const supplierId = typeof matches[0].supplier_id === "string" ? matches[0].supplier_id : "";
    const fulfilmentProfileId =
      typeof matches[0].fulfilment_profile_id === "string" ? matches[0].fulfilment_profile_id : "";
    if (!supplierId || !fulfilmentProfileId) {
      throw new Error(`${DELIVERY_QUOTE_REQUIRED} A supplier fulfilment profile is required.`);
    }
    targets.set(`${supplierId}:${fulfilmentProfileId}`, { supplierId, fulfilmentProfileId });
  }
  return [...targets.values()];
}

/**
 * Loads supplier delivery evidence exclusively with the service role. It never
 * accepts a browser price, weight, dimensions, supplier or rate ID. An absent
 * migration/configuration is deliberately treated as "quote required".
 */
async function quoteConfiguredPhysicalDelivery(
  admin: any,
  lines: ConfiguredPhysicalLine[],
  scope: DeliveryConfirmationScope,
  pendingStaffConfirmation: PendingStaffConfirmation | null = null,
) {
  const productIds = [...new Set(lines.map((line) => line.productId))];
  const configurationUnavailable = () =>
    new Error(
      `${DELIVERY_QUOTE_REQUIRED} Delivery configuration or verified parcel information is unavailable for this order.`,
    );

  const { data: intakeRows, error: intakeError } = await admin
    .from("store_inventory_intakes")
    .select("publication_store_product_id,supplier_id,fulfilment_profile_id")
    .in("publication_store_product_id", productIds);
  if (intakeError || !intakeRows) throw configurationUnavailable();

  const intakesByProduct = new Map<string, Array<Record<string, unknown>>>();
  for (const intake of intakeRows as Array<Record<string, unknown>>) {
    const productId =
      typeof intake.publication_store_product_id === "string"
        ? intake.publication_store_product_id
        : "";
    if (!productId) continue;
    intakesByProduct.set(productId, [...(intakesByProduct.get(productId) ?? []), intake]);
  }

  const resolvedLines = lines.map((line) => {
    const matches = intakesByProduct.get(line.productId) ?? [];
    if (matches.length !== 1) throw configurationUnavailable();
    const intake = matches[0];
    const supplierId = typeof intake.supplier_id === "string" ? intake.supplier_id : "";
    const fulfilmentProfileId =
      typeof intake.fulfilment_profile_id === "string" ? intake.fulfilment_profile_id : "";
    if (!supplierId || !fulfilmentProfileId) throw configurationUnavailable();
    return { ...line, supplierId, fulfilmentProfileId };
  });

  const supplierIds = [...new Set(resolvedLines.map((line) => line.supplierId))];
  const profileIds = [...new Set(resolvedLines.map((line) => line.fulfilmentProfileId))];
  const [attributesResult, suppliersResult, profilesResult, ratesResult, confirmationsResult] =
    await Promise.all([
      admin
        .from("store_product_delivery_attributes")
        .select(
          "store_product_id,length_cm,width_cm,height_cm,weight_kg,dimension_kind,dimensions_verified_at,weight_verified_at",
        )
        .in("store_product_id", productIds),
      admin.from("store_suppliers").select("id,name,status").in("id", supplierIds),
      admin
        .from("store_fulfilment_profiles")
        .select("id,supplier_id,delivery_payer,is_active")
        .in("id", profileIds),
      admin
        .from("store_delivery_rate_configurations")
        .select(
          "id,supplier_id,fulfilment_profile_id,method_code,customer_label,price,currency,is_active,customer_selectable,is_default,classification,eligibility_requirements,source_url,source_evidence,verified_at,operational_notes",
        )
        .in("fulfilment_profile_id", profileIds),
      admin
        .from("store_delivery_quote_confirmations")
        .select(
          "id,supplier_id,fulfilment_profile_id,rate_configuration_id,eligibility_classification,delivery_method,delivery_amount,currency,evidence_note,verified_at,expires_at",
        )
        .in("fulfilment_profile_id", profileIds)
        .eq("cart_fingerprint", scope.cartFingerprint)
        .eq("address_fingerprint", scope.addressFingerprint)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("verified_at", { ascending: false }),
    ]);
  if (
    attributesResult.error ||
    suppliersResult.error ||
    profilesResult.error ||
    ratesResult.error ||
    confirmationsResult.error ||
    !attributesResult.data ||
    !suppliersResult.data ||
    !profilesResult.data ||
    !ratesResult.data ||
    !confirmationsResult.data
  ) {
    throw configurationUnavailable();
  }

  const attributesByProduct = new Map(
    (attributesResult.data as Array<Record<string, unknown>>).map((row) => [
      String(row.store_product_id),
      row,
    ]),
  );
  const suppliersById = new Map(
    (suppliersResult.data as Array<Record<string, unknown>>).map((row) => [String(row.id), row]),
  );
  const profilesById = new Map(
    (profilesResult.data as Array<Record<string, unknown>>).map((row) => [String(row.id), row]),
  );
  const ratesByProfile = new Map<string, ConfiguredDeliveryRate[]>();
  for (const rawRate of ratesResult.data as Array<Record<string, unknown>>) {
    const rate = configuredRate(rawRate);
    if (!rate) continue;
    ratesByProfile.set(rate.fulfilmentProfileId, [
      ...(ratesByProfile.get(rate.fulfilmentProfileId) ?? []),
      rate,
    ]);
  }

  const confirmationsByTarget = new Map<string, LoadedDeliveryConfirmation>();
  for (const row of confirmationsResult.data as Array<Record<string, unknown>>) {
    const confirmation = deliveryConfirmation(row);
    if (!confirmation) continue;
    const key = `${confirmation.supplierId}:${confirmation.fulfilmentProfileId}`;
    if (!confirmationsByTarget.has(key)) confirmationsByTarget.set(key, confirmation);
  }

  const groupLines = new Map<string, typeof resolvedLines>();
  for (const line of resolvedLines) {
    const key = `${line.supplierId}:${line.fulfilmentProfileId}`;
    groupLines.set(key, [...(groupLines.get(key) ?? []), line]);
  }

  let shippingTotal = 0;
  const shippingMethods: string[] = [];
  const providers: string[] = [];
  const configuredRates: Array<{ rateId: string; methodCode: string; verifiedAt: string | null }> =
    [];
  const manualQuotes: Array<{
    confirmationId: string | null;
    deliveryMethod: string;
    deliveryAmount: number;
    verifiedAt: string;
    expiresAt: string;
  }> = [];
  const confirmationTargets: Array<{
    supplierId: string;
    fulfilmentProfileId: string;
    rateId: string;
    methodCode: string;
    customerLabel: string;
    amount: number;
  }> = [];
  for (const [key, groupedLines] of groupLines) {
    const [supplierId, fulfilmentProfileId] = key.split(":");
    const supplier = suppliersById.get(supplierId);
    const profile = profilesById.get(fulfilmentProfileId);
    if (!supplier || !profile || String(profile.supplier_id) !== supplierId) {
      throw configurationUnavailable();
    }

    const storedConfirmation =
      pendingStaffConfirmation &&
      pendingStaffConfirmation.target.supplierId === supplierId &&
      pendingStaffConfirmation.target.fulfilmentProfileId === fulfilmentProfileId
        ? {
            supplierId,
            fulfilmentProfileId,
            eligibilityClassification: pendingStaffConfirmation.eligibilityClassification,
          }
        : (confirmationsByTarget.get(key) ?? null);

    // A staff-approved manual quote remains bound to this exact cart and
    // address by the confirmation lookup above. It deliberately bypasses the
    // configured-rate resolver only after the trusted staff workflow has
    // supplied a non-zero amount, method and audit evidence server-side.
    if (
      storedConfirmation &&
      storedConfirmation.eligibilityClassification === "MANUAL_DELIVERY_QUOTE_REQUIRED"
    ) {
      const confirmation = storedConfirmation as LoadedDeliveryConfirmation;
      const quotedAmount = confirmation.deliveryAmount;
      if (
        supplier.status !== "active" ||
        profile.is_active !== true ||
        profile.delivery_payer !== "customer" ||
        !confirmation.deliveryMethod ||
        confirmation.currency !== "ZAR" ||
        quotedAmount === null ||
        quotedAmount <= 0 ||
        quotedAmount > 100000
      ) {
        throw configurationUnavailable();
      }
      const deliveryAmount = money(quotedAmount);
      shippingTotal = money(shippingTotal + deliveryAmount);
      shippingMethods.push(confirmation.deliveryMethod);
      providers.push(typeof supplier.name === "string" ? supplier.name : "configured supplier");
      manualQuotes.push({
        confirmationId: confirmation.id ?? null,
        deliveryMethod: confirmation.deliveryMethod,
        deliveryAmount,
        verifiedAt: confirmation.verifiedAt,
        expiresAt: confirmation.expiresAt,
      });
      continue;
    }
    const delivery = resolveConfiguredDeliveryGroup({
      supplierId,
      fulfilmentProfileId,
      supplierIsActive: supplier.status === "active",
      fulfilmentProfileIsActive: profile.is_active === true,
      customerPaysDelivery: profile.delivery_payer === "customer",
      // Destination eligibility is never inferred from the browser address.
      // It is unlocked only by a private, time-limited staff confirmation.
      addressEligibility: addressEligibilityFromConfirmation(storedConfirmation),
      rates: ratesByProfile.get(fulfilmentProfileId) ?? [],
      items: groupedLines.map((line) => {
        const row = attributesByProduct.get(line.productId);
        return {
          productId: line.productId,
          quantity: line.quantity,
          measurements: row
            ? {
                lengthCm: finiteNumber(row.length_cm),
                widthCm: finiteNumber(row.width_cm),
                heightCm: finiteNumber(row.height_cm),
                weightKg: finiteNumber(row.weight_kg),
                dimensionKind:
                  row.dimension_kind === "product" || row.dimension_kind === "packed_parcel"
                    ? row.dimension_kind
                    : null,
                dimensionsVerifiedAt:
                  typeof row.dimensions_verified_at === "string"
                    ? row.dimensions_verified_at
                    : null,
                weightVerifiedAt:
                  typeof row.weight_verified_at === "string" ? row.weight_verified_at : null,
              }
            : null,
        };
      }),
    });

    if (delivery.status !== "quoted") throw new Error(delivery.message);
    if (
      !storedConfirmation ||
      storedConfirmation.eligibilityClassification !== "STANDARD_RATE_ELIGIBLE"
    ) {
      throw configurationUnavailable();
    }
    if (!pendingStaffConfirmation) {
      const confirmation = storedConfirmation as LoadedDeliveryConfirmation;
      if (
        confirmation.rateConfigurationId !== delivery.rate.id ||
        confirmation.deliveryMethod !== delivery.rate.methodCode ||
        confirmation.currency !== "ZAR" ||
        confirmation.deliveryAmount === null ||
        money(confirmation.deliveryAmount) !== money(delivery.shippingTotal)
      ) {
        throw configurationUnavailable();
      }
    }
    shippingTotal = money(shippingTotal + delivery.shippingTotal);
    shippingMethods.push(delivery.shippingMethod);
    providers.push(typeof supplier.name === "string" ? supplier.name : "configured supplier");
    configuredRates.push({
      rateId: delivery.rate.id,
      methodCode: delivery.rate.methodCode,
      verifiedAt: delivery.rate.verifiedAt,
    });
    confirmationTargets.push({
      supplierId,
      fulfilmentProfileId,
      rateId: delivery.rate.id,
      methodCode: delivery.rate.methodCode,
      customerLabel: delivery.shippingMethod,
      amount: delivery.shippingTotal,
    });
  }

  return {
    shippingTotal,
    shippingMethod: shippingMethods.join(" + "),
    provider: providers.join(" + "),
    quoteMetadata: {
      configured_rates: configuredRates,
      manual_quotes: manualQuotes,
    },
    confirmationTargets,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(request) });
  }
  if (request.method !== "POST") {
    return json(request, { error: "Method not allowed." }, 405);
  }

  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
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
        : body.action === "confirm_delivery"
          ? "confirm_delivery"
          : body.action === "request_delivery_quote"
            ? "request_delivery_quote"
            : body.action === "list_my_delivery_quote_requests"
              ? "list_my_delivery_quote_requests"
              : body.action === "list_delivery_quote_requests"
                ? "list_delivery_quote_requests"
                : body.action === "approve_delivery_quote"
                  ? "approve_delivery_quote"
                  : body.action === "reject_delivery_quote"
                    ? "reject_delivery_quote"
                    : body.action === "yoco_create"
                      ? "yoco_create"
                      : body.action === "yoco_live_create"
                        ? "yoco_live_create"
                      : body.action === "yoco_live_register_webhook"
                        ? "yoco_live_register_webhook"
                      : body.action === "yoco_status"
                        ? "yoco_status"
                        : body.action === "yoco_return"
                          ? "yoco_return"
                          : body.action === "create" || !body.action
                            ? "create"
                            : null;
    if (!action) throw new Error("Unsupported checkout action.");

    // The Yoco integration is deliberately a merchant-only test path. This
    // prevents public customers from creating test orders on the live store
    // while the gateway is being validated.
    if (action === "yoco_create" || action === "yoco_status" || action === "yoco_return") {
      await requireCossaStoreAdmin(admin, userData.user.id);
    }

    if (action === "yoco_live_register_webhook") {
      stage = "yoco_live_webhook_commissioning_gate";
      await requireCossaStoreAdminAal2(admin, authClient, token, userData.user.id);
    }

    // Live Yoco is an explicit, server-only commissioning path. It remains
    // unavailable unless both the database control and server secret exist.
    if (action === "yoco_live_create") {
      stage = "yoco_live_configuration_gate";
      const liveSecret = Deno.env.get("YOCO_LIVE_SECRET_KEY");
      const { data: control, error: controlError } = await admin
        .from("store_payment_provider_controls")
        .select("yoco_live_state")
        .eq("id", true)
        .maybeSingle();
      if (controlError || !control || control.yoco_live_state === "disabled" || !liveSecret) {
        throw new Error("Yoco live payments are not currently available.");
      }
      if (control.yoco_live_state === "commissioning") {
        await requireCossaStoreAdminAal2(admin, authClient, token, userData.user.id);
      }
    }

    if (action === "yoco_live_register_webhook") {
      stage = "yoco_live_webhook_registration";
      const liveSecret = Deno.env.get("YOCO_LIVE_SECRET_KEY");
      if (!liveSecret) throw new Error("Yoco live payments are not configured.");
      const { data: storedSecret, error: storedSecretError } = await admin.rpc(
        "get_yoco_live_webhook_secret",
      );
      if (storedSecretError) throw new Error("Live webhook configuration could not be checked.");
      if (storedSecret) return json(request, { alreadyConfigured: true, registered: true });

      const webhookUrl = "https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/yoco-live-webhook";
      const existingResponse = await fetch("https://payments.yoco.com/api/webhooks", {
        headers: { Authorization: `Bearer ${liveSecret}` },
      });
      if (!existingResponse.ok) throw new Error("Yoco webhooks could not be reconciled safely.");
      const existing = parseYocoWebhookSubscriptions(await existingResponse.json());
      const duplicate = hasCossaLiveWebhookDuplicate(existing, webhookUrl);
      if (duplicate) throw new Error("A Cossa Store live webhook already exists but its signing secret is not stored.");

      const registerResponse = await fetch("https://payments.yoco.com/api/webhooks", {
        method: "POST",
        headers: { Authorization: `Bearer ${liveSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "cossa-store-yoco-live", url: webhookUrl }),
      });
      const registerBody = (await registerResponse.json().catch(() => ({}))) as Record<string, unknown>;
      const webhookSecret = text(registerBody.secret, 1000);
      if (!registerResponse.ok || !webhookSecret.startsWith("whsec_")) {
        throw new Error("Yoco live webhook registration failed safely.");
      }
      const { error: storeError } = await admin.rpc("store_yoco_live_webhook_secret", {
        p_secret: webhookSecret,
      });
      if (storeError) throw new Error("The live webhook was registered but its secret could not be secured.");
      return json(request, { registered: true, webhookUrl });
    }

    if (action === "yoco_status" || action === "yoco_return") {
      stage = "yoco_attempt_status";
      const attemptId = text(body.attemptId, 64);
      if (!uuid(attemptId)) throw new Error("The Yoco test payment attempt is invalid.");
      const { data: attemptData, error: attemptError } = await admin
        .from("store_yoco_test_payment_attempts")
        .select("*")
        .eq("id", attemptId)
        .eq("payer_user_id", userData.user.id)
        .maybeSingle();
      if (attemptError || !attemptData)
        throw new Error("This Yoco test payment attempt was not found.");

      if (action === "yoco_status") {
        return json(request, {
          attempt: yocoAttemptPublic(attemptData as Record<string, unknown>),
        });
      }

      const returnState = text(body.returnState, 20);
      if (returnState !== "success" && returnState !== "cancelled" && returnState !== "failed") {
        throw new Error("The Yoco return state is invalid.");
      }
      const update: Record<string, unknown> = {
        return_state: returnState,
        return_recorded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // A browser return is never payment proof. Cancellation and failure are
      // customer-visible attempt states only; a later signed Yoco event can
      // still record an actual payment if one completed concurrently.
      if (returnState !== "success" && attemptData.status !== "succeeded") {
        update.status = returnState;
      }
      const { data: updatedAttempt, error: updateError } = await admin
        .from("store_yoco_test_payment_attempts")
        .update(update)
        .eq("id", attemptId)
        .select("*")
        .single();
      if (updateError || !updatedAttempt)
        throw new Error("The Yoco return state could not be recorded.");
      return json(request, {
        attempt: yocoAttemptPublic(updatedAttempt as Record<string, unknown>),
      });
    }

    if (action === "list_my_delivery_quote_requests") {
      stage = "delivery_quote_request_list";
      const { data, error } = await admin
        .from("store_delivery_quote_requests")
        .select(
          "id,status,delivery_method,delivery_amount,currency,staff_note,created_at,quoted_at,expires_at",
        )
        .eq("organisation_id", COSSA_ORGANISATION_ID)
        .eq("requester_user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw new Error("Your delivery quote requests could not be loaded.");
      return json(request, {
        requests: (data ?? []).map((row: Record<string, unknown>) =>
          deliveryQuoteRequestPublic(row),
        ),
      });
    }

    if (
      action === "list_delivery_quote_requests" ||
      action === "approve_delivery_quote" ||
      action === "reject_delivery_quote"
    ) {
      await requireCossaStoreAdmin(admin, userData.user.id);
      stage = "delivery_quote_administration";

      if (action === "list_delivery_quote_requests") {
        const { data, error } = await admin
          .from("store_delivery_quote_requests")
          .select(
            "id,status,customer_name,customer_phone,requester_email,items,shipping_address,delivery_method,delivery_amount,currency,staff_note,created_at,quoted_at,expires_at",
          )
          .eq("organisation_id", COSSA_ORGANISATION_ID)
          .eq("status", "requested")
          .order("created_at", { ascending: true })
          .limit(100);
        if (error) throw new Error("The delivery quote queue could not be loaded.");
        return json(request, {
          requests: (data ?? []).map((row: Record<string, unknown>) =>
            deliveryQuoteRequestForAdmin(row),
          ),
        });
      }

      const requestId = text(body.requestId, 64);
      if (!uuid(requestId)) throw new Error("The delivery quote request is invalid.");

      if (action === "approve_delivery_quote") {
        const deliveryAmount = finiteNumber(body.deliveryAmount);
        const deliveryMethod = text(body.deliveryMethod, 160);
        const evidenceNote = text(body.evidenceNote, 2000);
        const staffNote = text(body.staffNote, 1000) || null;
        const { data, error } = await admin.rpc("approve_store_delivery_quote_request", {
          p_request_id: requestId,
          p_staff_user_id: userData.user.id,
          p_delivery_amount: deliveryAmount,
          p_delivery_method: deliveryMethod,
          p_evidence_note: evidenceNote,
          p_staff_note: staffNote,
        });
        if (error || !data) {
          throw new Error(error?.message || "The verified delivery quote could not be saved.");
        }
        const quoted = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
        return json(request, { request: deliveryQuoteRequestPublic(quoted) });
      }

      const staffNote = text(body.staffNote, 1000);
      const { data, error } = await admin.rpc("reject_store_delivery_quote_request", {
        p_request_id: requestId,
        p_staff_user_id: userData.user.id,
        p_staff_note: staffNote,
      });
      if (error || !data) {
        throw new Error(error?.message || "The delivery quote request could not be rejected.");
      }
      const rejected = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
      return json(request, { request: deliveryQuoteRequestPublic(rejected) });
    }

    const customerName = text(body.customerName, 140);
    const customerPhone = text(body.customerPhone, 40);
    const clientRequestId = text(body.clientRequestId, 64);
    if (action !== "confirm_delivery" && (customerName.length < 2 || !uuid(clientRequestId))) {
      throw new Error("Please provide your name and a valid checkout session.");
    }
    if (action === "confirm_delivery") {
      await requireCossaStoreAdmin(admin, userData.user.id);
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
    const configuredPhysicalLines: ConfiguredPhysicalLine[] = [];
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
        configuredPhysicalLines.push({
          productId: product.id,
          name: product.name,
          quantity: line.quantity,
        });
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

    const deliveryScope = shippingAddress
      ? {
          cartFingerprint: await deliveryConfirmationFingerprint({
            cart: resolvedCart.map((line) => ({
              productId: line.product_id,
              variantId: line.variant_id,
              quantity: line.quantity,
            })),
            address: shippingAddress,
          }),
          addressFingerprint: await deliveryConfirmationFingerprint({
            cart: [],
            address: shippingAddress,
          }),
        }
      : null;

    if (action === "request_delivery_quote") {
      if (
        !shippingAddress ||
        !deliveryScope ||
        !configuredPhysicalLines.length ||
        printifyLines.length
      ) {
        throw new Error(
          "Staff delivery quotes currently support one configured physical fulfilment group.",
        );
      }
      const targets = await deliveryConfirmationTargets(admin, configuredPhysicalLines);
      if (targets.length !== 1) {
        throw new Error(
          "This cart needs separate delivery quotes for each supplier fulfilment group.",
        );
      }

      stage = "delivery_quote_request";
      const { data: existing, error: existingError } = await admin
        .from("store_delivery_quote_requests")
        .select(
          "id,status,delivery_method,delivery_amount,currency,staff_note,created_at,quoted_at,expires_at",
        )
        .eq("requester_user_id", userData.user.id)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (existingError) throw new Error("Your delivery quote request could not be checked.");
      if (existing) {
        return json(request, {
          request: deliveryQuoteRequestPublic(existing as Record<string, unknown>),
        });
      }

      const { data: openRequest, error: openRequestError } = await admin
        .from("store_delivery_quote_requests")
        .select(
          "id,status,delivery_method,delivery_amount,currency,staff_note,created_at,quoted_at,expires_at",
        )
        .eq("requester_user_id", userData.user.id)
        .eq("cart_fingerprint", deliveryScope.cartFingerprint)
        .eq("address_fingerprint", deliveryScope.addressFingerprint)
        .eq("status", "requested")
        .maybeSingle();
      if (openRequestError) throw new Error("Your delivery quote request could not be checked.");
      if (openRequest) {
        return json(request, {
          request: deliveryQuoteRequestPublic(openRequest as Record<string, unknown>),
        });
      }

      const target = targets[0];
      const requestItems = configuredPhysicalLines.map((line) => ({
        productId: line.productId,
        name: line.name,
        quantity: line.quantity,
      }));
      const { data: created, error: createError } = await admin
        .from("store_delivery_quote_requests")
        .insert({
          organisation_id: COSSA_ORGANISATION_ID,
          requester_user_id: userData.user.id,
          client_request_id: clientRequestId,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          requester_email: userData.user.email,
          items: requestItems,
          shipping_address: shippingAddress,
          cart_fingerprint: deliveryScope.cartFingerprint,
          address_fingerprint: deliveryScope.addressFingerprint,
          supplier_id: target.supplierId,
          fulfilment_profile_id: target.fulfilmentProfileId,
        })
        .select(
          "id,status,delivery_method,delivery_amount,currency,staff_note,created_at,quoted_at,expires_at",
        )
        .single();
      if (createError || !created) {
        // A second click can race the first request. The unique client ID
        // makes it safe to return the original instead of creating a duplicate.
        if (createError?.code === "23505") {
          const { data: raced } = await admin
            .from("store_delivery_quote_requests")
            .select(
              "id,status,delivery_method,delivery_amount,currency,staff_note,created_at,quoted_at,expires_at",
            )
            .eq("requester_user_id", userData.user.id)
            .eq("cart_fingerprint", deliveryScope.cartFingerprint)
            .eq("address_fingerprint", deliveryScope.addressFingerprint)
            .eq("status", "requested")
            .maybeSingle();
          if (raced) {
            return json(request, {
              request: deliveryQuoteRequestPublic(raced as Record<string, unknown>),
            });
          }
        }
        throw new Error("Your delivery quote request could not be submitted.");
      }
      return json(request, {
        request: deliveryQuoteRequestPublic(created as Record<string, unknown>),
      });
    }

    if (action === "confirm_delivery") {
      if (
        !shippingAddress ||
        !deliveryScope ||
        !configuredPhysicalLines.length ||
        printifyLines.length
      ) {
        throw new Error(
          "Staff delivery confirmation currently supports one configured physical fulfilment group.",
        );
      }
      const staffConfirmation = readStaffConfirmation(body.deliveryConfirmation);
      if (!staffConfirmation) {
        throw new Error("Provide an eligibility classification and an operational evidence note.");
      }
      const targets = await deliveryConfirmationTargets(admin, configuredPhysicalLines);
      if (targets.length !== 1) {
        throw new Error(
          "Staff delivery confirmation requires exactly one supplier fulfilment group.",
        );
      }
      const target = targets[0];
      let rateConfigurationId: string | null = null;
      let deliveryMethod: string | null = null;
      let deliveryAmount: number | null = null;
      let quote: { subtotal: number; shippingTotal: number; total: number } | null = null;

      if (staffConfirmation.eligibilityClassification === "STANDARD_RATE_ELIGIBLE") {
        const configuredDelivery = await quoteConfiguredPhysicalDelivery(
          admin,
          configuredPhysicalLines,
          deliveryScope,
          { target, ...staffConfirmation },
        );
        const confirmedGroup = configuredDelivery.confirmationTargets[0];
        if (!confirmedGroup || configuredDelivery.confirmationTargets.length !== 1) {
          throw new Error(
            `${DELIVERY_QUOTE_REQUIRED} A single configured delivery rate is required.`,
          );
        }
        rateConfigurationId = confirmedGroup.rateId;
        deliveryMethod = confirmedGroup.methodCode;
        deliveryAmount = confirmedGroup.amount;
        quote = {
          subtotal,
          shippingTotal: configuredDelivery.shippingTotal,
          total: money(subtotal + configuredDelivery.shippingTotal),
        };
      }

      const expiresAt = new Date(Date.now() + DELIVERY_CONFIRMATION_TTL_MS).toISOString();
      const deactivate = await admin
        .from("store_delivery_quote_confirmations")
        .update({ is_active: false })
        .eq("supplier_id", target.supplierId)
        .eq("fulfilment_profile_id", target.fulfilmentProfileId)
        .eq("cart_fingerprint", deliveryScope.cartFingerprint)
        .eq("address_fingerprint", deliveryScope.addressFingerprint)
        .eq("is_active", true);
      if (deactivate.error)
        throw new Error("The prior delivery confirmation could not be superseded.");

      const { error: confirmationError } = await admin
        .from("store_delivery_quote_confirmations")
        .insert({
          organisation_id: COSSA_ORGANISATION_ID,
          supplier_id: target.supplierId,
          fulfilment_profile_id: target.fulfilmentProfileId,
          rate_configuration_id: rateConfigurationId,
          cart_fingerprint: deliveryScope.cartFingerprint,
          address_fingerprint: deliveryScope.addressFingerprint,
          eligibility_classification: staffConfirmation.eligibilityClassification,
          delivery_method: deliveryMethod,
          delivery_amount: deliveryAmount,
          currency: deliveryAmount === null ? null : "ZAR",
          evidence_note: staffConfirmation.evidenceNote,
          verified_by: userData.user.id,
          verified_at: new Date().toISOString(),
          expires_at: expiresAt,
          is_active: true,
        });
      if (confirmationError) throw new Error("The delivery confirmation could not be saved.");

      return json(request, {
        confirmation: {
          classification: staffConfirmation.eligibilityClassification,
          verifiedAt: new Date().toISOString(),
          expiresAt,
          deliveryMethod,
          deliveryAmount,
        },
        quote,
      });
    }

    let shippingTotal = 0;
    const shippingMethods: string[] = [];
    const shippingProviders: string[] = [];
    const shippingQuoteMetadata: Record<string, unknown> = {};
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
      shippingMethods.push(quote.method);
      shippingProviders.push("Printify");
      shippingTotal = money(shippingTotal + (quote.centsUsd / 100) * fxRate);
    }

    if (configuredPhysicalLines.length) {
      stage = "configured_delivery_quote";
      const configuredDelivery = await quoteConfiguredPhysicalDelivery(
        admin,
        configuredPhysicalLines,
        deliveryScope!,
      );
      shippingTotal = money(shippingTotal + configuredDelivery.shippingTotal);
      shippingMethods.push(configuredDelivery.shippingMethod);
      shippingProviders.push(configuredDelivery.provider);
      shippingQuoteMetadata.configured_delivery = configuredDelivery.quoteMetadata;
    }

    const shippingMethod = shippingMethods.join(" + ") || "none";
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

    if (action === "yoco_live_create") {
      stage = "yoco_live_attempt_creation";
      const liveSecret = Deno.env.get("YOCO_LIVE_SECRET_KEY");
      if (!liveSecret) throw new Error("Yoco live payments are not configured.");
      const { data: control } = await admin
        .from("store_payment_provider_controls")
        .select("yoco_live_state")
        .eq("id", true)
        .maybeSingle();
      if (!control || !["commissioning", "active"].includes(String(control.yoco_live_state))) {
        throw new Error("Yoco live payments are disabled.");
      }
      const { data: attemptData, error: attemptError } = await admin.rpc(
        "create_store_yoco_live_payment_attempt",
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
          p_shipping_provider: shippingProviders.join(" + ") || null,
          p_shipping_quote_metadata: shippingQuoteMetadata,
          p_cart_fingerprint: JSON.stringify(resolvedCart),
          p_address_fingerprint: JSON.stringify(shippingAddress ?? {}),
          p_delivery_fingerprint: JSON.stringify(shippingQuoteMetadata),
        },
      );
      if (attemptError || !attemptData) throw new Error(attemptError?.message || "Live payment attempt could not be created.");
      const attempt = (Array.isArray(attemptData) ? attemptData[0] : attemptData) as Record<string, unknown>;
      const prior = attempt.metadata && typeof attempt.metadata === "object" ? attempt.metadata as Record<string, unknown> : {};
      const priorRedirect = text(prior.redirectUrl, 2000);
      if (attempt.provider_checkout_id && priorRedirect) return json(request, { attempt: yocoLiveAttemptPublic(attempt), redirectUrl: priorRedirect });
      const returnOrigin = request.headers.get("origin");
      if (!returnOrigin || !isAllowedOrigin(returnOrigin)) throw new Error("The Yoco return origin is not allowed.");
      const returnBase = `${returnOrigin}/checkout?yocoLiveAttemptId=${encodeURIComponent(String(attempt.id))}`;
      const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
        method: "POST",
        headers: { Authorization: `Bearer ${liveSecret}`, "Content-Type": "application/json", "Idempotency-Key": String(attempt.id) },
        body: JSON.stringify({
          amount: Number(attempt.amount_cents), currency: "ZAR", clientReferenceId: String(attempt.store_order_id), externalId: String(attempt.id),
          metadata: { cossaPaymentAttemptId: attempt.id, mode: "live" },
          successUrl: `${returnBase}&yoco=success`, cancelUrl: `${returnBase}&yoco=cancelled`, failureUrl: `${returnBase}&yoco=failed`,
        }),
      });
      const yocoBody = (await yocoResponse.json().catch(() => ({}))) as Record<string, unknown>;
      const redirectUrl = text(yocoBody.redirectUrl, 2000);
      const checkoutId = text(yocoBody.id, 240);
      if (!yocoResponse.ok || !redirectUrl || !checkoutId) throw new Error("Yoco could not create the live checkout.");
      const { data: updated, error: updateError } = await admin.from("store_payment_attempts").update({ provider_checkout_id: checkoutId, status: "created", metadata: { ...prior, redirectUrl }, updated_at: new Date().toISOString() }).eq("id", attempt.id).select("*").single();
      if (updateError || !updated) throw new Error("Live checkout was created but could not be recorded safely.");
      return json(request, { attempt: yocoLiveAttemptPublic(updated as Record<string, unknown>), redirectUrl });
    }

    if (action === "yoco_create") {
      stage = "yoco_test_attempt_creation";
      const yocoTestSecret = Deno.env.get("YOCO_TEST_SECRET_KEY");
      if (!yocoTestSecret) throw new Error("Yoco test checkout is not configured.");
      const { data: attemptData, error: attemptError } = await admin.rpc(
        "create_store_yoco_test_payment_attempt_with_delivery",
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
          p_shipping_provider: shippingProviders.join(" + ") || null,
          p_shipping_quote_metadata: shippingQuoteMetadata,
        },
      );
      if (attemptError || !attemptData) {
        throw new Error(
          attemptError?.message || "Your Yoco test payment attempt could not be created.",
        );
      }
      const attempt = (Array.isArray(attemptData) ? attemptData[0] : attemptData) as Record<
        string,
        unknown
      >;
      const priorResponse =
        attempt.yoco_response && typeof attempt.yoco_response === "object"
          ? (attempt.yoco_response as Record<string, unknown>)
          : {};
      const priorRedirectUrl = text(priorResponse.redirectUrl, 2000);
      if (attempt.status === "succeeded") {
        throw new Error(
          "This Yoco test payment has already been verified. Create a new test order to pay again.",
        );
      }
      if (attempt.yoco_checkout_id && priorRedirectUrl) {
        return json(request, {
          attempt: yocoAttemptPublic(attempt),
          redirectUrl: priorRedirectUrl,
        });
      }

      const returnOrigin = request.headers.get("origin");
      if (!returnOrigin || !isAllowedOrigin(returnOrigin)) {
        throw new Error("The Yoco return origin is not allowed.");
      }

      // Yoco returns this signing secret only once. On the first test
      // checkout, register the single shared webhook and place its secret in
      // Supabase Vault; neither value is ever returned to the browser.
      const { data: storedWebhookSecret, error: storedWebhookSecretError } = await admin.rpc(
        "get_yoco_test_webhook_secret",
      );
      if (storedWebhookSecretError || !storedWebhookSecret) {
        stage = "yoco_test_webhook_registration";
        const webhookResponse = await fetch("https://payments.yoco.com/api/webhooks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${yocoTestSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "cossa-store-yoco-test",
            url: `${supabaseUrl}/functions/v1/yoco-webhook`,
          }),
        });
        const webhookBody = (await webhookResponse.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const webhookSecret = text(webhookBody.secret, 1000);
        if (!webhookResponse.ok || !webhookSecret.startsWith("whsec_")) {
          throw new Error(
            "Yoco could not register the test payment webhook. No checkout was created.",
          );
        }
        const { error: saveWebhookSecretError } = await admin.rpc(
          "store_yoco_test_webhook_secret",
          { p_secret: webhookSecret },
        );
        if (saveWebhookSecretError) {
          throw new Error(
            "Yoco registered the test webhook, but its signing secret could not be secured.",
          );
        }
      }

      stage = "yoco_test_checkout_creation";
      const returnBase = `${returnOrigin}/checkout?yocoAttemptId=${encodeURIComponent(String(attempt.id))}`;
      const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${yocoTestSecret}`,
          "Content-Type": "application/json",
          "Idempotency-Key": String(attempt.id),
        },
        body: JSON.stringify({
          amount: Number(attempt.amount_cents),
          currency: "ZAR",
          clientReferenceId: String(attempt.store_order_id),
          externalId: String(attempt.id),
          metadata: { cossaYocoTestAttemptId: attempt.id, mode: "test" },
          successUrl: `${returnBase}&yoco=success`,
          cancelUrl: `${returnBase}&yoco=cancelled`,
          failureUrl: `${returnBase}&yoco=failed`,
        }),
      });
      const yocoBody = (await yocoResponse.json().catch(() => ({}))) as Record<string, unknown>;
      const redirectUrl = text(yocoBody.redirectUrl, 2000);
      const yocoCheckoutId = text(yocoBody.id, 240);
      if (!yocoResponse.ok || !redirectUrl || !yocoCheckoutId) {
        await admin
          .from("store_yoco_test_payment_attempts")
          .update({
            status: "failed",
            last_error:
              text(yocoBody.message ?? yocoBody.error, 500) || "Yoco rejected checkout creation.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attempt.id);
        throw new Error("Yoco could not create the test checkout. No payment was taken.");
      }
      const { data: updatedAttempt, error: updateError } = await admin
        .from("store_yoco_test_payment_attempts")
        .update({
          yoco_checkout_id: yocoCheckoutId,
          yoco_response: yocoBody,
          status: "created",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id)
        .select("*")
        .single();
      if (updateError || !updatedAttempt) {
        throw new Error(
          "Yoco checkout was created but could not be recorded. Retrying will not create a second checkout.",
        );
      }
      return json(request, {
        attempt: yocoAttemptPublic(updatedAttempt as Record<string, unknown>),
        redirectUrl,
      });
    }

    stage = "eft_order_creation";
    const { data: paymentData, error: paymentError } = await admin.rpc(
      "create_store_eft_payment_request_with_delivery",
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
        p_shipping_provider: shippingProviders.join(" + ") || null,
        p_shipping_quote_metadata: shippingQuoteMetadata,
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
