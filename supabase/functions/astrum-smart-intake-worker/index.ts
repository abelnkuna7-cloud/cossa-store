import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  classifyProduct,
  compactText,
  evaluateCommercialPosition,
  extractOfficialProductGallery,
  modelToken,
  slugToken,
  type MarketEvidence,
} from "../_shared/smart-intake-intelligence.ts";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ASTRUM_SUPPLIER_ID = "3b625ee7-25d4-4604-afd5-2a0909ac04b6";
const ACTOR_ID = "fe80a00e-ec49-497f-b28b-c5b984c964b6";
const IMAGE_BUCKET = "store-product-images";
const SAFE_REFS = new Set([
  "AHDEGOB", "ASB100NB", "A70012-B", "ABT310DTRB", "A90577-B", "ATWDP10B",
  "A63011-Q", "AKBX50FB", "A72045-B", "AENP4310B", "APB100P", "ASW130RB",
  "ASW200TB", "ACHW45LBE", "ACHW65GBE", "AMFWL510B",
]);
const HOLD_REFS = new Set(["ASPKSM510B", "APB20PB", "ALCP156B", "ALCP172B", "A32305-A", "A14521-B"]);

type Intake = {
  id: string;
  name: string;
  supplier_product_ref: string;
  supplier_category: string | null;
  approval_status: string;
  publication_store_product_id: string | null;
  supplier_available_stock: number | string | null;
  selling_price_override: number | string | null;
  fulfilment_profile_id: string | null;
  import_trace: unknown;
};

type ProductRow = {
  id: string;
  name: string;
  supplier_product_ref: string | null;
  brand: string | null;
  status: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return compactText(decode(value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")));
}

function meta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]).trim();
  }
  return "";
}

function extractSection(html: string, id: string) {
  const re = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i");
  return stripHtml(html.match(re)?.[1] ?? "");
}

function extractListItems(html: string) {
  const out: string[] = [];
  for (const match of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = stripHtml(match[1]);
    if (text.length >= 8 && text.length <= 180 && !/login|cart|menu|contact|privacy|cookie/i.test(text)) out.push(text);
    if (out.length >= 18) break;
  }
  return [...new Set(out)];
}

function physicalEvidence(text: string) {
  const dimension = text.match(/dimensions?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)/i);
  const weight = text.match(/(?:product\s*)?weight\s*[:\-]?\s*(?:approx\.?\s*)?(\d+(?:\.\d+)?)\s*(g|kg)/i);
  let dims: { length: number; width: number; height: number } | null = null;
  if (dimension) {
    const factor = dimension[4].toLowerCase() === "mm" ? 0.1 : 1;
    dims = { length: Number(dimension[1]) * factor, width: Number(dimension[2]) * factor, height: Number(dimension[3]) * factor };
  }
  let kg: number | null = null;
  if (weight) kg = Number(weight[1]) * (weight[2].toLowerCase() === "g" ? 0.001 : 1);
  return { dims, kg };
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CossaStore-SmartIntake/2.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Astrum page request failed (${response.status}).`);
  return await response.text();
}

async function resolveProductPage(intake: Intake) {
  const terms = [modelToken(intake.name), intake.supplier_product_ref].filter(Boolean);
  for (const term of terms) {
    const searchUrl = `https://astrum.co.za/?s=${encodeURIComponent(term)}`;
    const searchHtml = await fetchHtml(searchUrl);
    const candidates = [...searchHtml.matchAll(/href=["'](https:\/\/astrum\.co\.za\/product\/[^"'#?]+\/?)["']/gi)]
      .map((m) => m[1]);
    for (const candidate of [...new Set(candidates)].slice(0, 10)) {
      try {
        const html = await fetchHtml(candidate);
        if (html.toLowerCase().includes(intake.supplier_product_ref.toLowerCase())) return { url: candidate, html };
      } catch {
        // continue to the next exact supplier-page candidate
      }
    }
  }
  throw new Error("Official Astrum product page could not be resolved and verified against the supplier SKU.");
}

