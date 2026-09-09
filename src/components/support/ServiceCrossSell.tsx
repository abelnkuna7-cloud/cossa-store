import { Link } from "@tanstack/react-router";
import { MessageCircle, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";

const SERVICE_BY_CATEGORY: Record<
  string,
  { heading: string; body: string; message: string } | undefined
> = {
  "construction-diy": {
    heading: "Need installation, renovation or construction support?",
    body: "Cossa Nexus Construction can help with renovations, repairs, maintenance, painting, tiling and related project work.",
    message:
      "Hello Cossa Store, I need products together with Cossa Nexus Construction support.",
  },
  "tools-industrial": {
    heading: "Need help with the project, not only the tools?",
    body: "Cossa Nexus Construction can support suitable installation, repair, maintenance and renovation work.",
    message:
      "Hello Cossa Store, I need products together with Cossa Nexus Construction support.",
  },
  "cleaning-household": {
    heading: "Need professional cleaning or facility support?",
    body: "Cossa Facility Services can provide residential, commercial and recurring cleaning, hygiene and facility-support services.",
    message:
      "Hello Cossa Store, I need products together with Cossa Facility Services cleaning or facility support.",
  },
  "cleaning-facility-supplies": {
    heading: "Need professional cleaning or facility support?",
    body: "Cossa Facility Services can provide residential, commercial and recurring cleaning, hygiene and facility-support services.",
    message:
      "Hello Cossa Store, I need products together with Cossa Facility Services cleaning or facility support.",
  },
  "technology-electronics": {
    heading: "Need setup, installation or technical support?",
    body: "Cossa Tech can support suitable connected technology, smart-home, security and workplace technology requirements.",
    message:
      "Hello Cossa Store, I need products together with Cossa Tech setup or technical support.",
  },
  "security-smart-home": {
    heading: "Need smart-home or security setup support?",
    body: "Cossa Tech can help with suitable smart-home, connected-device and security technology setup requirements.",
    message:
      "Hello Cossa Store, I need products together with Cossa Tech smart-home or security support.",
  },
  "office-business": {
    heading: "Need workplace technology or business setup support?",
    body: "Cossa Tech can support suitable workplace technology, digital setup and business technology requirements.",
    message:
      "Hello Cossa Store, I need products together with Cossa Tech workplace technology support.",
  },
  "technology-smart-solutions": {
    heading: "Need installation, setup or technical support?",
    body: "Cossa Tech can support suitable smart-home, security and workplace technology requirements.",
    message:
      "Hello Cossa Store, I need products together with Cossa Tech setup or technical support.",
  },
};

export function ServiceCrossSell({ categorySlug }: { categorySlug: string }) {
  const { open } = useSupport();
  const service = SERVICE_BY_CATEGORY[categorySlug];
  if (!service) return null;

  return (
    <aside className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-base font-semibold">{service.heading}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{service.body}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          onClick={() => trackEvent("service_cross_sell_clicked", { category: categorySlug })}
        >
          <Link to="/request-a-quote">Request a service quote</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            trackEvent("service_cross_sell_clicked", {
              category: categorySlug,
              action: "callback",
            });
            open("callback");
          }}
        >
          Request a callback
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href={whatsappLink(service.message)}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackEvent("service_cross_sell_clicked", {
                category: categorySlug,
                action: "whatsapp",
              })
            }
          >
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> WhatsApp about this service
          </a>
        </Button>
      </div>
    </aside>
  );
}
