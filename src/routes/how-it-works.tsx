import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SITE_URL } from "@/config/seo";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { FULFILMENT_LABELS } from "@/types/catalog";
import { SITE } from "@/config/site";

const TITLE = "How Cossa Store works | Ordering, fulfilment & service";
const DESCRIPTION =
  "How buying from Cossa Store works: retail and trade paths, the five fulfilment routes, quote-to-order for business, and where Cossa services fit in.";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/how-it-works` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/how-it-works` }],
  }),
  component: HowItWorks,
});

const RETAIL_STEPS = [
  ["Browse or start from a project", "Search the ranges, or pick the job you need to do and let the project kit build the list for you."],
  ["Check the honest detail", "Every product shows its fulfilment route, stock status and realistic delivery window before you add it."],
  ["Pay securely", "Use the secure EFT payment-request flow currently available at checkout. Card and instant-EFT gateway options are activated only after merchant approval and live integration verification. VAT-inclusive rand pricing throughout."],
  ["Track and receive", "Order confirmation, dispatch notice and tracking. Inspect on delivery and report issues the same day."],
];

const TRADE_STEPS = [
  ["Request a quote", "Send a product list, a project scope or a photo on WhatsApp. No account needed to get a price."],
  ["Get a written quotation", "A formal quotation with references, suitable for procurement, tender and approval processes."],
  ["Open a business account", "Company details, VAT number, delivery addresses and terms — captured once, reused every order."],
  ["Order and reorder", "Approved quotes convert to orders, and repeat consumables reorder from your history in a click."],
];

const FULFILMENT_EXPLAINED: { key: keyof typeof FULFILMENT_LABELS; body: string }[] = [
  { key: "cossa_stock", body: "Held by Cossa in South Africa. Fastest dispatch and easiest returns." },
  { key: "local_supplier", body: "Shipped by a vetted South African supplier on their lead time. We manage the order." },
  { key: "local_dropshipping", body: "Sent directly to you from a local partner's warehouse — fewer handling delays." },
  { key: "international_dropshipping", body: "Sourced abroad. Longer transit and customs, clearly flagged before you buy." },
  { key: "print_on_demand", body: "Produced to order via Printify. Made for you, so returns are faults-only." },
  { key: "digital", body: "Delivered as a download or licence key — no shipping at all." },
  { key: "service", body: "Carried out by a Cossa service team: installation, cleaning or technical support." },
  { key: "affiliate", body: "Fulfilled by a partner retailer. Disclosed on the product and priced by them." },
];

function HowItWorks() {
  return (
    <div>
      <PageHeader
        eyebrow="Transparency"
        title="How Cossa Store works"
        description="Two ways to buy, five ways an order can be fulfilled, and one team you can actually phone."
      />
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Buying as a retail customer</h2>
            <ol className="mt-4 space-y-4">
              {RETAIL_STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-6">
              <Link to="/shop">
                Shop products <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>

          <section className="rounded-lg border border-primary/30 bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Buying for a business or site</h2>
            <ol className="mt-4 space-y-4">
              {TRADE_STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/request-a-quote">Request a quote</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/business-account">Open a business account</Link>
              </Button>
            </div>
          </section>
        </div>

        <section>
          <h2 className="font-display text-xl font-semibold">The five fulfilment routes</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Most stores hide how an order actually reaches you. We label it on every product, because
            the route determines your delivery time and your return rights.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FULFILMENT_EXPLAINED.map((item) => (
              <div key={item.key} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold text-primary">{FULFILMENT_LABELS[item.key]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Product plus service, not just a box</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Cossa Store sits inside Cossa Nexus Holdings, so an order can include the work as well as
            the goods: installation for construction and smart-tech products, cleaning and facility
            teams for consumables, and technical support for workplace technology. Ask for it on any
            product, at quote stage, or on WhatsApp {SITE.phoneDisplay}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/request-a-quote">Request products with a service</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/delivery">Delivery information</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/returns">Returns and refunds</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
