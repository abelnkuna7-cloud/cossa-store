import { Globe, Info, Phone } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SITE } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { useSupport } from "@/components/support/support-context";

const STATUS = [
  "Supplier network is being established.",
  "Product catalogue is being prepared.",
  "Quotations and product sourcing requests are available.",
  "Payment and delivery integrations are not connected yet and will only be described as active once they are live.",
];

const SUPPORT_CATEGORIES = [
  "Product enquiries",
  "Product sourcing",
  "Bulk and business orders",
  "Quotations",
  "Supplier applications",
  "Construction services",
  "Facility and cleaning services",
  "Technology support",
];

export function ImportantInfoDialog() {
  const { panel, close } = useSupport();

  return (
    <Dialog open={panel === "info"} onOpenChange={(v) => (v ? null : close())}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" aria-hidden /> Important information
          </DialogTitle>
          <DialogDescription>
            {SITE.name} — a division of {SITE.parent}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="space-y-1.5">
            <a
              href={SITE.website}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("website_link_clicked")}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
            >
              <Globe className="h-4 w-4" aria-hidden /> {SITE.domain}
            </a>
            <a
              href={SITE.phoneHref}
              onClick={() => trackEvent("phone_call_clicked")}
              className="flex items-center gap-2 font-medium text-primary hover:underline"
            >
              <Phone className="h-4 w-4" aria-hidden /> Phone and WhatsApp: {SITE.phoneDisplay}
            </a>
          </div>

          <Block title="Service areas">
            <p className="text-muted-foreground">
              South Africa first, with expansion planned later.
            </p>
          </Block>

          <Block title="Current store status">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {STATUS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Block>

          <Block title="Support categories">
            <ul className="flex flex-wrap gap-2">
              {SUPPORT_CATEGORIES.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground"
                >
                  {c}
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
