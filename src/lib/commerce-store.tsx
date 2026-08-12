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
 * Cossa Store browser commerce state.
 *
 * CURRENT PHASE
 * -------------
 * Cart, wishlist and quotation basket are persisted in localStorage.
 *
 * FUTURE PHASE
 * ------------
 * These structures can later migrate into Supabase-backed commerce tables
 * so authenticated customers can retain baskets across devices.
 *
 * IMPORTANT
 * ---------
 * - Product variant is part of cart/quote line identity.
 * - Product + Variant A and Product + Variant B are separate lines.
 * - Wishlist remains product-level.
 * - Existing v1 browser data is migrated automatically.
 */

/* -------------------------------------------------------------------------- */
/* LINE TYPES                                                                 */
/* -------------------------------------------------------------------------- */

export type CommerceCartLine = CartLine & {
  variant_id: string | null;
};

export type CommerceQuoteLine = QuoteLine & {
  variant_id: string | null;
};

/* -------------------------------------------------------------------------- */
/* CONTEXT TYPE                                                               */
/* -------------------------------------------------------------------------- */

interface CommerceState {
  cart: CommerceCartLine[];
  wishlist: string[];
  quoteBasket: CommerceQuoteLine[];

  hydrated: boolean;

  addToCart: (
    productId: string,
    quantity?: number,
    variantId?: string | null,
  ) => void;

  setCartQuantity: (
    productId: string,
    quantity: number,
    variantId?: string | null,
  ) => void;

  removeFromCart: (
    productId: string,
    variantId?: string | null,
  ) => void;

  clearCart: () => void;

  toggleWishlist: (productId: string) => void;

  isWishlisted: (productId: string) => boolean;

  removeFromWishlist: (productId: string) => void;

  addToQuote: (
    productId: string,
    quantity?: number,
    variantId?: string | null,
  ) => void;

  setQuoteQuantity: (
    productId: string,
    quantity: number,
    variantId?: string | null,
  ) => void;

  removeFromQuote: (
    productId: string,
    variantId?: string | null,
  ) => void;

  clearQuote: () => void;

  cartCount: number;
  wishlistCount: number;
  quoteCount: number;
}

const CommerceContext = createContext<CommerceState | null>(null);

/* -------------------------------------------------------------------------- */
/* STORAGE                                                                    */
/* -------------------------------------------------------------------------- */

const KEY = "cossa.commerce.v2";
const LEGACY_KEY = "cossa.commerce.v1";

interface Persisted {
  cart: CommerceCartLine[];
  wishlist: string[];
  quoteBasket: CommerceQuoteLine[];
}

const EMPTY: Persisted = {
  cart: [],
  wishlist: [],
  quoteBasket: [],
};

/* -------------------------------------------------------------------------- */
/* VALIDATION                                                                 */
/* -------------------------------------------------------------------------- */

function normaliseQuantity(value: unknown): number {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor(quantity));
}

function normaliseVariantId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normaliseProductId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

/* -------------------------------------------------------------------------- */
/* LINE IDENTITY                                                              */
/* -------------------------------------------------------------------------- */

function lineKey(
  productId: string,
  variantId: string | null,
): string {
  return `${productId}::${variantId ?? "base"}`;
}

/* -------------------------------------------------------------------------- */
/* DUPLICATE MERGING                                                          */
/* -------------------------------------------------------------------------- */

function mergeDuplicateCartLines(
  lines: CommerceCartLine[],
): CommerceCartLine[] {
  const map = new Map<string, CommerceCartLine>();

  for (const line of lines) {
    const key = lineKey(line.product_id, line.variant_id);
    const existing = map.get(key);

    if (existing) {
      map.set(key, {
        ...existing,
        quantity: existing.quantity + line.quantity,
      });
    } else {
      map.set(key, line);
    }
  }

  return Array.from(map.values());
}

function mergeDuplicateQuoteLines(
  lines: CommerceQuoteLine[],
): CommerceQuoteLine[] {
  const map = new Map<string, CommerceQuoteLine>();

  for (const line of lines) {
    const key = lineKey(line.product_id, line.variant_id);
    const existing = map.get(key);

    if (existing) {
      map.set(key, {
        ...existing,
        quantity: existing.quantity + line.quantity,
      });
    } else {
      map.set(key, line);
    }
  }

  return Array.from(map.values());
}

