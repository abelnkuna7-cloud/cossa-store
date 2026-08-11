import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  ExternalLink,
} from "lucide-react";

import { CATEGORIES } from "@/data/categories";
import { SITE, whatsappLink } from "@/config/site";
import { NewsletterForm } from "@/components/common/NewsletterForm";
import { StaffCatalogueLink } from "@/components/admin/StaffCatalogueLink";
import { trackEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";
import { companyConfig } from "@/config/company";

/**
 * Public Cossa digital platforms.
 *
 * Keep public platform URLs centralised here until they are moved
 * into companyConfig or another shared Cossa ecosystem configuration.
 */
const COSSA_PLATFORMS = [
  {
    label: "Cossa Nexus Holdings",
    description: "Corporate group website",
    href: SITE.corporateWebsite,
  },
  {
    label: "NexDocs",
    description: "Business document platform",
    href: "https://nexdocs.cossanexusholdings.co.za",
  },
  {
    label: "Cossa Growth",
    description: "Business growth platform",
    href: "https://growth.cossanexusholdings.co.za",
  },
] as const;

/**
 * Official social channels with confirmed handle-style URLs.
 *
 * Add Facebook Construction and any additional platforms once
 * their exact public profile URLs are confirmed.
 */
const SOCIAL_LINKS = [
  {
    label: "Instagram — Cossa Nexus Holdings",
    shortLabel: "Instagram",
    href: "https://www.instagram.com/cossa_nexus_holdings",
    icon: Instagram,
  },
  {
    label: "Instagram — Cossa Store",
    shortLabel: "Store Instagram",
    href: "https://www.instagram.com/cossa_nexus_store",
    icon: Instagram,
  },
  {
    label: "Facebook — Cossa Nexus Holdings",
    shortLabel: "Facebook",
    href: "https://www.facebook.com/Cossanexusholdings",
    icon: Facebook,
  },
  {
    label: "Facebook — Cossa Store",
    shortLabel: "Store Facebook",
    href: "https://www.facebook.com/Cossastore",
    icon: Facebook,
  },
  {
    label: "X — Cossa Nexus Holdings",
    shortLabel: "X",
    href: "https://x.com/cossa_nexus",
    icon: Globe,
  },
  {
    label: "TikTok — Cossa Nexus Holdings",
    shortLabel: "TikTok",
    href: "https://www.tiktok.com/@cossa_nexus_holdings",
    icon: Globe,
  },
] as const;

export function SiteFooter() {
  const { open } = useSupport();

  return (
    <footer className="mt-16 border-t border-border bg-secondary">
      {/* MAIN FOOTER */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        {/* BRAND / COMPANY */}
        <div className="lg:col-span-2">
          <img
            src={companyConfig.store.logo}
            alt={companyConfig.store.logoAlt}
            width={200}
            height={60}
            loading="lazy"
            decoding="async"
            className="h-11 w-auto object-contain"
          />

          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {SITE.positioning}
          </p>

          {/* PARENT COMPANY */}
          <div className="mt-5 flex items-start gap-3">
            <img
              src={companyConfig.parentCompany.logo}
              alt={companyConfig.parentCompany.logoAlt}
              width={44}
              height={44}
              loading="lazy"
              decoding="async"
              className="h-11 w-11 shrink-0 object-contain"
            />

            <div>
              <p className="text-xs font-medium text-foreground">
                A division of {SITE.parent}
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Registered South African company operating the Cossa business
                ecosystem.
              </p>
            </div>
          </div>

          {/* COMPANY TRUST DETAILS */}
          <dl className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline font-medium text-foreground">
                Legal entity:{" "}
              </dt>
              <dd className="inline">{SITE.parent}</dd>
            </div>

            <div>
              <dt className="inline font-medium text-foreground">
                Registration:{" "}
              </dt>
              <dd className="inline">{SITE.registrationNumber}</dd>
            </div>

            <div>
              <dt className="inline font-medium text-foreground">
                Country:{" "}
              </dt>
              <dd className="inline">{SITE.country}</dd>
            </div>

            <div>
              <dt className="inline font-medium text-foreground">
                Currency:{" "}
              </dt>
              <dd className="inline">{SITE.currency}</dd>
            </div>

            {companyConfig.parentCompany.bbbee && (
              <div>
                <dt className="inline font-medium text-foreground">
                  B-BBEE:{" "}
                </dt>
                <dd className="inline">
                  {companyConfig.parentCompany.bbbee}
                </dd>
              </div>
            )}

            <div>
              <dt className="inline font-medium text-foreground">
                Location:{" "}
              </dt>
              <dd className="inline">{SITE.publicAddress}</dd>
            </div>
          </dl>

          {/* CONTACT */}
          <div className="mt-5 space-y-2.5 text-sm">
            <a
              href={`mailto:${SITE.email}`}
              onClick={() => trackEvent("email_clicked", { trigger: "footer" })}
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              {SITE.email}
            </a>

            <a
              href={SITE.phoneHref}
              onClick={() => trackEvent("phone_call_clicked")}
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <Phone className="h-4 w-4 text-primary" aria-hidden />
              {SITE.phoneDisplay}
            </a>

            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent("whatsapp_opened", { trigger: "footer" })
              }
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <MessageCircle
                className="h-4 w-4 text-primary"
                aria-hidden
              />
              WhatsApp {SITE.phoneDisplay}
            </a>

            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>{SITE.publicAddress}</span>
            </div>
          </div>
        </div>

        {/* SHOP */}
        <div>
          <p className="text-sm font-semibold">Shop</p>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop" className="hover:underline">
                All products
              </Link>
            </li>

            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}

            <li>
              <Link to="/shop-by-project" className="hover:underline">
                Shop by project
              </Link>
            </li>

            <li>
              <Link to="/cart" className="hover:underline">
                Shopping cart
              </Link>
            </li>

            <li>
              <Link to="/account/orders" className="hover:underline">
                My orders
              </Link>
            </li>
          </ul>
        </div>

        {/* BUSINESS / ECOSYSTEM */}
        <div>
          <p className="text-sm font-semibold">Cossa ecosystem</p>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/business-account" className="hover:underline">
                Business buying
              </Link>
            </li>

            <li>
              <Link to="/request-a-quote" className="hover:underline">
                Request a quotation
              </Link>
            </li>

            <li>
              <Link to="/supplier-application" className="hover:underline">
                Become a supplier
              </Link>
            </li>

            <li>
              <Link to="/about" className="hover:underline">
                About Cossa Store
              </Link>
            </li>

            {COSSA_PLATFORMS.map((platform) => (
              <li key={platform.label}>
                <a
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-1.5 hover:underline"
                >
                  <span>
                    {platform.label}
                    <span className="block text-xs opacity-80">
                      {platform.description}
                    </span>
                  </span>

                  <ExternalLink
                    className="mt-0.5 h-3 w-3 shrink-0 opacity-60"
                    aria-hidden
                  />
                </a>
              </li>
            ))}
          </ul>

          {/* GROUP COMPANIES */}
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Group companies
            </p>

            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>Cossa Nexus Construction</li>
              <li>Cossa Facility Services</li>
              <li>Cossa Tech</li>
              <li>Cossa Store</li>
              <li>Cossa Logistics — planned</li>
              <li>Cossa Cuisine — planned</li>
            </ul>
          </div>
        </div>

        {/* SUPPORT & LEGAL */}
        <div>
          <p className="text-sm font-semibold">Support & legal</p>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/contact" className="hover:underline">
                Contact us
              </Link>
            </li>

            <li>
              <button
                type="button"
                onClick={() => open("callback")}
                className="hover:underline"
              >
                Request a callback
              </button>
            </li>

            <li>
              <Link to="/how-it-works" className="hover:underline">
                How Cossa Store works
              </Link>
            </li>

            <li>
              <Link to="/account/orders" className="hover:underline">
                Track an order
              </Link>
            </li>

            <li>
              <Link to="/delivery" className="hover:underline">
                Shipping & Delivery Policy
              </Link>
            </li>

            <li>
              <Link to="/returns" className="hover:underline">
                Returns & Refunds Policy
              </Link>
            </li>

            <li>
              <Link to="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
            </li>

            <li>
              <Link to="/terms" className="hover:underline">
                Terms and Conditions
              </Link>
            </li>

            <li>
              <button
                type="button"
                onClick={() => open("info")}
                className="hover:underline"
              >
                Important information
              </button>
            </li>
          </ul>

          {/* TRUST */}
          <div className="mt-5 rounded-lg border border-border bg-background/40 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="h-4 w-4 text-primary"
                aria-hidden
              />

              <p className="text-xs font-semibold text-foreground">
                Customer protection
              </p>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Purchases made directly from Cossa Store are subject to our
              published terms, delivery and returns policies and applicable
              South African consumer law.
            </p>
          </div>
        </div>
      </div>

      {/* SOCIAL MEDIA */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Connect with Cossa</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Follow Cossa Nexus Holdings and Cossa Store for products,
                projects, updates and business opportunities.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-background"
                  >
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {item.shortLabel}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* NEWSLETTER */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <NewsletterForm />
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-1">
            <p>
              © {new Date().getFullYear()} {SITE.parent}. All rights reserved.
            </p>

            <p>
              Cossa Store is operated by {SITE.parent} · Reg.{" "}
              {SITE.registrationNumber}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={SITE.corporateWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {SITE.domain}
              </span>
            </a>

            <StaffCatalogueLink variant="link" />
          </div>
        </div>
      </div>
    </footer>
  );
}