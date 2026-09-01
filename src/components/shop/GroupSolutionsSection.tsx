import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const db = supabase as any;

type Service = {
  id: string;
  name: string;
  eyebrow: string | null;
  description: string;
  image_url: string | null;
  destination_url: string;
  cta_label: string;
};

const SERVICE_LOGOS = {
  construction: "/assets/logos/cossa-nexus-construction.svg",
  facility: "/assets/logos/cossa-facility-services.svg",
  tech: "/assets/logos/cossa-tech.svg",
  growth: "/assets/logos/growth.svg",
  nexdocs: "/assets/logos/nexdocs.svg",
  group: "/assets/logos/cossa-nexus-holdings.png",
} as const;

function getServiceLogo(service: Service) {
  const id = service.id.toLowerCase();
  const name = service.name.toLowerCase();

  if (id.includes("construction") || name.includes("construction")) return SERVICE_LOGOS.construction;
  if (id.includes("facility") || name.includes("facility")) return SERVICE_LOGOS.facility;
  if (id.includes("tech") || name.includes("tech")) return SERVICE_LOGOS.tech;
  if (id.includes("growth") || name.includes("growth")) return SERVICE_LOGOS.growth;
  if (id.includes("nexdocs") || name.includes("nexdocs")) return SERVICE_LOGOS.nexdocs;
  return SERVICE_LOGOS.group;
}

const FALLBACK: Service[] = [
  { id: "construction", name: "Cossa Nexus Construction", eyebrow: "Build · Renovate · Maintain", description: "Construction, renovations, repairs, maintenance and property improvement.", image_url: "/assets/demo/construction-tools.jpg", destination_url: "https://cossanexusholdings.co.za/construction", cta_label: "Explore construction" },
  { id: "facility", name: "Cossa Facility Services", eyebrow: "Clean · Maintain · Support", description: "Cleaning, hygiene, property care and professional facility-support solutions.", image_url: "/assets/demo/cleaning-supplies.jpg", destination_url: "https://cossanexusholdings.co.za/facility-services", cta_label: "Explore facility services" },
  { id: "tech", name: "Cossa Tech", eyebrow: "Marketing · AI · Business Growth", description: "Web, digital marketing, SEO, automation, AI and business technology solutions.", image_url: "/assets/demo/technology-laptop.jpg", destination_url: "https://cossanexusholdings.co.za/tech", cta_label: "Explore Cossa Tech" },
  { id: "growth", name: "Growth", eyebrow: "CRM · Sales · Automation", description: "Business intelligence, marketing, sales, lead generation and AI-assisted operations.", image_url: "/assets/demo/smart-security.jpg", destination_url: "https://growth.cossanexusholdings.co.za", cta_label: "Open Growth" },
  { id: "nexdocs", name: "NexDocs", eyebrow: "Business documents · Digital tools", description: "Business documentation and productivity tools designed for practical business use.", image_url: "/assets/demo/digital-download.jpg", destination_url: "https://nexdocs.cossanexusholdings.co.za", cta_label: "Open NexDocs" },
  { id: "group", name: "Cossa Nexus Holdings", eyebrow: "One group · Connected solutions", description: "Explore the active Cossa Nexus Holdings portfolio and find the right product, service or digital solution.", image_url: "/assets/backgrounds/cossa-eagle-hero.webp", destination_url: "https://cossanexusholdings.co.za/our-group", cta_label: "Visit the group" },
];

export function GroupSolutionsSection() {
  const [services, setServices] = useState<Service[]>(FALLBACK);

  useEffect(() => {
    let active = true;

    void db
      .from("store_services")
      .select("id,name,eyebrow,description,image_url,destination_url,cta_label")
      .eq("organisation_id", ORGANISATION_ID)
      .eq("status", "active")
      .eq("featured", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }: { data: Service[] | null; error: unknown }) => {
        if (!active || error || !data?.length) return;
        setServices(data);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Products + services</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">More from Cossa Nexus Holdings</h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Cossa Store connects products with the wider Cossa group when your requirement needs a service, project or digital solution.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <a key={service.id} href={service.destination_url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/60">
              <div className="flex h-36 items-center justify-center bg-secondary/30 p-5">
                <div className="flex h-24 w-full max-w-52 items-center justify-center overflow-hidden rounded-lg border border-border bg-background px-4 py-3">
                  <img src={getServiceLogo(service)} alt={`${service.name} logo`} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]" />
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{service.eyebrow || "Cossa solution"}</p>
                <h3 className="mt-1 font-display text-xl font-semibold">{service.name}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{service.description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">{service.cta_label}<ArrowRight className="ml-1.5 h-4 w-4" /></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
