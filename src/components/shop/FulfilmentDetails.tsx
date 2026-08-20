import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { SITE, whatsappLink } from "@/config/site";
import type { Product } from "@/types/catalog";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

/**
 * Fulfilment-model specific explanation shown on the product page. Everything
 * here is derived from the real product record.
 */
export function FulfilmentDetails({ product }: { product: Product }) {
  const kit = product.kit_items ?? [];

  return (
    <div className="space-y-4">
      {kit.length > 0 ? (
        <Panel title="What is in this kit">
          <ul className="divide-y divide-border">
            {kit.map((item) => (
              <li key={item.label} className="flex justify-between gap-4 py-1.5">
                <span>{item.label}</span>
                <span className="font-medium text-foreground">{item.quantity}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs">
            Quantities are estimates for a typical job. Use the project calculator to size the kit
            for your space.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link to="/request-a-quote">Request a complete project quote</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/shop-by-project">Open the project planner</Link>
            </Button>
          </div>
        </Panel>
      ) : null}

      {product.fulfilment_type === "cossa_stock" ? (
        <Panel title="Own stock">
          <p>
            Held in Cossa Store stock and dispatched through our fulfilment process.{" "}
            {product.stock_available
              ? "Available now."
              : "Availability is confirmed before dispatch."}
          </p>
          <p>Delivery: {product.estimated_delivery}</p>
        </Panel>
      ) : null}

      {product.fulfilment_type === "local_supplier" ? (
        <Panel title="Local supplier fulfilment">
          <p>
            Supplied by {product.supplier_name ?? "a verified local supplier"}. We confirm
            availability with the supplier before the order is processed.
          </p>
          <p>Delivery: {product.estimated_delivery}</p>
        </Panel>
      ) : null}

      {product.fulfilment_type === "local_dropshipping" ||
      product.fulfilment_type === "international_dropshipping" ? (
        <Panel title="Shipped by our fulfilment partner">
          <p>
            This item ships directly from{" "}
            {product.supplier_name ?? "our fulfilment partner"} to your delivery address.
          </p>
          <p>Estimated delivery: {product.estimated_delivery}</p>
          <p>
            Returns are handled through the applicable fulfilment route and Cossa Store coordinates
            the process where the sale is made directly through Cossa Store.{" "}
            <Link to="/returns" className="underline">
              Returns policy
            </Link>
          </p>
        </Panel>
      ) : null}

      {product.affiliate ? (
        <Panel title="Partner offer">
          <p>
            {product.affiliate.disclosure_text ??
              `Sold and fulfilled by ${product.affiliate.partner_name}.`}
          </p>
          <p>
            Payment, delivery and returns are handled by the retailer — this order does not go
            through Cossa checkout.
          </p>
          <Button asChild size="sm">
            <a
              href={product.affiliate.tracking_url}
              target="_blank"
              rel="nofollow sponsored noreferrer"
            >
              View offer at {product.affiliate.partner_name}
            </a>
          </Button>
        </Panel>
      ) : null}

      {product.fulfilment_type === "print_on_demand" ? (
        <Panel title="Printed and made after you order">
          <p>
            Nothing is pre-printed. Production starts once your order is confirmed
            {product.lead_time ? ` and takes ${product.lead_time}` : ""}, then delivery follows.
          </p>
          <p>Total time: {product.estimated_delivery}</p>
          {(product.customisation_options ?? []).length > 0 ? (
            <ul className="list-disc pl-5">
              {product.customisation_options!.map((option) => (
                <li key={option}>{option}</li>
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}

      {product.digital_download ? (
        <Panel title="Digital delivery">
          <p>No physical delivery. Access is issued once payment is successfully confirmed.</p>
          <p>
            Digital-product cancellation and refund rights are governed by the applicable Cossa Store
            terms and South African consumer law.
          </p>
        </Panel>
      ) : null}

      {product.service_included ? (
        <Panel title="Product + service">
          <p>{product.service_description ?? "A Cossa service is included with this product."}</p>
          <p>
            Available in:{" "}
            {(product.province_availability ?? []).join(", ") || "selected service areas"}. We
            confirm your address falls inside the service area before scheduling.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm">
              <Link to="/request-a-quote">Request a quote & booking</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={whatsappLink(`Service enquiry: ${product.name}`)} target="_blank" rel="noreferrer">
                WhatsApp {SITE.phoneDisplay}
              </a>
            </Button>
          </div>
        </Panel>
      ) : null}

      {product.requires_quote ? (
        <Panel title="Quote required">
          <p>
            We do not show a price for this line because it depends on volume, specification and
            delivery distance. Send the details and we will quote in writing.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm">
              <Link to="/request-a-quote">Request a quote</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={whatsappLink(`Quote request: ${product.name}`)} target="_blank" rel="noreferrer">
                WhatsApp us
              </a>
            </Button>
          </div>
        </Panel>
      ) : null}

      {(product.province_availability ?? []).length > 0 && !product.service_included ? (
        <Panel title="Delivery coverage">
          <p>{product.province_availability!.join(", ")}</p>
        </Panel>
      ) : null}
    </div>
  );
}