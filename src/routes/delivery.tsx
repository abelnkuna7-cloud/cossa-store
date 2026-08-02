import { createFileRoute } from "@tanstack/react-router";
import { MapPin, PackageCheck, Truck } from "lucide-react";

import { SITE_URL } from "@/config/seo";
import { PageHeader } from "@/components/common/PageHeader";
import { PROVINCIAL_DELIVERY } from "@/config/trust";
import { SITE } from "@/config/site";

const TITLE = "Delivery information | Cossa Store";
const DESCRIPTION =
  "Provincial delivery timelines, delivery costs, Pargo click-and-collect and receiving instructions for Cossa Store orders across South Africa.";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/delivery` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/delivery` }],
  }),
  component: DeliveryPage,
});

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Truck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function DeliveryPage() {
  return (
    <div>
      <PageHeader eyebrow="Transparency" title="Delivery information" description={DESCRIPTION} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Provincial delivery windows</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Working days after dispatch, for in-stock parcel items. Dispatch itself adds 1–2 working
            days for own stock, and longer for supplier, print-on-demand and imported routes — the
            exact route is shown on every product page.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Province</th>
                  <th className="py-2 pr-4 font-medium">Main centres</th>
                  <th className="py-2 font-medium">Outlying areas</th>
                </tr>
              </thead>
              <tbody>
                {PROVINCIAL_DELIVERY.map((row) => (
                  <tr key={row.province} className="border-b border-border/60">
                    <td className="py-2.5 pr-4 font-medium">{row.province}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{row.metro}</td>
                    <td className="py-2.5 text-muted-foreground">{row.outlying}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Public holidays, load-shedding disruptions and courier backlogs can extend these
            windows. If your order is running late we tell you before you have to ask.
          </p>
        </section>

        <Block icon={MapPin} title="Click and collect via Pargo">
          <p>
            Cossa Store is set up to offer collection through the Pargo pickup-point network, which
            has thousands of retail collection points across South Africa — useful if you are on
            site during the day and cannot receive a courier delivery.
          </p>
          <p>
            Click-and-collect activates once our Pargo merchant account is confirmed. Until then,
            request a collection arrangement on WhatsApp {SITE.phoneDisplay} and we will coordinate
            it manually rather than leaving you without an option.
          </p>
          <p>
            Pargo suits parcel-sized goods. Bulk construction materials and large equipment are
            delivered directly or collected from the supplier by arrangement.
          </p>
        </Block>

        <Block icon={Truck} title="Delivery cost">
          <p>
            Delivery is quoted per order on weight, volume, destination and fulfilment route. Small
            parcel items are priced at standard courier rates; heavy or oversized construction
            material is quoted separately before you commit.
          </p>
          <p>
            Business and project accounts can have delivery consolidated into a single scheduled
            drop instead of paying per line item.
          </p>
        </Block>

        <Block icon={PackageCheck} title="Receiving your order">
          <p>
            Inspect goods on delivery before signing. Report visible damage or shortages the same
            day, with photographs, so we can lodge the carrier claim inside the claim window.
          </p>
          <p>
            Someone must be available at the delivery address during working hours. Failed delivery
            attempts that require redelivery may carry an additional courier charge.
          </p>
        </Block>
      </div>
    </div>
  );
}
