import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";

const TITLE = "Checkout | Cossa Store";
const DESCRIPTION = "Complete your Cossa Store order.";

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
  return (
    <div>
      <PageHeader eyebrow="Checkout" title="Secure checkout" description={DESCRIPTION} />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <NoticeBlock tone="pending" title="Online payments are not connected yet">
          Card and EFT payment processing has not been enabled for Cossa Store. To place an order
          today, send your cart through as a quote request and our team will confirm pricing,
          delivery and payment details directly.
        </NoticeBlock>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/request-a-quote">Send my cart as a quote request</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/cart">Back to cart</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
