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
const KNOWN_PUBLISHED_REFS = new Set(["A11561-B", "A11562-B", "A51021-B"]);
const HOLD_REFS = new Set(["ASPKSM510B", "APB20PB", "ALCP156B", "ALCP172B", "A32305-A", "A14521-B"]);
const ALLOWED_REFS = new Set([...SAFE_REFS, ...KNOWN_PUBLISHED_REFS]);

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
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return compactText(decode(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")));
}

function meta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const pattern of [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ]) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]).trim();
  }
  return "";
}

function extractDescription(html: string) {
  const match = html.match(/<[^>]+id=["']tab-description["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
  return stripHtml(match?.[1] ?? "");
}

function extractFeatures(html: string) {
  const out: string[] = [];
  for (const match of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = stripHtml(match[1]);
    if (text.length >= 8 && text.length <= 180 && !/login|cart|menu|contact|privacy|cookie/i.test(text)) out.push(text);
    if (out.length >= 18) break;
  }
  return [...new Set(out)].filter((item) => !/^SKU:/i.test(item)).slice(0, 12);
}

function physicalEvidence(text: string) {
  const dimension = text.match(/dimensions?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)/i);
  const weight = text.match(/(?:product\s*)?weight\s*[:\-]?\s*(?:approx\.?\s*)?(\d+(?:\.\d+)?)\s*(g|kg)/i);
  const dims = dimension ? {
    length: Number(dimension[1]) * (dimension[4].toLowerCase() === "mm" ? 0.1 : 1),
    width: Number(dimension[2]) * (dimension[4].toLowerCase() === "mm" ? 0.1 : 1),
    height: Number(dimension[3]) * (dimension[4].toLowerCase() === "mm" ? 0.1 : 1),
  } : null;
  const kg = weight ? Number(weight[1]) * (weight[2].toLowerCase() === "g" ? 0.001 : 1) : null;
  return { dims, kg };
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function inferImageType(bytes: Uint8Array, sourceUrl: string, headerType: string) {
  const type = headerType.split(";")[0].toLowerCase();
  if (/^image\/(webp|png|jpe?g)$/.test(type)) return type === "image/jpg" ? "image/jpeg" : type;
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (/\.webp(?:\?|$)/i.test(sourceUrl)) return "image/webp";
  if (/\.png(?:\?|$)/i.test(sourceUrl)) return "image/png";
  if (/\.jpe?g(?:\?|$)/i.test(sourceUrl)) return "image/jpeg";
  return "";
}

async function fetchHtml(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "CossaStore-SmartIntake/2.0", Accept: "text/html,application/xhtml+xml", Referer: "https://astrum.co.za/" } });
  if (!response.ok) throw new Error(`Astrum page request failed (${response.status}).`);
  return await response.text();
}

async function resolveProductPage(intake: Intake) {
  const terms = [modelToken(intake.name), intake.supplier_product_ref].filter(Boolean);
  for (const term of terms) {
    const searchHtml = await fetchHtml(`https://astrum.co.za/?s=${encodeURIComponent(term)}`);
    const candidates = [...searchHtml.matchAll(/href=["'](https:\/\/astrum\.co\.za\/product\/[^"'#?]+\/?)["']/gi)].map((m) => m[1]);
    for (const candidate of [...new Set(candidates)].slice(0, 10)) {
      try {
        const html = await fetchHtml(candidate);
        if (html.toLowerCase().includes(intake.supplier_product_ref.toLowerCase())) return { url: candidate, html };
      } catch {}
    }
  }
  throw new Error("Official Astrum product page could not be resolved and verified against the supplier SKU.");
}

