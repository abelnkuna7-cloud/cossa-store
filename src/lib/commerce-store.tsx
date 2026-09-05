import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { CartLine, QuoteLine } from "@/types/catalog";
import {
  cartLineKey,
  cartQuantity,
  mergeCartLines,
  removeCartLineKeys,
  selectedCartLineKeys as normaliseSelectedCartLineKeys,
  selectedCartLines as filterSelectedCartLines,
} from "@/lib/cart-lines";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

/**
 * Cossa Store browser commerce state.
 *
 * CURRENT PHASE
 * -------------
 * Wishlist and quotation basket are persisted in localStorage. Anonymous
 * carts remain browser-local; authenticated customer carts are also synced to
 * Supabase so the same account can continue shopping on another device.
 *
 * FUTURE PHASE
 * ------------
 * The account-linked cart stores only product/variant identifiers and
 * quantities. Orders and fulfilment data remain protected by their own
 * session-bound RLS policies.
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
  savedForLater: CommerceCartLine[];
  selectedCartLines: CommerceCartLine[];
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

  toggleCartLineSelection: (
    productId: string,
    variantId?: string | null,
  ) => void;

  saveCartLineForLater: (
    productId: string,
    variantId?: string | null,
  ) => void;

  moveSavedLineToCart: (
    productId: string,
    variantId?: string | null,
  ) => void;

  removeSavedLine: (
    productId: string,
    variantId?: string | null,
  ) => void;

  removePaidCartLines: (lines: CommerceCartLine[]) => void;

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
const userStorageKey = (userId: string) => `${KEY}.user.${userId}`;

interface Persisted {
  cart: CommerceCartLine[];
  savedForLater: CommerceCartLine[];
  selectedCartLineKeys: string[];
  wishlist: string[];
  quoteBasket: CommerceQuoteLine[];
}

const EMPTY: Persisted = {
  cart: [],
  savedForLater: [],
  selectedCartLineKeys: [],
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

/* -------------------------------------------------------------------------- */
/* DUPLICATE MERGING                                                          */
/* -------------------------------------------------------------------------- */

function mergeDuplicateCartLines(
  lines: CommerceCartLine[],
): CommerceCartLine[] {
  return mergeCartLines(lines);
}

function mergeRemoteCartWithLocal(
  remote: CommerceCartLine[],
  local: CommerceCartLine[],
): CommerceCartLine[] {
  const remoteKeys = new Set(remote.map((line) => cartLineKey(line)));
  const localOnly = local.filter((line) => !remoteKeys.has(cartLineKey(line)));

  // The account row is authoritative for lines it already knows about. Only
  // local-only additions are merged, preventing quantities from doubling on
  // every device refresh.
  return mergeDuplicateCartLines([...remote, ...localOnly]);
}

function mergeDuplicateQuoteLines(
  lines: CommerceQuoteLine[],
): CommerceQuoteLine[] {
  const map = new Map<string, CommerceQuoteLine>();

  for (const line of lines) {
    const key = cartLineKey(line);
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
        savedForLater: [],
        selectedCartLineKeys: [],
        wishlist: [],
        quoteBasket: [],
      };
    }

    const record = parsed as Record<string, unknown>;

    return {
      cart: normaliseCartLines(record.cart),
      savedForLater: normaliseCartLines(record.savedForLater),
      selectedCartLineKeys: normaliseSelectedCartLineKeys(
        normaliseCartLines(record.cart),
        record.selectedCartLineKeys,
      ),
      wishlist: normaliseWishlist(record.wishlist),
      quoteBasket: normaliseQuoteLines(record.quoteBasket),
    };
  } catch {
    return {
      cart: [],
      savedForLater: [],
      selectedCartLineKeys: [],
      wishlist: [],
      quoteBasket: [],
    };
  }
}

