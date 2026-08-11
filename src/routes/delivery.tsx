import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Clock3,
  Globe2,
  MapPin,
  PackageCheck,
  PackageOpen,
  Truck,
  WalletCards,
} from "lucide-react";

import { SITE_URL } from "@/config/seo";
import { PageHeader } from "@/components/common/PageHeader";
import { PROVINCIAL_DELIVERY } from "@/config/trust";
import { SITE } from "@/config/site";

const TITLE = "Shipping & Delivery Policy | Cossa Store";
const DESCRIPTION =
  "How Cossa Store processes, dispatches, tracks and delivers stocked, print-on-demand, supplier-fulfilled and special-order products.";

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

      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function DeliveryPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Shipping & Fulfilment"
        title="Shipping & Delivery Policy"
        description={DESCRIPTION}
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        {/* INTRODUCTION */}
        <section className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              Last updated: 11 August 2026
            </strong>
          </p>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This Shipping & Delivery Policy explains how products purchased
            directly from Cossa Store are processed, dispatched and delivered.
            Cossa Store is operated by {SITE.parent}.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Because Cossa Store uses a hybrid fulfilment model, different
            products may be supplied from our own or locally available stock,
            produced by a print-on-demand partner, dispatched directly by an
            approved supplier, specially ordered, imported or fulfilled through
            another authorised logistics arrangement.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Processing and delivery information shown on a specific product
            page or confirmed for your order should be read together with this
            policy.
          </p>
        </section>

        {/* PROCESSING TIMES */}
        <Block icon={Clock3} title="1. Order processing times">
          <p>
            Processing time is the period between confirmation of an eligible
            order and the time the parcel is handed to a courier, collection
            network, fulfilment partner or other delivery service.
          </p>

          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">
                Stocked or locally available products:
              </strong>{" "}
              normally prepared for dispatch within approximately 1–3 business
              days, unless another timeframe is displayed or communicated.
            </li>

            <li>
              <strong className="text-foreground">
                Print-on-demand products:
              </strong>{" "}
              are manufactured after the order is placed. Production commonly
              requires approximately 3–7 business days before dispatch, but the
              actual production period may differ by product, print provider,
              location, volume and seasonal demand.
            </li>

            <li>
              <strong className="text-foreground">
                Supplier-fulfilled or dropshipped products:
              </strong>{" "}
              are dispatched by the relevant approved supplier or fulfilment
              partner. Processing times vary by supplier and will be displayed
              or communicated where reasonably available.
            </li>

            <li>
              <strong className="text-foreground">
                Personalised and made-to-order products:
              </strong>{" "}
              may require additional production, proofing or preparation time
              before dispatch.
            </li>

            <li>
              <strong className="text-foreground">
                Special-order or imported products:
              </strong>{" "}
              may require longer lead times. Where material, the expected
              timeframe will be disclosed before purchase or confirmed with
              you.
            </li>

            <li>
              <strong className="text-foreground">
                Business or bulk orders:
              </strong>{" "}
              follow the processing and delivery schedule stated in the
              quotation, purchase arrangement or other written agreement.
            </li>
          </ul>

          <p>
            Processing time is separate from courier delivery time. A delivery
            estimate therefore generally begins once the applicable parcel has
            been dispatched.
          </p>
        </Block>

        {/* SOUTH AFRICA */}
        <Block icon={MapPin} title="2. South African delivery">
          <p>
            Cossa Store&apos;s primary delivery market is South Africa. We may
            use different courier, pickup-point, supplier-delivery or logistics
            partners depending on product type, destination, parcel dimensions
            and fulfilment route.
          </p>

          <p>
            Availability of a particular delivery service depends on the
            delivery address, product, supplier and logistics network servicing
            that area.
          </p>
        </Block>

        {/* PROVINCIAL DELIVERY */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            3. Estimated provincial delivery windows
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The estimates below apply primarily to dispatched parcel-sized
            goods travelling through standard South African courier routes.
            They begin after dispatch and do not include production or order
            processing time.
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
                  <tr
                    key={row.province}
                    className="border-b border-border/60"
                  >
                    <td className="py-2.5 pr-4 font-medium">
                      {row.province}
                    </td>

                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {row.metro}
                    </td>

                    <td className="py-2.5 text-muted-foreground">
                      {row.outlying}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            These delivery windows are estimates rather than guaranteed
            delivery dates. Courier capacity, public holidays, severe weather,
            infrastructure disruptions, supplier delays, remote locations,
            peak shopping periods and circumstances outside our reasonable
            control may extend delivery times.
          </p>
        </section>

        {/* POD */}
        <Block icon={PackageOpen} title="4. Print-on-demand delivery">
          <p>
            Print-on-demand products are manufactured specifically after your
            order has been submitted and therefore normally have both a
            production period and a delivery period.
          </p>

          <p>
            A POD product may be manufactured and dispatched from South Africa
            or another production location selected by the fulfilment provider.
            The manufacturing location may vary according to the product,
            colour, size, stock availability and print provider.
          </p>

          <p>
            Where reasonably available, the relevant product page will show an
            estimated production or shipping period. These estimates may change
            where a provider changes its capacity or fulfilment location.
          </p>

          <p>
            POD products included in the same order as stocked or
            supplier-fulfilled products may arrive separately.
          </p>
        </Block>

        {/* SUPPLIER */}
        <Block
          icon={Truck}
          title="5. Supplier-fulfilled and dropshipped products"
        >
          <p>
            Certain products purchased directly from Cossa Store may be
            dispatched to you by an approved manufacturer, wholesaler,
            distributor, dropshipping supplier or other fulfilment partner.
          </p>

          <p>
            Delivery times can vary between suppliers. Where reasonably
            available, the product page or order information will identify the
            relevant estimated processing and delivery period.
          </p>

          <p>
            Even where an approved fulfilment partner dispatches the order,
            Cossa Store remains your customer-support contact for products sold
            directly by Cossa Store unless we expressly advise you of another
            authorised process.
          </p>

          <p>
            Please contact Cossa Store rather than arranging an unauthorised
            return directly with a supplier.
          </p>
        </Block>

        {/* SPLIT SHIPMENTS */}
        <Block icon={PackageCheck} title="6. Multiple parcels and split shipments">
          <p>
            An order containing stocked, supplier-fulfilled, print-on-demand,
            imported or specially ordered products may be fulfilled from
            different locations.
          </p>

          <p>
            As a result, one order may arrive in two or more separate parcels
            and on different dates.
          </p>

          <p>
            Where separate tracking references are available, we may provide
            individual tracking information for each parcel.
          </p>

          <p>
            A split shipment does not automatically mean that an item is
            missing. Check the dispatch information for all parcels before
            reporting a shortage.
          </p>
        </Block>

        {/* SHIPPING COST */}
        <Block icon={WalletCards} title="7. Shipping and delivery costs">
          <p>
            Shipping charges may depend on destination, parcel dimensions,
            weight, fulfilment method, supplier, courier service and product
            category.
          </p>

          <p>
            Where automated checkout shipping is available, the applicable
            delivery charge will be displayed before you complete the
            transaction.
          </p>

          <p>
            Heavy, oversized, specialist or bulk goods may require a separate
            freight or delivery quotation. We will disclose the applicable
            delivery charge or basis of calculation before you commit to the
            affected order.
          </p>

          <p>
            Where a free-shipping threshold, promotion or special delivery
            offer applies, its conditions will be displayed with that offer.
          </p>

          <p>
            Business and project customers may request consolidated deliveries
            where operationally available.
          </p>
        </Block>

        {/* PARGO */}
        <Block icon={MapPin} title="8. Pickup-point and Click & Collect delivery">
          <p>
            Cossa Store may offer pickup-point or Click & Collect delivery
            through approved logistics partners when the applicable integration
            is active.
          </p>

          <p>
            Pargo is one delivery network we may support. Pargo operates a
            nationwide South African pickup-point network that enables customers
            to collect eligible parcels from participating pickup locations.
          </p>

          <p>
            <strong className="text-foreground">
              Pargo should only be considered available for a Cossa Store
              transaction when it is displayed as an active delivery option
              during checkout or expressly confirmed by our team.
            </strong>
          </p>

          <p>
            Until an automated pickup-point integration is operational, we may
            arrange alternative courier or collection options where available.
            Contact us on WhatsApp {SITE.phoneDisplay} if you need assistance
            with delivery options.
          </p>

          <p>
            Pickup-point networks are generally designed for eligible
            parcel-sized goods. Heavy construction materials, oversized
            equipment and other freight products may require direct delivery
            or a separately arranged collection.
          </p>
        </Block>

        {/* TRACKING */}
        <Block icon={Truck} title="9. Order tracking">
          <p>
            Where tracking is provided by the courier, supplier or fulfilment
            partner, tracking information may be sent by email, SMS, WhatsApp,
            displayed in your customer account or made available through
            another order-status channel.
          </p>

          <p>
            Tracking events are generated by the relevant logistics provider
            and may occasionally take time to update after dispatch or between
            scanning locations.
          </p>

          <p>
            If a parcel shows no meaningful movement for an unusual period,
            contact us with your order number and tracking reference so we can
            investigate.
          </p>
        </Block>

        {/* RECEIVING */}
        <Block icon={PackageCheck} title="10. Receiving your delivery">
          <p>
            Where reasonably possible, inspect the outer parcel and the goods
            promptly after delivery.
          </p>

          <p>
            If you notice visible damage, missing items, an incorrect product
            or another obvious delivery problem, contact us as soon as
            reasonably possible and provide your order number together with
            photographs of the product and packaging where relevant.
          </p>

          <p>
            Prompt notification helps us investigate courier or supplier claims
            efficiently, but failure to report an issue on the same day does
            not automatically remove statutory consumer rights that cannot
            lawfully be excluded.
          </p>

          <p>
            Keep damaged packaging where reasonably possible until we tell you
            whether it is required for a courier or supplier investigation.
          </p>
        </Block>

        {/* ADDRESS */}
        <Block icon={MapPin} title="11. Delivery addresses">
          <p>
            You are responsible for providing a complete and accurate delivery
            address, postal code, recipient name and suitable contact number.
          </p>

          <p>
            Please check your delivery information carefully before submitting
            an order.
          </p>

          <p>
            If you discover an address error before dispatch, contact us
            immediately. We will try to amend the information, but an address
            change cannot always be guaranteed after fulfilment has started.
          </p>

          <p>
            Additional charges reasonably incurred because of an incorrect
            address, refused parcel, unavailable recipient or customer-requested
            rerouting may be payable by the customer where permitted by law and
            where the circumstances are not caused by Cossa Store.
          </p>
        </Block>

        {/* FAILED DELIVERY */}
        <Block icon={Truck} title="12. Failed delivery attempts">
          <p>
            Someone may need to be available to receive a home or business
            delivery during the courier&apos;s operating hours.
          </p>

          <p>
            Courier procedures differ. A courier may attempt redelivery,
            contact you, hold the parcel at a depot or return the parcel to the
            sender.
          </p>

          <p>
            Where a failed delivery results from circumstances attributable to
            the customer, a reasonable redelivery or return-to-sender charge
            may apply where permitted by law.
          </p>
        </Block>

        {/* DELAYS */}
        <Block icon={Clock3} title="13. Delayed deliveries">
          <p>
            Delivery estimates are not guarantees unless we expressly agree to
            a guaranteed service.
          </p>

          <p>
            If your order has not arrived within the estimated delivery window,
            contact us with your order number. We will investigate with the
            courier, supplier or fulfilment provider.
          </p>

          <p>
            Where a delay becomes material or fulfilment cannot reasonably be
            completed, we will handle the matter in accordance with applicable
            South African law, our Returns & Refunds Policy and the
            circumstances of the transaction.
          </p>
        </Block>

        {/* LOST */}
        <Block icon={PackageOpen} title="14. Lost parcels">
          <p>
            If tracking indicates that a parcel may be lost, contact Cossa
            Store rather than attempting to resolve the matter solely with the
            fulfilment supplier.
          </p>

          <p>
            We may open an investigation with the relevant courier or delivery
            partner. Investigation times vary depending on the carrier and the
            circumstances.
          </p>

          <p>
            Where a parcel is confirmed lost and Cossa Store is responsible for
            the customer transaction, we will determine the appropriate
            replacement, reshipment or refund in accordance with applicable
            consumer law and our Returns & Refunds Policy.
          </p>
        </Block>

        {/* INTERNATIONAL */}
        <Block icon={Globe2} title="15. International shipping">
          <p>
            Cossa Store&apos;s primary fulfilment market is South Africa.
          </p>

          <p>
            International delivery may become available for selected products,
            particularly where an approved supplier or print-on-demand network
            supports international fulfilment.
          </p>

          <p>
            International shipping should be considered available only when the
            destination can be selected during checkout or when Cossa Store has
            expressly confirmed international delivery for the relevant order.
          </p>

          <p>
            International orders may be subject to customs duties, import taxes,
            brokerage charges or other destination-country fees. Where such
            charges are not collected by Cossa Store at checkout, they may be
            payable by the recipient subject to applicable law.
          </p>
        </Block>

        {/* DIGITAL */}
        <Block icon={PackageOpen} title="16. Digital products">
          <p>
            Digital products do not require physical shipping.
          </p>

          <p>
            Where Cossa Store sells a downloadable or electronically delivered
            product, access or delivery instructions will be provided through
            the method specified for that product, such as email, customer
            account access or a secure download process.
          </p>
        </Block>

        {/* AFFILIATE */}
        <Block icon={Globe2} title="17. Affiliate and third-party purchases">
          <p>
            Some Cossa Store links may direct you to an independent retailer,
            marketplace or partner website.
          </p>

          <p>
            If checkout and payment take place on that external website, the
            third-party seller is responsible for fulfilment and its own
            shipping policy applies to that transaction.
          </p>

          <p>
            Cossa Store&apos;s Shipping & Delivery Policy does not replace the
            external retailer&apos;s shipping terms for a transaction completed
            entirely on that retailer&apos;s platform.
          </p>
        </Block>

        {/* RETURNS */}
        <Block icon={PackageCheck} title="18. Returns after delivery">
          <p>
            Returns, damaged-product claims, defective-product claims,
            cancellations and refunds are governed by our Returns & Refunds
            Policy together with applicable South African consumer law.
          </p>

          <p>
            Do not send an item back to a supplier, print provider or courier
            address without receiving authorised return instructions from Cossa
            Store where Cossa Store was the seller.
          </p>

          <p>
            <Link to="/returns" className="text-primary underline">
              Read our Returns & Refunds Policy
            </Link>
          </p>
        </Block>

        {/* CONTACT */}
        <section className="rounded-lg border border-primary/30 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            19. Shipping and delivery support
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            If you need assistance with processing, tracking, delivery,
            collection, a missing parcel or another fulfilment matter, contact
            Cossa Store through our official support channels.
          </p>

          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">
                {SITE.parent} — Cossa Store
              </strong>
            </p>

            <p>Email: {SITE.email}</p>
            <p>Phone / WhatsApp: {SITE.phoneDisplay}</p>

            <p>
              Registered address: Ext 27 Olivenoutbouch 163, 163 Centurion
              Olivenoutbousch, Centurion, Gauteng, 0187
            </p>

            <p>Website: www.cossanexusholdings.co.za</p>
          </div>

          <p className="mt-4 text-sm">
            <Link to="/contact" className="text-primary underline">
              Contact Cossa Store
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}