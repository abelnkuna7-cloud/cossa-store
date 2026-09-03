import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";
import { PRINTIFY_SHOP_ID, printifyRequest } from "../_shared/printify-catalogue.ts";

const ORG = "00000000-0000-4000-8000-000000000001";
const ALLOWED = new Set(["https://store.cossanexusholdings.co.za","https://growth.cossanexusholdings.co.za","http://localhost:3000","http://localhost:5173"]);
function cors(r:Request):HeadersInit{const o=r.headers.get("origin");return{"Access-Control-Allow-Origin":o&&ALLOWED.has(o)?o:"","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Credentials":"true",Vary:"Origin"}}
function json(r:Request,b:unknown,s=200){return new Response(JSON.stringify(b),{status:s,headers:{...cors(r),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function uuid(v:unknown){return typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)}
function cents(v:unknown){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n):null}
async function user(r:Request,c:ReturnType<typeof createClient>):Promise<User>{const t=r.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim();if(!t)throw new Error("Sign in is required.");const {data,error}=await c.auth.getUser(t);if(error||!data.user)throw new Error("Your session could not be verified.");return data.user}
async function adminRole(a:ReturnType<typeof createClient>,id:string){const [m,g]=await Promise.all([a.from("organisation_members").select("role").eq("organisation_id",ORG).eq("user_id",id).eq("status","active").in("role",["owner","admin"]),a.from("user_roles").select("role").eq("user_id",id).eq("role","admin")]);if(m.error||g.error||(!(m.data??[]).length&&!(g.data??[]).length))throw new Error("An authorised Cossa Store administrator is required.")}

Deno.serve(async r=>{
 if(r.method==="OPTIONS")return new Response(null,{status:204,headers:cors(r)});if(r.method!=="POST")return json(r,{error:"Method not allowed."},405);
 const origin=r.headers.get("origin");if(origin&&!ALLOWED.has(origin))return json(r,{error:"Origin not allowed."},403);
 const url=Deno.env.get("SUPABASE_URL"),pub=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??Deno.env.get("SUPABASE_ANON_KEY"),svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),token=Deno.env.get("PRINTIFY_API_TOKEN");if(!url||!pub||!svc||!token)return json(r,{error:"Production authorization is not configured."},503);
 const c=createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false}}),a=createClient(url,svc,{auth:{autoRefreshToken:false,persistSession:false}});
 try{
  const u=await user(r,c);await adminRole(a,u.id);const body=await r.json().catch(()=>({})) as Record<string,unknown>;if(!uuid(body.fulfilmentId))throw new Error("A valid fulfilment ID is required.");
  const {data:f,error:fe}=await a.from("store_fulfilment_orders").select("id,store_order_id,provider,provider_order_id,status,provider_response,metadata").eq("id",String(body.fulfilmentId)).eq("organisation_id",ORG).eq("provider","Printify").maybeSingle();if(fe||!f)throw new Error("Printify fulfilment was not found.");if(!f.provider_order_id)throw new Error("Production is blocked until a Printify order ID has been persisted.");
  const {data:o,error:oe}=await a.from("store_orders").select("id,status,metadata").eq("id",f.store_order_id).eq("organisation_id",ORG).maybeSingle();if(oe||!o)throw new Error("Cossa Store order was not found.");if(o.status!=="paid")throw new Error("Production is blocked because the Cossa order is not paid.");
  const {data:p,error:pe}=await a.from("eft_payment_requests").select("id,status").eq("store_order_id",o.id).eq("organisation_id",ORG).eq("purpose","store_order").eq("status","approved").limit(1);if(pe||!(p??[]).length)throw new Error("Production is blocked because approved payment could not be revalidated.");
  const om=(o.metadata&&typeof o.metadata==="object"&&!Array.isArray(o.metadata)?o.metadata:{}) as Record<string,unknown>;if(om.cancelled===true||om.cancel_requested===true||om.fulfilment_hold===true)throw new Error("Production is blocked by a cancellation or fulfilment hold.");
  if(Deno.env.get("PRINTIFY_MANUAL_APPROVAL_CONFIRMED")!=="true")throw new Error("Production is blocked until Printify Manual order approval has been explicitly confirmed in server configuration.");

  const remote=await printifyRequest(`/shops/${PRINTIFY_SHOP_ID}/orders/${encodeURIComponent(String(f.provider_order_id))}.json`,token,{method:"GET"}) as Record<string,unknown>;
  const remoteStatus=String(remote.status??"");
  if(["sending-to-production","in-production","fulfilled","partially-fulfilled"].includes(remoteStatus))return json(r,{alreadyAuthorized:true,providerOrderId:f.provider_order_id,printifyStatus:remoteStatus});
  if(["canceled","unfulfillable","has-issues","payment-not-received","source-check-failed"].includes(remoteStatus))throw new Error(`Production is blocked by Printify order status: ${remoteStatus}.`);

  // Printify charges production + shipping when the order is sent to production.
  // Never infer spendable cash from a customer-facing `paid` flag. The worker must
  // receive an explicit server-side fulfilment-float snapshot from treasury/payment
  // reconciliation. Amounts are integer minor units in the Printify billing currency.
  const productionCost=cents(remote.total_price);
  const shippingCost=cents(remote.total_shipping);
  const taxCost=cents(remote.total_tax)??0;
  if(productionCost===null||shippingCost===null)throw new Error("Production is blocked because Printify liability could not be calculated safely.");
  const liability=productionCost+shippingCost+taxCost;
  const availableFloat=cents(Deno.env.get("PRINTIFY_AVAILABLE_FULFILMENT_FLOAT_MINOR"));
  const reserveFloor=cents(Deno.env.get("PRINTIFY_FULFILMENT_RESERVE_FLOOR_MINOR"))??0;
  const floatCurrency=(Deno.env.get("PRINTIFY_FULFILMENT_FLOAT_CURRENCY")||"").trim().toUpperCase();
  const billingCurrency=String(remote.currency??Deno.env.get("PRINTIFY_BILLING_CURRENCY")??"").trim().toUpperCase();
  if(availableFloat===null)throw new Error("Production is blocked until reconciled fulfilment float is available.");
  if(!floatCurrency||!billingCurrency||floatCurrency!==billingCurrency)throw new Error("Production is blocked because fulfilment-float currency does not match Printify billing currency.");
  const spendable=Math.max(0,availableFloat-reserveFloor);
  if(liability>spendable)throw new Error(`Production is blocked: supplier liability ${liability} ${billingCurrency} minor units exceeds spendable fulfilment float ${spendable}.`);

  const gates={orderPaid:true,paymentApproved:true,noHold:true,manualApprovalConfirmed:true,floatReconciled:true,floatCurrencyMatched:true,liabilityCovered:true};
  if(Deno.env.get("PRINTIFY_PRODUCTION_ENABLED")!=="true")return json(r,{authorized:false,dryRun:true,providerOrderId:f.provider_order_id,printifyStatus:remoteStatus,gates,finance:{billingCurrency,productionCost,shippingCost,taxCost,liability,availableFloat,reserveFloor,spendable},killSwitch:"PRINTIFY_PRODUCTION_ENABLED"});

  const response=await printifyRequest(`/shops/${PRINTIFY_SHOP_ID}/orders/${encodeURIComponent(String(f.provider_order_id))}/send_to_production.json`,token,{method:"POST"});
  const now=new Date().toISOString();const fm=(f.metadata&&typeof f.metadata==="object"&&!Array.isArray(f.metadata)?f.metadata:{}) as Record<string,unknown>;
  const {error:ue}=await a.from("store_fulfilment_orders").update({status:"production_requested",provider_response:{order:remote,send_to_production:response},metadata:{...fm,production_authorized_at:now,production_authorized_by:u.id,manual_approval_attested:true,finance_authorization:{billing_currency:billingCurrency,production_cost:productionCost,shipping_cost:shippingCost,tax_cost:taxCost,liability,available_float:availableFloat,reserve_floor:reserveFloor,spendable_float:spendable}},updated_at:now,last_error:null}).eq("id",f.id);if(ue)throw ue;
  return json(r,{authorized:true,providerOrderId:f.provider_order_id,status:"production_requested",sentToProduction:true,finance:{billingCurrency,liability,spendableBeforeAuthorization:spendable}});
 }catch(e){const message=e instanceof Error?e.message:"Production authorization failed.";console.error(JSON.stringify({event:"printify_production_authorization_failed",message}));return json(r,{error:message},400)}
});