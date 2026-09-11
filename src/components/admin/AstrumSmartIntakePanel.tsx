import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type QueueStatus = "pending" | "processing" | "prepared" | "hold" | "retry" | "failed" | "hard_hold";

type AstrumQueueRow = {
  id: string;
  supplier_product_ref: string;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_error: string | null;
  last_error_class: string | null;
  updated_at: string;
};

const STATUS_ORDER: QueueStatus[] = ["pending", "processing", "prepared", "hold", "retry", "failed", "hard_hold"];

function labelStatus(status: QueueStatus): string {
  return status.replace(/_/g, " ");
}

function loadAstrumQueue() {
  return db
    .from("astrum_intake_v13_queue")
    .select("id,supplier_product_ref,status,attempts,max_attempts,next_attempt_at,last_started_at,last_completed_at,last_error,last_error_class,updated_at")
    .order("updated_at", { ascending: false })
    .then(({ data, error }: any) => {
      if (error) throw error;
      return (data ?? []) as AstrumQueueRow[];
    });
}

export function AstrumSmartIntakePanel() {
  const queue = useQuery({
    queryKey: ["admin", "astrum-smart-intake-v13-queue"],
    queryFn: loadAstrumQueue,
    refetchInterval: 60_000,
  });
  const [filter, setFilter] = useState<"all" | QueueStatus>("all");

  const rows = queue.data ?? [];
  const counts = useMemo(() => {
    const base = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<QueueStatus, number>;
    for (const row of rows) base[row.status] = (base[row.status] ?? 0) + 1;
    return base;
  }, [rows]);

  const filtered = filter === "all" ? rows : rows.filter((row) => row.status === filter);
  const latest = filtered.slice(0, 30);
  const active = counts.pending + counts.processing + counts.retry;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            <h2 className="text-lg font-semibold">Astrum Smart Intake V13</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Controlled preparation queue for Astrum products. It verifies exact identity and evidence, prepares safe review records, and never publishes products or changes CEO-approved selling prices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
            {active > 0 ? "Automation active · every 10 min" : "Queue idle"}
          </span>
          <Button size="sm" variant="outline" onClick={() => void queue.refetch()} disabled={queue.isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${queue.isFetching ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {queue.isError ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          Smart Intake status could not be loaded. The server queue remains protected; refresh or check admin access.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(filter === status ? "all" : status)}
                className={`rounded-lg border p-3 text-left transition-colors ${filter === status ? "border-foreground/40 bg-secondary" : "border-border bg-background/40 hover:bg-secondary/40"}`}
              >
                <div className="text-xs capitalize text-muted-foreground">{labelStatus(status)}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{queue.isPending ? "—" : counts[status]}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{rows.length} queue records · showing {latest.length}{filter !== "all" ? ` ${labelStatus(filter)}` : " most recent"}</span>
            <span>Prepared items still require CEO review before publication.</span>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Astrum ref</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Reason / note</th>
                  <th className="px-3 py-2">Last activity</th>
                  <th className="px-3 py-2">Next attempt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latest.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>{queue.isPending ? "Loading Smart Intake queue…" : "No queue records match this filter."}</td></tr>
                ) : latest.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-2 font-mono text-xs font-medium">{row.supplier_product_ref}</td>
                    <td className="px-3 py-2"><span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize">{labelStatus(row.status)}</span></td>
                    <td className="px-3 py-2 tabular-nums">{row.attempts}/{row.max_attempts}</td>
                    <td className="max-w-[360px] px-3 py-2 text-xs text-muted-foreground">{row.last_error ?? (row.status === "prepared" ? "Prepared safely for CEO review" : "—")}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleString("en-ZA")}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.status === "retry" ? new Date(row.next_attempt_at).toLocaleString("en-ZA") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
