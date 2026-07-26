import { MessageCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SITE, WHATSAPP_OPTIONS, whatsappLink } from "@/config/site";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";

export function WhatsAppPopup() {
  const { panel, close } = useSupport();

  return (
    <Dialog open={panel === "whatsapp"} onOpenChange={(v) => (v ? null : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
            Chat with Cossa Store
          </DialogTitle>
          <DialogDescription>
            Get help with products, sourcing, quotations, business orders and Cossa services.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {WHATSAPP_OPTIONS.map((option) => (
            <li key={option.id}>
              <a
                href={whatsappLink(option.message)}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent(option.event as AnalyticsEvent, { option: option.id })}
                className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-secondary px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:bg-secondary/70"
              >
                <span>
                  {option.label}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              </a>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          WhatsApp and calls: {SITE.phoneDisplay}. You will always reach a real person on the Cossa
          team.
        </p>
      </DialogContent>
    </Dialog>
  );
}
