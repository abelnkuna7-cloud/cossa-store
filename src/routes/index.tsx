import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  FileText,
  MessageCircle,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { SITE_URL } from "@/config/seo";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/shop/ProductCarousel";
import { ProductImage } from "@/components/shop/ProductImage";
import { CATEGORIES, PROJECTS } from "@/data/categories";
import { SITE, whatsappLink } from "@/config/site";
import { publicCollectionsQuery, storefrontProductsQuery } from "@/lib/queries";
import { buildSections } from "@/lib/merchandising";
import { ContactStrip } from "@/components/support/ContactStrip";
import { COMPLIANCE_BADGES, GUARANTEES, TRUST_STATS } from "@/config/trust";
import { companyConfig } from "@/config/company";
import { GroupBadge } from "@/components/company/GroupBadge";

const TITLE = "Cossa Store | Products, Projects & Business Procurement";
const DESCRIPTION = "Shop products, project solutions and business procurement through Cossa Store, a South African hybrid commerce platform operated by Cossa Nexus Holdings (Pty) Ltd.";

const GROUP_SOLUTIONS = [
  {
    name: "Cossa Nexus Construction",
    eyebrow: "Build · Renovate · Maintain",
    description: "Construction, renovations, repairs, ceilings, painting, tiling, roofing, plumbing and project support.",
    image: "/assets/demo/construction-tools.jpg",
    href: `${SITE.platforms.corporate}/construction`,
    action: "Explore construction",
  },
  {
    name: "Cossa Facility Services",
    eyebrow: "Clean · Maintain · Support",
    description: "Cleaning, hygiene, facility support, property care and recurring service requirements.",
    image: "/assets/demo/cleaning-supplies.jpg",
    href: `${SITE.platforms.corporate}/facility-services`,
    action: "Explore facility services",
  },
  {
    name: "Cossa Tech",
    eyebrow: "Marketing · AI · Business Growth",
    description: "Websites, digital marketing, AI-enabled solutions, business technology and online growth support.",
    image: "/assets/demo/technology-laptop.jpg",
    href: `${SITE.platforms.corporate}/tech`,
    action: "Explore Cossa Tech",
  },
  {
    name: "Growth",
    eyebrow: "CRM · Sales · Automation",
    description: "Cossa's business growth platform for customer acquisition, sales operations, workflows and AI-enabled execution.",
    image: "/assets/demo/smart-security.jpg",
    href: SITE.platforms.growth,
    action: "Open Growth",
  },
  {
    name: "NexDocs",
    eyebrow: "Business documents · Digital tools",
    description: "Create practical business and project documents through Cossa's digital document platform.",
    image: "/assets/demo/digital-download.jpg",
    href: SITE.platforms.nexdocs,
    action: "Open NexDocs",
  },
  {
    name: "Cossa Nexus Holdings",
    eyebrow: "One group · Connected solutions",
    description: "Discover the Cossa business group and find the right product, service or business solution for your requirement.",
    image: "/assets/backgrounds/cossa-eagle-hero.webp",
    href: SITE.platforms.corporate,
    action: "Visit the group",
  },
] as const;

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
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
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
  const featuredCollections = (collections ?? []).filter((collection) => collection.status === "active");

  return (
    <div>
      <Hero />
      <TrustStatsBar />
      <ContactStrip />

      {sections.map((section) => (
        <ProductCarousel
          key={section.id}
          sectionId={section.id}
          title={section.title}
          description={section.description}
          products={section.products}
          action={<Button asChild variant="outline" size="sm"><Link to="/shop">Shop all</Link></Button>}
        />
      ))}

      {featuredCollections.length > 0 ? (
        <Section muted title="Featured collections" description="Curated Cossa Store ranges, product groups and campaigns.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCollections.map((collection) => (
              <Link key={collection.id} to="/shop" search={{ collection: collection.slug }} className="overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/60">
                <ProductImage url={collection.hero_image_url} alt={collection.name} className="h-40 w-full" />
                <div className="p-5">
                  {collection.campaign_name ? <p className="text-xs font-semibold uppercase tracking-wide text-primary">{collection.campaign_name}</p> : null}
                  <h3 className="mt-1 font-display text-xl font-semibold">{collection.name}</h3>
                  {collection.description ? <p className="mt-2 line-clamp-2 text-base text-muted-foreground">{collection.description}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <GroupSolutions />

      <Section title="Shop by category" description="Find the product range you need without searching through unrelated stock.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link key={category.slug} to="/category/$slug" params={{ slug: category.slug }} className="flex min-h-44 flex-col rounded-xl border border-border bg-card p-5 transition hover:border-primary/60">
              <h3 className="font-display text-xl font-semibold">{category.name}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{category.tagline}</p>
              <p className="mt-3 flex-1 text-base leading-relaxed text-muted-foreground">{category.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-foreground">Browse range <ArrowRight className="ml-1.5 h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </Section>

      <Section muted title="Shop by project" description="Start with the job. Build the product requirement around what you need to complete.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.slice(0, 6).map((project) => (
            <Link key={project.slug} to="/project/$slug" params={{ slug: project.slug }} className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/60">
              <h3 className="text-lg font-semibold">{project.name}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{project.description}</p>
              {project.calculator ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Calculator className="h-4 w-4" />{project.calculator.label} calculator</p> : null}
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-6"><Link to="/shop-by-project">Explore all projects</Link></Button>
      </Section>

      <Section title="Buying for a business" description="Procurement support for larger quantities, project requirements and repeat purchasing.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Building2, "Bulk orders", "Request pricing for larger quantities and recurring requirements."],
            [FileText, "Formal quotations", "Request written quotations for procurement and project approval."],
            [PackageSearch, "Product sourcing", "Ask Cossa Store to help source a specific product or requirement."],
            [MessageCircle, "Human support", "Speak to the Store team when your requirement needs assistance."],
          ].map(([Icon, title, body]) => {
            const CardIcon = Icon as typeof Building2;
            return <div key={String(title)} className="rounded-xl border border-border bg-card p-5"><CardIcon className="h-6 w-6 text-primary" /><h3 className="mt-3 text-base font-semibold">{String(title)}</h3><p className="mt-2 text-base leading-relaxed text-muted-foreground">{String(body)}</p></div>;
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/business-account">Business buying</Link></Button><Button asChild variant="outline"><Link to="/request-a-quote">Request a quote</Link></Button></div>
      </Section>

      <Section muted title="Buying with confidence" description="Clear commitments based on what Cossa Store can support.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {GUARANTEES.map((guarantee) => <div key={guarantee.title} className="rounded-xl border border-border bg-card p-5"><CheckCircle2 className="h-5 w-5 text-primary" /><h3 className="mt-3 text-sm font-semibold">{guarantee.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guarantee.body}</p></div>)}
        </div>
      </Section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-primary/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-display text-2xl font-semibold">Need help finding the right solution?</h2><p className="mt-2 text-base text-muted-foreground">Send us your product list, project requirement or sourcing request.</p></div>
          <Button asChild size="lg"><a href={whatsappLink()} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />{SITE.whatsappDisplay}</a></Button>
        </div>
      </section>
    </div>
  );
}

function GroupSolutions() {
  return (
    <Section muted title="More from Cossa Nexus Holdings" description="Cossa Store connects products with the wider Cossa group when your requirement needs a service, project or digital solution.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GROUP_SOLUTIONS.map((solution) => (
          <a key={solution.name} href={solution.href} className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/60" target={solution.href.startsWith(SITE.storeWebsite) ? undefined : "_blank"} rel="noopener noreferrer">
            <div className="relative h-36 overflow-hidden bg-secondary"><img src={solution.image} alt="" loading="lazy" className="h-full w-full object-cover opacity-75 transition duration-300 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" /></div>
            <div className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{solution.eyebrow}</p><h3 className="mt-1 font-display text-xl font-semibold">{solution.name}</h3><p className="mt-2 text-base leading-relaxed text-muted-foreground">{solution.description}</p><span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">{solution.action}<ArrowRight className="ml-1.5 h-4 w-4" /></span></div>
          </a>
        ))}
      </div>
    </Section>
  );
}

function Section({ title, description, action, muted, children }: { title: string; description?: string; action?: ReactNode; muted?: boolean; children: ReactNode }) {
  return <section className={muted ? "bg-secondary/40" : undefined}><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>{description ? <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">{description}</p> : null}</div>{action}</div>{children}</div></section>;
}

function Hero() {
  return (
    <section className="border-b border-primary/20 bg-background">
      <div className="mx-auto grid max-w-7xl gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:grid-cols-[1.55fr_.85fr] lg:px-8">
        <div className="relative isolate min-h-[390px] overflow-hidden rounded-2xl border border-primary/25 sm:min-h-[420px] lg:min-h-[455px]">
          <img src={companyConfig.backgrounds.heroEagle} alt="" width={1146} height={1368} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" aria-hidden />
          <div className="relative flex min-h-[390px] max-w-2xl flex-col justify-center p-5 sm:min-h-[420px] sm:p-8 lg:min-h-[455px] lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Products · Projects · Business procurement</p>
            <GroupBadge className="mt-3 self-start" />
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">Shop smarter.<span className="block text-primary">Build more.</span></h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">Products and practical buying solutions for homes, projects and businesses — with Cossa support when you need more than a product.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/shop">Shop products <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline" className="border-primary/60 bg-black/55 text-white hover:bg-primary/15"><Link to="/shop-by-project">Shop by project</Link></Button></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Link to="/shop" className="group relative min-h-44 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:min-h-52 lg:min-h-0">
            <img src="/assets/demo/home-improvement.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 transition duration-300 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/15" />
            <div className="relative flex h-full flex-col justify-end"><Sparkles className="h-5 w-5 text-primary" /><p className="mt-2 text-xs font-bold uppercase tracking-wide text-primary">Useful products</p><h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Find what fits the job.</h2><span className="mt-2 inline-flex items-center text-sm font-semibold text-white">Browse the store <ArrowRight className="ml-1 h-4 w-4" /></span></div>
          </Link>
          <Link to="/request-a-quote" className="group relative min-h-44 overflow-hidden rounded-2xl border border-primary/30 bg-card p-5 sm:min-h-52 lg:min-h-0">
            <img src="/assets/demo/project-kit.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 transition duration-300 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20" />
            <div className="relative flex h-full flex-col justify-end"><Wrench className="h-5 w-5 text-primary" /><p className="mt-2 text-xs font-bold uppercase tracking-wide text-primary">Need more than a product?</p><h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Products + Cossa support.</h2><span className="mt-2 inline-flex items-center text-sm font-semibold text-white">Request help <ArrowRight className="ml-1 h-4 w-4" /></span></div>
          </Link>
        </div>
      </div>
    </section>
  );
}

function TrustStatsBar() {
  return <section className="border-b border-border bg-surface-strong"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">{TRUST_STATS.map((stat) => <div key={stat.id}><dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt><dd className={stat.value ? "mt-1 font-display text-lg font-bold text-primary" : "mt-1 text-xs text-muted-foreground"}>{stat.value ?? stat.pending}</dd></div>)}</dl><div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">{COMPLIANCE_BADGES.map((badge) => <div key={badge.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"><ShieldCheck className="h-4 w-4 text-primary" /><span className="text-xs font-semibold">{badge.name}</span></div>)}</div></div></section>;
}
