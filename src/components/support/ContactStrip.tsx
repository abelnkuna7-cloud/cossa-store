import { FileText, MessageCircle, Phone, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE, whatsappLink } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";

export function ContactStrip() {
  const { open } = useSupport();

  return (
    <section className="border-y border-border bg-secondary">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="text-sm font-semibold">
          Need help finding products or planning a project?
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Speak to a real person on the South African Cossa team.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="min-h-11">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_opened", { trigger: "contact_strip" })}
            >
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> WhatsApp us
            </a>
          </Button>
          <Button variant="outline" className="min-h-11" onClick={() => open("callback")}>
            <PhoneCall className="mr-2 h-4 w-4" aria-hidden /> Request a callback
          </Button>
          <Button variant="outline" className="min-h-11" onClick={() => open("quote")}>
            <FileText className="mr-2 h-4 w-4" aria-hidden /> Request a quote
          </Button>
          <Button asChild variant="ghost" className="min-h-11">
            <a href={SITE.phoneHref} onClick={() => trackEvent("phone_call_clicked")}>
              <Phone className="mr-2 h-4 w-4" aria-hidden /> Call {SITE.phoneDisplay}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}