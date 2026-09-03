import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BATCH = 10;
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
function backoff(attempts: number) { return Math.min(3600, Math.max(30, 30 * Math.pow(2, Math.max(0, attempts - 1)))); }

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const workerSecret = Deno.env.get("STORE_FULFILMENT_WORKER_SECRET");
  if (!url || !service || !workerSecret) return json({ error: "Fulfilment worker is not configured." }, 503);
  if (request.headers.get("x-cossa-worker-secret") !== workerSecret) return json({ error: "Unauthorized." }, 401);

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const workerId = `edge:${crypto.randomUUID()}`;
  const { data: jobs, error } = await admin.rpc("claim_store_fulfilment_outbox_jobs", { p_worker_id: workerId, p_limit: MAX_BATCH });
  if (error) return json({ error: "Could not claim fulfilment work." }, 500);

  const results: unknown[] = [];
  for (const job of jobs ?? []) {
    try {
      if (job.provider !== "Printify") throw new Error(`Unsupported fulfilment provider: ${job.provider}`);
      let result: Record<string, unknown> = {};

      if (job.event_type === "production_approved") {
        const { data: fulfilment, error: fulfilmentError } = await admin
          .from("store_fulfilment_orders")
          .select("id,provider_order_id,status")
          .eq("organisation_id", job.organisation_id)
          .eq("store_order_id", job.store_order_id)
          .eq("provider", "Printify")
          .maybeSingle();
        if (fulfilmentError) throw fulfilmentError;
        if (!fulfilment?.id || !fulfilment.provider_order_id) throw new Error("Production approval is waiting for a persisted Printify fulfilment order.");

        const response = await fetch(`${url}/functions/v1/printify-send-to-production`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cossa-worker-secret": workerSecret,
            "Authorization": `Bearer ${service}`,
          },
          body: JSON.stringify({ fulfilmentId: fulfilment.id, source: "store_fulfilment_outbox", outboxJobId: job.id }),
        });
        result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(result?.error || `Production endpoint returned ${response.status}.`));
        if (result.authorized !== true && result.alreadyAuthorized !== true) {
          throw new Error(String(result?.error || "Production remains blocked by a safety gate; the worker will retry automatically."));
        }
      } else if (job.event_type === "payment_approved") {
        const paymentId = job.payment_request_id || job.payload?.paymentId;
        if (!paymentId) throw new Error("Approved payment reference is missing from fulfilment job.");
        const response = await fetch(`${url}/functions/v1/printify-fulfilment-create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cossa-worker-secret": workerSecret,
            "Authorization": `Bearer ${service}`,
          },
          body: JSON.stringify({ paymentId, source: "store_fulfilment_outbox", outboxJobId: job.id }),
        });
        result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(result?.error || `Fulfilment endpoint returned ${response.status}.`));
      } else {
        throw new Error(`Unsupported fulfilment event: ${job.event_type}`);
      }

      const now = new Date().toISOString();
      const { error: completeError } = await admin.from("store_fulfilment_outbox").update({ status: "completed", result, completed_at: now, locked_at: null, locked_by: null, last_error: null, updated_at: now }).eq("id", job.id).eq("status", "processing");
      if (completeError) throw completeError;
      results.push({ id: job.id, eventType: job.event_type, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fulfilment worker failed.";
      const attempts = Number(job.attempts || 1);
      const dead = attempts >= Number(job.max_attempts || 12);
      const availableAt = new Date(Date.now() + backoff(attempts) * 1000).toISOString();
      await admin.from("store_fulfilment_outbox").update({ status: dead ? "dead_letter" : "retry", available_at: availableAt, locked_at: null, locked_by: null, last_error: message.slice(0, 2000), updated_at: new Date().toISOString() }).eq("id", job.id);
      results.push({ id: job.id, eventType: job.event_type, status: dead ? "dead_letter" : "retry", error: message });
    }
  }
  return json({ workerId, claimed: (jobs ?? []).length, results });
});