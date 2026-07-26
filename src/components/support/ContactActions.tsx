import { MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE, whatsappLink } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

export function CallButton({
  className,
  variant = "outline",
  label = `Call ${SITE.phoneDisplay}`,
}: {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
}) {
  return (
    <Button asChild variant={variant} className={className}>
      <a href={SITE.phoneHref} onClick={() => trackEvent("phone_call_clicked")}>
        <Phone className="mr-2 h-4 w-4" aria-hidden /> {label}
      </a>
    </Button>
  );
}

export function WhatsAppButton({
  message,
  className,
  variant = "default",
  label = "WhatsApp us",
}: {
  message?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
}) {
  return (
    <Button asChild variant={variant} className={className}>
      <a
        href={message ? whatsappLink(message) : whatsappLink()}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent("whatsapp_opened", { trigger: "button" })}
      >
        <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> {label}
      </a>
    </Button>
  );
}
