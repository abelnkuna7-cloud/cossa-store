import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CatalogueShell, useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { EmptyBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/fulfilment-operations")({ component: FulfilmentOperationsPage });

type Job = { id:string; provider:string; status:string; attempts:number; max_attempts:number; last_error:string|null; available_at:string; created_at:string; store_order_id:string; result:unknown };

function FulfilmentOperationsPage() {
  const access = useCatalogueAccess();
  const query = useQuery({
    queryKey:["fulfilment-operations"],
    enabled:access.isAdmin,
    refetchInterval:30_000,
    queryFn:async()=>{
      const { data, error } = await supabase.from("store_fulfilment_outbox").select("id,provider,status,attempts,max_attempts,last_error,available_at,created_at,store_order_id,result").order("created_at",{ascending:false}).limit(100);
      if(error) throw error;
      return (data??[]) as Job[];
    },
  });
  const jobs=query.data??[];
  const counts={attention:jobs.filter(j=>j.status==="dead_letter").length,retrying:jobs.filter(j=>j.status==="retry").length,processing:jobs.filter(j=>j.status==="processing").length,pending:jobs.filter(j=>j.status==="pending").length,completed:jobs.filter(j=>j.status==="completed").length};

  return <CatalogueShell title="Fulfilment operations" description="Exception-first command center. Routine supplier work runs automatically; this screen surfaces only work that needs operational attention.">
    {!access.isAdmin?<EmptyBlock title="Administrator access required" description="Fulfilment controls are restricted to Cossa administrators."/>:query.isPending?<LoadingBlock label="Loading fulfilment health…"/>:<>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[["Needs attention",counts.attention],["Retrying",counts.retrying],["Processing",counts.processing],["Pending",counts.pending],["Completed",counts.completed]].map(([label,value])=><Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{value}</p></CardContent></Card>)}
      </div>
      <div className="mt-6 space-y-3">
        {jobs.filter(j=>j.status!=="completed").length===0?<EmptyBlock title="No operational exceptions" description="The automated fulfilment pipeline currently has no pending, retrying, processing or dead-letter work."/>:jobs.filter(j=>j.status!=="completed").map(job=><Card key={job.id}><CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><strong>{job.provider}</strong><Badge variant={job.status==="dead_letter"?"destructive":"secondary"}>{job.status.replace("_"," ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Order {job.store_order_id} · attempt {job.attempts}/{job.max_attempts}</p>{job.last_error?<p className="mt-2 max-w-3xl text-sm">{job.last_error}</p>:null}</div><p className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString()}</p></CardContent></Card>)}
      </div>
    </>}
  </CatalogueShell>;
}
