import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { CATEGORIES } from "@/data/categories";
import { SITE, whatsappLink } from "@/config/site";
import { NewsletterForm } from "@/components/common/NewsletterForm";
import { StaffCatalogueLink } from "@/components/admin/StaffCatalogueLink";
import { trackEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";
import { companyConfig } from "@/config/company";

/**
 * Additional Cossa platforms.
 *
 * These are intentionally secondary to Cossa Store.
 * The footer remains store-focused while allowing customers
 * and business buyers to discover related Cossa platforms.
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
 * Primary Cossa Store social media.
 *
 * Store customers should see store-specific social channels first.
 */
const STORE_SOCIAL_LINKS = [
  {
    label: "Cossa Store on Instagram",
    shortLabel: "Instagram",
    href: "https://www.instagram.com/cossa_nexus_store",
    icon: Instagram,
  },
  {
    label: "Cossa Store on Facebook",
    shortLabel: "Facebook",
    href: "https://www.facebook.com/Cossastore",
    icon: Facebook,
  },
] as const;

/**
 * Parent-company social channels.
 *
 * These remain secondary and are clearly identified
 * as Cossa Nexus Holdings rather than Cossa Store.
 */
const PARENT_SOCIAL_LINKS = [
  {
    label: "Cossa Nexus Holdings on Instagram",
    shortLabel: "Holdings Instagram",
    href: "https://www.instagram.com/cossa_nexus_holdings",
    icon: Instagram,
  },
  {
    label: "Cossa Nexus Holdings on Facebook",
    shortLabel: "Holdings Facebook",
    href: "https://www.facebook.com/Cossanexusholdings",
    icon: Facebook,
  },
] as const;

export function SiteFooter() {
  const { open } = useSupport();

  return (
    <footer className="mt-16 border-t border-border bg-secondary">
      {/* MAIN FOOTER */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        {/* STORE IDENTITY */}
        <div className="lg:col-span-2">
          <img
            src={companyConfig.store.logo}
            alt={companyConfig.store.logoAlt}
            width={200}
            height={60}
            loading="lazy"
            decoding="async"
            className="h-11 w-[200px] object-cover object-center"
          />

          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {SITE.positioning}
          </p>

          {/* LEGAL PARENT */}
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
                Operated by {SITE.parent}
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Registered South African company.
              </p>
            </div>
          </div>

          {/* TRUST DETAILS */}
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
              href={`mailto:${SITE.supportEmail}`}
              onClick={() =>
                trackEvent("email_clicked", { trigger: "footer" })
              }
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              {SITE.supportEmail}
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

        {/* BUSINESS & MORE FROM COSSA */}
        <div>
          <p className="text-sm font-semibold">Business & services</p>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/business-account" className="hover:underline">
                Business buying
              </Link>
            </li>

            <li>
              <Link to="/business-account" className="hover:underline">
                Business account
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
          </ul>

          {/* RELATED COSSA PLATFORMS */}
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              More from Cossa
            </p>

            <ul className="mt-3 space-y-3 text-xs text-muted-foreground">
              {COSSA_PLATFORMS.map((platform) => (
                <li key={platform.label}>
                  <a
                    href={platform.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-1.5 hover:underline"
                  >
                    <span>
                      <span className="font-medium text-foreground">
                        {platform.label}
                      </span>

                      <span className="block">
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

          {/* CUSTOMER PROTECTION */}
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
              published Terms and Conditions, Shipping & Delivery Policy,
              Returns & Refunds Policy and applicable South African consumer
              law.
            </p>
          </div>
        </div>
      </div>

      {/* STORE SOCIAL MEDIA */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Follow Cossa Store</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Follow us for new products, collections, promotions, buying
                guides and store updates.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {STORE_SOCIAL_LINKS.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    onClick={() =>
                      trackEvent("social_link_clicked", {
                        platform: item.shortLabel,
                        brand: "Cossa Store",
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-background"
                  >
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {item.shortLabel}
                  </a>
                );
              })}
            </div>
          </div>

          {/* PARENT SOCIAL — SECONDARY */}
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Cossa Store is part of {SITE.parent}.
              </p>

              <div className="flex flex-wrap gap-3">
                {PARENT_SOCIAL_LINKS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      title={item.label}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {item.shortLabel}
                    </a>
                  );
                })}
              </div>
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

      {/* BOTTOM LEGAL BAR */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-1">
            <p>
              © {new Date().getFullYear()} {SITE.parent}. All rights reserved.
            </p>

            <p>
              {SITE.name} is operated by {SITE.parent} · Reg.{" "}
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
