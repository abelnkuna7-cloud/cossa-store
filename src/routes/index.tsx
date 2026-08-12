import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  FileText,
  Landmark,
  MessageCircle,
  PackageSearch,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Truck,
  Undo2,
  Wrench,
} from "lucide-react";

import { SITE_URL } from "@/config/seo";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/shop/ProductCarousel";
import { ProductImage } from "@/components/shop/ProductImage";
import { CATEGORIES, PROJECTS } from "@/data/categories";
import {
  SITE,
  STORE_SUPPORT_PATHWAYS,
  whatsappLink,
} from "@/config/site";
import {
  publicCollectionsQuery,
  storefrontProductsQuery,
} from "@/lib/queries";
import { buildSections } from "@/lib/merchandising";
import { ContactStrip } from "@/components/support/ContactStrip";
import {
  COMPLIANCE_BADGES,
  GUARANTEES,
  TRUST_STATS,
} from "@/config/trust";
import { companyConfig } from "@/config/company";
import { GroupBadge } from "@/components/company/GroupBadge";

const TITLE =
  "Cossa Store | Project Commerce, Products & Business Procurement";

const DESCRIPTION =
  "Shop products, project solutions and business procurement through Cossa Store, a South African hybrid commerce platform operated by Cossa Nexus Holdings (Pty) Ltd.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },

      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE.name },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/` },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],

    /**
     * IMPORTANT:
     * The homepage owns its own canonical URL.
     *
     * The root route must NOT also emit a canonical.
     * We will remove the canonical from the root route next.
     */
    links: [
      {
        rel: "canonical",
        href: `${SITE_URL}/`,
      },
    ],
  }),

  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(storefrontProductsQuery()),
      context.queryClient.ensureQueryData(publicCollectionsQuery()),
    ]);
  },

  component: Home,
});

function Home() {
  const { data: products } = useSuspenseQuery(storefrontProductsQuery());
  const { data: collections } = useSuspenseQuery(publicCollectionsQuery());

  const sections = buildSections(products);

  const featuredCollections = (collections ?? []).filter(
    (collection) => collection.status === "active",
  );

  return (
    <div>
      <Hero />

      <TrustStatsBar />

      <ContactStrip />

      {/* PRODUCT MERCHANDISING */}
      {sections.map((section) => (
        <ProductCarousel
          key={section.id}
          sectionId={section.id}
          title={section.title}
          description={section.description}
          products={section.products}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/shop">Shop all</Link>
            </Button>
          }
        />
      ))}

      {/* FEATURED COLLECTIONS */}
      {featuredCollections.length > 0 ? (
        <Section
          muted
          title="Featured collections"
          description="Curated Cossa Store ranges, product groups and campaigns."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCollections.map((collection) => (
              <Link
                key={collection.id}
                to="/shop"
                search={{ collection: collection.slug }}
                className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
              >
                <ProductImage
                  url={collection.hero_image_url}
                  alt={collection.name}
                  className="h-40 w-full"
                />

                <div className="p-5">
                  {collection.campaign_name ? (
                    <p className="text-[11px] uppercase tracking-wide text-primary">
                      {collection.campaign_name}
                    </p>
                  ) : null}

                  <h3 className="mt-1 font-display text-lg font-semibold">
                    {collection.name}
                  </h3>

                  {collection.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {collection.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {/* MAIN CATEGORIES */}
      <Section
        title="Shop by category"
        description="Browse the main product ranges available through Cossa Store."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
            >
              <h3 className="font-display text-xl font-semibold">
                {category.name}
              </h3>

              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {category.tagline}
              </p>

              <p className="mt-3 flex-1 text-sm text-muted-foreground">
                {category.description}
              </p>

              <span className="mt-4 inline-flex items-center text-sm font-medium text-foreground">
                Browse range
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* SHOP BY PROJECT */}
      <Section
        muted
        title="Shop by project"
        description="Start with what you need to get done. Cossa Store helps turn the job into products, quantities, project kits and quotation options."
        action={
          <Button asChild variant="outline">
            <Link to="/shop-by-project">
              <Calculator className="mr-2 h-4 w-4" />
              Open the project hub
            </Link>
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.slice(0, 6).map((project) => (
            <Link
              key={project.slug}
              to="/project/$slug"
              params={{ slug: project.slug }}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent"
            >
              <h3 className="font-sans text-base font-semibold">
                {project.name}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                {project.description}
              </p>

              {project.calculator ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-primary">
                  <Calculator className="h-3.5 w-3.5" aria-hidden />
                  {project.calculator.label} calculator
                </p>
              ) : null}
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {PROJECTS.length} starter projects available —{" "}
          <Link
            to="/shop-by-project"
            className="font-medium text-primary underline"
          >
            explore all projects
          </Link>
          .
        </p>
      </Section>

      {/* BUSINESS BUYING */}
      <Section
        muted
        title="Buying for a business"
        description="Cossa Store supports business procurement, bulk buying and repeat purchasing — not only once-off retail orders."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/business-account">
                Apply for a business account
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link to="/business-account">
                How business buying works
              </Link>
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              icon: Building2,
              title: "Bulk orders",
              body:
                "Request pricing for larger quantities, project requirements and recurring supply.",
            },
            {
              icon: FileText,
              title: "Formal quotations",
              body:
                "Request written quotations for procurement, projects and purchasing approval.",
            },
            {
              icon: Receipt,
              title: "Business documentation",
              body:
                "Order and transaction documents are provided according to the applicable transaction and tax requirements.",
            },
            {
              icon: RefreshCw,
              title: "Repeat purchasing",
              body:
                "Reorder recurring products and consumables without rebuilding the requirement every time.",
            },
            {
              icon: Landmark,
              title: "Business support",
              body:
                "Get assistance with product sourcing, quotations, purchasing and fulfilment enquiries.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <Icon className="h-5 w-5 text-accent" aria-hidden />

              <h3 className="mt-3 font-sans text-sm font-semibold">
                {title}
              </h3>

              <p className="mt-1.5 text-sm text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* COMPLETE THE PROJECT */}
      <Section
        title="Need more than the product?"
        description="Some purchases need installation, setup, project support or recurring service. Cossa Store can help route suitable enquiries to the right support pathway."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {STORE_SUPPORT_PATHWAYS.map((support) => (
            <div
              key={support.id}
              className="rounded-lg border border-border bg-card p-6"
            >
              <h3 className="font-display text-lg font-semibold">
                {support.name}
              </h3>

              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {support.need}
              </p>

              <p className="mt-3 text-sm text-muted-foreground">
                {support.description}
              </p>

              <Button
                asChild
                variant="link"
                className="mt-2 px-0"
              >
                <Link to="/request-a-quote">
                  Request help with your requirement
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {/* SUPPLIERS */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold">
              Supply Cossa Store
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              We are building a curated supplier network for physical
              products, local distribution, dropshipping, fulfilment and
              selected specialist product ranges.
            </p>
          </div>

          <Button asChild size="lg">
            <Link to="/supplier-application">
              Apply as a supplier
            </Link>
          </Button>
        </div>
      </section>

      {/* TRUST */}
      <Section
        title="Buying with confidence"
        description="Clear commitments based on what Cossa Store can actually support today."
        muted
        action={
          <Button asChild variant="outline">
            <Link to="/how-it-works">
              How Cossa Store works
            </Link>
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {GUARANTEES.map((guarantee) => (
            <div
              key={guarantee.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <CheckCircle2
                className="h-5 w-5 text-accent"
                aria-hidden
              />

              <h3 className="mt-3 font-sans text-sm font-semibold">
                {guarantee.title}
              </h3>

              <p className="mt-1.5 text-sm text-muted-foreground">
                {guarantee.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Landmark,
              title: "South African business",
              body:
                `Cossa Store is operated by ${SITE.parent}, a registered South African company.`,
            },
            {
              icon: ShieldCheck,
              title: "Online payments in verification",
              body:
                "Online payment methods will only be presented as available after the relevant merchant verification and production integration are complete.",
            },
            {
              icon: Truck,
              title: "Delivery information",
              body:
                "Delivery expectations and fulfilment information are communicated according to product type, destination and fulfilment route.",
            },
            {
              icon: Undo2,
              title: "Type-specific returns",
              body:
                "Returns and refunds are handled according to the applicable product type, published policy and South African consumer law.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <Icon className="h-5 w-5 text-accent" aria-hidden />

              <h3 className="mt-3 font-sans text-sm font-semibold">
                {title}
              </h3>

              <p className="mt-1.5 text-sm text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* WHATSAPP CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-lg border border-accent/40 bg-accent/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Not sure what you need?
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Send the Cossa Store team your product list, project requirement
              or sourcing request.
            </p>
          </div>

          <Button asChild size="lg">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {SITE.whatsappDisplay}
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  muted,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={muted ? "bg-secondary/50" : undefined}>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>

            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          {action}
        </div>

        {children}
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-primary/20">
      <img
        src={companyConfig.backgrounds.heroEagle}
        alt=""
        width={1600}
        height={1200}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      <div
        className="hero-veil absolute inset-0"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            South African owned · Products · Projects · Business procurement
          </p>

          <GroupBadge className="mt-4" />

          <div
            className="gold-rule mt-4 h-px w-24"
            aria-hidden
          />

          <h1 className="mt-6 font-display text-[2.15rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Everything your project needs.
            <span className="block text-primary">
              One intelligent store.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Shop products, build project requirements and source business
            supplies through one South African hybrid commerce platform —
            with human support when the job needs more than a product.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-13 px-8 text-base font-semibold shadow-lg"
            >
              <Link to="/shop">
                Shop products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 border-primary/45 bg-transparent px-8 text-base hover:bg-primary/10"
            >
              <Link to="/shop-by-project">
                Shop by project
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-13 px-6 text-base"
            >
              <Link to="/request-a-quote">
                Request a quote
              </Link>
            </Button>
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PackageSearch
                className="h-3.5 w-3.5 text-primary"
                aria-hidden
              />
              Retail & business
            </span>

            <span className="flex items-center gap-1.5">
              <Calculator
                className="h-3.5 w-3.5 text-primary"
                aria-hidden
              />
              Project-based buying
            </span>

            <span className="flex items-center gap-1.5">
              <Wrench
                className="h-3.5 w-3.5 text-primary"
                aria-hidden
              />
              Support beyond the product
            </span>

            <span className="flex items-center gap-1.5">
              <MessageCircle
                className="h-3.5 w-3.5 text-primary"
                aria-hidden
              />
              {SITE.phoneDisplay}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function TrustStatsBar() {
  return (
    <section className="border-b border-border bg-surface-strong">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {TRUST_STATS.map((stat) => (
            <div key={stat.id}>
              <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </dt>

              <dd
                className={
                  stat.value
                    ? "mt-1.5 font-display text-lg font-bold text-primary sm:text-xl"
                    : "mt-1.5 text-xs italic text-muted-foreground"
                }
              >
                {stat.value ?? stat.pending}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Compliance & registration
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            {COMPLIANCE_BADGES.map((badge) => (
              <div
                key={badge.id}
                className="flex min-w-[220px] flex-1 items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <span className="rounded border border-primary/40 px-2 py-1 font-display text-xs font-bold text-primary">
                  {badge.code}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {badge.name}
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {badge.reference ?? badge.note}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Registration, certification and performance claims are published
            only when they are supported by current business records.
          </p>
        </div>
      </div>
    </section>
  );
}
