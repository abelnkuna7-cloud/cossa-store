import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/config/seo";
import { PageHeader } from "@/components/common/PageHeader";
import { CompanyInfoCard } from "@/components/company/CompanyInfoCard";
import { FounderSection } from "@/components/company/FounderSection";
import { companyConfig } from "@/config/company";

const TITLE = "About Cossa Store | Cossa Nexus Holdings";
const DESCRIPTION =
  "Cossa Store is owned by Cossa Nexus Holdings (Pty) Ltd — supplying construction, facility and technology products backed by real project expertise in South Africa.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/about` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: About,
});

const STORY = [
  "Cossa Store is proudly owned by Cossa Nexus Holdings (Pty) Ltd, a South African business group founded with one mission: to make it easier for businesses, contractors, homeowners and organisations to source quality products, professional services and smart technology from one trusted ecosystem.",
  "Rather than operating as just another online store, Cossa Store connects products with real-world expertise. Through our group companies, we combine construction, facility services, technology and business solutions into a single customer experience.",
  "Our customers are not simply buying products — they gain access to practical solutions backed by experienced teams that understand how projects are delivered from planning to completion.",
  "Every product we offer is selected with quality, reliability and long-term value in mind. Whether you are renovating a home, managing a commercial property, maintaining facilities or implementing smart technology, our goal is to help you complete projects faster, more efficiently and with confidence.",
  "As part of Cossa Nexus Holdings, we are committed to continuous innovation, customer service, integrity and sustainable business growth.",
  "We proudly serve South Africa today while building a business capable of serving customers across Africa and internationally.",
];

function About() {
  return (
    <div>
      <PageHeader
        eyebrow="About us"
        title="Built in South Africa. Built for Growth."
        description={companyConfig.store.parentText}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <img
              src={companyConfig.store.logo}
              alt={companyConfig.store.logoAlt}
              width={200}
              height={60}
              loading="lazy"
              decoding="async"
              className="h-12 w-[200px] object-cover object-center"
            />
            <img
              src={companyConfig.parentCompany.logo}
              alt={companyConfig.parentCompany.logoAlt}
              width={60}
              height={60}
              loading="lazy"
              decoding="async"
              className="h-12 w-auto object-contain"
            />
          </div>
          {STORY.map((paragraph) => (
            <p key={paragraph} className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
          <p className="mt-6 font-display text-lg font-semibold text-primary">
            Built in South Africa. Trusted Worldwide.
          </p>
        </section>

        <CompanyInfoCard />

        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">
            {companyConfig.construction.shortName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Our group construction company delivers the work behind the products we supply.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {companyConfig.construction.specialities.map((item) => (
              <li
                key={item}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">What Cossa Store supplies</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {companyConfig.store.serves.map((item) => (
              <li
                key={item}
                className="rounded-full border border-primary/25 px-3 py-1 text-xs text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <FounderSection />
      </div>
    </div>
  );
}
