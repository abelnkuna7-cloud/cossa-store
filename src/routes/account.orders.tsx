import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { trackOrder } from "@/services/account.service";

const db = supabase as any;

type DownloadEntitlement = {
  id: string;
  product_id: string;
  download_limit: number;
  downloads_used: number;
  expires_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/account/orders")({
  component: AccountOrders,
});

function AccountOrders() {
  const [message, setMessage] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadEntitlement[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loadingDownloads, setLoadingDownloads] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void loadDownloads();
  }, []);

  async function loadDownloads() {
    setLoadingDownloads(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSignedIn(false);
      setDownloads([]);
      setLoadingDownloads(false);
      return;
    }

    setSignedIn(true);
    const { data, error } = await db
      .from("store_digital_entitlements")
      .select("id,product_id,download_limit,downloads_used,expires_at,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Your digital downloads could not be loaded.");
      setDownloads([]);
      setLoadingDownloads(false);
      return;
    }

    const entitlements = (data ?? []) as DownloadEntitlement[];
    setDownloads(entitlements);
    if (entitlements.length) {
      const { data: products } = await db
        .from("store_public_products")
        .select("id,name")
        .in("id", entitlements.map((item) => item.product_id));
      setProductNames(Object.fromEntries((products ?? []).map((product: { id: string; name: string }) => [product.id, product.name])));
    }
    setLoadingDownloads(false);
  }

  async function downloadProduct(entitlement: DownloadEntitlement) {
    setDownloadingId(entitlement.id);
    const { data, error } = await supabase.functions.invoke("digital-download", {
      body: { entitlementId: entitlement.id },
    });
    setDownloadingId(null);
    if (error || !data?.url) {
      toast.error(data?.error ?? "Your download could not be prepared. Please contact Cossa Store if this continues.");
      return;
    }
    window.location.assign(data.url);
    void loadDownloads();
  }

  async function handleTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await trackOrder(String(form.get("reference") ?? ""));
    setMessage(
      "Order tracking is not connected yet, so we can't look this up automatically. Please contact us with your reference and we'll respond directly.",
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-primary/30 bg-card p-6">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold">Digital downloads</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Paid digital products appear here. Each download link is short-lived and only available to the account that completed the order.
            </p>
          </div>
        </div>

        {!signedIn && !loadingDownloads ? (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/auth" className="font-medium text-primary underline underline-offset-2">Sign in</Link> to access purchases linked to your Cossa Store account.
          </p>
        ) : null}

        {loadingDownloads ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking your downloadsâ€¦</div>
        ) : downloads.length ? (
          <div className="mt-4 space-y-3">
            {downloads.map((entitlement) => {
              const remaining = Math.max(0, entitlement.download_limit - entitlement.downloads_used);
              const expired = entitlement.expires_at ? new Date(entitlement.expires_at) <= new Date() : false;
              return (
                <div key={entitlement.id} className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{productNames[entitlement.product_id] ?? "Digital Cossa Store product"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {expired ? "Access period has ended" : `${remaining} of ${entitlement.download_limit} downloads remaining`}
                    </p>
                  </div>
                  <Button disabled={expired || remaining <= 0 || downloadingId === entitlement.id} onClick={() => void downloadProduct(entitlement)}>
                    {downloadingId === entitlement.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download
                  </Button>
                </div>
              );
            })}
          </div>
        ) : signedIn ? (
          <p className="mt-4 text-sm text-muted-foreground">No paid digital downloads are available for this account yet.</p>
        ) : null}
      </section>

      <NoticeBlock tone="pending" title="Order history is not available yet">
        Orders will appear here once online ordering and customer accounts are connected. Quote and
        application references you have submitted are shown on their confirmation screens.
      </NoticeBlock>

      <form
        className="max-w-md space-y-3 rounded-lg border border-border bg-card p-6"
        onSubmit={handleTrack}
      >
        <h2 className="font-display text-lg font-semibold">Track an order or reference</h2>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference number</Label>
          <Input id="reference" name="reference" placeholder="e.g. QR-2026-0001" />
        </div>
        <Button type="submit">Track</Button>
        {message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

