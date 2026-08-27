import { ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function AliExpressAffiliatePanel() {
  return (
    <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              AliExpress affiliate
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-[11px] font-medium text-primary">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Affiliate approved
            </span>
          </div>

          <h2 className="mt-2 text-lg font-semibold">Stage AliExpress partner offers</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Use the approved AliExpress tracked affiliate link. These products are merchant-owned partner offers:
            AliExpress handles payment, stock, delivery and returns, while Cossa Store may earn an affiliate commission.
          </p>

          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <strong className="text-foreground">Available now</strong>
              <p className="mt-1">Manual tracked-link staging through the existing Affiliate product editor.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <strong className="text-foreground">API automation</strong>
              <p className="mt-1">Configuration required until AliExpress AppKey, App Secret and tracking credentials are verified server-side.</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            New AliExpress listings must stay Draft until the product details, images, current merchant price and tracked link are reviewed.
            Do not enter AliExpress stock as Cossa inventory.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <Button asChild>
            <Link to="/admin/catalogue/new">Stage AliExpress product</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="https://portals.aliexpress.com" target="_blank" rel="noreferrer">
              Open AliExpress portal <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
