import { useEffect, useState } from "react";
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
  { panel: "chat", label: "Ask Cossa AI", icon: Bot },
  { panel: "info", label: "Important information", icon: Info },
];

function contextualPrompt(): string {
  if (typeof window === "undefined") return "I'm here if you need help.";
  const path = window.location.pathname.toLowerCase();
  if (path.includes("cleaning")) return "Need help choosing cleaning products? Cossa Facility Services can also do the job.";
  if (path.includes("construction") || path.includes("tools-industrial")) return "Planning a repair or renovation? I can help with products, quantities and Cossa Construction.";
  if (path.includes("technology") || path.includes("security-smart-home")) return "Need help choosing or setting this up? I can help, and Cossa Tech can assist too.";
  if (path.includes("automotive")) return "Not sure which car product fits the job? Ask me before you buy.";
  if (path.includes("project/")) return "Tell me your measurements. I can help estimate what the project may need.";
  if (path.includes("product/")) return "Questions about this product, delivery or what else you may need? Ask me.";
  return "I'm here if you need help — products, projects, delivery or Cossa services.";
}

export function FloatingSupport() {
  const { menuOpen, setMenuOpen, open } = useSupport();
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState("I'm here if you need help.");

  useEffect(() => {
    setPrompt(contextualPrompt());
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem("cossa-ai-help-prompt-seen");
    if (seen) return;
    const show = window.setTimeout(() => {
      setShowPrompt(true);
      window.sessionStorage.setItem("cossa-ai-help-prompt-seen", "1");
    }, 3500);
    const hide = window.setTimeout(() => setShowPrompt(false), 14000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 sm:p-6">
        <div className="pointer-events-auto flex w-full max-w-xs flex-col items-end gap-2">
          {!menuOpen && showPrompt ? (
            <button
              type="button"
              onClick={() => {
                setShowPrompt(false);
                open("chat");
              }}
              className="w-full rounded-lg border border-primary/40 bg-popover p-3 text-left shadow-xl transition hover:border-primary"
              aria-label="Open Cossa AI assistant"
            >
              <span className="flex items-start gap-2">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <strong className="block text-sm">Cossa AI</strong>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{prompt}</span>
                </span>
              </span>
            </button>
          ) : null}

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
            onClick={() => {
              setShowPrompt(false);
              setMenuOpen(!menuOpen);
            }}
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
