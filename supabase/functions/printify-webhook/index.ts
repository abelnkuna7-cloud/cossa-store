import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PRINTIFY_PRODUCT_WEBHOOK_TOPICS, PRINTIFY_SHOP_ID, archivePrintifyProduct, fetchPrintifyProduct, syncOnePrintifyProduct } from "../_shared/printify-catalogue.ts";

const ORDER_TOPICS=["order:created","order:updated","order:sent-to-production","order:shipment:created","order:shipment:delivered"] as const;
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function constantTimeEqual(l:Uint8Array,r:Uint8Array){if(l.length!==r.length)return false;let d=0;for(let i=0;i<l.length;i++)d|=l[i]^r[i];return d===0}
function hexToBytes(v:string){if(!/^[a-f0-9]{64}$/i.test(v))return null;const b=new Uint8Array(v.length/2);for(let i=0;i<v.length;i+=2)b[i/2]=Number.parseInt(v.slice(i,i+2),16);return b}
async function validSignature(raw:string,supplied:string|null,secret:string){const actual=hexToBytes(supplied?.trim().replace(/^sha256=/i,"")??"");if(!actual)return false;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw)));return constantTimeEqual(sig,actual)}
function eventParts(event:any){const type=typeof event?.type==="string"?event.type:"";const id=typeof event?.resource?.id==="string"?event.resource.id:"";const resourceType=typeof event?.resource?.type==="string"?event.resource.type:"";const data=event?.resource?.data&&typeof event.resource.data==="object"?event.resource.data:{};return{type,id,resourceType,data,eventId:typeof event?.id==="string"?event.id:"",createdAt:typeof event?.created_at==="string"?event.created_at:null}}

Deno.serve(async request=>{
 if(request.method!=="POST")return json({error:"Method not allowed."},405);
 const secret=Deno.env.get("PRINTIFY_WEBHOOK_SECRET"),url=Deno.env.get("SUPABASE_URL"),svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),token=Deno.env.get("PRINTIFY_API_TOKEN");if(!secret||!url||!svc||!token)return json({error:"Printify webhook is not configured."},503);
 const raw=await request.text();if(!(await validSignature(raw,request.headers.get("x-pfy-signature"),secret)))return json({error:"Invalid webhook signature."},401);
 let event:any;try{event=JSON.parse(raw)}catch{return json({error:"Invalid webhook body."},400)}
 const p=eventParts(event);if(String(p.data.shop_id??"")!==PRINTIFY_SHOP_ID)return json({ignored:true,reason:"shop_mismatch"});
 const admin=createClient(url,svc,{auth:{autoRefreshToken:false,persistSession:false}});
 try{
  if(p.resourceType==="product"&&(PRINTIFY_PRODUCT_WEBHOOK_TOPICS as readonly string[]).includes(p.type)){
   if(!p.id)return json({error:"Invalid Printify product event."},400);
   if(p.type==="product:deleted"){const archived=await archivePrintifyProduct(admin,p.id);return json({received:true,archived})}
   const product=await fetchPrintifyProduct(PRINTIFY_SHOP_ID,p.id,token);const result=await syncOnePrintifyProduct(admin,product);return json({received:true,outcome:result.outcome});
  }
  if(p.resourceType!=="order"||!(ORDER_TOPICS as readonly string[]).includes(p.type))return json({ignored:true});
  if(!p.id)return json({error:"Invalid Printify order event."},400);

  // Provider order ID is our durable join key. Repeated webhook delivery is safe:
  // each update converges the same fulfilment row instead of creating new records.
  const {data:f,error:fe}=await admin.from("store_fulfilment_orders").select("id,store_order_id,status,metadata,tracking_number,tracking_url").eq("provider","Printify").eq("provider_order_id",p.id).maybeSingle();
  if(fe)throw fe;if(!f)return json({received:true,reconciliationPending:true,providerOrderId:p.id});
  const fm=(f.metadata&&typeof f.metadata==="object"&&!Array.isArray(f.metadata)?f.metadata:{}) as Record<string,unknown>;const carrier=p.data?.carrier&&typeof p.data.carrier==="object"?p.data.carrier:{};const tracking=typeof carrier.tracking_number==="string"?carrier.tracking_number.trim():"";const carrierCode=typeof carrier.code==="string"?carrier.code.trim():"";
  let status=f.status;let orderStatus:string|null=null;
  if(p.type==="order:sent-to-production")status="production_requested";
  if(p.type==="order:updated"){
   const s=String(p.data.status??"");
   if(s==="sending-to-production")status="production_requested";
   else if(s==="in-production")status="in_production";
   else if(s==="partially-fulfilled")status="partially_fulfilled";
   else if(s==="fulfilled"){status="fulfilled";orderStatus="fulfilled"}
   else if(s==="canceled"){status="cancelled";orderStatus="cancelled"}
   else if(["has-issues","unfulfillable","payment-not-received","source-check-failed"].includes(s))status="exception";
  }
  if(p.type==="order:shipment:created"){status="shipped";orderStatus="shipped"}
  if(p.type==="order:shipment:delivered"){status="delivered";orderStatus="delivered"}
  const now=new Date().toISOString();const webhookMeta={last_printify_event_id:p.eventId||null,last_printify_event_type:p.type,last_printify_event_at:p.createdAt||now,carrier:carrierCode||null,shipped_at:p.data?.shipped_at??null,delivered_at:p.data?.delivered_at??null};
  const update:any={status,metadata:{...fm,webhook:webhookMeta},updated_at:now,last_error:status==="exception"?`Printify reported ${String(p.data.status??"order issue")}`:null};if(tracking)update.tracking_number=tracking;
  const {error:ue}=await admin.from("store_fulfilment_orders").update(update).eq("id",f.id);if(ue)throw ue;
  if(orderStatus){const {error:oe}=await admin.from("store_orders").update({status:orderStatus,updated_at:now}).eq("id",f.store_order_id);if(oe)throw oe}
  return json({received:true,providerOrderId:p.id,event:p.type,fulfilmentStatus:status,orderStatus,trackingNumber:tracking||null,carrier:carrierCode||null});
 }catch(error){const message=error instanceof Error?error.message:"Printify webhook reconciliation failed.";console.error(JSON.stringify({event:"printify_webhook_failed",type:p.type,resourceId:p.id,message}));return json({error:"Printify webhook reconciliation failed."},500)}
});