import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const PAYMENT_PROOFS_BUCKET = "eft-payment-proofs";
const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "https://nexdocs.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

type PaymentPurpose =
  | "store_order"
  | "growth_subscription"
  | "nexdocs_subscription";

type PaymentStatus =
  | "awaiting_payment"
  | "proof_submitted"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

type PaymentRequest = {
  id: string;
  organisation_id: string;
  payer_user_id: string;
  payer_email: string;
  purpose: PaymentPurpose;
  store_order_id: string | null;
  plan_code: string | null;
  reference: string;
  amount: number | string;
  currency: "ZAR";
  status: PaymentStatus;
  proof_storage_path: string | null;
  proof_file_name: string | null;
  proof_content_type: string | null;
  proof_file_size: number | null;
  payer_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_note: string | null;
  expires_at: string;
  created_from: "store" | "growth" | "nexdocs";
  created_at: string;
};

type EftSettings = {
  enabled: boolean;
  account_holder: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  branch_code: string;
  payment_instruction: string | null;
};

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeFileName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (normalized || "proof-of-payment").slice(0, 120);
}

function isRecognizedProof(contentType: string, bytes: Uint8Array): boolean {
  const isPdf =
    contentType === "application/pdf" &&
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  const isJpeg =
    contentType === "image/jpeg" &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    contentType === "image/png" &&
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  return isPdf || isJpeg || isPng;
}

function paymentIsExpired(payment: PaymentRequest): boolean {
  return new Date(payment.expires_at).getTime() <= Date.now();
}

function publicPayment(payment: PaymentRequest) {
  return {
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
  };
}

function paymentInstructions(payment: PaymentRequest, settings: EftSettings) {
  return {
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
      "Pay the exact amount using the unique reference, then upload an unaltered proof of payment for review.",
  };
}

async function requireUser(
  request: Request,
  client: ReturnType<typeof createClient>,
): Promise<User> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sign in is required to continue.");

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Your session could not be verified. Please sign in again.");
  return data.user;
}

async function getSettings(
  admin: ReturnType<typeof createClient>,
): Promise<EftSettings> {
  const { data, error } = await admin
    .from("eft_payment_settings")
    .select("enabled,account_holder,bank_name,account_type,account_number,branch_code,payment_instruction")
    .eq("id", true)
    .eq("enabled", true)
    .maybeSingle();

  if (error || !data) throw new Error("EFT payment is temporarily unavailable. Please try again later.");
  return data as EftSettings;
}

async function loadOwnedPayment(
  admin: ReturnType<typeof createClient>,
  paymentId: string,
  userId: string,
): Promise<PaymentRequest> {
  if (!isValidUuid(paymentId)) throw new Error("The payment reference is invalid.");

  const { data, error } = await admin
    .from("eft_payment_requests")
    .select("*")
    .eq("id", paymentId)
    .eq("payer_user_id", userId)
    .maybeSingle();

  if (error || !data) throw new Error("This payment request is not available for your account.");
  return data as PaymentRequest;
}

async function ensureActivePayment(
  admin: ReturnType<typeof createClient>,
  payment: PaymentRequest,
): Promise<PaymentRequest> {
  if (!paymentIsExpired(payment)) return payment;

  if (payment.status === "awaiting_payment" || payment.status === "rejected") {
    await admin
      .from("eft_payment_requests")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .in("status", ["awaiting_payment", "rejected"]);
  }

  return { ...payment, status: "expired" };
}

async function requireCossaReviewer(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const [{ data: memberships, error: membershipError }, { data: roles, error: roleError }] = await Promise.all([
    admin
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin", "manager"]),
    admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
  ]);

  if (membershipError || roleError || (!(memberships ?? []).length && !(roles ?? []).length)) {
    throw new Error("You do not have permission to review customer payments.");
  }
}

