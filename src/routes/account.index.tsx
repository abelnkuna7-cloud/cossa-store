import { createFileRoute, Link } from "@tanstack/react-router";

import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { AUTH_CONNECTED } from "@/services/account.service";
import { useProfile, useSession } from "@/lib/auth";

export const Route = createFileRoute("/account/")({
  component: AccountOverview,
});

function AccountOverview() {
  const { user, loading } = useSession();
  const profile = useProfile(user?.id);

  return (
    <div className="space-y-6">
      {!loading && user ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</p>
          <p className="mt-1 font-display text-lg font-semibold">
            {profile.data?.full_name ?? user.email}
          </p>
          {profile.data?.business_name ? (
            <p className="text-sm text-muted-foreground">{profile.data.business_name}</p>
          ) : null}
          <Button asChild className="mt-4">
            <Link to="/admin/catalogue">Manage my products</Link>
          </Button>
        </div>
      ) : !loading ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Sign in to your member account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Members can list and manage their own products on Cossa Store.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in or sign up</Link>
          </Button>
        </div>
      ) : null}

      {!AUTH_CONNECTED ? (
        <NoticeBlock tone="pending" title="Customer accounts are not live yet">
          Customer order history and saved addresses are not connected yet. Your cart, wishlist and
          quote basket are stored on this device in the meantime.
        </NoticeBlock>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          title="Orders"
          description="Track order status and delivery updates."
          to="/account/orders"
          cta="View orders"
        />
        <Card
          title="Saved projects"
          description="Reopen, rename and share the project kits you have planned."
          to="/account/projects"
          cta="View saved projects"
        />
        <Card
          title="Wishlist"
          description="Products you have saved for later."
          to="/account/wishlist"
          cta="View wishlist"
        />
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
