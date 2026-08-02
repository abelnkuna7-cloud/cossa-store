import { MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { SITE, whatsappLink } from "@/config/site";
import { TRUST_STRAPLINE } from "@/config/trust";
import { trackEvent } from "@/lib/analytics";

/** Persistent site-wide trust strip. Sits directly under the header. */
export function TrustBar() {
  return (
    <div className="border-b border-primary/25 bg-surface-strong">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-2 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-xs lg:px-8">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>{TRUST_STRAPLINE}</span>
        </p>
        <div className="flex items-center gap-4 text-muted-foreground">
          <a
            href={SITE.phoneHref}
            onClick={() => trackEvent("phone_call_clicked")}
            className="flex items-center gap-1.5 hover:text-primary"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden /> {SITE.phoneDisplay}
          </a>
          <a
            href={whatsappLink("Hello Cossa Store, I have a question.")}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("whatsapp_opened", { trigger: "trust_bar" })}
            className="flex items-center gap-1.5 hover:text-primary"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
