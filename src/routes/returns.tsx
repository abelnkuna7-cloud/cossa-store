import { createFileRoute, Link } from "@tanstack/react-router";

import { SITE_URL } from "@/config/seo";
import { PageHeader } from "@/components/common/PageHeader";
import { SITE } from "@/config/site";

const TITLE = "Returns and refunds | Cossa Store";
const DESCRIPTION =
  "Return rules by product type — physical goods, digital products and made-to-order items — plus faults, warranties and how refunds are paid.";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/returns` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/returns` }],
  }),
  component: ReturnsPage,
});

const BY_TYPE = [
  {
    type: "Physical stocked goods",
    window: "7 days from delivery",
    rules: [
      "Unused, in original packaging and in resaleable condition.",
      "Change-of-mind returns are accepted but the return courier cost is for your account.",
      "Opened consumables — chemicals, sealants, paint that has been tinted — cannot be returned.",
    ],
  },
  {
    type: "Digital products",
    window: "Before first download",
    rules: [
      "Refundable while the file has not yet been downloaded or the licence key not yet issued.",
      "Once downloaded or activated, a digital product cannot be returned.",
      "If a file is corrupt or the wrong version, we replace it or refund in full.",
    ],
  },
  {
    type: "Made-to-order & print-on-demand",
    window: "Faults only",
    rules: [
      "Items produced to your specification or artwork are not returnable for change of mind.",
      "Printing defects, wrong size supplied against the order, or damage in transit are replaced free.",
      "Report production faults with photographs within 7 days of delivery.",
    ],
  },
  {
    type: "Special order & imported items",
    window: "Faults only",
    rules: [
      "Items brought in specifically for your order are non-returnable unless faulty.",
      "This is stated on the product page before you buy, never after.",
    ],
  },
  {
    type: "Services (installation, cleaning, technical)",
    window: "Before scheduled start",
    rules: [
      "Cancel or reschedule at no charge up to 48 hours before the scheduled date.",
      "Work already carried out is charged; disputed workmanship is re-inspected at our cost.",
    ],
  },
];

function ReturnsPage() {
  return (
    <div>
      <PageHeader eyebrow="Transparency" title="Returns and refunds" description={DESCRIPTION} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {BY_TYPE.map((entry) => (
            <section key={entry.type} className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-base font-semibold">{entry.type}</h2>
              <p className="mt-1 text-xs uppercase tracking-wide text-primary">
                Return window: {entry.window}
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {entry.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Faulty, damaged or incorrect goods</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your rights under the Consumer Protection Act apply regardless of the categories above.
            If an item arrives damaged, is defective, or is not what you ordered, you may choose a
            replacement, a repair or a refund within six months of delivery — at our cost, including
            return collection.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Send your order reference and clear photographs to WhatsApp {SITE.phoneDisplay} or use
            the callback request. We log every claim against the reference so you never repeat
            yourself.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Warranties and refunds</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Manufacturer warranty terms are shown per product where they apply. We handle the claim
            with the manufacturer or supplier on your behalf — you deal with us, not them.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Approved refunds are paid back to the original payment method within 5–10 working days
            of the returned goods being received and inspected. Delivery charges are refunded only
            where the return results from our error. Business accounts on terms are credited against
            the account unless you request otherwise.
          </p>
          <p className="mt-4 text-sm">
            <Link to="/contact" className="text-primary underline">
              Start a return or claim
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
