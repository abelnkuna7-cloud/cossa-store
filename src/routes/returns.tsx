import { createFileRoute, Link } from "@tanstack/react-router";

import { SITE_URL } from "@/config/seo";
import { PageHeader } from "@/components/common/PageHeader";
import { SITE } from "@/config/site";

const TITLE = "Returns & Refunds Policy | Cossa Store";
const DESCRIPTION =
  "Cossa Store returns, refunds and cancellation policy for stocked goods, print-on-demand products, supplier-fulfilled items, digital products and affiliate purchases.";

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
    type: "Standard / stocked physical goods",
    window: "7 calendar days from delivery, where applicable",
    rules: [
      "For qualifying online purchases, you may cancel within 7 calendar days after receiving the goods where the cooling-off provisions of the Electronic Communications and Transactions Act apply.",
      "Change-of-mind goods must be unused, undamaged, in their original condition and, where reasonably possible, in their original packaging.",
      "For an eligible change-of-mind return, you are responsible for the direct cost of returning the goods to us.",
      "This change-of-mind policy does not limit any rights you may have if goods are defective, unsafe, damaged or incorrectly supplied.",
      "Certain products cannot be returned for change of mind where an exclusion permitted by applicable law applies.",
    ],
  },
  {
    type: "Print-on-demand & personalised products",
    window: "Faulty, damaged or incorrect products",
    rules: [
      "Print-on-demand, personalised and custom-made products are produced specifically for your order and are generally not eligible for change-of-mind returns where the law permits this exclusion.",
      "You remain protected if the product is defective, damaged, incorrectly printed or materially different from what you ordered.",
      "Selecting the wrong size, colour or personalisation details when the correct item was supplied is not considered a production defect.",
      "Please report visible printing errors, incorrect items or transit damage as soon as reasonably possible and include clear photographs so we can investigate quickly.",
    ],
  },
  {
    type: "Supplier / dropshipped products",
    window: "Statutory rights still apply",
    rules: [
      "Some Cossa Store products may be stored, packed or dispatched directly by an approved supplier or fulfilment partner.",
      "Supplier fulfilment does not remove your consumer rights when your purchase was made from Cossa Store.",
      "For orders sold directly by Cossa Store, contact Cossa Store first for returns, refunds, defective goods or delivery claims unless we expressly tell you otherwise.",
      "Return instructions may differ according to the fulfilment location, so please do not return an item directly to a supplier without receiving return instructions from us.",
    ],
  },
  {
    type: "Special-order & imported products",
    window: "As disclosed before purchase",
    rules: [
      "Products sourced, imported or ordered specifically for you may have different cancellation or change-of-mind conditions where permitted by law.",
      "Any material restriction that applies to a special-order product will be disclosed before you complete the purchase.",
      "These restrictions do not remove statutory remedies that apply to defective, unsafe, damaged or incorrectly supplied goods.",
    ],
  },
  {
    type: "Digital products",
    window: "Before access or delivery, subject to applicable law",
    rules: [
      "Where Cossa Store offers downloadable files, templates, licences or other digital products, eligibility for cancellation or refund may depend on whether the digital product has already been supplied, downloaded, accessed or activated.",
      "Where we voluntarily permit cancellation before digital delivery or access, the purchase price will be refunded to the original payment method.",
      "If a digital file supplied by us is corrupt, inaccessible, materially different from its description or the wrong product was delivered, contact us so that we can replace, correct or refund it as appropriate.",
      "Nothing in this section removes consumer rights that cannot lawfully be excluded.",
    ],
  },
  {
    type: "Affiliate / partner products",
    window: "Third-party retailer policy applies",
    rules: [
      "Some links on Cossa Store may take you to an independent third-party retailer or marketplace to complete your purchase.",
      "Where checkout and payment take place on that third-party website, Cossa Store is not the seller of that transaction and does not receive or process your payment.",
      "Returns, cancellations, warranties and refunds for that transaction are governed by the terms and policies of the third-party retailer.",
      "We will clearly identify affiliate or partner links where reasonably practicable so that you know when you are leaving Cossa Store.",
    ],
  },
];

function ReturnsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Customer Protection"
        title="Returns & Refunds Policy"
        description={DESCRIPTION}
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              Last updated: 11 August 2026
            </strong>
          </p>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This Returns & Refunds Policy applies to purchases made from
            Cossa Store, operated by Cossa Nexus Holdings (Pty) Ltd.
            It explains how cancellations, returns, faulty-product claims
            and refunds are handled for the different types of products
            offered through our store.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nothing in this policy is intended to exclude, restrict or
            waive any consumer right that cannot lawfully be excluded
            under South African law, including applicable rights under
            the Consumer Protection Act 68 of 2008 and the Electronic
            Communications and Transactions Act 25 of 2002.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {BY_TYPE.map((entry) => (
            <section
              key={entry.type}
              className="rounded-lg border border-border bg-card p-6"
            >
              <h2 className="font-display text-base font-semibold">
                {entry.type}
              </h2>

              <p className="mt-1 text-xs uppercase tracking-wide text-primary">
                Return position: {entry.window}
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
          <h2 className="font-display text-lg font-semibold">
            Faulty, defective, unsafe or incorrectly supplied goods
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your statutory rights concerning defective goods apply
            regardless of whether an item is stocked, print-on-demand,
            supplier-fulfilled or specially ordered.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Where the Consumer Protection Act applies, goods must be
            reasonably suitable for their intended purpose, of good
            quality, in good working order and free of defects, subject
            to the circumstances recognised by law.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            If qualifying goods fail to meet the applicable statutory
            standards within six months after delivery, you may be
            entitled to return the goods without penalty and at the
            supplier&apos;s risk and expense, and to choose a repair,
            replacement or refund as provided for by applicable law.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Please send your order reference, a description of the
            problem and clear photographs or video where reasonably
            relevant to WhatsApp {SITE.phoneDisplay} or contact us
            through our support page. Evidence helps us assess the claim
            quickly but does not remove rights you have under applicable
            law.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Damaged or incorrect deliveries
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            If your parcel arrives visibly damaged, contains the wrong
            product, is missing an item or differs materially from your
            confirmed order, please contact us as soon as reasonably
            possible.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Include your order number and, where possible, photographs
            of the product, parcel and shipping label. Do not discard
            damaged packaging until we confirm whether it is required
            for a courier or supplier claim.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            How to request a return
          </h2>

          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Contact Cossa Store with your order number and the reason
              for your request.
            </li>
            <li>
              If the item is faulty, damaged or incorrect, provide
              photographs or other relevant information where reasonably
              possible.
            </li>
            <li>
              Wait for our return instructions before sending the product.
              Some supplier-fulfilled products may need to be returned to
              a different authorised return location.
            </li>
            <li>
              Package the goods securely and follow the return instructions
              supplied by our support team.
            </li>
            <li>
              Once the return is received and assessed where assessment is
              reasonably required, we will notify you of the outcome.
            </li>
          </ol>

          <p className="mt-4 text-sm">
            <Link to="/contact" className="text-primary underline">
              Start a return or claim
            </Link>
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Return shipping costs
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            For an eligible change-of-mind return under an applicable
            cooling-off right, the direct cost of returning the goods may
            be for your account as permitted by law.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Where goods are returned because they are defective, damaged,
            incorrectly supplied or because of another error for which
            Cossa Store is responsible, return costs will be handled in
            accordance with applicable consumer law and the circumstances
            of the claim.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Refund processing
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Approved refunds will normally be returned to the original
            payment method used for the transaction. We will not normally
            redirect a refund to an unrelated bank account, card or payment
            instrument.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Once a refund has been approved and initiated by Cossa Store,
            processing by the payment provider or your financial institution
            may take additional business days. We will provide confirmation
            when the refund has been initiated where the payment system
            supports such confirmation.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Refunds will not exceed the amount originally paid for the
            affected transaction, except where additional amounts are
            required by applicable law.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Warranties
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Some products may include a manufacturer or supplier warranty.
            Where applicable, warranty information may be displayed on the
            relevant product page, packaging or supporting documentation.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A manufacturer or supplier warranty is additional to, and does
            not replace, statutory consumer rights that apply to your
            purchase.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Business and bulk orders
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Orders placed under an approved business account, formal
            quotation, procurement agreement or bulk-order agreement may
            also be subject to the specific commercial terms agreed for
            that transaction.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Those commercial terms do not exclude statutory rights where
            those rights apply and cannot lawfully be excluded.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Contact Cossa Store
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            For a cancellation, return, refund, damaged parcel, warranty
            or defective-product claim, contact Cossa Store through our
            official support channels.
          </p>

          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">
                Cossa Nexus Holdings (Pty) Ltd — Cossa Store
              </strong>
            </p>
            <p>Email: cossa@cossanexusholdings.co.za</p>
            <p>Phone / WhatsApp: {SITE.phoneDisplay}</p>
            <p>
              Registered address: Ext 27 Olivenoutbouch 163, 163 Centurion
              Olivenoutbousch, Centurion, Gauteng, 0187
            </p>
            <p>Website: www.cossanexusholdings.co.za</p>
          </div>

          <p className="mt-4 text-sm">
            <Link to="/contact" className="text-primary underline">
              Contact customer support
            </Link>
          </p>
        </section>

        <section className="rounded-lg border border-primary/30 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Checkout acknowledgement
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Before completing an eligible purchase directly from Cossa
            Store, customers may be required to acknowledge our Terms &
            Conditions and this Returns & Refunds Policy as part of the
            checkout process.
          </p>
        </section>
      </div>
    </div>
  );
}