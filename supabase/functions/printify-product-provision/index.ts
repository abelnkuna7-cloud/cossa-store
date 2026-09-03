import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const PRINTIFY_BASE = "https://api.printify.com/v1";
const PRINTIFY_SHOP_ID = "28233755";
const COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const ALLOWED_ORIGINS = new Set(["https://store.cossanexusholdings.co.za","https://growth.cossanexusholdings.co.za","http://localhost:3000","http://localhost:5173"]);

function cors(request: Request): HeadersInit { const origin=request.headers.get("origin"); return {"Access-Control-Allow-Origin":origin&&ALLOWED_ORIGINS.has(origin)?origin:"","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Credentials":"true",Vary:"Origin"}; }
function json(request: Request, body: unknown, status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(request),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function uuid(v: unknown){return typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)}
async function requireUser(request:Request,client:ReturnType<typeof createClient>):Promise<User>{const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim();if(!token)throw new Error("Sign in is required.");const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw new Error("Your session could not be verified.");return data.user}
async function requireAdmin(admin:ReturnType<typeof createClient>,userId:string){const [membership,role]=await Promise.all([admin.from("organisation_members").select("role").eq("organisation_id",COSSA_ORGANISATION_ID).eq("user_id",userId).eq("status","active").in("role",["owner","admin"]),admin.from("user_roles").select("role").eq("user_id",userId).eq("role","admin")]);if(membership.error||role.error||(!(membership.data??[]).length&&!(role.data??[]).length))throw new Error("An authorised Cossa Store administrator is required.")}
async function pf(token:string,path:string,init:RequestInit={}){return fetch(`${PRINTIFY_BASE}${path}`,{...init,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",...(init.headers??{})}})}
function marker(productId:string){return `COSSA-PROVISION:${productId}`}

Deno.serve(async(request)=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(request)});
 if(request.method!=="POST")return json(request,{error:"Method not allowed."},405);
 const origin=request.headers.get("origin"); if(origin&&!ALLOWED_ORIGINS.has(origin))return json(request,{error:"Origin not allowed."},403);
 const supabaseUrl=Deno.env.get("SUPABASE_URL"), publishable=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), token=Deno.env.get("PRINTIFY_API_TOKEN");
 if(!supabaseUrl||!publishable||!service||!token)return json(request,{error:"Provisioning service is not configured."},503);
 const customer=createClient(supabaseUrl,publishable,{auth:{autoRefreshToken:false,persistSession:false}}),admin=createClient(supabaseUrl,service,{auth:{autoRefreshToken:false,persistSession:false}});
 try{
  const user=await requireUser(request,customer); await requireAdmin(admin,user.id);
  const body=await request.json().catch(()=>({})) as Record<string,any>;
  if(!uuid(body.storeProductId))throw new Error("A valid Cossa Store product ID is required.");
  const enabled=Deno.env.get("PRINTIFY_PRODUCT_PROVISIONING_ENABLED")==="true";
  const {data:product,error:pe}=await admin.from("store_products").select("id,name,sku,brand,status,price,currency,product_type,fulfilment_model,metadata").eq("id",body.storeProductId).eq("organisation_id",COSSA_ORGANISATION_ID).maybeSingle();
  if(pe||!product)throw new Error("Cossa Store product was not found.");
  if(product.brand!=="Cossa Lifestyle"||product.product_type!=="pod"||product.fulfilment_model!=="print_on_demand")throw new Error("Only Cossa Lifestyle POD products can use this provisioning service.");
  const blueprintId=Number(body.blueprintId), printProviderId=Number(body.printProviderId); if(!Number.isInteger(blueprintId)||!Number.isInteger(printProviderId))throw new Error("Blueprint and print-provider IDs are required.");
  if(typeof body.artworkImageId!=="string"||!body.artworkImageId.trim())throw new Error("A permanent Printify artwork image ID is required.");
  const {data:variants,error:ve}=await admin.from("store_product_variants").select("id,sku,title,is_available").eq("product_id",product.id).eq("is_available",true).order("sort_order",{ascending:true}); if(ve)throw ve; if(!(variants??[]).length)throw new Error("At least one available Cossa variant is required.");
  const requested=new Map<string,number>((Array.isArray(body.variantMappings)?body.variantMappings:[]).map((x:any)=>[String(x.storeVariantId),Number(x.providerVariantId)]));
  for(const v of variants??[])if(!Number.isInteger(requested.get(v.id)))throw new Error(`Missing Printify variant mapping for ${v.title}.`);

  const persist=async(providerProductId:string,reconciled:boolean)=>{
    const rows=(variants??[]).map((v:any)=>({organisation_id:COSSA_ORGANISATION_ID,store_product_id:product.id,store_variant_id:v.id,provider:"Printify",provider_product_id:providerProductId,provider_variant_id:String(requested.get(v.id)),blueprint_id:String(blueprintId),print_provider_id:String(printProviderId),artwork_asset_ref:String(body.artworkImageId),fulfilment_status:"active",sync_status:"synced",metadata:{cossa_owned_configured_product:true,provisioning_mode:"preconfigured_product",provisioning_key:marker(product.id),printify_shop_id:PRINTIFY_SHOP_ID,reconciled,provisioned_at:new Date().toISOString()}}));
    const {error}=await admin.from("store_product_fulfilment_mappings").upsert(rows,{onConflict:"organisation_id,store_product_id,store_variant_id,provider"});
    if(error)throw error;
    return rows.length;
  };

  const {data:existing,error:ee}=await admin.from("store_product_fulfilment_mappings").select("provider_product_id,metadata").eq("organisation_id",COSSA_ORGANISATION_ID).eq("store_product_id",product.id).eq("provider","Printify").eq("fulfilment_status","active"); if(ee)throw ee;
  const permanent=(existing??[]).find((m:any)=>m.provider_product_id&&m.metadata?.cossa_owned_configured_product===true);
  if(permanent)return json(request,{provisioned:true,reused:true,reconciled:false,providerProductId:permanent.provider_product_id,message:"Permanent Cossa-owned Printify product already exists; no duplicate was created."});

  // Recovery-before-create: if a prior Printify create succeeded but our DB write failed,
  // find the Cossa provisioning marker in the shop and repair mappings instead of creating again.
  let page=1; let recovered:any=null;
  while(page<=10&&!recovered){
    const list=await pf(token,`/shops/${PRINTIFY_SHOP_ID}/products.json?page=${page}&limit=100`);
    if(!list.ok)throw new Error(`Printify reconciliation lookup failed (${list.status}).`);
    const payload=await list.json().catch(()=>null); const products=Array.isArray(payload?.data)?payload.data:Array.isArray(payload)?payload:[];
    recovered=products.find((p:any)=>String(p?.description??"").includes(marker(product.id)));
    const last=Number(payload?.last_page??page); if(page>=last)break; page++;
  }
  if(recovered?.id){
    const count=await persist(String(recovered.id),true);
    return json(request,{provisioned:true,reused:true,reconciled:true,providerProductId:String(recovered.id),variantCount:count,message:"Recovered the existing Cossa-owned Printify product and repaired permanent mappings; no duplicate was created."});
  }

  const printifyVariants=(variants??[]).map((v:any)=>({id:requested.get(v.id),price:Math.max(1,Math.round(Number(product.price)*100)),is_enabled:true}));
  const printAreas=[{variant_ids:printifyVariants.map((v:any)=>v.id),placeholders:[{position:body.printArea||"front",decoration_method:body.decorationMethod||"dtg",images:[{id:body.artworkImageId,x:Number(body.x??0.5),y:Number(body.y??0.5),scale:Number(body.scale??0.75),angle:Number(body.angle??0)}]}]}];
  const description=`${String(body.description??`Cossa Lifestyle — ${product.name}`)}\n\n${marker(product.id)}`;
  const payload={title:product.name,description,blueprint_id:blueprintId,print_provider_id:printProviderId,variants:printifyVariants,print_areas:printAreas};
  if(!enabled)return json(request,{provisioned:false,dryRun:true,killSwitch:"PRINTIFY_PRODUCT_PROVISIONING_ENABLED",reconciliationChecked:true,payload:{...payload,description:"validated with permanent Cossa provisioning marker",print_areas:"validated but redacted from log"},variantCount:printifyVariants.length});
  const create=await pf(token,`/shops/${PRINTIFY_SHOP_ID}/products.json`,{method:"POST",body:JSON.stringify(payload)}); const created=await create.json().catch(()=>null); if(!create.ok||!created?.id)throw new Error(`Printify product creation failed (${create.status}).`);
  const providerProductId=String(created.id);
  try{
    const count=await persist(providerProductId,false);
    return json(request,{provisioned:true,reused:false,reconciled:false,providerProductId,variantCount:count,publicationRequested:false,orderCreated:false,sentToProduction:false});
  }catch(me){
    console.error(JSON.stringify({event:"printify_mapping_persist_failed",providerProductId,message:me instanceof Error?me.message:String(me),provisioningKey:marker(product.id)}));
    return json(request,{error:"Printify product was created but mapping persistence failed. Retry provisioning: the reconciliation pass will recover this exact Cossa product instead of creating a duplicate.",providerProductId,reconciliationRequired:true,provisioningKey:marker(product.id)},500);
  }
 }catch(error){const message=error instanceof Error?error.message:"Provisioning failed.";console.error(JSON.stringify({event:"printify_product_provision_failed",message}));return json(request,{error:message},400)}
});