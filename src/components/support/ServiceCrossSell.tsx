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
    body: "Cossa Construction & DIY can carry out the work for the products you buy.",
    message:
      "Hello Cossa Store, I need products together with a Cossa service (construction or installation).",
  },
  "cleaning-facility-supplies": {
    heading: "Need professional cleaning or facility support?",
    body: "Cossa Facility Services handles contract cleaning, hygiene and facility maintenance.",
    message:
      "Hello Cossa Store, I need products together with a Cossa service (cleaning or facility support).",
  },
  "technology-smart-solutions": {
    heading: "Need installation, setup or technical support?",
    body: "Cossa Tech installs and configures smart-home, security and workplace technology.",
    message:
      "Hello Cossa Store, I need products together with a Cossa service (technology installation or support).",
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