async function resolveSubscriptionOrganisation(
  admin: ReturnType<typeof createClient>,
  user: User,
  requestedOrganisationId: string,
  purpose: "growth_subscription" | "nexdocs_subscription",
): Promise<string> {
  if (requestedOrganisationId && !isValidUuid(requestedOrganisationId)) {
    throw new Error("The selected organisation is invalid.");
  }

  let membershipsQuery = admin
    .from("organisation_members")
    .select("organisation_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .order("created_at", { ascending: true });

  if (requestedOrganisationId) {
    membershipsQuery = membershipsQuery.eq("organisation_id", requestedOrganisationId);
  }

  const { data: memberships, error } = await membershipsQuery;
  if (error) throw new Error("Your organisation membership could not be verified.");
  if (memberships?.[0]?.organisation_id) return memberships[0].organisation_id;

  if (purpose === "growth_subscription") {
    throw new Error("An active GROWTH organisation owner account is required to start a subscription payment.");
  }

  const displayName = cleanText(
    user.user_metadata?.business_name || user.user_metadata?.full_name || user.user_metadata?.display_name,
    120,
  );
  const fallbackName = cleanText(user.email?.split("@")[0], 80) || "NexDocs customer";
  const legalName = `${displayName || fallbackName} — NexDocs account`;

  const { data: organisation, error: organisationError } = await admin
    .from("organisations")
    .insert({ legal_name: legalName, trading_name: displayName || null, status: "active" })
    .select("id")
    .single();

  if (organisationError || !organisation?.id) {
    throw new Error("Your NexDocs billing profile could not be prepared. Please contact Cossa support.");
  }

  const { error: membershipError } = await admin
    .from("organisation_members")
    .insert({ organisation_id: organisation.id, user_id: user.id, role: "owner", status: "active" });

  if (membershipError) {
    await admin.from("organisations").update({ status: "archived" }).eq("id", organisation.id);
    throw new Error("Your NexDocs billing profile could not be prepared. Please contact Cossa support.");
  }

  return organisation.id;
}

async function describeStoreOrder(
  admin: ReturnType<typeof createClient>,
  payment: PaymentRequest,
) {
  if (!payment.store_order_id) return null;

  const { data: order, error: orderError } = await admin
    .from("store_orders")
    .select("order_number,status,total,store_order_items(product_name,sku,quantity,unit_price,line_total)")
    .eq("id", payment.store_order_id)
    .maybeSingle();

  if (orderError || !order) return null;

  return {
    orderNumber: order.order_number,
    orderStatus: order.status,
    total: Number(order.total),
    items: (order.store_order_items ?? []).map((item: Record<string, unknown>) => ({
      productName: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price ?? 0),
      lineTotal: Number(item.line_total ?? 0),
    })),
  };
}

async function startStorePayment(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
  body: Record<string, unknown>,
) {
  const customerName = cleanText(body.customerName, 140);
  const customerPhone = cleanText(body.customerPhone, 40);
  const clientRequestId = cleanText(body.clientRequestId, 64);
  const cart = Array.isArray(body.cart)
    ? body.cart.map((line) => ({
        product_id: cleanText((line as Record<string, unknown>)?.productId, 64),
        quantity: Number((line as Record<string, unknown>)?.quantity),
      }))
    : [];

  if (customerName.length < 2 || !user.email || !isValidUuid(clientRequestId)) {
    throw new Error("Please provide your name and a valid signed-in checkout session.");
  }

  const { data, error } = await admin.rpc("create_store_eft_payment_request", {
    p_payer_user_id: user.id,
    p_payer_email: user.email,
    p_customer_name: customerName,
    p_customer_phone: customerPhone || null,
    p_items: cart,
    p_client_request_id: clientRequestId,
  });

  if (error || !data) throw new Error(error?.message || "Your EFT order could not be created.");
  const payment = Array.isArray(data) ? data[0] : data;
  const settings = await getSettings(admin);
  return json(request, {
    payment: publicPayment(payment as PaymentRequest),
    instructions: paymentInstructions(payment as PaymentRequest, settings),
    order: await describeStoreOrder(admin, payment as PaymentRequest),
  });
}

async function startSubscriptionPayment(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
  body: Record<string, unknown>,
  purpose: "growth_subscription" | "nexdocs_subscription",
) {
  const planCode = purpose === "nexdocs_subscription" ? "nexdocs" : cleanText(body.planCode, 50);
  const clientRequestId = cleanText(body.clientRequestId, 64);
  const organisationId = await resolveSubscriptionOrganisation(
    admin,
    user,
    cleanText(body.organisationId, 64),
    purpose,
  );

  if (!user.email || !isValidUuid(clientRequestId)) {
    throw new Error("A signed-in billing session is required.");
  }

  const { data, error } = await admin.rpc("create_subscription_eft_payment_request", {
    p_payer_user_id: user.id,
    p_payer_email: user.email,
    p_organisation_id: organisationId,
    p_plan_code: planCode,
    p_purpose: purpose,
    p_client_request_id: clientRequestId,
  });

  if (error || !data) throw new Error(error?.message || "Your subscription payment request could not be created.");
  const payment = (Array.isArray(data) ? data[0] : data) as PaymentRequest;
  const settings = await getSettings(admin);

  return json(request, {
    payment: publicPayment(payment),
    instructions: paymentInstructions(payment, settings),
    subscription: { planCode: payment.plan_code, organisationId: payment.organisation_id },
  });
}

