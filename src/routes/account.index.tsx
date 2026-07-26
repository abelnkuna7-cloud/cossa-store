import { createFileRoute, Link } from "@tanstack/react-router";

import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { AUTH_CONNECTED } from "@/services/account.service";

export const Route = createFileRoute("/account/")({
  component: AccountOverview,
});

function AccountOverview() {
  return (
    <div className="space-y-6">
      {!AUTH_CONNECTED ? (
        <NoticeBlock tone="pending" title="Customer accounts are not live yet">
          Sign-in, order history and saved addresses become available once the Cossa Store account
          system is connected. Your cart, wishlist and quote basket are stored on this device in the
          meantime.
        </NoticeBlock>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Orders" description="Track order status and delivery updates." to="/account/orders" cta="View orders" />
        <Card title="Wishlist" description="Products you have saved for later." to="/account/wishlist" cta="View wishlist" />
        <Card
          title="Business account"
          description="Apply for bulk pricing and contract supply terms."
          to="/business-account"
          cta="Apply now"
        />
        <Card
          title="Request a quote"
          description="Get a professional quotation for project requirements."
          to="/request-a-quote"
          cta="Request a quote"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  to,
  cta,
}: {
  title: string;
  description: string;
  to: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}