/* -------------------------------------------------------------------------- */
/* STORAGE NORMALISATION                                                      */
/* -------------------------------------------------------------------------- */

function normaliseCartLines(value: unknown): CommerceCartLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: CommerceCartLine[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const record = candidate as Record<string, unknown>;

    const productId = normaliseProductId(record.product_id);

    if (!productId) {
      continue;
    }

    lines.push({
      product_id: productId,
      quantity: normaliseQuantity(record.quantity),
      variant_id: normaliseVariantId(record.variant_id),
    });
  }

  return mergeDuplicateCartLines(lines);
}

function normaliseQuoteLines(value: unknown): CommerceQuoteLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: CommerceQuoteLine[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const record = candidate as Record<string, unknown>;

    const productId = normaliseProductId(record.product_id);

    if (!productId) {
      continue;
    }

    lines.push({
      product_id: productId,
      quantity: normaliseQuantity(record.quantity),
      variant_id: normaliseVariantId(record.variant_id),
    });
  }

  return mergeDuplicateQuoteLines(lines);
}

function normaliseWishlist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .map(normaliseProductId)
    .filter((value): value is string => value !== null);

  return Array.from(new Set(ids));
}

/* -------------------------------------------------------------------------- */
/* STORAGE READ                                                               */
/* -------------------------------------------------------------------------- */

function parsePersisted(raw: string): Persisted {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {
        cart: [],
        wishlist: [],
        quoteBasket: [],
      };
    }

    const record = parsed as Record<string, unknown>;

    return {
      cart: normaliseCartLines(record.cart),
      wishlist: normaliseWishlist(record.wishlist),
      quoteBasket: normaliseQuoteLines(record.quoteBasket),
    };
  } catch {
    return {
      cart: [],
      wishlist: [],
      quoteBasket: [],
    };
  }
}

function read(): Persisted {
  if (typeof window === "undefined") {
    return {
      cart: [],
      wishlist: [],
      quoteBasket: [],
    };
  }

  try {
    const current = window.localStorage.getItem(KEY);

    if (current) {
      return parsePersisted(current);
    }

    const legacy = window.localStorage.getItem(LEGACY_KEY);

    if (legacy) {
      return parsePersisted(legacy);
    }

    return {
      cart: [],
      wishlist: [],
      quoteBasket: [],
    };
  } catch {
    return {
      cart: [],
      wishlist: [],
      quoteBasket: [],
    };
  }
}

/* -------------------------------------------------------------------------- */
/* PROVIDER                                                                   */
/* -------------------------------------------------------------------------- */

