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
  "Supplier network is active and expanding.",
  "Live products are available to browse and order.",
  "Quotations and product sourcing requests are available.",
  "Secure live card payments are available through Yoco. Delivery is calculated or confirmed according to the product's supplier and fulfilment method before payment is accepted.",
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
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto border-primary/40 bg-black text-white sm:text-base">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Info className="h-5 w-5 text-primary" aria-hidden /> Important information
          </DialogTitle>
          <DialogDescription className="text-white/85">
            {SITE.name} — a division of {SITE.parent}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-[15px] leading-6 text-white sm:text-base">
          <div className="space-y-1.5">
            <a
              href={SITE.website}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("website_link_clicked")}
              className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
            >
              <Globe className="h-4 w-4" aria-hidden /> {SITE.domain}
            </a>
            <a
              href={SITE.phoneHref}
              onClick={() => trackEvent("phone_call_clicked")}
              className="flex items-center gap-2 font-semibold text-primary hover:underline"
            >
              <Phone className="h-4 w-4" aria-hidden /> Phone and WhatsApp: {SITE.phoneDisplay}
            </a>
          </div>

          <Block title="Service areas">
            <p className="text-white/85">
              South Africa first, with expansion planned later.
            </p>
          </Block>

          <Block title="Current store status">
            <ul className="list-disc space-y-1.5 pl-5 text-white/90">
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
                  className="rounded-full border border-primary/35 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/90"
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
      <p className="font-semibold text-white">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
