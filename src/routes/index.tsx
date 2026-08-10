import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_URL } from "@/config/seo";
import { useSuspenseQuery } from "@tanstack/react-query";
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

import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/shop/ProductCarousel";
import { ProductImage } from "@/components/shop/ProductImage";
import { CATEGORIES, PROJECTS } from "@/data/categories";
import { SERVICE_ECOSYSTEM, SITE, whatsappLink } from "@/config/site";
import { publicCollectionsQuery, storefrontProductsQuery } from "@/lib/queries";
import { buildSections } from "@/lib/merchandising";
import { ContactStrip } from "@/components/support/ContactStrip";
import { COMPLIANCE_BADGES, GUARANTEES, TRUST_STATS } from "@/config/trust";
import { companyConfig } from "@/config/company";
import { GroupBadge } from "@/components/company/GroupBadge";

const TITLE = "Cossa Store | Building, Facility & Tech Supplies";
const DESCRIPTION =
  "Products, services and intelligent solutions for building, maintaining and improving homes and businesses. Supplied in South Africa by Cossa Nexus Holdings.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Cossa Store",
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storefrontProductsQuery());
    context.queryClient.ensureQueryData(publicCollectionsQuery());
  },
  component: Home,
});

function Home() {
  const { data: products } = useSuspenseQuery(storefrontProductsQuery());
  const { data: collections } = useSuspenseQuery(publicCollectionsQuery());
  const sections = buildSections(products);
  const featuredCollections = (collections ?? []).filter((c) => c.status === "active");

  return (
    <div>
      <Hero />
      <TrustStatsBar />

      <ContactStrip />

      {/* Merchandising rails — a section only renders when it has real products */}
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

      {featuredCollections.length > 0 ? (
        <Section
          muted
          title="Featured collections"
          description="Curated Cossa ranges and campaigns."
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
                  <h3 className="mt-1 font-display text-lg font-semibold">{collection.name}</h3>
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

      {/* Categories */}
      <Section
        title="Main product categories"
        description="Browse the three ranges that make up the Cossa Store catalogue."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
            >
              <h3 className="font-display text-xl font-semibold">{category.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {category.tagline}
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{category.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-foreground">
                Browse range <ArrowRight className="ml-1.5 h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Shop by project */}
      <Section
        muted
        title="Shop by project"
        description="Start from the job, not the aisle. Every project has a quantity calculator, a full kit you can add to cart in one action, and a quote path for bigger scopes."
        action={
          <Button asChild variant="outline">
            <Link to="/shop-by-project">
              <Calculator className="mr-2 h-4 w-4" /> Open the project hub
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
              <h3 className="font-sans text-base font-semibold">{project.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
              {project.calculator ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-primary">
                  <Calculator className="h-3.5 w-3.5" aria-hidden /> {project.calculator.label}{" "}
                  calculator
                </p>
              ) : null}
            </Link>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          {PROJECTS.length} starter projects available —{" "}
          <Link to="/shop-by-project" className="text-primary underline">
            see them all
          </Link>
          .
        </p>
      </Section>

      {/* Business buying */}
      <Section
        muted
        title="Buying for a business"
        description="Cossa Store is built for procurement, not only once-off retail purchases."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/business-account">Apply for a business account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/business-account">How business buying works</Link>
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              icon: Building2,
              title: "Bulk orders",
              body: "Volume pricing on request for repeat and high-quantity lines.",
            },
            {
              icon: FileText,
              title: "Quotations",
              body: "Formal quotations for procurement and tender processes.",
            },
            {
              icon: Receipt,
              title: "VAT invoices",
              body: "Tax invoices issued with full business and VAT details.",
            },
            {
              icon: RefreshCw,
              title: "Repeat purchasing",
              body: "Reorder standard consumables on a predictable schedule.",
            },
            {
              icon: Landmark,
              title: "Business support",
              body: "A named contact for account, delivery and product queries.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-3 font-sans text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Service ecosystem */}
      <Section
        title="The Cossa service ecosystem"
        description="Products are only part of the job. Cossa companies can carry out the work."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {SERVICE_ECOSYSTEM.filter((s) => !("planned" in s && s.planned)).map((service) => (
            <div key={service.name} className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">{service.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {service.need}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{service.description}</p>
              <Button asChild variant="link" className="mt-2 px-0">
                <Link to="/request-a-quote">Request this service with your products</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Cossa Logistics, Cossa AI and Cossa Marketing integrations are planned and are not
          connected to this store yet.
        </p>
      </Section>

      {/* Suppliers */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold">Supply Cossa Store</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We are building a supplier network across construction, facility supplies and
              technology. If you offer wholesale, dropshipping or local distribution, apply to be
              listed.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/supplier-application">Apply as a supplier</Link>
          </Button>
        </div>
      </section>

      {/* Trust */}
      <Section
        title="Buying with confidence"
        description="Specific, honest commitments — not badges we cannot back up."
        muted
        action={
          <Button asChild variant="outline">
            <Link to="/how-it-works">How Cossa works</Link>
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="rounded-lg border border-border bg-card p-5">
              <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-3 font-sans text-sm font-semibold">{g.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Landmark,
              title: "South African business",
              body: "Operated locally under Cossa Nexus Holdings.",
            },
            {
              icon: ShieldCheck,
              title: "Payments in verification",
              body: "PayFast and Ozow are wired in and go live the moment merchant verification clears.",
            },
            {
              icon: Truck,
              title: "Provincial delivery windows",
              body: "Published per province, plus Pargo click-and-collect.",
            },
            {
              icon: Undo2,
              title: "Type-specific returns",
              body: "Different rules for physical, digital and made-to-order — all written down.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-3 font-sans text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* WhatsApp CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-lg border border-accent/40 bg-accent/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Not sure what you need?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Message the Cossa Store team on WhatsApp with your project or product list.
            </p>
          </div>
          <Button asChild size="lg">
            <a href={whatsappLink()} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> {SITE.whatsappDisplay}
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
  action?: React.ReactNode;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={muted ? "bg-secondary/50" : undefined}>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
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
        alt="Cossa Nexus eagle emblem"
        width={1600}
        height={1200}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="hero-veil absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            South African owned · Serving local and international clients
          </p>
          <GroupBadge className="mt-4" />
          <div className="gold-rule mt-4 h-px w-24" aria-hidden />
          <h1 className="mt-6 font-display text-[2.15rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Built in South Africa.
            <span className="block text-primary">Trusted worldwide.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Construction, facility and smart-technology supply — with the installation, cleaning and
            technical teams to finish the job, not just ship the box.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-13 px-8 text-base font-semibold shadow-lg">
              <Link to="/shop">
                Shop products <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 border-primary/45 bg-transparent px-6 text-sm hover:bg-primary/10"
            >
              <Link to="/request-a-quote">Request a quote</Link>
            </Button>
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PackageSearch className="h-3.5 w-3.5 text-primary" aria-hidden /> Retail & trade
            </span>
            <span className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-primary" aria-hidden /> Product + service
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-primary" aria-hidden />{" "}
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
                  <p className="truncate text-xs font-semibold">{badge.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {badge.reference ?? badge.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            We publish registration and certificate numbers only once they are issued and verified.
            Nothing on this page is a placeholder claim.
          </p>
        </div>
      </div>
    </section>
  );
}
