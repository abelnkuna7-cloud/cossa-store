import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";

const TITLE = "Checkout | Cossa Store";
const DESCRIPTION =
  "Review Cossa Store checkout information, legal terms and available order options.";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),

  component: CheckoutPage,
});

function CheckoutPage() {
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  return (
    <div>
      <PageHeader
        eyebrow="Checkout"
        title="Checkout"
        description={DESCRIPTION}
      />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        {/* PAYMENT STATUS */}
        <NoticeBlock
          tone="pending"
          title="Online payment methods are being activated"
        >
          Cossa Store is preparing approved online payment options for secure
          checkout. Payment providers will only appear here once the relevant
          merchant approval and technical integration are operational.
          Until then, you can submit your cart as a quotation request and our
          team will confirm product availability, pricing, delivery and payment
          arrangements.
        </NoticeBlock>

        {/* SECURITY / TRANSPARENCY */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden
            />

            <div>
              <h2 className="font-display text-lg font-semibold">
                Order protection
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Before proceeding with an order through Cossa Store, please
                review the terms governing the transaction, including returns,
                refunds and delivery.
              </p>
            </div>
          </div>
        </section>

        {/* LEGAL ACKNOWLEDGEMENT */}
        <section className="rounded-lg border border-primary/30 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Terms acknowledgement
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Please review and accept the applicable Cossa Store policies before
            continuing.
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedPolicies}
              onChange={(event) =>
                setAcceptedPolicies(event.target.checked)
              }
              className="mt-1 h-4 w-4 shrink-0 accent-current"
              aria-describedby="checkout-policy-description"
            />

            <span
              id="checkout-policy-description"
              className="text-sm leading-relaxed text-muted-foreground"
            >
              I have read and agree to the{" "}
              <Link
                to="/terms"
                className="font-medium text-primary underline underline-offset-2"
                onClick={(event) => event.stopPropagation()}
              >
                Terms and Conditions
              </Link>{" "}
              and acknowledge the{" "}
              <Link
                to="/returns"
                className="font-medium text-primary underline underline-offset-2"
                onClick={(event) => event.stopPropagation()}
              >
                Returns & Refunds Policy
              </Link>
              . I have also had the opportunity to review the{" "}
              <Link
                to="/delivery"
                className="font-medium text-primary underline underline-offset-2"
                onClick={(event) => event.stopPropagation()}
              >
                Shipping & Delivery Policy
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="font-medium text-primary underline underline-offset-2"
                onClick={(event) => event.stopPropagation()}
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </section>

        {/* CONTINUE */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Continue with your order
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Until online payment processing is active, your cart can be
            submitted as a quotation request. This does not charge your card,
            bank account or any other payment method.
          </p>

          {!acceptedPolicies && (
            <p className="mt-3 text-xs text-muted-foreground">
              Accept the Terms and Conditions and acknowledge the applicable
              store policies before continuing.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {acceptedPolicies ? (
              <Button asChild size="lg">
                <Link to="/request-a-quote">
                  Send my cart as a quote request
                </Link>
              </Button>
            ) : (
              <Button size="lg" disabled>
                Send my cart as a quote request
              </Button>
            )}

            <Button asChild variant="outline" size="lg">
              <Link to="/cart">Back to cart</Link>
            </Button>
          </div>
        </section>

        {/* FUTURE PAYMENT PROVIDERS */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Payment methods
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Cossa Store may support multiple approved payment service
            providers. Only payment methods that are fully approved,
            integrated and available for your transaction will be displayed
            during checkout.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We do not treat a payment as successful until confirmation is
            received from the applicable payment service provider.
          </p>
        </section>
      </div>
    </div>
  );
}