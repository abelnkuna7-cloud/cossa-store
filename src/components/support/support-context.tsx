import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";

import { trackEvent } from "@/lib/analytics";

export type SupportPanel = "whatsapp" | "callback" | "quote" | "chat" | "info";

interface SupportContextValue {
  panel: SupportPanel | null;
  open: (panel: SupportPanel) => void;
  close: () => void;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  isCheckoutFlow: boolean;
}

const SupportContext = createContext<SupportContextValue | null>(null);

const DISMISS_KEY = "cossa.whatsapp-popup.dismissed.v1";
const AUTO_DELAY_MS = 25_000;

export function SupportProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<SupportPanel | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCheckoutFlow = pathname.startsWith("/checkout") || pathname.startsWith("/cart");

  const open = useCallback((next: SupportPanel) => {
    // Only one popup at a time.
    setPanel(next);
    setMenuOpen(false);
    if (next === "whatsapp") trackEvent("whatsapp_opened");
    if (next === "callback") trackEvent("callback_opened");
    if (next === "quote") trackEvent("quote_opened");
    if (next === "chat") trackEvent("chatbot_opened");
  }, []);

  const close = useCallback(() => {
    setPanel((current) => {
      if (current === "whatsapp" && typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(DISMISS_KEY, "1");
        } catch {
          /* ignore */
        }
      }
      return null;
    });
  }, []);

  // One gentle, delayed WhatsApp invite per session — never during cart/checkout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isCheckoutFlow) return;
    let dismissed = true;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = true;
    }
    if (dismissed) return;
    const timer = window.setTimeout(() => {
      setPanel((current) => {
        if (current !== null) return current;
        trackEvent("whatsapp_opened", { trigger: "auto" });
        return "whatsapp";
      });
    }, AUTO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isCheckoutFlow]);

  const value = useMemo(
    () => ({ panel, open, close, menuOpen, setMenuOpen, isCheckoutFlow }),
    [panel, open, close, menuOpen, isCheckoutFlow],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport(): SupportContextValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error("useSupport must be used inside SupportProvider");
  return ctx;
}
