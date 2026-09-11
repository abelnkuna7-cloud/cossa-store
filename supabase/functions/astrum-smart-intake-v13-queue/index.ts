import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROVIDER = "Astrum Smart Intake";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function sha(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function authenticate(admin: any, req: Request) {
  const token = req.headers.get("x-cossa-automation-token")?.trim() || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Authorization required");
  const { data, error } = await admin.from("supplier_automation_tokens")
    .select("id")
    .eq("provider", PROVIDER)
    .eq("token_hash", await sha(token))
    .eq("active", true)
    .maybeSingle();
  if (error || !data) throw new Error("Authorization failed");
  return token;
}

function classifyFailure(reason: string) {
  const r = reason.toLowerCase();
  if (/exact astrum product identity could not be verified|verified astrum gallery unavailable|unsupported image|invalid image/.test(r)) {
    return { kind: "permanent", status: "hold" as const };
  }
  if (/429|astrum request failed 5\d\d|network|fetch failed|timed out|timeout|connection|no official image copied/.test(r)) {
    return { kind: "temporary", status: "retry" as const };
  }
  return { kind: "temporary", status: "retry" as const };
}

function backoffMinutes(attempts: number) {
  return Math.min(360, 10 * Math.pow(2, Math.max(0, attempts - 1)));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Not configured" }, 503);
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const token = await authenticate(admin, req);
    const body = await req.json().catch(() => ({}));
    const maxItems = Math.max(1, Math.min(6, Number(body.maxItems) || 4));

    const { data: claimed, error: claimError } = await admin.rpc("claim_astrum_intake_v13_queue", { p_limit: maxItems });
    if (claimError) throw claimError;
    if (!claimed?.length) {
      const { data: counts } = await admin.from("astrum_intake_v13_queue").select("status");
      const summary: Record<string, number> = {};
      for (const row of counts || []) summary[row.status] = (summary[row.status] || 0) + 1;
      return json({ ok: true, status: "idle", reason: "No eligible queued Astrum products remain runnable.", queue: summary });
    }

    const queueIds = claimed.map((x: any) => x.queue_id);
    const refs = claimed.map((x: any) => x.supplier_product_ref);
    const { data: queueRows } = await admin.from("astrum_intake_v13_queue")
      .select("id,supplier_product_ref,attempts,max_attempts")
      .in("id", queueIds);
    const meta = new Map((queueRows || []).map((x: any) => [x.supplier_product_ref, x]));

    let workerBody: any = null;
    try {
      const response = await fetch(`${url}/functions/v1/astrum-smart-intake-v13`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cossa-automation-token": token },
        body: JSON.stringify({ refs, maxItems, dryRun: false })
      });
      workerBody = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(workerBody?.error || `V13 worker failed ${response.status}`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "V13 worker invocation failed";
      for (const ref of refs) {
        const q: any = meta.get(ref);
        if (!q) continue;
        const exhausted = Number(q.attempts) >= Number(q.max_attempts);
        const next = new Date(Date.now() + backoffMinutes(Number(q.attempts)) * 60000).toISOString();
        await admin.from("astrum_intake_v13_queue").update({
          status: exhausted ? "failed" : "retry",
          next_attempt_at: next,
          locked_at: null,
          last_error: reason.slice(0, 1000),
          last_error_class: "temporary",
          last_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq("id", q.id).eq("status", "processing");
      }
      throw new Error(reason);
    }

    const results = Array.isArray(workerBody?.results) ? workerBody.results : [];
    const seen = new Set<string>();
    const outcome: any[] = [];

    for (const result of results) {
      const ref = String(result.ref || "");
      const q: any = meta.get(ref);
      if (!q) continue;
      seen.add(ref);
      const now = new Date().toISOString();
      if (result.status === "prepared_review") {
        await admin.from("astrum_intake_v13_queue").update({
          status: "prepared", locked_at: null, last_error: null, last_error_class: null,
          last_completed_at: now, updated_at: now
        }).eq("id", q.id).eq("status", "processing");
        outcome.push({ ref, status: "prepared", proposedPrice: result.proposedPrice, qualityScore: result.qualityScore });
        continue;
      }

      const reason = String(result.reason || "V13 did not prepare product");
      const cls = classifyFailure(reason);
      const exhausted = Number(q.attempts) >= Number(q.max_attempts);
      const finalStatus = cls.kind === "permanent" ? "hold" : exhausted ? "failed" : "retry";
      const next = new Date(Date.now() + backoffMinutes(Number(q.attempts)) * 60000).toISOString();
      await admin.from("astrum_intake_v13_queue").update({
        status: finalStatus,
        next_attempt_at: next,
        locked_at: null,
        last_error: reason.slice(0, 1000),
        last_error_class: cls.kind,
        last_completed_at: now,
        updated_at: now
      }).eq("id", q.id).eq("status", "processing");
      outcome.push({ ref, status: finalStatus, reason });
    }

    for (const ref of refs) {
      if (seen.has(ref)) continue;
      const q: any = meta.get(ref);
      if (!q) continue;
      const exhausted = Number(q.attempts) >= Number(q.max_attempts);
      const now = new Date().toISOString();
      const next = new Date(Date.now() + backoffMinutes(Number(q.attempts)) * 60000).toISOString();
      await admin.from("astrum_intake_v13_queue").update({
        status: exhausted ? "failed" : "retry",
        next_attempt_at: next,
        locked_at: null,
        last_error: "V13 returned no result for claimed product",
        last_error_class: "temporary",
        last_completed_at: now,
        updated_at: now
      }).eq("id", q.id).eq("status", "processing");
      outcome.push({ ref, status: exhausted ? "failed" : "retry", reason: "No worker result" });
    }

    return json({ ok: true, status: "completed", claimed: refs.length, outcomes: outcome, finishedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Astrum V13 queue runner failed" }, 400);
  }
});