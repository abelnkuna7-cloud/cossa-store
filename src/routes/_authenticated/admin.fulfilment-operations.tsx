import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CatalogueShell, useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { EmptyBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/fulfilment-operations")({ component: FulfilmentOperationsPage });
type Job={id:string;provider:string;status:string;attempts:number;max_attempts:number;last_error:string|null;available_at:string;created_at:string;store_order_id:string;result:any};
type Action="hold"|"release"|"retry"|"cancel"|"investigate"|"approve_production";

function FulfilmentOperationsPage(){
 const access=useCatalogueAccess(),qc=useQueryClient(); const [reason,setReason]=useState<Record<string,string>>({});
 const query=useQuery({queryKey:["fulfilment-operations"],enabled:access.isAdmin,refetchInterval:30_000,queryFn:async()=>{const{data,error}=await supabase.from("store_fulfilment_outbox").select("id,provider,status,attempts,max_attempts,last_error,available_at,created_at,store_order_id,result").order("created_at",{ascending:false}).limit(100);if(error)throw error;return(data??[]) as Job[]}});
 const action=useMutation({mutationFn:async(v:{jobId:string;action:Action;reason:string})=>{if(v.reason.trim().length<3)throw new Error("Enter a short reason before taking an action.");const{data,error}=await supabase.rpc("execute_store_fulfilment_action",{p_job_id:v.jobId,p_action:v.action,p_reason:v.reason.trim()});if(error)throw error;return data},onSuccess:async()=>{await qc.invalidateQueries({queryKey:["fulfilment-operations"]})}});
 const jobs=query.data??[],counts={attention:jobs.filter(j=>j.status==="dead_letter").length,retrying:jobs.filter(j=>j.status==="retry").length,processing:jobs.filter(j=>j.status==="processing").length,pending:jobs.filter(j=>j.status==="pending").length,completed:jobs.filter(j=>j.status==="completed").length};
 const run=(j:Job,a:Action)=>action.mutate({jobId:j.id,action:a,reason:reason[j.id]??""});
 return <CatalogueShell title="Fulfilment operations" description="Exception-first action center. Agents handle routine work; administrators approve or intervene only where authority is required.">
 {!access.isAdmin?<EmptyBlock title="Administrator access required" description="Fulfilment controls are restricted to Cossa administrators."/>:query.isPending?<LoadingBlock label="Loading fulfilment health…"/>:<>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Needs attention",counts.attention],["Retrying",counts.retrying],["Processing",counts.processing],["Pending",counts.pending],["Completed",counts.completed]].map(([l,v])=><Card key={String(l)}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{v}</p></CardContent></Card>)}</div>
 {action.error?<p className="mt-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive">{action.error instanceof Error?action.error.message:"Action failed."}</p>:null}
 <div className="mt-6 space-y-3">{jobs.filter(j=>j.status!=="completed").length===0?<EmptyBlock title="No operational exceptions" description="The automated fulfilment pipeline currently has no unresolved work."/>:jobs.filter(j=>j.status!=="completed").map(j=>{const held=j.result?.human_hold===true;return <Card key={j.id}><CardContent className="p-4"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><div className="flex items-center gap-2"><strong>{j.provider}</strong><Badge variant={j.status==="dead_letter"?"destructive":"secondary"}>{held?"human hold":j.status.replace("_"," ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Order {j.store_order_id} · attempt {j.attempts}/{j.max_attempts}</p>{j.last_error?<p className="mt-2 max-w-3xl text-sm">{j.last_error}</p>:null}</div><p className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</p></div>
 <div className="mt-4 border-t pt-4"><Input value={reason[j.id]??""} onChange={e=>setReason(s=>({...s,[j.id]:e.target.value}))} placeholder="Reason / decision note (required)" className="max-w-xl"/><div className="mt-3 flex flex-wrap gap-2">{held?<Button size="sm" onClick={()=>run(j,"release")} disabled={action.isPending}>Release</Button>:<Button size="sm" variant="outline" onClick={()=>run(j,"hold")} disabled={action.isPending}>Hold</Button>}{["dead_letter","retry"].includes(j.status)?<Button size="sm" variant="outline" onClick={()=>run(j,"retry")} disabled={action.isPending}>Retry</Button>:null}<Button size="sm" variant="outline" onClick={()=>run(j,"investigate")} disabled={action.isPending}>Investigate</Button>{j.provider==="Printify"?<Button size="sm" onClick={()=>run(j,"approve_production")} disabled={action.isPending}>Approve production</Button>:null}<Button size="sm" variant="destructive" onClick={()=>run(j,"cancel")} disabled={action.isPending}>Cancel</Button></div><p className="mt-2 text-xs text-muted-foreground">Approve production records authorization only. Financial, payment, supplier-state and production kill-switch gates still run before any supplier spend.</p></div>
 </CardContent></Card>})}</div></>}
 </CatalogueShell>;
}
