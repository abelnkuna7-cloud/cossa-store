import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/PageHeader";

const LINKS = [
  { to: "/account", label: "Overview" },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/wishlist", label: "Wishlist" },
] as const;

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account | Cossa Store" },
      { name: "description", content: "Manage your Cossa Store orders, wishlist and details." },
      { property: "og:title", content: "My account | Cossa Store" },
      { property: "og:description", content: "Manage your Cossa Store account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountLayout,
});

function AccountLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div>
      <PageHeader eyebrow="Account" title="My account" />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Account sections">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                pathname === link.to
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-accent"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}