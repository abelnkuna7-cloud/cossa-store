import { Link } from "@tanstack/react-router";
import { Globe, MessageCircle, Phone } from "lucide-react";

import { CATEGORIES } from "@/data/categories";
import { SITE, whatsappLink } from "@/config/site";
import { NewsletterForm } from "@/components/common/NewsletterForm";
import { StaffCatalogueLink } from "@/components/admin/StaffCatalogueLink";
import { trackEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";
import { companyConfig } from "@/config/company";

export function SiteFooter() {
  const { open } = useSupport();
  return (
    <footer className="mt-16 border-t border-border bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <img
            src={companyConfig.store.logo}
            alt={companyConfig.store.logoAlt}
            width={200}
            height={60}
            loading="lazy"
            decoding="async"
            className="h-11 w-auto object-contain"
          />
          <p className="mt-3 text-sm text-muted-foreground">{SITE.positioning}</p>
          <div className="mt-4 flex items-center gap-3">
            <img
              src={companyConfig.parentCompany.logo}
              alt={companyConfig.parentCompany.logoAlt}
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="h-10 w-10 object-contain"
            />
            <p className="text-xs text-muted-foreground">
              {companyConfig.store.parentText}. Trading in South Africa.
            </p>
          </div>
          <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div>
              <dt className="inline font-medium text-foreground">Parent company: </dt>
              <dd className="inline">{companyConfig.parentCompany.name}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Reg. no: </dt>
              <dd className="inline">{companyConfig.parentCompany.registrationNumber}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Construction company: </dt>
              <dd className="inline">{companyConfig.construction.name}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Reg. no: </dt>
              <dd className="inline">{companyConfig.construction.registrationNumber}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">B-BBEE: </dt>
              <dd className="inline">{companyConfig.parentCompany.bbbee}</dd>
            </div>
          </dl>
          <div className="mt-4 space-y-2 text-sm">
            <a
              href={SITE.website}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("website_link_clicked")}
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <Globe className="h-4 w-4 text-primary" aria-hidden /> {SITE.domain}
            </a>
            <a
              href={SITE.phoneHref}
              onClick={() => trackEvent("phone_call_clicked")}
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <Phone className="h-4 w-4 text-primary" aria-hidden /> Phone {SITE.phoneDisplay}
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_opened", { trigger: "footer" })}
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <MessageCircle className="h-4 w-4 text-primary" aria-hidden /> WhatsApp{" "}
              {SITE.phoneDisplay}
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop" className="hover:underline">
                All products
              </Link>
            </li>
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link to="/category/$slug" params={{ slug: c.slug }} className="hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/shop-by-project" className="hover:underline">
                Shop by project
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Business & partners</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/business-account" className="hover:underline">
                Business buying
              </Link>
            </li>
            <li>
              <Link to="/business-account" className="hover:underline">
                Business account application
              </Link>
            </li>
            <li>
              <Link to="/request-a-quote" className="hover:underline">
                Request a quote
              </Link>
            </li>
            <li>
              <Link to="/supplier-application" className="hover:underline">
                Supplier application
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:underline">
                About Cossa Store
              </Link>
            </li>
            <li>
              <a
                href={companyConfig.parentCompany.website}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                Cossa Nexus Holdings group site
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Support</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/contact" className="hover:underline">
                Contact & WhatsApp support
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:underline">
                How Cossa works
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => open("callback")} className="hover:underline">
                Request a callback
              </button>
            </li>
            <li>
              <button type="button" onClick={() => open("info")} className="hover:underline">
                Important information
              </button>
            </li>
            <li>
              <Link to="/account/orders" className="hover:underline">
                Track order
              </Link>
            </li>
            <li>
              <Link to="/delivery" className="hover:underline">
                Delivery information
              </Link>
            </li>
            <li>
              <Link to="/returns" className="hover:underline">
                Returns and refunds
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:underline">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:underline">
                Terms and conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {companyConfig.footer.copyright}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StaffCatalogueLink variant="link" />
            {companyConfig.social.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
