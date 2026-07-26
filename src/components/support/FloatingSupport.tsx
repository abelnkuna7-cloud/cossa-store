import { Bot, FileText, Info, MessageCircle, PhoneCall, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSupport, type SupportPanel } from "@/components/support/support-context";
import { WhatsAppPopup } from "@/components/support/WhatsAppPopup";
import { CallbackDialog } from "@/components/support/CallbackDialog";
import { QuickQuoteDialog } from "@/components/support/QuickQuoteDialog";
import { CossaAiChat } from "@/components/support/CossaAiChat";
import { ImportantInfoDialog } from "@/components/support/ImportantInfoDialog";

const ACTIONS: { panel: SupportPanel; label: string; icon: typeof MessageCircle }[] = [
  { panel: "whatsapp", label: "WhatsApp us", icon: MessageCircle },
  { panel: "callback", label: "Request a callback", icon: PhoneCall },
  { panel: "quote", label: "Request a quote", icon: FileText },
  { panel: "chat", label: "Cossa AI assistant", icon: Bot },
  { panel: "info", label: "Important information", icon: Info },
];

export function FloatingSupport() {
  const { menuOpen, setMenuOpen, open } = useSupport();

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 sm:p-6">
        <div className="pointer-events-auto flex w-full max-w-xs flex-col items-end gap-2">
          {menuOpen ? (
            <div
              id="cossa-support-menu"
              className="w-full rounded-lg border border-border bg-popover p-2 shadow-xl"
            >
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cossa Store support
              </p>
              {ACTIONS.map(({ panel, label, icon: Icon }) => (
                <button
                  key={panel}
                  type="button"
                  onClick={() => open(panel)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary hover:text-primary"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="cossa-support-menu"
            aria-label={menuOpen ? "Close support menu" : "Open support menu"}
            className={cn(
              "inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-yellow-hover",
            )}
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <MessageCircle className="h-5 w-5" aria-hidden />
            )}
            <span className={menuOpen ? "" : "hidden sm:inline"}>
              {menuOpen ? "Close" : "Need help?"}
            </span>
          </button>
        </div>
      </div>

      <WhatsAppPopup />
      <CallbackDialog />
      <QuickQuoteDialog />
      <CossaAiChat />
      <ImportantInfoDialog />
    </>
  );
}
