import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { CATEGORIES } from "@/data/categories";
import { SITE, whatsappLink } from "@/config/site";
import { NewsletterForm } from "@/components/common/NewsletterForm";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-display text-lg font-bold">Cossa Store</p>
          <p className="mt-2 text-sm text-primary-foreground/70">{SITE.positioning}</p>
          <p className="mt-4 text-xs text-primary-foreground/60">
            A division of {SITE.parent}. Trading in South Africa.
          </p>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> {SITE.whatsappDisplay}
          </a>
        </div>

        <div>
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
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
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li>
              <Link to="/business-buying" className="hover:underline">
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
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Support</p>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li>
              <Link to="/contact" className="hover:underline">
                Contact & WhatsApp support
              </Link>
            </li>
            <li>
              <Link to="/track-order" className="hover:underline">
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

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Cossa Nexus Holdings. All rights reserved.</p>
          <p>{SITE.domain}</p>
        </div>
      </div>
    </footer>
  );
}