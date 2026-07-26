import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine, QuoteLine } from "@/types/catalog";

/**
 * Local (browser-only) commerce state for Phase 1.
 * Cart, wishlist and quote-basket persist in localStorage until Supabase
 * carts/wishlists/quote_items tables are connected.
 */

interface CommerceState {
  cart: CartLine[];
  wishlist: string[];
  quoteBasket: QuoteLine[];
  hydrated: boolean;
  addToCart: (productId: string, quantity?: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  addToQuote: (productId: string, quantity?: number) => void;
  setQuoteQuantity: (productId: string, quantity: number) => void;
  removeFromQuote: (productId: string) => void;
  clearQuote: () => void;
  cartCount: number;
  wishlistCount: number;
  quoteCount: number;
}

const CommerceContext = createContext<CommerceState | null>(null);

const KEY = "cossa.commerce.v1";

interface Persisted {
  cart: CartLine[];
  wishlist: string[];
  quoteBasket: QuoteLine[];
}

const EMPTY: Persisted = { cart: [], wishlist: [], quoteBasket: [] };

function read(): Persisted {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      quoteBasket: Array.isArray(parsed.quoteBasket) ? parsed.quoteBasket : [],
    };
  } catch {
    return EMPTY;
  }
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  }, [state, hydrated]);

  const upsertLine = useCallback(
    (key: "cart" | "quoteBasket", productId: string, quantity: number) => {
      setState((prev) => {
        const lines = prev[key];
        const existing = lines.find((l) => l.product_id === productId);
        const next = existing
          ? lines.map((l) =>
              l.product_id === productId ? { ...l, quantity: l.quantity + quantity } : l,
            )
          : [...lines, { product_id: productId, quantity }];
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  const setQuantity = useCallback(
    (key: "cart" | "quoteBasket", productId: string, quantity: number) => {
      setState((prev) => ({
        ...prev,
        [key]:
          quantity <= 0
            ? prev[key].filter((l) => l.product_id !== productId)
            : prev[key].map((l) => (l.product_id === productId ? { ...l, quantity } : l)),
      }));
    },
    [],
  );

  const removeLine = useCallback((key: "cart" | "quoteBasket", productId: string) => {
    setState((prev) => ({ ...prev, [key]: prev[key].filter((l) => l.product_id !== productId) }));
  }, []);

  const value = useMemo<CommerceState>(
    () => ({
      cart: state.cart,
      wishlist: state.wishlist,
      quoteBasket: state.quoteBasket,
      hydrated,
      addToCart: (id, qty = 1) => upsertLine("cart", id, qty),
      setCartQuantity: (id, qty) => setQuantity("cart", id, qty),
      removeFromCart: (id) => removeLine("cart", id),
      clearCart: () => setState((prev) => ({ ...prev, cart: [] })),
      toggleWishlist: (id) =>
        setState((prev) => ({
          ...prev,
          wishlist: prev.wishlist.includes(id)
            ? prev.wishlist.filter((w) => w !== id)
            : [...prev.wishlist, id],
        })),
      isWishlisted: (id) => state.wishlist.includes(id),
      removeFromWishlist: (id) =>
        setState((prev) => ({ ...prev, wishlist: prev.wishlist.filter((w) => w !== id) })),
      addToQuote: (id, qty = 1) => upsertLine("quoteBasket", id, qty),
      setQuoteQuantity: (id, qty) => setQuantity("quoteBasket", id, qty),
      removeFromQuote: (id) => removeLine("quoteBasket", id),
      clearQuote: () => setState((prev) => ({ ...prev, quoteBasket: [] })),
      cartCount: state.cart.reduce((sum, l) => sum + l.quantity, 0),
      wishlistCount: state.wishlist.length,
      quoteCount: state.quoteBasket.length,
    }),
    [state, hydrated, upsertLine, setQuantity, removeLine],
  );

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useCommerce(): CommerceState {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used inside CommerceProvider");
  return ctx;
}
