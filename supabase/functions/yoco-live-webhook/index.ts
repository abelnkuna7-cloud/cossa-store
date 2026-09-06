import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_WEBHOOK_AGE_MS = 3 * 60 * 1000;
function text(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
function base64Bytes(value: string) { const decoded = atob(value); return Uint8Array.from(decoded, c => c.charCodeAt(0)); }
function equal(a: Uint8Array, b: Uint8Array) { if (a.length !== b.length) return false; let n=0; for (let i=0;i<a.length;i++) n|=a[i]^b[i]; return n===0; }
async function validSignature(raw: string, id: string, timestamp: string, signatures: string, secret: string) {
  if (!secret.startsWith("whsec_")) return false;
  const ms = Number(timestamp) * 1000;
  if (!Number.isFinite(ms) || Math.abs(Date.now()-ms)>MAX_WEBHOOK_AGE_MS) return false;
  const key = await crypto.subtle.importKey("raw", base64Bytes(secret.slice(6)), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${raw}`)));
  return signatures.split(/\s+/).some(item => { const [,encoded] = item.split(",",2); if (!encoded) return false; try { return equal(expected,base64Bytes(encoded)); } catch { return false; } });
}

Deno.serve(async request => {
  if (request.method !== "POST") return json({error:"Method not allowed."},405);
  const url=Deno.env.get("SUPABASE_URL"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({error:"Yoco live webhook is not configured."},503);
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:secret,error:secretError}=await admin.rpc("get_yoco_live_webhook_secret");
  if (secretError || !secret) return json({error:"Yoco live webhook is not configured."},503);
  const raw=await request.text(), id=text(request.headers.get("webhook-id"),240), timestamp=text(request.headers.get("webhook-timestamp"),40), signatures=text(request.headers.get("webhook-signature"),4000);
  if (!id || !timestamp || !signatures) return json({error:"Missing webhook signature headers."},400);
  if (!(await validSignature(raw,id,timestamp,signatures,String(secret)))) return json({error:"Invalid webhook signature."},403);
  let event:Record<string,unknown>; try { event=JSON.parse(raw) as Record<string,unknown>; } catch { return json({error:"Invalid webhook body."},400); }
  const payload=event.payload && typeof event.payload === "object" ? event.payload as Record<string,unknown> : {};
  const metadata=payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string,unknown> : {};
  const attemptId=text(metadata.cossaPaymentAttemptId ?? payload.externalId,64), checkoutId=text(metadata.checkoutId ?? payload.checkoutId,240), paymentId=text(payload.id,240), mode=text(payload.mode,20);
  if (!attemptId || mode !== "live") return json({ignored:true});
  const {data:attempt,error:attemptError}=await admin.from("store_payment_attempts").select("id,provider_checkout_id").eq("id",attemptId).maybeSingle();
  if (attemptError || !attempt) return json({ignored:true});
  if (checkoutId && attempt.provider_checkout_id && checkoutId !== attempt.provider_checkout_id) return json({error:"Webhook checkout identity mismatch."},400);
  const {data:recordedAttempt,error}=await admin.rpc("record_store_yoco_live_payment_event",{p_event_id:text(event.id,240),p_attempt_id:attempt.id,p_checkout_id:checkoutId || attempt.provider_checkout_id,p_payment_id:paymentId,p_amount_cents:Math.trunc(Number(payload.amount)),p_currency:text(payload.currency,3).toUpperCase(),p_event_type:text(event.type,80),p_payment_status:text(payload.status,80),p_safe_payload:{id:text(event.id,240),type:text(event.type,80),payload:{id:paymentId,status:text(payload.status,80),amount:Math.trunc(Number(payload.amount)),currency:text(payload.currency,3).toUpperCase(),mode,checkoutId}}});
  if (error) { console.error(JSON.stringify({event:"yoco_live_webhook_processing_failed",webhookId:id,message:error.message})); return json({error:"Webhook could not be processed."},500); }
  if (recordedAttempt?.status === "investigation") return json({error:"Payment requires investigation."},409);
  return json({received:true});
});