function read(userId: string | null = null): Persisted {
  if (typeof window === "undefined") {
    return {
      cart: [],
      savedForLater: [],
      selectedCartLineKeys: [],
      wishlist: [],
      quoteBasket: [],
    };
  }

  try {
    const current = window.localStorage.getItem(
      userId ? userStorageKey(userId) : KEY,
    );

    if (current) {
      return parsePersisted(current);
    }

    // Migrate the existing anonymous browser cart into the first signed-in
    // account once. Future account state is always stored under the user ID.
    const legacy = window.localStorage.getItem(
      userId ? KEY : LEGACY_KEY,
    );

    if (legacy) {
      return parsePersisted(legacy);
    }

    return {
      cart: [],
      savedForLater: [],
      selectedCartLineKeys: [],
      wishlist: [],
      quoteBasket: [],
    };
  } catch {
    return {
      cart: [],
      savedForLater: [],
      selectedCartLineKeys: [],
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
  const { user, loading: authLoading } = useSession();
  const userId = user?.id ?? null;
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------------------------------------------------ */
  /* HYDRATION                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const localState = read(userId);

    setState(localState);
    setHydrated(true);
    setRemoteReady(false);

    if (!userId) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const { data, error } = await supabase
        .from("store_customer_carts")
        .select("cart")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn("Unable to load the account cart; using local cart", error);
        setRemoteReady(true);
        return;
      }

      const remoteCart = normaliseCartLines(data?.cart);
      const mergedCart = mergeRemoteCartWithLocal(remoteCart, localState.cart);

      setState((previous) => ({
        ...previous,
        cart: mergedCart,
        selectedCartLineKeys: normaliseSelectedCartLineKeys(
          mergedCart,
          previous.selectedCartLineKeys,
        ),
      }));
      setRemoteReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  /* ------------------------------------------------------------------------ */
  /* PERSISTENCE                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        userId ? userStorageKey(userId) : KEY,
        JSON.stringify(state),
      );
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /**
       * Storage may be unavailable in restricted/private browser modes.
       * Commerce state continues in memory for the current session.
       */
    }
  }, [state, hydrated, userId]);

  /* ------------------------------------------------------------------------ */
  /* ACCOUNT CART SYNC                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!remoteReady || !userId) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      void supabase
        .from("store_customer_carts")
        .upsert({
          user_id: userId,
          cart: state.cart,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) {
            console.warn("Unable to save the account cart", error);
          }
        });
    }, 250);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [remoteReady, state.cart, userId]);

  // Keep another already-open device/profile current without requiring the
  // customer to sign out and back in. The account row is authoritative for
  // existing lines; local persistence still covers temporary offline edits.
  useEffect(() => {
    if (!remoteReady || !userId || typeof window === "undefined") return;

    let cancelled = false;
    const syncRemoteCart = async () => {
      const { data, error } = await supabase
        .from("store_customer_carts")
        .select("cart")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const remoteCart = normaliseCartLines(data.cart);
      setState((previous) => {
        if (JSON.stringify(previous.cart) === JSON.stringify(remoteCart)) {
          return previous;
        }

        return {
          ...previous,
          cart: remoteCart,
          selectedCartLineKeys: normaliseSelectedCartLineKeys(
            remoteCart,
            previous.selectedCartLineKeys,
          ),
        };
      });
    };

    const interval = window.setInterval(() => {
      void syncRemoteCart();
    }, 5000);
    window.addEventListener("focus", syncRemoteCart);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncRemoteCart);
    };
  }, [remoteReady, userId]);

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
        const key = cartLineKey({ product_id: safeProductId, variant_id: safeVariantId });

        const existing = previous.cart.find(
          (line) =>
            cartLineKey(line) === key,
        );

        const nextCart = existing
          ? previous.cart.map((line) =>
              cartLineKey(line) === key
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
          selectedCartLineKeys: Array.from(
            new Set([...previous.selectedCartLineKeys, key]),
          ),
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

        const targetKey = cartLineKey(target);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          return {
            ...previous,
            cart: removeCartLineKeys(previous.cart, [targetKey]),
            selectedCartLineKeys: previous.selectedCartLineKeys.filter(
              (key) => key !== targetKey,
            ),
          };
        }

        const safeQuantity = normaliseQuantity(quantity);

        return {
          ...previous,
          cart: previous.cart.map((line) =>
            cartLineKey(line) === targetKey
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
          const targetKey = cartLineKey({
            product_id: safeProductId,
            variant_id: safeVariantId,
          });
          return {
            ...previous,
            cart: removeCartLineKeys(previous.cart, [targetKey]),
            selectedCartLineKeys: previous.selectedCartLineKeys.filter(
              (key) => key !== targetKey,
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
          cart: removeCartLineKeys(previous.cart, [cartLineKey(target)]),
          selectedCartLineKeys: previous.selectedCartLineKeys.filter(
            (key) => key !== cartLineKey(target),
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
      selectedCartLineKeys: [],
    }));
  }, []);

  const toggleCartLineSelection = useCallback(
    (productId: string, variantId?: string | null) => {
      const safeProductId = normaliseProductId(productId);
      if (!safeProductId) return;

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);

      setState((previous) => {
        const matching = previous.cart.filter((line) =>
          line.product_id === safeProductId &&
          (!hasExplicitVariant || line.variant_id === safeVariantId),
        );
        if (matching.length !== 1) return previous;

        const key = cartLineKey(matching[0]);
        const isSelected = previous.selectedCartLineKeys.includes(key);
        return {
          ...previous,
          selectedCartLineKeys: isSelected
            ? previous.selectedCartLineKeys.filter((value) => value !== key)
            : [...previous.selectedCartLineKeys, key],
        };
      });
    },
    [],
  );

  const saveCartLineForLater = useCallback(
    (productId: string, variantId?: string | null) => {
      const safeProductId = normaliseProductId(productId);
      if (!safeProductId) return;

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);
      setState((previous) => {
        const matches = previous.cart.filter((line) =>
          line.product_id === safeProductId &&
          (!hasExplicitVariant || line.variant_id === safeVariantId),
        );
        if (matches.length !== 1) return previous;

        const target = matches[0];
        const key = cartLineKey(target);
        return {
          ...previous,
          cart: removeCartLineKeys(previous.cart, [key]),
          savedForLater: mergeDuplicateCartLines([...previous.savedForLater, target]),
          selectedCartLineKeys: previous.selectedCartLineKeys.filter((value) => value !== key),
        };
      });
    },
    [],
  );

  const moveSavedLineToCart = useCallback(
    (productId: string, variantId?: string | null) => {
      const safeProductId = normaliseProductId(productId);
      if (!safeProductId) return;

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);
      setState((previous) => {
        const matches = previous.savedForLater.filter((line) =>
          line.product_id === safeProductId &&
          (!hasExplicitVariant || line.variant_id === safeVariantId),
        );
        if (matches.length !== 1) return previous;

        const target = matches[0];
        const key = cartLineKey(target);
        return {
          ...previous,
          cart: mergeDuplicateCartLines([...previous.cart, target]),
          savedForLater: removeCartLineKeys(previous.savedForLater, [key]),
          selectedCartLineKeys: Array.from(
            new Set([...previous.selectedCartLineKeys, key]),
          ),
        };
      });
    },
    [],
  );

  const removeSavedLine = useCallback(
    (productId: string, variantId?: string | null) => {
      const safeProductId = normaliseProductId(productId);
      if (!safeProductId) return;

      const hasExplicitVariant = variantId !== undefined;
      const safeVariantId = normaliseVariantId(variantId);
      setState((previous) => {
        const matches = previous.savedForLater.filter((line) =>
          line.product_id === safeProductId &&
          (!hasExplicitVariant || line.variant_id === safeVariantId),
        );
        if (matches.length !== 1) return previous;
        return {
          ...previous,
          savedForLater: removeCartLineKeys(previous.savedForLater, [cartLineKey(matches[0])]),
        };
      });
    },
    [],
  );

  const removePaidCartLines = useCallback((paidLines: CommerceCartLine[]) => {
    const paidByKey = new Map(paidLines.map((line) => [cartLineKey(line), line.quantity]));
    setState((previous) => {
      // Retain a line if its quantity changed while the payment request was
      // being prepared. It is safer to leave it for the customer to review
      // than to silently remove a newly changed quantity.
      const removedKeys = previous.cart
        .filter((line) => paidByKey.get(cartLineKey(line)) === line.quantity)
        .map(cartLineKey);
      return {
        ...previous,
        cart: removeCartLineKeys(previous.cart, removedKeys),
        selectedCartLineKeys: previous.selectedCartLineKeys.filter(
          (key) => !removedKeys.includes(key),
        ),
      };
    });
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
        const key = cartLineKey({ product_id: safeProductId, variant_id: safeVariantId });

        const existing = previous.quoteBasket.find(
          (line) =>
            cartLineKey(line) === key,
        );

        const nextQuoteBasket = existing
          ? previous.quoteBasket.map((line) =>
              cartLineKey(line) === key
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

        const targetKey = cartLineKey(target);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          return {
            ...previous,
            quoteBasket: previous.quoteBasket.filter(
              (line) =>
                cartLineKey(line) !==
                targetKey,
            ),
          };
        }

        const safeQuantity = normaliseQuantity(quantity);

        return {
          ...previous,
          quoteBasket: previous.quoteBasket.map((line) =>
            cartLineKey(line) === targetKey
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
              cartLineKey(line) !==
              cartLineKey(target),
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

  const cartCount = useMemo(() => cartQuantity(state.cart), [state.cart]);

  const quoteCount = useMemo(
    () =>
      state.quoteBasket.reduce(
        (total, line) => total + line.quantity,
        0,
      ),
    [state.quoteBasket],
  );

  const selectedCartLines = useMemo(
    () => filterSelectedCartLines(state.cart, state.selectedCartLineKeys),
    [state.cart, state.selectedCartLineKeys],
  );

  /* ------------------------------------------------------------------------ */
  /* CONTEXT VALUE                                                            */
  /* ------------------------------------------------------------------------ */

  const value = useMemo<CommerceState>(
    () => ({
      cart: state.cart,
      savedForLater: state.savedForLater,
      selectedCartLines,
      wishlist: state.wishlist,
      quoteBasket: state.quoteBasket,

      hydrated,

      addToCart,
      setCartQuantity,
      removeFromCart,
      clearCart,
      toggleCartLineSelection,
      saveCartLineForLater,
      moveSavedLineToCart,
      removeSavedLine,
      removePaidCartLines,

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
      state.savedForLater,
      state.wishlist,
      state.quoteBasket,
      hydrated,
      addToCart,
      setCartQuantity,
      removeFromCart,
      clearCart,
      toggleCartLineSelection,
      saveCartLineForLater,
      moveSavedLineToCart,
      removeSavedLine,
      removePaidCartLines,
      toggleWishlist,
      isWishlisted,
      removeFromWishlist,
      addToQuote,
      setQuoteQuantity,
      removeFromQuote,
      clearQuote,
      cartCount,
      selectedCartLines,
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