async function copyImage(admin: any, intakeId: string, sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "CossaStore-SmartIntake/2.0",
      Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.7",
      Referer: "https://astrum.co.za/",
    },
  });
  if (!response.ok) throw new Error(`Official product image request failed (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error("Official product image is empty or larger than 12 MB.");
  const type = inferImageType(bytes, sourceUrl, response.headers.get("content-type") ?? "");
  if (!type) throw new Error("Official product image type could not be safely determined.");
  const extension = type.includes("webp") ? "webp" : type.includes("png") ? "png" : "jpg";
  const hash = await sha256Hex(bytes);
  const path = `published/${intakeId}/${hash}.${extension}`;
  const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl as string;
}

async function copyGallery(admin: any, intakeId: string, sourceUrls: string[]) {
  const hosted: string[] = [];
  for (const sourceUrl of sourceUrls.slice(0, 8)) {
    try {
      const hostedUrl = await copyImage(admin, intakeId, sourceUrl);
      if (!hosted.includes(hostedUrl)) hosted.push(hostedUrl);
    } catch {}
  }
  if (!hosted.length) throw new Error("No verified official product image could be copied into Cossa Store custody.");
  return hosted;
}

async function requireAutomationToken(admin: any, request: Request) {
  const token = request.headers.get("x-cossa-automation-token")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Automation authorization is required.");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const hash = Array.from(digest).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const { data, error } = await admin.from("supplier_automation_tokens").select("id").eq("provider", "Astrum Smart Intake").eq("token_hash", hash).eq("active", true).maybeSingle();
  if (error || !data) throw new Error("Automation authorization failed.");
}

async function findDuplicate(admin: any, intake: Intake) {
  const { data: exactRows, error: exactError } = await admin.from("store_products").select("id,name,supplier_product_ref,brand").eq("supplier_product_ref", intake.supplier_product_ref).limit(5);
  if (exactError) throw exactError;
  const exact = (exactRows ?? []) as ProductRow[];
  const foreignExact = exact.find((row) => row.id !== intake.publication_store_product_id);
  if (foreignExact) return `Supplier SKU ${intake.supplier_product_ref} already belongs to Store product ${foreignExact.id}.`;
  const model = modelToken(intake.name);
  if (!model) return null;
  const { data: modelRows, error: modelError } = await admin.from("store_products").select("id,name,supplier_product_ref,brand").ilike("brand", "Astrum").ilike("name", `%${model}%`).limit(12);
  if (modelError) throw modelError;
  const collision = ((modelRows ?? []) as ProductRow[]).find((row) => row.id !== intake.publication_store_product_id && modelToken(row.name) === model && row.supplier_product_ref !== intake.supplier_product_ref);
  return collision ? `Astrum model ${model} is already represented by Store product ${collision.id}; manual identity review is required.` : null;
}

function marketEvidenceFor(body: Record<string, unknown>, ref: string): MarketEvidence[] {
  const source = body.marketEvidence;
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  const rows = (source as Record<string, unknown>)[ref];
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const price = Number(item.price);
    if (!Number.isFinite(price) || price <= 0) return [];
    return [{ retailer: String(item.retailer ?? "competitor"), price, url: item.url ? String(item.url) : undefined, observedAt: item.observedAt ? String(item.observedAt) : undefined, exactMatch: item.exactMatch !== false }];
  });
}

async function upsertDelivery(admin: any, productId: string, ref: string, pageUrl: string, physical: ReturnType<typeof physicalEvidence>) {
  const readiness = physical.kg && physical.dims ? "PARCEL_READY_DESTINATION_PENDING" : physical.kg ? "MISSING_DIMENSIONS" : physical.dims ? "MISSING_WEIGHT" : "MISSING_BOTH";
  const row: Record<string, unknown> = {
    store_product_id: productId,
    dimension_evidence_state: physical.dims ? "MANUFACTURER_VERIFIED" : "MISSING",
    weight_evidence_state: physical.kg ? "MANUFACTURER_VERIFIED" : "MISSING",
    readiness_status: readiness,
    enrichment_agent: "astrum-smart-intake-v2",
    enrichment_result: { source_url: pageUrl, supplier_product_ref: ref, evidence_basis: physical.kg || physical.dims ? "manufacturer_verified" : "missing" },
    operational_notes: physical.kg || physical.dims ? "Manufacturer evidence captured from official Astrum product page. No packed-parcel measurement was invented." : "No manufacturer weight/dimension values were published on the official page; checkout safety rules remain authoritative.",
  };
  if (physical.dims) Object.assign(row, { length_cm: physical.dims.length, width_cm: physical.dims.width, height_cm: physical.dims.height, dimension_kind: "product", dimensions_source_url: pageUrl, dimensions_source_evidence: `Official Astrum page dimensions for ${ref}.`, dimensions_verified_at: new Date().toISOString() });
  if (physical.kg) Object.assign(row, { weight_kg: physical.kg, weight_source_url: pageUrl, weight_source_evidence: `Official Astrum page weight for ${ref}.`, weight_verified_at: new Date().toISOString() });
  const { error } = await admin.from("store_product_delivery_attributes").upsert(row, { onConflict: "store_product_id" });
  if (error) throw error;
  return readiness;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Smart Intake worker is not configured." }, 503);
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    await requireAutomationToken(admin, request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const refs = Array.isArray(body.refs) ? body.refs.map(String).filter((ref) => ALLOWED_REFS.has(ref) && !HOLD_REFS.has(ref)) : [...ALLOWED_REFS];
    const dryRun = body.dryRun === true;
    const enrichPublished = body.enrichPublished === true;
    const requireMarketEvidence = body.requireMarketEvidence !== false;
    const maxItems = Math.max(1, Math.min(25, Number(body.maxItems) || refs.length));
    const { data: rows, error: rowsError } = await admin.from("store_inventory_intakes").select("id,name,supplier_product_ref,supplier_category,approval_status,publication_store_product_id,supplier_available_stock,selling_price_override,fulfilment_profile_id,import_trace").eq("organisation_id", ORG_ID).eq("supplier_id", ASTRUM_SUPPLIER_ID).in("supplier_product_ref", refs).order("supplier_product_ref");
    if (rowsError) throw rowsError;
    const results: unknown[] = [];
    for (const intake of (rows ?? []).slice(0, maxItems) as Intake[]) {
      const ref = intake.supplier_product_ref;
      try {
        const published = Boolean(intake.publication_store_product_id || intake.approval_status === "published");
        if (published && !enrichPublished) { results.push({ ref, status: "already_published", productId: intake.publication_store_product_id }); continue; }
        if (!published && KNOWN_PUBLISHED_REFS.has(ref)) throw new Error("Historically published SKU is no longer linked to its Store product; manual identity review is required before any republish.");
        if (!published && intake.approval_status !== "approved") throw new Error("Only CEO-approved Astrum intakes may be published by this worker.");
        if (!(Number(intake.supplier_available_stock) > 0)) throw new Error("Supplier stock is not currently available.");
        if (!(Number(intake.selling_price_override) > 0)) throw new Error("CEO-approved selling price is missing.");
        if (!intake.fulfilment_profile_id) throw new Error("Astrum fulfilment profile is missing.");
        const duplicate = await findDuplicate(admin, intake);
        if (duplicate) throw new Error(duplicate);
        const marketEvidence = marketEvidenceFor(body, ref);
        const commercial = evaluateCommercialPosition(Number(intake.selling_price_override), marketEvidence);
        if (!published && requireMarketEvidence && commercial.status === "missing") throw new Error("Fresh exact-match competitor evidence is required before publication.");
        if (!published && commercial.status === "blocked") throw new Error(commercial.reason);
        if (!published && commercial.status === "review") throw new Error(`${commercial.reason} CEO price review is required before publication.`);
        const page = await resolveProductPage(intake);
        const title = compactText(meta(page.html, "og:title").replace(/\s*[–|-]\s*Experience the difference\s*$/i, "")) || compactText(intake.name);
        const short = compactText(meta(page.html, "og:description")) || `Official Astrum ${title}.`;
        const full = extractDescription(page.html);
        const description = full.length >= 120 ? full.slice(0, 3500) : short;
        const gallery = extractOfficialProductGallery(page.html, title, ref, meta(page.html, "og:image"));
        if (!gallery.length) throw new Error("Verified Astrum product gallery could not be resolved; generic artwork is not allowed.");
        const features = extractFeatures(page.html);
        const physical = physicalEvidence(stripHtml(page.html));
        const taxonomy = classifyProduct(intake.supplier_category, title);
        const model = modelToken(title) || modelToken(intake.name);
        const tags = [...new Set(["astrum", slugToken(model), slugToken(intake.supplier_category ?? "technology"), ...taxonomy.tags, ...taxonomy.subdepartments, ...title.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4).slice(0, 8), "south-africa"].filter(Boolean))].slice(0, 20);
        const specs: string[] = [];
        if (physical.dims) specs.push(`Dimensions: ${physical.dims.length.toFixed(1)} x ${physical.dims.width.toFixed(1)} x ${physical.dims.height.toFixed(1)} cm (L x W x H)`);
        if (physical.kg) specs.push(`Weight: ${physical.kg < 1 ? Math.round(physical.kg * 1000) + " g" : physical.kg.toFixed(2) + " kg"}`);
        const specifications = specs.join("\n") || `Supplier reference: ${ref}\nSupplier category: ${intake.supplier_category ?? "Astrum product"}`;
        if (dryRun) { results.push({ ref, status: published ? "dry_run_enrichment_ready" : "dry_run_ready", title, sourceUrl: page.url, galleryCount: gallery.length, gallery, department: taxonomy.department, subdepartments: taxonomy.subdepartments, features: features.length, physical, commercial }); continue; }
        const hostedGallery = await copyGallery(admin, intake.id, gallery);
        const trace = Array.isArray(intake.import_trace) ? intake.import_trace : [];
        const now = new Date().toISOString();
        const { error: intakeUpdateError } = await admin.from("store_inventory_intakes").update({
          name: title, short_description: short.slice(0, 500), description, specifications,
          category: taxonomy.department, brand: "Astrum", image_urls: gallery, source_url: page.url,
          features, additional_categories: taxonomy.subdepartments, merchandising_tags: tags,
          import_trace: [...trace,
            { field: "brand", sourceLabel: "manufacturer official Astrum product page", sourceUrl: page.url, observedAt: now },
            { field: "taxonomy", sourceLabel: "Cossa Smart Intake taxonomy classifier", department: taxonomy.department, subdepartments: taxonomy.subdepartments, observedAt: now },
            { field: "gallery", sourceLabel: "manufacturer official Astrum product page", sourceUrl: page.url, officialImageCount: gallery.length, hostedImageCount: hostedGallery.length, observedAt: now },
            { field: "commercial", sourceLabel: "Cossa market evidence gate", decision: commercial, evidence: marketEvidence, observedAt: now },
          ],
          operational_notes: `Smart Intake 2.0: duplicate guard, verified gallery, Cossa taxonomy and commercial gate evaluated for ${ref}.`,
        }).eq("id", intake.id);
        if (intakeUpdateError) throw intakeUpdateError;
        if (published) {
          const productId = intake.publication_store_product_id!;
          const { error } = await admin.from("store_products").update({
            name: title, short_description: short.slice(0, 500), description,
            category: taxonomy.department, additional_categories: taxonomy.subdepartments,
            merchandising_tags: tags, brand: "Astrum", image_urls: hostedGallery,
            customer_features: features, customer_specifications: specifications,
            seo_title: `${title} | Cossa Store`.slice(0, 70), seo_description: short.slice(0, 160),
          }).eq("id", productId).eq("supplier_product_ref", ref);
          if (error) throw error;
          const physicalReadiness = await upsertDelivery(admin, productId, ref, page.url, physical);
          results.push({ ref, status: "published_product_enriched", productId, hostedImages: hostedGallery.length, department: taxonomy.department, subdepartments: taxonomy.subdepartments, commercial, physicalReadiness });
          continue;
        }
        const { data: publishData, error: publishError } = await admin.rpc("publish_store_inventory_intake_with_images", { p_intake_id: intake.id, p_actor_id: ACTOR_ID, p_customer_image_urls: hostedGallery });
        if (publishError) throw publishError;
        const publishedRow = Array.isArray(publishData) ? publishData[0] : publishData;
        const productId = publishedRow?.store_product_id as string | undefined;
        if (!productId) throw new Error("Publication did not return a Store product ID.");
        const physicalReadiness = await upsertDelivery(admin, productId, ref, page.url, physical);
        results.push({ ref, status: "published", productId, slug: publishedRow?.public_slug, price: Number(intake.selling_price_override), hostedImages: hostedGallery.length, department: taxonomy.department, subdepartments: taxonomy.subdepartments, commercial, physicalReadiness });
      } catch (error) {
        results.push({ ref, status: "held", reason: error instanceof Error ? error.message : "Unknown Smart Intake failure." });
      }
    }
    return json({ ok: true, dryRun, enrichPublished, requireMarketEvidence, processed: results.length, results, finishedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Astrum Smart Intake failed.";
    console.error(`[astrum-smart-intake-worker] ${message}`);
    return json({ error: message }, 400);
  }
});
