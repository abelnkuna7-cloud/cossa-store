import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  CartLine,
  QuoteLine,
} from "@/types/catalog";

/**
 * Cossa Store browser commerce state.
 *
 * CURRENT PHASE
 * -------------
 * Cart, wishlist and quotation basket are persisted in localStorage.
 *
 * FUTURE PHASE
 * ------------
 * These structures should migrate into shared Supabase-backed commerce tables
 * so signed-in customers can retain their baskets across devices and Cossa AI /
 * Growth can work from the same approved customer context.
 *
 * IMPORTANT:
 * - Product variant is part of line identity.
 * - Product + Variant A and Product + Variant B are separate lines.
 * - Wishlist remains product-level, not variant-level.
 * - Existing v1 browser data is migrated automatically.
 */

/* -------------------------------------------------------------------------- */
/* LINE TYPES                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Variant-aware cart line.
 *
 * We extend the existing CartLine rather than forcing another immediate
 * repository-wide type migration.
 *
 * `variant_id: null` means the product has no selected variant.
 */
export type CommerceCartLine = CartLine & {
  variant_id: string | null;
};

/**
 * Variant-aware quotation line.
 */
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

  /**
   * Add a product or selected variant to cart.
   *
   * Existing two-argument calls remain valid.
   */
  addToCart: (
    productId: string,
    quantity?: number,
    variantId?: string | null,
  ) => void;

  /**
   * Update one cart line.
   *
   * Cart UI should eventually always pass variantId.
   */
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

  /**
   * Add a product or selected variant to the quotation basket.
   */
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

const CommerceContext =
  createContext<CommerceState | null>(null);

/* -------------------------------------------------------------------------- */
/* STORAGE                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Increment storage version because line identity now includes variant_id.
 */
const KEY = "cossa.commerce.v2";

/**
 * Previous key retained only for automatic migration.
 */
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

function normaliseQuantity(
  value: unknown,
): number {
  const quantity = Number(value);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(quantity),
  );
}

function normaliseVariantId(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normaliseProductId(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

/* -------------------------------------------------------------------------- */
/* STORAGE LINE NORMALISATION                                                 */
/* -------------------------------------------------------------------------- */

function normaliseCartLines(
  value: unknown,
): CommerceCartLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: CommerceCartLine[] = [];

  for (const candidate of value) {
    if (
      !candidate ||
      typeof candidate !== "object"
    ) {
      continue;
    }

    const record =
      candidate as Record<
        string,
        unknown
      >;

    const productId =
      normaliseProductId(
        record.product_id,
      );

    if (!productId) {
      continue;
    }

    const line: CommerceCartLine = {
      product_id: productId,

      quantity:
        normaliseQuantity(
          record.quantity,
        ),

      variant_id:
        normaliseVariantId(
          record.variant_id,
        ),
    };

    lines.push(line);
  }

  return mergeDuplicateCartLines(
    lines,
  );
}

function normaliseQuoteLines(
  value: unknown,
): CommerceQuoteLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: CommerceQuoteLine[] = [];

  for (const candidate of value) {
    if (
      !candidate ||
      typeof candidate !== "object"
    ) {
      continue;
    }

    const record =
      candidate as Record<
        string,
        unknown
      >;

    const productId =
      normaliseProductId(
        record.product_id,
      );

    if (!productId) {
      continue;
    }

    const line: CommerceQuoteLine = {
      product_id: productId,

      quantity:
        normaliseQuantity(
          record.quantity,
        ),

      variant_id:
        normaliseVariantId(
          record.variant_id,
        ),
    };

    lines.push(line);
  }

  return mergeDuplicateQuoteLines(
    lines,
  );
}

function normaliseWishlist(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .map(normaliseProductId)
    .filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    );

  return Array.from(
    new Set(ids),
  );
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

function mergeDuplicateCartLines(
  lines: CommerceCartLine[],
): CommerceCartLine[] {
  const map =
    new Map<
      string,
      CommerceCartLine
    >();

  for (const line of lines) {
    const key = lineKey(
      line.product_id,
      line.variant_id,
    );

    const existing =
      map.get(key);

    if (existing) {
      map.set(key, {
        ...existing,

        quantity:
          existing.quantity +
          line.quantity,
      });
    } else {
      map.set(key, line);
    }
  }

  return Array.from(
    map.values(),
  );
}

