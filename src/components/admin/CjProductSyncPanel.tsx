import { useState } from "react";
import { CheckCircle2, CircleAlert, ClipboardCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type CjShipping =
  | {
      status: "verified";
      carrier: string;
      aging: string;
      origin: string;
      freightUsd: number;
      minDays: number | null;
      maxDays: number | null;
      variantId: string;
    }
  | { status: "unverified" | "unavailable"; reason: string; variantId: string | null };

type CjPreview = {
  productId: string;
  title: string;
  category: string | null;
  variants: Array<{
    id: string;
    sku: string | null;
    title: string;
    sourcePriceUsd: number | null;
    stockQuantity: number | null;
    available: boolean;
    warehouse: string | null;
  }>;
  totalInventory: number;
  inventoryUnitsKnown: boolean;
  inventorySource: string;
  shipping: CjShipping;
  duplicate: { id: string; status: string } | null;
  pricing: {
    supplierCostUsd: number | null;
    freightUsd: number | null;
    landedCostZar: number | null;
    bufferedCostZar: number | null;
    proposedSellingPriceZar: number | null;
    grossProfitZar: number | null;
    grossMargin: number | null;
    fxZarPerUsd: number;
    targetGrossMargin: number;
  };
  outcome:
    | "SHIPPING_UNVERIFIED"
    | "REJECTED_NO_ZA_SHIPPING"
    | "REJECTED_NO_STOCK"
    | "REJECTED_LOW_MARGIN"
    | "REJECTED_COMPLIANCE"
    | "REVIEW_PRICING"
    | "READY_FOR_REVIEW";
  reasons: string[];
  checkedAt: string;
};

type CjInspectionResult = { action: "inspect"; preview: CjPreview; readOnly: true };
type CjDraftResult = {
  action: "create_private_draft";
  preview: CjPreview;
  draft: {
    action: "create" | "update_draft" | "reopen_archived" | "preserve_active";
    productId: string | null;
    status?: "draft";
    message: string;
  };
};

async function invokeQualification<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.refreshSession();
  if (sessionError || !session?.access_token) {
    throw new Error("Please sign in again to use CJ acquisition controls.");
  }
  const { data, error } = await supabase.functions.invoke("cj-qualification", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    const context = (error as { context?: unknown }).context as {
      clone?: () => { json?: () => Promise<unknown> };
      json?: () => Promise<unknown>;
    } | null;
    const response = typeof context?.clone === "function" ? context.clone() : context;
    const payload =
      typeof response?.json === "function" ? await response.json().catch(() => null) : null;
    if (
      payload &&
      typeof payload === "object" &&
      typeof (payload as { error?: unknown }).error === "string"
    ) {
      throw new Error((payload as { error: string }).error);
    }
    throw new Error((error as { message?: string }).message || "CJ qualification failed.");
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

function zar(value: number | null | undefined): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        minimumFractionDigits: 2,
      }).format(value);
}

function usd(value: number | null | undefined): string {
  return value == null ? "—" : `US$ ${value.toFixed(2)}`;
}

function label(value: string): string {
  return value.replace(/_/g, " ");
}