async function getMyPayment(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
  body: Record<string, unknown>,
) {
  const original = await loadOwnedPayment(admin, cleanText(body.paymentId, 64), user.id);
  const payment = await ensureActivePayment(admin, original);
  const settings = await getSettings(admin);

  return json(request, {
    payment: publicPayment(payment),
    instructions: paymentInstructions(payment, settings),
    order: await describeStoreOrder(admin, payment),
  });
}

async function listMyPayments(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
) {
  const { data, error } = await admin
    .from("eft_payment_requests")
    .select("*")
    .eq("payer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error("Your EFT payments could not be loaded.");
  const settings = await getSettings(admin);
  const payments = await Promise.all(
    ((data ?? []) as PaymentRequest[]).map(async (original) => {
      const payment = await ensureActivePayment(admin, original);
      return {
        payment: publicPayment(payment),
        instructions: paymentInstructions(payment, settings),
        order: await describeStoreOrder(admin, payment),
      };
    }),
  );

  return json(request, { payments });
}

async function subscriptionOptions(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
  body: Record<string, unknown>,
) {
  const purpose = cleanText(body.purpose, 64);
  if (purpose !== "growth_subscription" && purpose !== "nexdocs_subscription") {
    throw new Error("Unsupported subscription type.");
  }

  const [membershipsResult, plansResult] = await Promise.all([
    admin
      .from("organisation_members")
      .select("organisation_id,role,organisations(legal_name,trading_name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .order("created_at", { ascending: true }),
    admin
      .from("saas_plans")
      .select("code,name,monthly_price_zar")
      .eq("is_active", true)
      .in("code", purpose === "growth_subscription" ? ["starter", "professional", "business"] : ["nexdocs"])
      .order("sort_order", { ascending: true }),
  ]);

  if (membershipsResult.error || plansResult.error) {
    throw new Error("Subscription options could not be loaded.");
  }

  const organisations = (membershipsResult.data ?? []).map((membership: Record<string, unknown>) => {
    const organisation = membership.organisations as { legal_name?: string; trading_name?: string } | null;
    return {
      id: membership.organisation_id,
      name: organisation?.trading_name || organisation?.legal_name || "Organisation",
      role: membership.role,
    };
  });

  return json(request, {
    organisations,
    plans: plansResult.data ?? [],
    willCreateNexDocsBillingProfile: purpose === "nexdocs_subscription" && organisations.length === 0,
  });
}

async function submitProof(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
) {
  const form = await request.formData();
  const paymentId = cleanText(form.get("paymentId"), 64);
  const proof = form.get("proof");
  const payerNote = cleanText(form.get("payerNote"), 1000);

  if (!(proof instanceof File)) throw new Error("Attach a PDF, JPG or PNG proof of payment.");
  if (proof.size <= 0 || proof.size > MAX_PROOF_BYTES) {
    throw new Error("Proof of payment must be between 1 byte and 10 MB.");
  }
  if (!["application/pdf", "image/jpeg", "image/png"].includes(proof.type)) {
    throw new Error("Proof of payment must be a PDF, JPG or PNG file.");
  }

  const existing = await loadOwnedPayment(admin, paymentId, user.id);
  const payment = await ensureActivePayment(admin, existing);
  if (!(["awaiting_payment", "rejected"] as PaymentStatus[]).includes(payment.status)) {
    throw new Error("Proof can only be uploaded for a payment awaiting review.");
  }

  const bytes = new Uint8Array(await proof.arrayBuffer());
  if (!isRecognizedProof(proof.type, bytes)) {
    throw new Error("The uploaded file does not match its stated PDF, JPG or PNG format.");
  }

  const objectPath = `${user.id}/${payment.id}/${crypto.randomUUID()}-${sanitizeFileName(proof.name)}`;
  const { error: uploadError } = await admin.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(objectPath, bytes, { contentType: proof.type, upsert: false });

  if (uploadError) throw new Error("Proof of payment could not be stored securely. Please try again.");

  const { data: updated, error: updateError } = await admin
    .from("eft_payment_requests")
    .update({
      status: "proof_submitted",
      proof_storage_path: objectPath,
      proof_file_name: sanitizeFileName(proof.name),
      proof_content_type: proof.type,
      proof_file_size: proof.size,
      payer_note: payerNote || null,
      submitted_at: new Date().toISOString(),
      reviewer_note: null,
      reviewed_at: null,
      reviewed_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("payer_user_id", user.id)
    .in("status", ["awaiting_payment", "rejected"])
    .select("*")
    .maybeSingle();

  if (updateError || !updated) {
    await admin.storage.from(PAYMENT_PROOFS_BUCKET).remove([objectPath]);
    throw new Error("Proof of payment could not be submitted for review. Please try again.");
  }

  return json(request, {
    payment: publicPayment(updated as PaymentRequest),
    message: "Proof of payment received. Cossa will review it before fulfilment or access is activated.",
  });
}

async function reviewQueue(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
) {
  await requireCossaReviewer(admin, user.id);
  const { data, error } = await admin
    .from("eft_payment_requests")
    .select("*")
    .eq("status", "proof_submitted")
    .order("submitted_at", { ascending: true })
    .limit(100);

  if (error) throw new Error("The payment review queue could not be loaded.");

  const payments = await Promise.all(
    ((data ?? []) as PaymentRequest[]).map(async (payment) => {
      let proofUrl: string | null = null;
      if (payment.proof_storage_path) {
        const { data: signed } = await admin.storage
          .from(PAYMENT_PROOFS_BUCKET)
          .createSignedUrl(payment.proof_storage_path, 300);
        proofUrl = signed?.signedUrl ?? null;
      }

      return {
        ...publicPayment(payment),
        payerEmail: payment.payer_email,
        payerNote: payment.payer_note,
        proofFileName: payment.proof_file_name,
        proofContentType: payment.proof_content_type,
        proofUrl,
        order: await describeStoreOrder(admin, payment),
      };
    }),
  );

  return json(request, { payments });
}

async function reviewPayment(
  request: Request,
  admin: ReturnType<typeof createClient>,
  user: User,
  body: Record<string, unknown>,
  action: "approve" | "reject",
) {
  await requireCossaReviewer(admin, user.id);
  const paymentId = cleanText(body.paymentId, 64);
  const reviewerNote = cleanText(body.reviewerNote, 2000);
  if (!isValidUuid(paymentId)) throw new Error("The payment reference is invalid.");

  const { data, error } = await admin.rpc(
    action === "approve" ? "approve_eft_payment_request" : "reject_eft_payment_request",
    action === "approve"
      ? {
          p_payment_request_id: paymentId,
          p_reviewer_id: user.id,
          p_reviewer_note: reviewerNote || null,
        }
      : {
          p_payment_request_id: paymentId,
          p_reviewer_id: user.id,
          p_reviewer_note: reviewerNote || "Please upload a clear, valid proof of payment for review.",
        },
  );

  if (error || !data) throw new Error(error?.message || "The payment review could not be saved.");
  const payment = (Array.isArray(data) ? data[0] : data) as PaymentRequest;

  return json(request, {
    payment: publicPayment(payment),
    message:
      action === "approve"
        ? "Payment approved. The order or subscription is now active."
        : "Payment rejected. The customer can upload a replacement proof of payment.",
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin");
    return origin && !ALLOWED_ORIGINS.has(origin)
      ? json(request, { error: "Origin not allowed." }, 403)
      : new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "Origin not allowed." }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(request, { error: "The payment service is not configured." }, 503);
  }

  const customerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const user = await requireUser(request, customerClient);
    const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");

    if (isMultipart) {
      return await submitProof(request, admin, user);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanText(body.action, 64);

    switch (action) {
      case "start_store_payment":
        return await startStorePayment(request, admin, user, body);
      case "start_growth_subscription":
        return await startSubscriptionPayment(request, admin, user, body, "growth_subscription");
      case "start_nexdocs_subscription":
        return await startSubscriptionPayment(request, admin, user, body, "nexdocs_subscription");
      case "get_my_payment":
        return await getMyPayment(request, admin, user, body);
      case "list_my_payments":
        return await listMyPayments(request, admin, user);
      case "subscription_options":
        return await subscriptionOptions(request, admin, user, body);
      case "review_queue":
        return await reviewQueue(request, admin, user);
      case "approve_payment":
        return await reviewPayment(request, admin, user, body, "approve");
      case "reject_payment":
        return await reviewPayment(request, admin, user, body, "reject");
      default:
        return json(request, { error: "Unsupported payment action." }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "The payment request could not be completed.";
    return json(request, { error: message }, 400);
  }
});
