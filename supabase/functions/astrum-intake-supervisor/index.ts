import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ASTRUM_SUPPLIER_ID = "3b625ee7-25d4-4604-afd5-2a0909ac04b6";
const WORKER = "astrum-smart-intake-worker";
// Temporary safety exclusions: exact product/gallery identity must be resolved first.
const SAFETY_HOLD_REFS = new Set(["AENP4310B", "ASB100NB"]);
const HARD_HOLD_REFS = new Set(["ASPKSM510B", "APB20PB", "ALCP156B", "ALCP172B", "A32305-A", "A14521-B"]);

type Intake = { id:string; supplier_product_ref:string; supplier_available_stock:number|string|null; selling_price_override:number|string|null; publication_store_product_id:string|null; approval_status:string; };
type Evidence = { supplier_product_ref:string|null; retailer:string; price_zar:number|string; source_url:string; observed_at:string; exact_match:boolean; confidence:number|string; availability:string; };

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}

Deno.serve(async(req)=>{
 if(req.method!=="POST") return reply({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key) return reply({error:"Supervisor is not configured."},503);
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 try{
   const token=req.headers.get("x-cossa-automation-token")?.trim()??"";
   if(!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Supervisor authorization is required.");
   const hash=await sha256(token);
   const {data:auth,error:authErr}=await admin.from("supplier_automation_tokens").select("id").eq("provider","Astrum Smart Intake Supervisor").eq("token_hash",hash).eq("active",true).maybeSingle();
   if(authErr||!auth) throw new Error("Supervisor authorization failed.");

   const {data:intakes,error:intakeErr}=await admin.from("store_inventory_intakes").select("id,supplier_product_ref,supplier_available_stock,selling_price_override,publication_store_product_id,approval_status").eq("organisation_id",ORG_ID).eq("supplier_id",ASTRUM_SUPPLIER_ID).eq("approval_status","approved").is("publication_store_product_id",null).gt("supplier_available_stock",0).order("supplier_product_ref");
   if(intakeErr) throw intakeErr;
   const rows=(intakes??[]) as Intake[];
   const refs=rows.map(r=>r.supplier_product_ref).filter(ref=>!SAFETY_HOLD_REFS.has(ref)&&!HARD_HOLD_REFS.has(ref));
   if(!refs.length) return reply({ok:true,status:"idle",reason:"No eligible CEO-approved Astrum intakes are awaiting publication.",checked:rows.length});

   const {data:health,error:healthErr}=await admin.from("store_inventory_commercial_health").select("supplier_product_ref,commercial_status,estimated_gross_margin_pct").in("supplier_product_ref",refs);
   if(healthErr) throw healthErr;
   const commerciallySafe=new Set((health??[]).filter((h:any)=>h.commercial_status==="competitive" && Number(h.estimated_gross_margin_pct)>=15).map((h:any)=>h.supplier_product_ref));
   const candidates=refs.filter(ref=>commerciallySafe.has(ref)).slice(0,8);
   if(!candidates.length) return reply({ok:true,status:"held",reason:"No unpublished Astrum SKU currently passes both market and margin gates.",checked:rows.length});

   const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
   const {data:evidence,error:evidenceErr}=await admin.from("store_competitor_price_evidence").select("supplier_product_ref,retailer,price_zar,source_url,observed_at,exact_match,confidence,availability").in("supplier_product_ref",candidates).eq("exact_match",true).gte("observed_at",since).order("observed_at",{ascending:false});
   if(evidenceErr) throw evidenceErr;
   const marketEvidence:Record<string,unknown[]>={};
   for(const e of (evidence??[]) as Evidence[]){if(!e.supplier_product_ref||Number(e.confidence)<0.7)continue;(marketEvidence[e.supplier_product_ref]??=[]).push({retailer:e.retailer,price:Number(e.price_zar),url:e.source_url,observedAt:e.observed_at,exactMatch:true,availability:e.availability});}
   const ready=candidates.filter(ref=>(marketEvidence[ref]?.length??0)>0);
   if(!ready.length) return reply({ok:true,status:"held",reason:"Commercially eligible products do not yet have fresh high-confidence exact-match evidence.",candidates});

   const response=await fetch(`${url}/functions/v1/${WORKER}`,{method:"POST",headers:{"Content-Type":"application/json","x-cossa-automation-token":token},body:JSON.stringify({refs:ready,maxItems:8,dryRun:false,enrichPublished:false,requireMarketEvidence:true,marketEvidence})});
   const body=await response.json().catch(()=>({error:"Worker returned a non-JSON response."}));
   if(!response.ok) throw new Error(`Smart Intake worker failed (${response.status}): ${JSON.stringify(body)}`);
   return reply({ok:true,status:"completed",candidates:ready,worker:body,finishedAt:new Date().toISOString()});
 }catch(error){const message=error instanceof Error?error.message:"Astrum supervisor failed.";console.error(`[astrum-intake-supervisor] ${message}`);return reply({error:message},400);}
});