async function copyImage(admin: any, intakeId: string, sourceUrl: string) {
  const response = await fetch(sourceUrl, { headers: { "User-Agent": "CossaStore-SmartIntake/2.0" } });
  if (!response.ok) throw new Error(`Official product image request failed (${response.status}).`);
  const type = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
  if (!type.startsWith("image/") || /svg|gif/.test(type)) throw new Error(`Unsupported official image type: ${type || "unknown"}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error("Official product image is empty or larger than 12 MB.");
  const extension = type.includes("webp") ? "webp" : type.includes("png") ? "png" : "jpg";
  const hash = await sha256Hex(bytes);
  const path = `published/${intakeId}/${hash}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from(IMAGE_BUCKET)
    .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
  const { data } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function copyGallery(admin: any, intakeId: string, sourceUrls: string[]) {
  const hosted: string[] = [];
  for (const sourceUrl of sourceUrls.slice(0, 8)) {
    try {
      const url = await copyImage(admin, intakeId, sourceUrl);
      if (!hosted.includes(url)) hosted.push(url);
    } catch {
      // one broken gallery asset must not poison the entire verified product
    }
  }
  if (!hosted.length) throw new Error("No verified official product image could be copied into Cossa Store custody.");
  return hosted;
}

async function requireAutomationToken(admin: any, request: Request) {
  const token = request.headers.get("x-cossa-automation-token")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Automation authorization is required.");
  const hashBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const hash = Array.from(hashBytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const { data, error } = await admin
    .from("supplier_automation_tokens")
    .select("id")
    .eq("provider", "Astrum Smart Intake")
    .eq("token_hash", hash)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) throw new Error("Automation authorization failed.");
}

async function findDuplicate(admin: any, intake: Intake) {
  const { data: exactRows, error: exactError } = await admin
    .from("store_products")
    .select("id,name,supplier_product_ref,brand,status")
    .eq("supplier_product_ref", intake.supplier_product_ref)
    .limit(5);
  if (exactError) throw exactError;
  const exact = (exactRows ?? []) as ProductRow[];
  const foreignExact = exact.find((row) => row.id !== intake.publication_store_product_id);
  if (foreignExact) return { duplicate: true, reason: `Supplier SKU ${intake.supplier_product_ref} already belongs to Store product ${foreignExact.id}.`, productId: foreignExact.id };

  const model = modelToken(intake.name);
  if (!model) return { duplicate: false };
  const { data: modelRows, error: modelError } = await admin
    .from("store_products")
    .select("id,name,supplier_product_ref,brand,status")
    .ilike("brand", "Astrum")
    .ilike("name", `%${model}%`)
    .limit(12);
  if (modelError) throw modelError;
  const possible = ((modelRows ?? []) as ProductRow[]).filter((row) => row.id !== intake.publication_store_product_id);
  const collision = possible.find((row) => modelToken(row.name) === model && row.supplier_product_ref !== intake.supplier_product_ref);
  if (collision) return { duplicate: true, reason: `Astrum model ${model} is already represented by Store product ${collision.id}; manual identity review is required.`, productId: collision.id };
  return { duplicate: false };
}

function marketEvidenceFor(body: Record<string, unknown>, ref: string): MarketEvidence[] {
  const map = body.marketEvidence;
  if (!map || typeof map !== "object" || Array.isArray(map)) return [];
  const rows = (map as Record<string, unknown>)[ref];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
    .filter(Boolean)
    .map((item) => ({
      retailer: String(item!.retailer ?? "competitor"),
      price: Number(item!.price),
      url: item!.url ? String(item!.url) : undefined,
      observedAt: item!.observedAt ? String(item!.observedAt) : undefined,
      exactMatch: item!.exactMatch !== false,
    }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0);
}

async function upsertDeliveryEvidence(admin: any, productId: string, ref: string, pageUrl: string, physical: ReturnType<typeof physicalEvidence>) {
  const weightState = physical.kg ? "MANUFACTURER_VERIFIED" : "MISSING";
  const dimensionState = physical.dims ? "MANUFACTURER_VERIFIED" : "MISSING";
  const readiness = physical.kg && physical.dims
    ? "PARCEL_READY_DESTINATION_PENDING"
    : physical.kg
      ? "MISSING_DIMENSIONS"
      : physical.dims
        ? "MISSING_WEIGHT"
        : "MISSING_BOTH";
  const deliveryRow: Record<string, unknown> = {
    store_product_id: productId,
    dimension_evidence_state: dimensionState,
    weight_evidence_state: weightState,
    readiness_status: readiness,
    operational_notes: physical.kg || physical.dims
      ? "Manufacturer evidence captured from official Astrum product page. No packed-parcel measurement was invented."
      : "No manufacturer weight/dimension values were published on the official page; checkout safety rules remain authoritative.",
    enrichment_agent: "astrum-smart-intake-v2",
    enrichment_result: {
      source_url: pageUrl,
      supplier_product_ref: ref,
      evidence_basis: physical.kg || physical.dims ? "manufacturer_verified" : "missing",
    },
  };
  if (physical.dims) Object.assign(deliveryRow, {
    length_cm: physical.dims.length,
    width_cm: physical.dims.width,
    height_cm: physical.dims.height,
    dimension_kind: "product",
    dimensions_source_url: pageUrl,
    dimensions_source_evidence: `Official Astrum page dimensions for ${ref}.`,
    dimensions_verified_at: new Date().toISOString(),
  });
  if (physical.kg) Object.assign(deliveryRow, {
    weight_kg: physical.kg,
    weight_source_url: pageUrl,
    weight_source_evidence: `Official Astrum page weight for ${ref}.`,
    weight_verified_at: new Date().toISOString(),
  });
  const { error } = await admin.from("store_product_delivery_attributes").upsert(deliveryRow, { onConflict: "store_product_id" });
  if (error) throw error;
  return readiness;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Smart Intake worker is not configured." }, 503);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    await requireAutomationToken(admin, request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const refs = Array.isArray(body.refs)
      ? body.refs.map(String).filter((ref) => SAFE_REFS.has(ref) && !HOLD_REFS.has(ref))
      : [...SAFE_REFS];
    const dryRun = body.dryRun === true;
    const enrichPublished = body.enrichPublished === true;
    const requireMarketEvidence = body.requireMarketEvidence !== false;
    const maxItems = Math.max(1, Math.min(25, Number(body.maxItems) || refs.length));

    const { data: rows, error: rowsError } = await admin
      .from("store_inventory_intakes")
      .select("id,name,supplier_product_ref,supplier_category,approval_status,publication_store_product_id,supplier_available_stock,selling_price_override,fulfilment_profile_id,import_trace")
      .eq("organisation_id", ORG_ID)
      .eq("supplier_id", ASTRUM_SUPPLIER_ID)
      .in("supplier_product_ref", refs)
      .order("supplier_product_ref");
    if (rowsError) throw rowsError;

    const results: unknown[] = [];
    for (const raw of (rows ?? []).slice(0, maxItems) as Intake[]) {
      const ref = raw.supplier_product_ref;
      try {
        if (!SAFE_REFS.has(ref) || HOLD_REFS.has(ref)) throw new Error("SKU is not in the approved Astrum safe-loading set.");
        const alreadyPublished = Boolean(raw.publication_store_product_id || raw.approval_status === "published");
        if (alreadyPublished && !enrichPublished) {
          results.push({ ref, status: "already_published", productId: raw.publication_store_product_id });
          continue;
        }
        if (!alreadyPublished && raw.approval_status !== "approved") throw new Error("Only CEO-approved Astrum intakes may be published by this worker.");
        if (!(Number(raw.supplier_available_stock) > 0)) throw new Error("Supplier stock is not currently available.");
        if (!(Number(raw.selling_price_override) > 0)) throw new Error("CEO-approved selling price is missing.");
        if (!raw.fulfilment_profile_id) throw new Error("Astrum fulfilment profile is missing.");

        const duplicate = await findDuplicate(admin, raw);
        if (duplicate.duplicate) throw new Error(duplicate.reason);

        const marketEvidence = marketEvidenceFor(body, ref);
        const commercial = evaluateCommercialPosition(Number(raw.selling_price_override), marketEvidence);
        if (!alreadyPublished && requireMarketEvidence && commercial.status === "missing") {
          throw new Error("Fresh exact-match competitor evidence is required before publication.");
        }
        if (!alreadyPublished && commercial.status === "blocked") throw new Error(commercial.reason);
        if (!alreadyPublished && commercial.status === "review") throw new Error(`${commercial.reason} CEO price review is required before publication.`);

        const page = await resolveProductPage(raw);
        const title = compactText(meta(page.html, "og:title").replace(/\s*[–|-]\s*Experience the difference\s*$/i, "")) || compactText(raw.name);
        const short = compactText(meta(page.html, "og:description")) || `Official Astrum ${title}.`;
        const tabDescription = extractSection(page.html, "tab-description");
        const description = tabDescription.length >= 120 ? tabDescription.slice(0, 3500) : short;
        const ogImage = meta(page.html, "og:image");
        const officialGallery = extractOfficialProductGallery(page.html, title, ref, ogImage);
        if (!officialGallery.length) throw new Error("Verified Astrum product gallery could not be resolved; generic artwork is not allowed.");
        const features = extractListItems(page.html).filter((item) => !/^SKU:/i.test(item)).slice(0, 12);
        const evidenceText = stripHtml(page.html);
        const physical = physicalEvidence(evidenceText);
        const taxonomy = classifyProduct(raw.supplier_category, title);
        const model = modelToken(title) || modelToken(raw.name);
        const tags = [...new Set([
          "astrum",
          slugToken(model),
          slugToken(raw.supplier_category ?? "technology"),
          ...taxonomy.tags,
          ...taxonomy.subdepartments,
          ...title.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4).slice(0, 8),
          "south-africa",
        ].filter(Boolean))].slice(0, 20);
        const specParts: string[] = [];
        if (physical.dims) specParts.push(`Dimensions: ${physical.dims.length.toFixed(1)} x ${physical.dims.width.toFixed(1)} x ${physical.dims.height.toFixed(1)} cm (L x W x H)`);
        if (physical.kg) specParts.push(`Weight: ${physical.kg < 1 ? Math.round(physical.kg * 1000) + " g" : physical.kg.toFixed(2) + " kg"}`);
        const specifications = specParts.join("\n") || `Supplier reference: ${ref}\nSupplier category: ${raw.supplier_category ?? "Astrum product"}`;

        if (dryRun) {
          results.push({
            ref,
            status: alreadyPublished ? "dry_run_enrichment_ready" : "dry_run_ready",
            title,
            sourceUrl: page.url,
            galleryCount: officialGallery.length,
            department: taxonomy.department,
            subdepartments: taxonomy.subdepartments,
            features: features.length,
            physical,
            commercial,
          });
          continue;
        }

        const hostedGallery = await copyGallery(admin, raw.id, officialGallery);
        const trace = Array.isArray(raw.import_trace) ? raw.import_trace : [];
        const now = new Date().toISOString();
        const intelligenceTrace = [
          { field: "brand", sourceLabel: "manufacturer official Astrum product page", sourceUrl: page.url, observedAt: now },
          { field: "taxonomy", sourceLabel: "Cossa Smart Intake taxonomy classifier", department: taxonomy.department, subdepartments: taxonomy.subdepartments, observedAt: now },
          { field: "gallery", sourceLabel: "manufacturer official Astrum product page", sourceUrl: page.url, officialImageCount: officialGallery.length, hostedImageCount: hostedGallery.length, observedAt: now },
          { field: "commercial", sourceLabel: "Cossa market evidence gate", decision: commercial, evidence: marketEvidence, observedAt: now },
        ];
        const { error: updateError } = await admin.from("store_inventory_intakes").update({
          name: title,
          short_description: short.slice(0, 500),
          description,
          specifications,
          category: taxonomy.department,
          brand: "Astrum",
          image_urls: officialGallery,
          source_url: page.url,
          features,
          additional_categories: taxonomy.subdepartments,
          merchandising_tags: tags,
          import_trace: [...trace, ...intelligenceTrace],
          operational_notes: `Smart Intake 2.0: exact supplier identity, duplicate guard, official gallery, Cossa taxonomy and commercial gate evaluated for ${ref}.`,
        }).eq("id", raw.id);
        if (updateError) throw updateError;

        if (alreadyPublished) {
          const productId = raw.publication_store_product_id!;
          const { error: productUpdateError } = await admin.from("store_products").update({
            name: title,
            short_description: short.slice(0, 500),
            description,
            category: taxonomy.department,
            additional_categories: taxonomy.subdepartments,
            merchandising_tags: tags,
            brand: "Astrum",
            image_urls: hostedGallery,
            customer_features: features,
            customer_specifications: specifications,
            seo_title: `${title} | Cossa Store`.slice(0, 70),
            seo_description: short.slice(0, 160),
          }).eq("id", productId).eq("supplier_product_ref", ref);
          if (productUpdateError) throw productUpdateError;
          const readiness = await upsertDeliveryEvidence(admin, productId, ref, page.url, physical);
          results.push({
            ref,
            status: "published_product_enriched",
            productId,
            hostedImages: hostedGallery.length,
            department: taxonomy.department,
            subdepartments: taxonomy.subdepartments,
            commercial,
            physicalReadiness: readiness,
          });
          continue;
        }

        const { data: publishData, error: publishError } = await admin.rpc("publish_store_inventory_intake_with_images", {
          p_intake_id: raw.id,
          p_actor_id: ACTOR_ID,
          p_customer_image_urls: hostedGallery,
        });
        if (publishError) throw publishError;
        const published = Array.isArray(publishData) ? publishData[0] : publishData;
        const productId = published?.store_product_id as string | undefined;
        if (!productId) throw new Error("Publication did not return a Store product ID.");
        const readiness = await upsertDeliveryEvidence(admin, productId, ref, page.url, physical);
        results.push({
          ref,
          status: "published",
          productId,
          slug: published?.public_slug,
          price: Number(raw.selling_price_override),
          sourceUrl: page.url,
          hostedImages: hostedGallery.length,
          department: taxonomy.department,
          subdepartments: taxonomy.subdepartments,
          commercial,
          physicalReadiness: readiness,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Smart Intake failure.";
        results.push({ ref, status: "held", reason: message });
      }
    }

    return json({ ok: true, dryRun, enrichPublished, requireMarketEvidence, processed: results.length, results, finishedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Astrum Smart Intake failed.";
    console.error(`[astrum-smart-intake-worker] ${message}`);
    return json({ error: message }, 400);
  }
});
