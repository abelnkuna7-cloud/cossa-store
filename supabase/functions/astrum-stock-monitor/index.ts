import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ASTRUM_SUPPLIER_ID = "3b625ee7-25d4-4604-afd5-2a0909ac04b6";
const PROVIDER = "Astrum Stock Monitor";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function requireAutomationToken(admin: any, request: Request) {
  const token = request.headers.get("x-cossa-automation-token")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Automation authorization is required.");
  const tokenHash = await sha256Hex(token);
  const { data, error } = await admin
    .from("supplier_automation_tokens")
    .select("id")
    .eq("provider", PROVIDER)
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) throw new Error("Automation authorization failed.");
}

function detectAstrumAvailability(html: string): "available" | "unavailable" | "unknown" {
  const source = html.toLowerCase();

  const unavailableSignals = [
    /class=["'][^"']*stock\s+out-of-stock[^"']*["']/i,
    /class=["'][^"']*out-of-stock[^"']*["']/i,
    /"availability"\s*:\s*"https?:\\?\/\\?\/schema\.org\/outofstock"/i,
    />\s*out of stock\s*</i,
  ];
  if (unavailableSignals.some((signal) => signal.test(html))) return "unavailable";

  const availableSignals = [
    /class=["'][^"']*stock\s+in-stock[^"']*["']/i,
    /"availability"\s*:\s*"https?:\\?\/\\?\/schema\.org\/instock"/i,
    />\s*in stock\s*</i,
  ];
  if (availableSignals.some((signal) => signal.test(html))) return "available";

  // Avoid guessing from generic words such as “stock”, cart buttons, or prices.
  // Unknown evidence must never be converted into a false availability decision.
  if (!source.includes("product")) return "unknown";
  return "unknown";
}

async function fetchPage(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "astrum.co.za" || !parsed.pathname.startsWith("/product/")) {
    throw new Error("Only official Astrum product pages are accepted for stock monitoring.");
  }
  const response = await fetch(parsed.toString(), {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 CossaStore-StockMonitor/2.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Astrum product page returned ${response.status}.`);
  return await response.text();
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Stock monitor is not configured." }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    await requireAutomationToken(admin, request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const limit = Math.max(1, Math.min(100, Number(body.limit) || 25));
    const dryRun = body.dryRun === true;

    const { data: rows, error } = await admin
      .from("store_inventory_intakes")
      .select("id,name,supplier_product_ref,source_url,stock_status,supplier_available_stock,last_stock_checked_at,publication_store_product_id,approval_status")
      .eq("organisation_id", ORG_ID)
      .eq("supplier_id", ASTRUM_SUPPLIER_ID)
      .not("publication_store_product_id", "is", null)
      .eq("approval_status", "published")
      .order("last_stock_checked_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) throw error;

    const results: unknown[] = [];
    for (const row of rows ?? []) {
      const checkedAt = new Date().toISOString();
      try {
        const sourceUrl = String(row.source_url ?? "").trim();
        if (!sourceUrl) throw new Error("Official Astrum product URL is missing.");
        const html = await fetchPage(sourceUrl);
        const observed = detectAstrumAvailability(html);

        if (dryRun || observed === "unknown") {
          results.push({
            ref: row.supplier_product_ref,
            productId: row.publication_store_product_id,
            observed,
            current: row.stock_status,
            changed: false,
            reason: observed === "unknown" ? "Supplier page did not provide a strong stock signal; existing state preserved." : undefined,
          });
          if (!dryRun) {
            await admin
              .from("store_inventory_intakes")
              .update({ last_stock_checked_at: checkedAt })
              .eq("id", row.id);
          }
          continue;
        }

        const nextStatus = observed;
        const patch: Record<string, unknown> = {
          stock_status: nextStatus,
          last_stock_checked_at: checkedAt,
          stock_confirmed: true,
          stock_confirmed_at: checkedAt,
          operational_notes:
            `Astrum Stock Monitor: official supplier page observed ${observed} at ${checkedAt}. ` +
            `No numerical quantity was invented from webpage availability.`,
        };

        // If Astrum explicitly says out of stock, zeroing the supplier quantity is safe and
        // prevents stale CSV quantity from being mistaken for current sellable stock.
        // When stock returns, the numerical quantity is not invented; only availability is restored.
        if (observed === "unavailable") patch.supplier_available_stock = 0;

        const { error: updateError } = await admin
          .from("store_inventory_intakes")
          .update(patch)
          .eq("id", row.id)
          .eq("publication_store_product_id", row.publication_store_product_id);
        if (updateError) throw updateError;

        results.push({
          ref: row.supplier_product_ref,
          productId: row.publication_store_product_id,
          observed,
          previous: row.stock_status,
          changed: row.stock_status !== nextStatus,
        });
      } catch (itemError) {
        results.push({
          ref: row.supplier_product_ref,
          productId: row.publication_store_product_id,
          observed: "unknown",
          changed: false,
          error: itemError instanceof Error ? itemError.message : "Stock check failed.",
        });
      }
    }

    return json({
      ok: true,
      dryRun,
      processed: results.length,
      results,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stock monitor failed.";
    console.error(`[astrum-stock-monitor] ${message}`);
    return json({ error: message }, 400);
  }
});
