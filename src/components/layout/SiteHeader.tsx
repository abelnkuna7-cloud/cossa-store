import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FileText,
  Heart,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/data/categories";
import { SITE, whatsappLink } from "@/config/site";
import { useCommerce } from "@/lib/commerce-store";
import { trackEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";

const NAV = [
  { label: "Home", to: "/" as const },
  { label: "Shop", to: "/shop" as const },
  { label: "Shop by Project", to: "/shop-by-project" as const },
  { label: "Business Buying", to: "/business-buying" as const },
  { label: "Request a Quote", to: "/request-a-quote" as const },
  { label: "Support", to: "/contact" as const },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const { cartCount, wishlistCount, hydrated } = useCommerce();
  const { open: openSupport } = useSupport();

  function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    navigate({ to: "/search", search: { q } });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="border-b border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
          <p className="truncate text-muted-foreground">
            South African owned · Speak to a real person
          </p>
          <div className="flex shrink-0 items-center gap-4">
            <a
              href={SITE.phoneHref}
              onClick={() => trackEvent("phone_call_clicked")}
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{SITE.phoneDisplay}</span>
              <span className="sr-only sm:hidden">Call {SITE.phoneDisplay}</span>
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_opened", { trigger: "header" })}
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="hidden sm:inline">WhatsApp support</span>
              <span className="sr-only sm:hidden">WhatsApp support</span>
            </a>
            <button
              type="button"
              onClick={() => openSupport("quote")}
              className="hidden items-center gap-1.5 font-medium underline-offset-4 hover:underline md:inline-flex"
            >
              <FileText className="h-3.5 w-3.5 text-primary" aria-hidden /> Request a quote
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 flex-col leading-none">
          <span className="font-display text-xl font-bold tracking-tight">Cossa Store</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Cossa Nexus Holdings
          </span>
        </Link>

        <form onSubmit={runSearch} className="ml-auto hidden flex-1 max-w-xl md:flex" role="search">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search tools, cleaning supplies, technology…"
              aria-label="Search products"
              className="pl-9"
            />
          </div>
          <Button type="submit" className="ml-2">
            Search
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Support menu"
            className="md:hidden"
            onClick={() => openSupport("whatsapp")}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Account">
            <Link to="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Wishlist">
            <Link to="/account/wishlist" className="relative">
              <Heart className="h-5 w-5" />
              {hydrated && wishlistCount > 0 ? <Dot value={wishlistCount} /> : null}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Cart">
            <Link to="/cart" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {hydrated && cartCount > 0 ? <Dot value={cartCount} /> : null}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <nav className="hidden border-t border-border lg:block" aria-label="Main">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          {NAV.slice(0, 2).map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="py-3 text-sm font-medium text-foreground/80 hover:text-foreground data-[status=active]:text-foreground"
              activeProps={{ className: "border-b-2 border-accent text-foreground" }}
            >
              {category.name}
            </Link>
          ))}
          {NAV.slice(2).map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
        </div>
      </nav>

      {open ? (
        <div className="border-t border-border lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <form onSubmit={runSearch} className="mb-4 flex" role="search">
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
              />
              <Button type="submit" className="ml-2">
                Go
              </Button>
            </form>
            <div className="flex flex-col">
              {NAV.slice(0, 2).map((item) => (
                <MobileLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  onDone={() => setOpen(false)}
                />
              ))}
              {CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  onClick={() => setOpen(false)}
                  className="border-b border-border py-3 text-sm font-medium"
                >
                  {category.name}
                </Link>
              ))}
              {NAV.slice(2).map((item) => (
                <MobileLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  onDone={() => setOpen(false)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Dot({ value }: { value: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
      {value}
    </span>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="py-3 text-sm font-medium text-foreground/80 hover:text-foreground"
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: "border-b-2 border-accent text-foreground" }}
    >
      {label}
    </Link>
  );
}

function MobileLink({ to, label, onDone }: { to: string; label: string; onDone: () => void }) {
  return (
    <Link to={to} onClick={onDone} className="border-b border-border py-3 text-sm font-medium">
      {label}
    </Link>
  );
}
