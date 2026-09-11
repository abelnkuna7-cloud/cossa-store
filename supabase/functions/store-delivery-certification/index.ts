import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ASTRUM_SUPPLIER_ID = "3b625ee7-25d4-4604-afd5-2a0909ac04b6";
const ASTRUM_BRANCHES = [
  { code: "midrand", address1: "Unit 4, Richards Park, 35 Richards Drive", suburb: "Midrand", city: "Midrand", region: "Gauteng", zip: "1685" },
  { code: "durban", address1: "Unit 4, Origin Park, 14 Riverhorse Close", suburb: "Riverhorse Valley", city: "Durban", region: "KwaZulu-Natal", zip: "4037" },
  { code: "cape_town", address1: "Unit 4, Creation Park, Computer Road", suburb: "Marconi Beam", city: "Cape Town", region: "Western Cape", zip: "7447" },
] as const;
const MAIN_CENTRES = new Set([
  "durban", "johannesburg", "cape town", "bloemfontein", "east london", "port elizabeth",
  "nelspruit", "polokwane", "kimberley", "newcastle", "pietermaritzburg", "george",
]);
const PROVINCES = new Set([
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga",
  "Northern Cape", "North West", "Western Cape",
]);

type Point = { latitude: number; longitude: number };
type Address = { address1: string; address2: string; suburb: string; city: string; region: string; zip: string; country: "ZA" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function text(value: unknown, max = 200) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function uuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function normalise(value: string) { return value.trim().toLowerCase().replace(/\s+/g, " "); }
function finite(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }

function readAddress(value: unknown): Address | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const address1 = text(raw.address1, 180);
  const address2 = text(raw.address2, 180);
  const suburb = text(raw.suburb, 100);
  const city = text(raw.city, 100);
  const region = text(raw.region, 100);
  const zip = text(raw.zip, 20);
  const country = text(raw.country, 2).toUpperCase();
  if (address1.length < 4 || suburb.length < 2 || city.length < 2 || !PROVINCES.has(region) || !/^\d{4}$/.test(zip) || country !== "ZA") return null;
  return { address1, address2, suburb, city, region, zip, country: "ZA" };
}

async function requireAdmin(admin: any, userId: string) {
  const [membership, role] = await Promise.all([
    admin.from("organisation_members").select("role").eq("organisation_id", ORG_ID).eq("user_id", userId).eq("status", "active").in("role", ["owner", "admin"]),
    admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
  ]);
  if (membership.error || role.error || (!(membership.data ?? []).length && !(role.data ?? []).length)) throw new Error("Cossa Store administrator access is required.");
}

async function geocode(apiKey: string, address: Omit<Address, "country">): Promise<Point> {
  const q = [address.address1, address.address2, address.suburb, address.city, address.region, address.zip, "South Africa"].filter(Boolean).join(", ");
  const url = new URL("https://api.heigit.org/pelias/v1/search");
  url.searchParams.set("text", q);
  url.searchParams.set("boundary.country", "ZAF");
  url.searchParams.set("size", "1");
  const response = await fetch(url, { headers: { Authorization: apiKey, Accept: "application/json" } });
  if (!response.ok) throw new Error(`Address geocoding failed (${response.status}).`);
  const body = await response.json() as { features?: Array<{ geometry?: { coordinates?: [number, number] } }> };
  const coordinates = body.features?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length !== 2) throw new Error("Address could not be geocoded precisely enough.");
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Geocoder returned invalid coordinates.");
  return { latitude, longitude };
}