export function CjProductSyncPanel({ onSynced }: { onSynced?: () => void }) {
  const [working, setWorking] = useState<"inspect" | "save" | null>(null);
  const [requestedProduct, setRequestedProduct] = useState("");
  const [preview, setPreview] = useState<CjPreview | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  async function inspect() {
    const productRef = requestedProduct.trim();
    if (!productRef) {
      setLastError("Paste an exact CJ product ID or CJ product link first.");
      return;
    }
    setWorking("inspect");
    setLastError(null);
    setDraftMessage(null);
    try {
      const result = await invokeQualification<CjInspectionResult>({
        action: "inspect",
        productRef,
      });
      setPreview(result.preview);
      toast.success("CJ inspection complete", {
        description: "Nothing was added, activated, archived or published.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "CJ qualification failed.";
      setLastError(message);
      toast.error(message);
    } finally {
      setWorking(null);
    }
  }

  async function savePrivateDraft() {
    const productRef = requestedProduct.trim();
    if (!productRef || !preview) return;
    setWorking("save");
    setLastError(null);
    try {
      const result = await invokeQualification<CjDraftResult>({
        action: "create_private_draft",
        productRef,
      });
      setPreview(result.preview);
      setDraftMessage(result.draft.message);
      toast.success("CJ Storeroom action complete", { description: result.draft.message });
      onSynced?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The CJ Storeroom draft could not be saved.";
      setLastError(message);
      toast.error(message);
    } finally {
      setWorking(null);
    }
  }

  const canSave = preview?.outcome === "READY_FOR_REVIEW";
  const shipping = preview?.shipping;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="max-w-4xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden />
          <h2 className="font-semibold">CJ acquisition control</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Bulk CJ acquisition remains paused. Inspect one exact product, review its live evidence,
          then explicitly save a private Storeroom draft when it is ready.
        </p>

        <div className="mt-3 grid gap-2 rounded-md border border-border bg-background/60 p-3 text-xs sm:grid-cols-3">
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <span>Inspection is read-only: it cannot create or change Store products.</span>
          </div>
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <span>Private draft creation is a separate, deliberate staff action.</span>
          </div>
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <span>Commercial approval and publication remain separate.</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={requestedProduct}
            onChange={(event) => {
              setRequestedProduct(event.target.value);
              setPreview(null);
              setDraftMessage(null);
            }}
            placeholder="Paste an exact CJ product ID or CJ product link"
            aria-label="CJ product ID or link"
            disabled={working !== null}
          />
          <Button
            type="button"
            onClick={() => void inspect()}
            disabled={working !== null || !requestedProduct.trim()}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden />
            {working === "inspect" ? "Inspecting…" : "Inspect & qualify"}
          </Button>
        </div>
      </div>

      {lastError ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {lastError}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 rounded-md border border-border bg-background/60 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium">{preview.title || "CJ product details incomplete"}</p>
              <p className="font-mono text-xs text-muted-foreground">{preview.productId}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {preview.variants.filter((variant) => variant.available).length}/
                {preview.variants.length} variants available ·{" "}
                {preview.inventoryUnitsKnown
                  ? `${preview.totalInventory} units reported`
                  : "availability reported without unit counts"}
              </p>
            </div>
            <span
              className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${canSave ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" : "border-amber-500/40 bg-amber-500/10 text-amber-800"}`}
            >
              {label(preview.outcome)}
            </span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Supplier cost" value={usd(preview.pricing.supplierCostUsd)} />
            <Metric label="ZA freight" value={usd(preview.pricing.freightUsd)} />
            <Metric label="Landed cost" value={zar(preview.pricing.landedCostZar)} />
            <Metric label="Proposed price" value={zar(preview.pricing.proposedSellingPriceZar)} />
            <Metric label="Gross profit" value={zar(preview.pricing.grossProfitZar)} />
            <Metric
              label="Gross margin"
              value={
                preview.pricing.grossMargin == null
                  ? "—"
                  : `${(preview.pricing.grossMargin * 100).toFixed(1)}%`
              }
            />
            <Metric
              label="Protected FX"
              value={`US$1 = R${preview.pricing.fxZarPerUsd.toFixed(2)}`}
            />
            <Metric
              label="Target margin"
              value={`${(preview.pricing.targetGrossMargin * 100).toFixed(0)}%`}
            />
          </div>

          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">South Africa shipping</p>
            {shipping?.status === "verified" ? (
              <p className="mt-1 text-muted-foreground">
                {shipping.carrier} · {usd(shipping.freightUsd)} ·{" "}
                {shipping.aging || "delivery time not returned"} · origin {shipping.origin}
              </p>
            ) : (
              <p className="mt-1 text-amber-700">
                {shipping?.reason ?? "Shipping needs verification."}
              </p>
            )}
          </div>

          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">Review notes</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {preview.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          {preview.duplicate ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
              Existing CJ record detected: {preview.duplicate.status}. Saving will update the
              private record where safe; it will not create a duplicate or alter an active public
              record.
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/30 p-3">
            <Button
              type="button"
              onClick={() => void savePrivateDraft()}
              disabled={working !== null || !canSave}
            >
              {working === "save" ? "Saving private draft…" : "Create private Storeroom draft"}
            </Button>
            {!canSave ? (
              <span className="flex items-center gap-1 text-xs text-amber-800">
                <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                Resolve the qualification result before saving.
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void inspect()}
              disabled={working !== null}
            >
              Run fresh commercial review
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Saving creates or refreshes a private draft only. It does not activate, archive or
            publish the product.
          </p>
          {draftMessage ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
              {draftMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label: metricLabel, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{metricLabel}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
