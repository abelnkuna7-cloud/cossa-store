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
import heroImage from "@/assets/hero-projects.jpg";

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
        description="Start from the job you need to do and we'll show the relevant products."
        action={
          <Button asChild variant="outline">
            <Link to="/shop-by-project">All projects</Link>
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project) => (
            <Link
              key={project.slug}
              to="/project/$slug"
              params={{ slug: project.slug }}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent"
            >
              <h3 className="font-sans text-base font-semibold">{project.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
            </Link>
          ))}
        </div>
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
      <Section title="Buying with confidence" muted>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              icon: Landmark,
              title: "South African business",
              body: "Operated locally under Cossa Nexus Holdings.",
            },
            {
              icon: ShieldCheck,
              title: "Secure checkout",
              body: "Checkout is being finalised; payment processing is not live yet.",
            },
            {
              icon: MessageCircle,
              title: "Talk to a real person",
              body: `Call or WhatsApp the Cossa team on ${SITE.phoneDisplay}.`,
            },
            {
              icon: Truck,
              title: "Clear delivery information",
              body: "Delivery expectations shown per product and range.",
            },
            {
              icon: Undo2,
              title: "Transparent returns",
              body: "Published returns and refunds terms before you buy.",
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
