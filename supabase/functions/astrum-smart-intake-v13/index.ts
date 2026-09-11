import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORG = "00000000-0000-4000-8000-000000000001";
const SUP = "3b625ee7-25d4-4604-afd5-2a0909ac04b6";
const IMAGE_BUCKET = "store-product-images";
const HARD_HOLDS = new Set(["ASPKSM510B","APB20PB","ALCP156B","ALCP172B","A32305-A","A14521-B","AENP4310B","ASB100NB"]);
const PRIORITY = ["Headphones","Earbuds","SMART DEVICES","Power Banks","Mobile Chargers","Adapters &amp; Converters","Networking"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
async function sha(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2,"0")).join("");
}
async function auth(admin: any, req: Request) {
  const token = req.headers.get("x-cossa-automation-token")?.trim() || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Authorization required");
  const { data, error } = await admin.from("supplier_automation_tokens").select("id").eq("provider","Astrum Smart Intake").eq("token_hash",await sha(token)).eq("active",true).maybeSingle();
  if (error || !data) throw new Error("Authorization failed");
}
function clean(v: string) {
  return v.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
}
function meta(h: string, p: string) {
  const a = h.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)["']`,"i")) || h.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${p}["']`,"i"));
  return a?.[1] ? clean(a[1]) : "";
}
function model(v: string) {
  return (v.match(/\b[A-Z]{1,10}[ -]?\d{2,6}[A-Z0-9-]*\b/i)?.[0] || "").replace(/\s+/g,"").toUpperCase();
}
function colour(v: string) {
  const m = v.toLowerCase().match(/\b(black|white|gold|silver|grey|gray|red|blue|green|pink|purple|orange|yellow)\b/);
  return m?.[1] || "";
}
async function fetchHtml(url: string) {
  const r = await fetch(url,{headers:{"User-Agent":"CossaStore-SmartIntake/3.0",Accept:"text/html,application/xhtml+xml",Referer:"https://astrum.co.za/"}});
  if (!r.ok) throw new Error(`Astrum request failed ${r.status}`);
  return await r.text();
}
function identityOk(html: string, intake: any) {
  const text = clean(html).toLowerCase();
  const ref = String(intake.supplier_product_ref).toLowerCase();
  const m = model(intake.name).toLowerCase();
  if (!(text.includes(ref) || (m && text.includes(m)))) return false;
  const c = colour(intake.name);
  if (c && !text.includes(c)) return false;
  return true;
}
async function resolvePage(intake: any) {
  const candidates: string[] = [];
  const src = String(intake.source_url || "");
  if (/^https:\/\/(www\.)?astrum\.co\.za\/product\//i.test(src)) candidates.push(src);
  for (const q of [model(intake.name), intake.supplier_product_ref].filter(Boolean)) {
    const h = await fetchHtml(`https://astrum.co.za/?s=${encodeURIComponent(String(q))}`);
    for (const m of h.matchAll(/href=["'](https:\/\/astrum\.co\.za\/product\/[^"'#?]+\/?)["']/gi)) candidates.push(m[1]);
  }
  for (const u of [...new Set(candidates)].slice(0,20)) {
    try { const h = await fetchHtml(u); if (identityOk(h,intake)) return {url:u,html:h}; } catch { }
  }
  throw new Error("Exact Astrum product identity could not be verified");
}
function gallery(html: string, title: string, ref: string) {
  const out = new Map<string,string>();
  const mt = model(title).toLowerCase();
  const add = (u: string) => {
    u = u.replace(/&amp;/g,"&");
    if (!/^https:\/\/astrum\.co\.za\/wp-content\/uploads\//i.test(u)) return;
    if (/logo|favicon|placeholder|banner|header|footer|icon|avatar|payment|astrum-2\.png/i.test(u)) return;
    const key = u.replace(/-\d+x\d+(?=\.[a-z]+(?:\?|$))/i,"").replace(/\?.*$/,"").toLowerCase();
    out.set(key,u);
  };
  const og = meta(html,"og:image"); if (og) add(og);
  for (const m of html.matchAll(/(?:src|data-src|data-lazy-src|data-large_image|href)=["'](https:\/\/astrum\.co\.za\/wp-content\/uploads\/[^"']+)["']/gi)) {
    const u=m[1], idx=m.index||0, ctx=html.slice(Math.max(0,idx-350),idx+350).toLowerCase();
    if ((mt && u.toLowerCase().includes(mt)) || u.toLowerCase().includes(ref.toLowerCase()) || ctx.includes("product-gallery")) add(u);
  }
  return [...out.values()].slice(0,8);
}
function descriptionSection(html: string) {
  const m = html.match(/<[^>]+id=["']tab-description["'][^>]*>([\s\S]*?)(?:<\/div>|<\/section>)/i);
  return clean(m?.[1] || "");
}
function features(html: string) {
  const section = html.match(/<[^>]+id=["']tab-description["'][^>]*>([\s\S]*?)(?:<\/div>|<\/section>)/i)?.[1] || "";
  const out:string[]=[];
  for(const m of section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)){const t=clean(m[1]);if(t.length>=8&&t.length<=180&&!/^sku:/i.test(t))out.push(t);if(out.length>=12)break;}
  return [...new Set(out)];
}
function classify(cat: string|null, title: string) {
  const h=`${cat||""} ${title}`.toLowerCase();
  if(/camera|cctv|security/.test(h))return["security-smart-home",["cctv-cameras","security-systems"]];
  if(/headphone|headset|earbud|tws|neckband/.test(h))return["technology-electronics",["audio","headphones"]];
  if(/watch|fitness band|wearable/.test(h))return["technology-electronics",["wearables","smart-devices"]];
  if(/router|mifi|wi-?fi|network|ethernet|fibre|fiber/.test(h))return["technology-electronics",["networking","computer-accessories"]];
  if(/charger|power bank|powerbank|charging/.test(h))return["technology-electronics",["power-charging","cables-adapters"]];
  if(/keyboard/.test(h))return["technology-electronics",["computer-accessories","productivity-equipment"]];
  if(/ssd|nvme|enclosure|storage|memory/.test(h))return["technology-electronics",["storage-devices","computer-accessories"]];
  if(/cable|adapter|converter/.test(h))return["technology-electronics",["cables-adapters","computer-accessories"]];
  return["technology-electronics",["computer-accessories"]];
}
function physical(text:string){const d=text.match(/dimensions?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)/i),w=text.match(/(?:product\s*)?weight\s*[:\-]?\s*(?:approx\.?\s*)?(\d+(?:\.\d+)?)\s*(g|kg)/i);return{dims:d?{length:Number(d[1])*(d[4].toLowerCase()==="mm"?.1:1),width:Number(d[2])*(d[4].toLowerCase()==="mm"?.1:1),height:Number(d[3])*(d[4].toLowerCase()==="mm"?.1:1)}:null,kg:w?Number(w[1])*(w[2].toLowerCase()==="g"?.001:1):null};}
function evidence(body:any,ref:string){const rows=Array.isArray(body?.marketEvidence?.[ref])?body.marketEvidence[ref]:[];return rows.filter((x:any)=>x&&Number(x.price)>0&&x.exactMatch!==false).map((x:any)=>({retailer:String(x.retailer||"competitor"),price:Number(x.price),url:x.url?String(x.url):null,observedAt:x.observedAt?String(x.observedAt):null}));}
function pricing(cost:number,rrp:number,ev:any[]){const acquisition=cost*1.15,floor=acquisition/.85,prices=ev.map(x=>x.price).sort((a,b)=>a-b);let median:number|null=null;if(prices.length){const n=prices.length;median=n%2?prices[(n-1)/2]:(prices[n/2-1]+prices[n/2])/2;}let recommended=Math.max(floor,rrp||floor);let status="supplier_rrp_pending_market";if(median){const marketTarget=median*1.02;recommended=Math.max(floor,Math.min(rrp||marketTarget,marketTarget));status=median<floor?"margin_market_tension":"market_aligned";}recommended=Math.ceil(recommended);return{acquisition:Number(acquisition.toFixed(2)),marginFloor:Number(floor.toFixed(2)),marketMedian:median?Number(median.toFixed(2)):null,recommended,status};}
async function copyImage(admin:any,id:string,u:string){const r=await fetch(u,{headers:{"User-Agent":"CossaStore-SmartIntake/3.0",Referer:"https://astrum.co.za/"}});if(!r.ok)throw new Error("Image fetch failed");const ct=(r.headers.get("content-type")||"").split(";")[0];if(!ct.startsWith("image/")||/svg|gif/.test(ct))throw new Error("Unsupported image");const b=new Uint8Array(await r.arrayBuffer());if(!b.length||b.length>12582912)throw new Error("Invalid image");const dig=await crypto.subtle.digest("SHA-256",b),hex=Array.from(new Uint8Array(dig)).map(x=>x.toString(16).padStart(2,"0")).join(""),ext=ct.includes("png")?"png":ct.includes("webp")?"webp":"jpg",path=`intake/${id}/${hex}.${ext}`;const{error}=await admin.storage.from(IMAGE_BUCKET).upload(path,b,{contentType:ct,cacheControl:"31536000",upsert:false});if(error&&!/already exists|duplicate/i.test(error.message))throw error;return admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return json({error:"Not configured"},503);
  const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  try{
    await auth(admin,req);const body=await req.json().catch(()=>({}));const dry=body.dryRun===true,max=Math.max(1,Math.min(12,Number(body.maxItems)||4));let q=admin.from("store_inventory_intakes").select("id,name,supplier_product_ref,supplier_category,approval_status,publication_store_product_id,supplier_available_stock,supplier_cost,supplier_rrp,fulfilment_profile_id,source_url,import_trace,fields_requiring_confirmation").eq("organisation_id",ORG).eq("supplier_id",SUP).eq("approval_status","review").is("publication_store_product_id",null).gt("supplier_available_stock",0).gt("supplier_cost",0).not("fulfilment_profile_id","is",null);
    if(Array.isArray(body.refs)&&body.refs.length)q=q.in("supplier_product_ref",body.refs.map(String));
    const{data,error}=await q.limit(80);if(error)throw error;const rows=(data||[]).filter((x:any)=>!HARD_HOLDS.has(x.supplier_product_ref)).sort((a:any,b:any)=>{const ai=PRIORITY.indexOf(a.supplier_category),bi=PRIORITY.indexOf(b.supplier_category);return(ai<0?99:ai)-(bi<0?99:bi)||Number(b.supplier_available_stock)-Number(a.supplier_available_stock)}).slice(0,max),results:any[]=[];
    for(const i of rows){const ref=i.supplier_product_ref;try{const p=await resolvePage(i),title=meta(p.html,"og:title").replace(/\s*[–|-]\s*Experience the difference\s*$/i,"")||i.name,short=meta(p.html,"og:description")||`Official Astrum ${title}.`,desc=descriptionSection(p.html)||short,imgs=gallery(p.html,title,ref);if(!imgs.length)throw new Error("Verified Astrum gallery unavailable");const fs=features(p.html),[dept,subs]=classify(i.supplier_category,title) as [string,string[]],phys=physical(clean(p.html)),ev=evidence(body,ref),price=pricing(Number(i.supplier_cost),Number(i.supplier_rrp||0),ev),score=25+20+10+10+10+5+5+(ev.length?15:0),confirm=[...(Array.isArray(i.fields_requiring_confirmation)?i.fields_requiring_confirmation:[])].filter((x:string)=>!/category review required|description evidence|specifications evidence|image evidence/i.test(x));if(!ev.length&&!confirm.includes("market price evidence"))confirm.push("market price evidence");if(!phys.kg&&!confirm.includes("delivery weight evidence"))confirm.push("delivery weight evidence");if(!phys.dims&&!confirm.includes("delivery dimensions evidence"))confirm.push("delivery dimensions evidence");if(dry){results.push({ref,status:"dry_run_prepared",title,sourceUrl:p.url,galleryCount:imgs.length,department:dept,subdepartments:subs,pricing:price,qualityScore:score,confirm});continue;}const hosted:string[]=[];for(const u of imgs){try{const h=await copyImage(admin,i.id,u);if(!hosted.includes(h))hosted.push(h);}catch{}}if(!hosted.length)throw new Error("No official image copied to Cossa custody");const trace=Array.isArray(i.import_trace)?i.import_trace:[],now=new Date().toISOString();const upd:any={name:title,short_description:short.slice(0,500),description:desc.slice(0,3500),specifications:`Supplier reference: ${ref}${phys.kg?`\nWeight: ${phys.kg<1?Math.round(phys.kg*1000)+" g":phys.kg.toFixed(2)+" kg"}`:""}${phys.dims?`\nDimensions: ${phys.dims.length.toFixed(1)} x ${phys.dims.width.toFixed(1)} x ${phys.dims.height.toFixed(1)} cm`:""}`,category:dept,brand:"Astrum",image_urls:hosted,source_url:p.url,features:fs,additional_categories:subs,calculated_selling_price:price.recommended,compare_at_price:Number(i.supplier_rrp)>price.recommended?Number(i.supplier_rrp):null,market_price:price.marketMedian,market_price_notes:`Smart Intake v13 pricing: ${price.status}; acquisition R${price.acquisition}; 15% margin floor R${price.marginFloor}; proposed R${price.recommended}. Product is not rejected for price; hold for price optimisation when market and margin conflict.`,last_price_checked_at:ev.length?now:null,fields_requiring_confirmation:confirm,operational_notes:`Smart Intake v13 prepared ${ref}. Exact Astrum identity and official images verified. Quality ${score}/100. Approval status intentionally unchanged.`,import_trace:[...trace,{field:"smart_intake_v13",sourceUrl:p.url,observedAt:now,qualityScore:score,pricing:price,marketEvidence:ev,hostedImageCount:hosted.length}]};const{error:ue}=await admin.from("store_inventory_intakes").update(upd).eq("id",i.id).eq("approval_status","review");if(ue)throw ue;results.push({ref,status:"prepared_review",qualityScore:score,proposedPrice:price.recommended,marketEvidence:ev.length,hostedImages:hosted.length,sourceUrl:p.url});}catch(e){results.push({ref,status:"held",reason:e instanceof Error?e.message:"Unknown failure"});}}
    return json({ok:true,dryRun:dry,processed:results.length,results,finishedAt:new Date().toISOString()});
  }catch(e){return json({error:e instanceof Error?e.message:"Smart Intake v13 failed"},400);}
});