async function drivingDistanceKm(apiKey: string, from: Point, to: Point) {
  const response = await fetch("https://api.heigit.org/openrouteservice/v2/matrix/driving-car", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ locations: [[from.longitude, from.latitude], [to.longitude, to.latitude]], sources: [0], destinations: [1], metrics: ["distance"], units: "km" }),
  });
  if (!response.ok) throw new Error(`Driving-distance calculation failed (${response.status}).`);
  const body = await response.json() as { distances?: number[][] };
  const value = body.distances?.[0]?.[0];
  if (!Number.isFinite(value) || Number(value) < 0) throw new Error("Routing service returned an invalid distance.");
  return Number(value);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const routingKey = Deno.env.get("OPENROUTESERVICE_API_KEY")?.trim();
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !routingKey) return json({ error: "Delivery certification is not configured." }, 503);

  const auth = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("Sign in is required.");
    const { data: userData, error: userError } = await auth.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Session could not be verified.");
    await requireAdmin(admin, userData.user.id);

    const body = await request.json() as Record<string, unknown>;
    const intakeId = text(body.intakeId, 64);
    const supplierProductRef = text(body.supplierProductRef, 120);
    const address = readAddress(body.shippingAddress);
    if (!address) throw new Error("Provide a complete South African certification address.");
    if (!uuid(intakeId) && !supplierProductRef) throw new Error("Provide an Astrum intake ID or supplier product reference.");

    let intakeQuery = admin.from("store_inventory_intakes").select("id,name,supplier_id,supplier_product_ref,approval_status,publication_store_product_id,fulfilment_profile_id,supplier_available_stock").eq("supplier_id", ASTRUM_SUPPLIER_ID);
    intakeQuery = uuid(intakeId) ? intakeQuery.eq("id", intakeId) : intakeQuery.eq("supplier_product_ref", supplierProductRef);
    const { data: intake, error: intakeError } = await intakeQuery.maybeSingle();
    if (intakeError || !intake) throw new Error("Approved Astrum intake was not found.");
    if (intake.approval_status !== "approved") throw new Error("Certification requires an approved, unpublished Astrum intake.");
    if (intake.publication_store_product_id) throw new Error("This certification action is reserved for unpublished Astrum intakes.");
    if (!intake.fulfilment_profile_id) throw new Error("Astrum fulfilment profile is missing.");
    if (!(Number(intake.supplier_available_stock) > 0)) throw new Error("Supplier stock is not currently sellable.");

    const [{ data: profile, error: profileError }, { data: rates, error: ratesError }] = await Promise.all([
      admin.from("store_fulfilment_profiles").select("id,supplier_id,delivery_payer,is_active").eq("id", intake.fulfilment_profile_id).maybeSingle(),
      admin.from("store_delivery_rate_configurations").select("id,method_code,customer_label,price,currency,is_active,customer_selectable,verified_at,source_url,source_evidence").eq("supplier_id", ASTRUM_SUPPLIER_ID).eq("fulfilment_profile_id", intake.fulfilment_profile_id),
    ]);
    if (profileError || !profile || profile.supplier_id !== ASTRUM_SUPPLIER_ID || profile.is_active !== true || profile.delivery_payer !== "customer") throw new Error("Astrum fulfilment profile is not safely active for customer-paid delivery.");
    if (ratesError || !rates) throw new Error("Astrum delivery rates could not be loaded.");

    const customerPoint = await geocode(routingKey, address);
    const evaluated = await Promise.all(ASTRUM_BRANCHES.map(async (branch) => {
      const branchPoint = await geocode(routingKey, { ...branch, address2: "" });
      return { code: branch.code, distanceKm: await drivingDistanceKm(routingKey, branchPoint, customerPoint) };
    }));
    evaluated.sort((a, b) => a.distanceKm - b.distanceKm);
    const nearest = evaluated[0];
    if (!nearest) throw new Error("No Astrum branch distance could be resolved.");

    const destinationClass = nearest.distanceKm <= 30 ? "local" : MAIN_CENTRES.has(normalise(address.city)) ? "main_centre" : "rest_sa";
    const methodCode = destinationClass === "local" ? "astrum_local" : destinationClass === "main_centre" ? "astrum_main_centre" : "astrum_rest_sa";
    const matching = (rates as Array<Record<string, unknown>>).filter((rate) => rate.method_code === methodCode && rate.is_active === true && rate.customer_selectable === true && rate.currency === "ZAR" && Number(rate.price) > 0 && typeof rate.source_url === "string" && rate.source_url && typeof rate.source_evidence === "string" && rate.source_evidence);
    if (matching.length !== 1) throw new Error("Exactly one verified Astrum rate must match the resolved destination.");

    const syntheticWeightKg = finite(body.syntheticWeightKg);
    const synthetic = syntheticWeightKg !== null;
    const weightDecision = synthetic
      ? syntheticWeightKg! > 15 ? "manual_quote_required" : "synthetic_under_15kg"
      : "real_weight_not_checked_by_address_only_certification";

    const rate = matching[0];
    return json({
      ok: true,
      certificationMode: synthetic ? "synthetic_weight_plus_live_routing" : "live_routing_only",
      createsOrder: false,
      createsPaymentRequest: false,
      publishesProduct: false,
      intake: { id: intake.id, name: intake.name, supplierProductRef: intake.supplier_product_ref, approvalStatus: intake.approval_status, supplierAvailableStock: Number(intake.supplier_available_stock) },
      destination: { class: destinationClass, nearestBranchCode: nearest.code, nearestBranchDistanceKm: Math.round(nearest.distanceKm * 100) / 100 },
      rate: { id: rate.id, methodCode: rate.method_code, customerLabel: rate.customer_label, amount: Number(rate.price), currency: rate.currency },
      weight: { synthetic, valueKg: syntheticWeightKg, decision: weightDecision },
      safety: { fullCheckoutCertificationPassed: false, reason: synthetic ? "Synthetic weight validates the exception logic only; actual intake weight evidence is still required before publication." : "Address/rate routing passed, but actual verified product weight is still required before publication." },
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery certification failed.";
    console.error(`[store-delivery-certification] ${message}`);
    return json({ error: message }, 400);
  }
});