export function CommerceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* HYDRATION                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setState(read());
    setHydrated(true);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* PERSISTENCE                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /**
       * Storage may be unavailable in restricted/private browser modes.
       * Commerce state continues in memory for the current session.
       */
    }
  }, [state, hydrated]);

  /* ------------------------------------------------------------------------ */
  /* CART                                                                     */
  /* ------------------------------------------------------------------------ */

  const addToCart = useCallback(
    (
      productId: string,
      quantity = 1,
      variantId: string | null = null,
    ) => {
      const safeProductId = normaliseProductId(productId);

      if (!safeProductId) {
        return;
      }

      const safeVariantId = normaliseVariantId(variantId);
      const safeQuantity = normaliseQuantity(quantity);

      setState((previous) => {
        const key = lineKey(safeProductId, safeVariantId);

        const existing = previous.cart.find(
          (line) =>
            lineKey(line.product_id, line.variant_id) === key,
        );

        const nextCart = existing
          ? previous.cart.map((line) =>
              lineKey(line.product_id, line.variant_id) === key
                ? {
                    ...line,
                    quantity: line.quantity + safeQuantity,
                  }
                : line,
            )
          : [
              ...previous.cart,
              {
                product_id: safeProductId,
                quantity: safeQuantity,
                variant_id: safeVariantId,
              },
            ];

        return {
          ...previous,
          cart: nextCart,
        };
      });
    },
    [],
  );

  const setCartQuantity = useCallback(
    (
      productId: string,
      quantity: number,
      variantId?: string | null,
    ) => {
      const safeProductId = normaliseProductId(productId);

      if (!safeProductId) {
        return;
      }

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);

      setState((previous) => {
        const productLines = previous.cart.filter(
          (line) => line.product_id === safeProductId,
        );

        const target = hasExplicitVariant
          ? productLines.find(
              (line) => line.variant_id === safeVariantId,
            )
          : productLines.length === 1
            ? productLines[0]
            : undefined;

        if (!target) {
          return previous;
        }

        const targetKey = lineKey(
          target.product_id,
          target.variant_id,
        );

        if (!Number.isFinite(quantity) || quantity <= 0) {
          return {
            ...previous,
            cart: previous.cart.filter(
              (line) =>
                lineKey(line.product_id, line.variant_id) !==
                targetKey,
            ),
          };
        }

        const safeQuantity = normaliseQuantity(quantity);

        return {
          ...previous,
          cart: previous.cart.map((line) =>
            lineKey(line.product_id, line.variant_id) === targetKey
              ? {
                  ...line,
                  quantity: safeQuantity,
                }
              : line,
          ),
        };
      });
    },
    [],
  );

  const removeFromCart = useCallback(
    (
      productId: string,
      variantId?: string | null,
    ) => {
      const safeProductId = normaliseProductId(productId);

      if (!safeProductId) {
        return;
      }

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);

      setState((previous) => {
        if (hasExplicitVariant) {
          return {
            ...previous,
            cart: previous.cart.filter(
              (line) =>
                !(
                  line.product_id === safeProductId &&
                  line.variant_id === safeVariantId
                ),
            ),
          };
        }

        /**
         * Backward compatibility for older callers:
         *
         * If exactly one line exists for this product, remove it.
         * If multiple variant lines exist, refuse to guess.
         */
        const matchingLines = previous.cart.filter(
          (line) => line.product_id === safeProductId,
        );

        if (matchingLines.length !== 1) {
          return previous;
        }

        const target = matchingLines[0];

        return {
          ...previous,
          cart: previous.cart.filter(
            (line) =>
              lineKey(line.product_id, line.variant_id) !==
              lineKey(target.product_id, target.variant_id),
          ),
        };
      });
    },
    [],
  );

  const clearCart = useCallback(() => {
    setState((previous) => ({
      ...previous,
      cart: [],
    }));
  }, []);

  /* ------------------------------------------------------------------------ */
  /* WISHLIST                                                                 */
  /* ------------------------------------------------------------------------ */

  const toggleWishlist = useCallback((productId: string) => {
    const safeProductId = normaliseProductId(productId);

    if (!safeProductId) {
      return;
    }

    setState((previous) => ({
      ...previous,
      wishlist: previous.wishlist.includes(safeProductId)
        ? previous.wishlist.filter(
            (id) => id !== safeProductId,
          )
        : [...previous.wishlist, safeProductId],
    }));
  }, []);

  const removeFromWishlist = useCallback(
    (productId: string) => {
      const safeProductId = normaliseProductId(productId);

      if (!safeProductId) {
        return;
      }

      setState((previous) => ({
        ...previous,
        wishlist: previous.wishlist.filter(
          (id) => id !== safeProductId,
        ),
      }));
    },
    [],
  );

  const isWishlisted = useCallback(
    (productId: string) =>
      state.wishlist.includes(productId),
    [state.wishlist],
  );

  /* ------------------------------------------------------------------------ */
  /* QUOTE BASKET                                                             */
  /* ------------------------------------------------------------------------ */

  const addToQuote = useCallback(
    (
      productId: string,
      quantity = 1,
      variantId: string | null = null,
    ) => {
      const safeProductId = normaliseProductId(productId);

      if (!safeProductId) {
        return;
      }

      const safeVariantId = normaliseVariantId(variantId);
      const safeQuantity = normaliseQuantity(quantity);

      setState((previous) => {
        const key = lineKey(safeProductId, safeVariantId);

        const existing = previous.quoteBasket.find(
          (line) =>
            lineKey(line.product_id, line.variant_id) === key,
        );

        const nextQuoteBasket = existing
          ? previous.quoteBasket.map((line) =>
              lineKey(line.product_id, line.variant_id) === key
                ? {
                    ...line,
                    quantity: line.quantity + safeQuantity,
                  }
                : line,
            )
          : [
              ...previous.quoteBasket,
              {
                product_id: safeProductId,
                quantity: safeQuantity,
                variant_id: safeVariantId,
              },
            ];

        return {
          ...previous,
          quoteBasket: nextQuoteBasket,
        };
      });
    },
    [],
  );

  const setQuoteQuantity = useCallback(
    (
      productId: string,
      quantity: number,
      variantId?: string | null,
    ) => {
      const safeProductId = normaliseProductId(productId);

      if (!safeProductId) {
        return;
      }

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);

      setState((previous) => {
        const productLines = previous.quoteBasket.filter(
          (line) => line.product_id === safeProductId,
        );

        const target = hasExplicitVariant
          ? productLines.find(
              (line) => line.variant_id === safeVariantId,
            )
          : productLines.length === 1
            ? productLines[0]
            : undefined;

        if (!target) {
          return previous;
        }

        const targetKey = lineKey(
          target.product_id,
          target.variant_id,
        );

        if (!Number.isFinite(quantity) || quantity <= 0) {
          return {
            ...previous,
            quoteBasket: previous.quoteBasket.filter(
              (line) =>
                lineKey(line.product_id, line.variant_id) !==
                targetKey,
            ),
          };
        }

        const safeQuantity = normaliseQuantity(quantity);

        return {
          ...previous,
          quoteBasket: previous.quoteBasket.map((line) =>
            lineKey(line.product_id, line.variant_id) === targetKey
              ? {
                  ...line,
                  quantity: safeQuantity,
                }
              : line,
          ),
        };
      });
    },
    [],
  );

  const removeFromQuote = useCallback(
    (
      productId: string,
      variantId?: string | null,
    ) => {
      const safeProductId = normaliseProductId(productId);

      if (!safeProductId) {
        return;
      }

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);

      setState((previous) => {
        if (hasExplicitVariant) {
          return {
            ...previous,
            quoteBasket: previous.quoteBasket.filter(
              (line) =>
                !(
                  line.product_id === safeProductId &&
                  line.variant_id === safeVariantId
                ),
            ),
          };
        }

        /**
         * Older callers may omit variantId.
         * Only remove automatically when the product has exactly one
         * quotation line.
         */
        const matchingLines = previous.quoteBasket.filter(
          (line) => line.product_id === safeProductId,
        );

        if (matchingLines.length !== 1) {
          return previous;
        }

        const target = matchingLines[0];

        return {
          ...previous,
          quoteBasket: previous.quoteBasket.filter(
            (line) =>
              lineKey(line.product_id, line.variant_id) !==
              lineKey(target.product_id, target.variant_id),
          ),
        };
      });
    },
    [],
  );

  const clearQuote = useCallback(() => {
    setState((previous) => ({
      ...previous,
      quoteBasket: [],
    }));
  }, []);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const cartCount = useMemo(
    () =>
      state.cart.reduce(
        (total, line) => total + line.quantity,
        0,
      ),
    [state.cart],
  );

  const quoteCount = useMemo(
    () =>
      state.quoteBasket.reduce(
        (total, line) => total + line.quantity,
        0,
      ),
    [state.quoteBasket],
  );

  /* ------------------------------------------------------------------------ */
  /* CONTEXT VALUE                                                            */
  /* ------------------------------------------------------------------------ */

  const value = useMemo<CommerceState>(
    () => ({
      cart: state.cart,
      wishlist: state.wishlist,
      quoteBasket: state.quoteBasket,

      hydrated,

      addToCart,
      setCartQuantity,
      removeFromCart,
      clearCart,

      toggleWishlist,
      isWishlisted,
      removeFromWishlist,

      addToQuote,
      setQuoteQuantity,
      removeFromQuote,
      clearQuote,

      cartCount,
      wishlistCount: state.wishlist.length,
      quoteCount,
    }),
    [
      state.cart,
      state.wishlist,
      state.quoteBasket,
      hydrated,
      addToCart,
      setCartQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWishlisted,
      removeFromWishlist,
      addToQuote,
      setQuoteQuantity,
      removeFromQuote,
      clearQuote,
      cartCount,
      quoteCount,
    ],
  );

  return (
    <CommerceContext.Provider value={value}>
      {children}
    </CommerceContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* HOOK                                                                       */
/* -------------------------------------------------------------------------- */

export function useCommerce(): CommerceState {
  const context = useContext(CommerceContext);

  if (!context) {
    throw new Error(
      "useCommerce must be used inside CommerceProvider",
    );
  }

  return context;
}