function mergeDuplicateQuoteLines(
  lines: CommerceQuoteLine[],
): CommerceQuoteLine[] {
  const map =
    new Map<
      string,
      CommerceQuoteLine
    >();

  for (const line of lines) {
    const key = lineKey(
      line.product_id,
      line.variant_id,
    );

    const existing =
      map.get(key);

    if (existing) {
      map.set(key, {
        ...existing,

        quantity:
          existing.quantity +
          line.quantity,
      });
    } else {
      map.set(key, line);
    }
  }

  return Array.from(
    map.values(),
  );
}

/* -------------------------------------------------------------------------- */
/* STORAGE READ                                                               */
/* -------------------------------------------------------------------------- */

function parsePersisted(
  raw: string,
): Persisted {
  try {
    const parsed =
      JSON.parse(raw) as Record<
        string,
        unknown
      >;

    return {
      cart:
        normaliseCartLines(
          parsed.cart,
        ),

      wishlist:
        normaliseWishlist(
          parsed.wishlist,
        ),

      quoteBasket:
        normaliseQuoteLines(
          parsed.quoteBasket,
        ),
    };
  } catch {
    return EMPTY;
  }
}

function read(): Persisted {
  if (
    typeof window === "undefined"
  ) {
    return EMPTY;
  }

  try {
    /**
     * Prefer current v2 state.
     */
    const current =
      window.localStorage.getItem(
        KEY,
      );

    if (current) {
      return parsePersisted(
        current,
      );
    }

    /**
     * Automatic migration from Phase 1.
     *
     * Old lines:
     *
     * {
     *   product_id,
     *   quantity
     * }
     *
     * become:
     *
     * {
     *   product_id,
     *   quantity,
     *   variant_id: null
     * }
     */
    const legacy =
      window.localStorage.getItem(
        LEGACY_KEY,
      );

    if (legacy) {
      return parsePersisted(
        legacy,
      );
    }

    return EMPTY;
  } catch {
    return EMPTY;
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
  const [state, setState] =
    useState<Persisted>(EMPTY);

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* HYDRATION                                                              */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    setState(read());

    setHydrated(true);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* PERSISTENCE                                                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify(state),
      );

      /**
       * After successful v2 persistence, remove legacy v1 state.
       *
       * This prevents stale old-format commerce data from being restored
       * later.
       */
      window.localStorage.removeItem(
        LEGACY_KEY,
      );
    } catch {
      /**
       * localStorage can fail in restricted/private browser modes.
       *
       * Commerce continues in-memory for the current session.
       */
    }
  }, [
    state,
    hydrated,
  ]);

  /* ---------------------------------------------------------------------- */
  /* CART                                                                   */
  /* ---------------------------------------------------------------------- */

  const addToCart =
    useCallback(
      (
        productId: string,
        quantity = 1,
        variantId: string | null = null,
      ) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        const safeVariantId =
          normaliseVariantId(
            variantId,
          );

        const safeQuantity =
          normaliseQuantity(
            quantity,
          );

        setState((previous) => {
          const key = lineKey(
            safeProductId,
            safeVariantId,
          );

          const existing =
            previous.cart.find(
              (line) =>
                lineKey(
                  line.product_id,
                  line.variant_id,
                ) === key,
            );

          const nextCart =
            existing
              ? previous.cart.map(
                  (line) =>
                    lineKey(
                      line.product_id,
                      line.variant_id,
                    ) === key
                      ? {
                          ...line,

                          quantity:
                            line.quantity +
                            safeQuantity,
                        }
                      : line,
                )
              : [
                  ...previous.cart,

                  {
                    product_id:
                      safeProductId,

                    quantity:
                      safeQuantity,

                    variant_id:
                      safeVariantId,
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

  const setCartQuantity =
    useCallback(
      (
        productId: string,
        quantity: number,
        variantId?: string | null,
      ) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        const hasExplicitVariant =
          variantId !== undefined;

        const safeVariantId =
          normaliseVariantId(
            variantId,
          );

        setState((previous) => {
          /**
           * During migration, older UI may call this method without
           * variantId.
           *
           * If there is exactly one line for this product, safely target it.
           *
           * If multiple variants exist, we refuse to guess which one the
           * caller intended.
           */
          const productLines =
            previous.cart.filter(
              (line) =>
                line.product_id ===
                safeProductId,
            );

          const target =
            hasExplicitVariant
              ? productLines.find(
                  (line) =>
                    line.variant_id ===
                    safeVariantId,
                )
              : productLines.length ===
                  1
                ? productLines[0]
                : undefined;

          if (!target) {
            return previous;
          }

          if (quantity <= 0) {
            return {
              ...previous,

              cart:
                previous.cart.filter(
                  (line) =>
                    lineKey(
                      line.product_id,
                      line.variant_id,
                    ) !==
                    lineKey(
                      target.product_id,
                      target.variant_id,
                    ),
                ),
            };
          }

          const safeQuantity =
            normaliseQuantity(
              quantity,
            );

          return {
            ...previous,

            cart:
              previous.cart.map(
                (line) =>
                  lineKey(
                    line.product_id,
                    line.variant_id,
                  ) ===
                  lineKey(
                    target.product_id,
                    target.variant_id,
                  )
                    ? {
                        ...line,
                        quantity:
                          safeQuantity,
                      }
                    : line,
              ),
          };
        });
      },
      [],
    );

  const removeFromCart =
    useCallback(
      (
        productId: string,
        variantId?: string | null,
      ) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        const hasExplicitVariant =
          variantId !== undefined;

        const safeVariantId =
          normaliseVariantId(
            variantId,
          );

        setState((previous) => {
          if (hasExplicitVariant) {
            return {
              ...previous,

              cart:
                previous.cart.filter(
                  (line) =>
                    !(
                      line.product_id ===
                        safeProductId &&
                      line.variant_id ===
                        safeVariantId
                    ),
                ),
            };
          }

          /**
           * Backward-compatible behaviour:
           *
           * When no variant is supplied, remove all cart lines belonging
           * to that product.
           *
           * Cart UI will later be upgraded to always pass the exact
           * variant_id for line-level removal.
           */
          return {
            ...previous,

            cart:
              previous.cart.filter(
                (line) =>
                  line.product_id !==
                  safeProductId,
              ),
          };
        });
      },
      [],
    );

  const clearCart =
    useCallback(() => {
      setState((previous) => ({
        ...previous,
        cart: [],
      }));
    }, []);

  /* ---------------------------------------------------------------------- */
  /* WISHLIST                                                               */
  /* ---------------------------------------------------------------------- */

  const toggleWishlist =
    useCallback(
      (productId: string) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        setState((previous) => ({
          ...previous,

          wishlist:
            previous.wishlist.includes(
              safeProductId,
            )
              ? previous.wishlist.filter(
                  (id) =>
                    id !==
                    safeProductId,
                )
              : [
                  ...previous.wishlist,
                  safeProductId,
                ],
        }));
      },
      [],
    );

  const removeFromWishlist =
    useCallback(
      (productId: string) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        setState((previous) => ({
          ...previous,

          wishlist:
            previous.wishlist.filter(
              (id) =>
                id !==
                safeProductId,
            ),
        }));
      },
      [],
    );

  /* ---------------------------------------------------------------------- */
  /* QUOTE BASKET                                                           */
  /* ---------------------------------------------------------------------- */

  const addToQuote =
    useCallback(
      (
        productId: string,
        quantity = 1,
        variantId: string | null = null,
      ) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        const safeVariantId =
          normaliseVariantId(
            variantId,
          );

        const safeQuantity =
          normaliseQuantity(
            quantity,
          );

        setState((previous) => {
          const key = lineKey(
            safeProductId,
            safeVariantId,
          );

          const existing =
            previous.quoteBasket.find(
              (line) =>
                lineKey(
                  line.product_id,
                  line.variant_id,
                ) === key,
            );

          const nextQuote =
            existing
              ? previous.quoteBasket.map(
                  (line) =>
                    lineKey(
                      line.product_id,
                      line.variant_id,
                    ) === key
                      ? {
                          ...line,

                          quantity:
                            line.quantity +
                            safeQuantity,
                        }
                      : line,
                )
              : [
                  ...previous.quoteBasket,

                  {
                    product_id:
                      safeProductId,

                    quantity:
                      safeQuantity,

                    variant_id:
                      safeVariantId,
                  },
                ];

          return {
            ...previous,
            quoteBasket:
              nextQuote,
          };
        });
      },
      [],
    );

  const setQuoteQuantity =
    useCallback(
      (
        productId: string,
        quantity: number,
        variantId?: string | null,
      ) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        const hasExplicitVariant =
          variantId !== undefined;

        const safeVariantId =
          normaliseVariantId(
            variantId,
          );

        setState((previous) => {
          const productLines =
            previous.quoteBasket.filter(
              (line) =>
                line.product_id ===
                safeProductId,
            );

          const target =
            hasExplicitVariant
              ? productLines.find(
                  (line) =>
                    line.variant_id ===
                    safeVariantId,
                )
              : productLines.length ===
                  1
                ? productLines[0]
                : undefined;

          if (!target) {
            return previous;
          }

          if (quantity <= 0) {
            return {
              ...previous,

              quoteBasket:
                previous.quoteBasket.filter(
                  (line) =>
                    lineKey(
                      line.product_id,
                      line.variant_id,
                    ) !==
                    lineKey(
                      target.product_id,
                      target.variant_id,
                    ),
                ),
            };
          }

          const safeQuantity =
            normaliseQuantity(
              quantity,
            );

          return {
            ...previous,

            quoteBasket:
              previous.quoteBasket.map(
                (line) =>
                  lineKey(
                    line.product_id,
                    line.variant_id,
                  ) ===
                  lineKey(
                    target.product_id,
                    target.variant_id,
                  )
                    ? {
                        ...line,

                        quantity:
                          safeQuantity,
                      }
                    : line,
              ),
          };
        });
      },
      [],
    );

  const removeFromQuote =
    useCallback(
      (
        productId: string,
        variantId?: string | null,
      ) => {
        const safeProductId =
          normaliseProductId(
            productId,
          );

        if (!safeProductId) {
          return;
        }

        const hasExplicitVariant =
          variantId !== undefined;

        const safeVariantId =
          normaliseVariantId(
            variantId,
          );

        setState((previous) => {
          if (hasExplicitVariant) {
            return {
              ...previous,

              quoteBasket:
                previous.quoteBasket.filter(
                  (line) =>
                    !(
                      line.product_id ===
                        safeProductId &&
                      line.variant_id ===
                        safeVariantId
                    ),
                ),
            };
          }

          return {
            ...previous,

            quoteBasket:
              previous.quoteBasket.filter(
                (line) =>
                  line.product_id !==
                  safeProductId,
              ),
          };
        });
      },
      [],
    );

  const clearQuote =
    useCallback(() => {
      setState((previous) => ({
        ...previous,
        quoteBasket: [],
      }));
    }, []);

  /* ---------------------------------------------------------------------- */
  /* CONTEXT VALUE                                                          */
  /* ---------------------------------------------------------------------- */

  const value =
    useMemo<CommerceState>(
      () => ({
        cart: state.cart,

        wishlist:
          state.wishlist,

        quoteBasket:
          state.quoteBasket,

        hydrated,

        addToCart,

        setCartQuantity,

        removeFromCart,

        clearCart,

        toggleWishlist,

        isWishlisted:
          (productId) =>
            state.wishlist.includes(
              productId,
            ),

        removeFromWishlist,

        addToQuote,

        setQuoteQuantity,

        removeFromQuote,

        clearQuote,

        cartCount:
          state.cart.reduce(
            (
              total,
              line,
            ) =>
              total +
              line.quantity,
            0,
          ),

        wishlistCount:
          state.wishlist.length,

        quoteCount:
          state.quoteBasket.reduce(
            (
              total,
              line,
            ) =>
              total +
              line.quantity,
            0,
          ),
      }),

      [
        state,
        hydrated,
        addToCart,
        setCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
        removeFromWishlist,
        addToQuote,
        setQuoteQuantity,
        removeFromQuote,
        clearQuote,
      ],
    );

  return (
    <CommerceContext.Provider
      value={value}
    >
      {children}
    </CommerceContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* HOOK                                                                       */
/* -------------------------------------------------------------------------- */

export function useCommerce(): CommerceState {
  const context =
    useContext(
      CommerceContext,
    );

  if (!context) {
    throw new Error(
      "useCommerce must be used inside CommerceProvider",
    );
  }

  return context;
}
