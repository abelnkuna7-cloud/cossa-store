import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  NoticeBlock,
} from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";

import {
  useCommerce,
  type CommerceCartLine,
} from "@/lib/commerce-store";

import { formatZar } from "@/lib/format";
import { productsByIdsQuery } from "@/lib/queries";

import type {
  Product,
  ProductVariantPublic,
  VatStatus,
} from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

const TITLE = "Shopping cart | Cossa Store";

const DESCRIPTION =
  "Review the products, selected options and quantities in your Cossa Store cart.";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      {
        title: TITLE,
      },
      {
        name: "description",
        content: DESCRIPTION,
      },
      {
        property: "og:title",
        content: TITLE,
      },
      {
        property: "og:description",
        content: DESCRIPTION,
      },

      /**
       * Cart pages are private customer utility pages.
       *
       * They must not appear in search results.
       */
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),

  component: CartPage,
});

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface ResolvedCartLine {
  line: CommerceCartLine;

  product: Product;

  variant: ProductVariantPublic | null;

  unitPrice: number;

  compareAtPrice: number | null;

  lineTotal: number;

  purchasable: boolean;

  issue: string | null;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function resolveVariant(
  product: Product,
  variantId: string | null,
): ProductVariantPublic | null {
  if (!variantId) {
    return null;
  }

  return (
    product.variants.find(
      (variant) => variant.id === variantId,
    ) ?? null
  );
}

function resolveUnitPrice(
  product: Product,
  variant: ProductVariantPublic | null,
): number {
  if (
    variant?.retail_price !== null &&
    variant?.retail_price !== undefined &&
    Number.isFinite(variant.retail_price) &&
    variant.retail_price > 0
  ) {
    return variant.retail_price;
  }

  if (
    Number.isFinite(product.selling_price) &&
    product.selling_price > 0
  ) {
    return product.selling_price;
  }

  return 0;
}

function resolveCompareAtPrice(
  product: Product,
  variant: ProductVariantPublic | null,
  unitPrice: number,
): number | null {
  const variantCompare =
    variant?.compare_at_price ?? null;

  if (
    typeof variantCompare === "number" &&
    Number.isFinite(variantCompare) &&
    variantCompare > unitPrice
  ) {
    return variantCompare;
  }

  if (
    typeof product.compare_at_price === "number" &&
    Number.isFinite(product.compare_at_price) &&
    product.compare_at_price > unitPrice
  ) {
    return product.compare_at_price;
  }

  return null;
}

function vatLabel(
  status: VatStatus,
): string | null {
  switch (status) {
    case "vat_inclusive":
      return "VAT included";

    case "vat_exclusive":
      return "VAT excluded";

    case "zero_rated":
      return "VAT zero-rated";

    case "exempt":
      return "VAT exempt";

    case "not_specified":
    default:
      return null;
  }
}

function lineIssue(
  product: Product,
  variant: ProductVariantPublic | null,
  line: CommerceCartLine,
  unitPrice: number,
): string | null {
  /**
   * Demo products are visual/development records only.
   */
  if (product.is_demo) {
    return "Demo products cannot be purchased.";
  }

  /**
   * Product must still be operational.
   */
  if (product.status !== "active") {
    return "This product is no longer active.";
  }

  /**
   * Where publication state is present, require the product
   * to still be published.
   */
  if (
    product.publication_state &&
    product.publication_state !== "published"
  ) {
    return "This product is no longer publicly available.";
  }

  /**
   * Public checkout must never continue with hidden/private
   * catalogue records.
   */
  if (
    product.visibility &&
    product.visibility !== "public"
  ) {
    return "This product is no longer publicly available.";
  }

  /**
   * Affiliate offers are completed on the partner website.
   */
  if (
    product.affiliate ||
    product.fulfilment_type === "affiliate"
  ) {
    return "Partner offers must be purchased on the partner website.";
  }

  /**
   * Quote-only products must not enter normal checkout.
   */
  if (
    product.requires_quote ||
    product.fulfilment_type === "quote_only" ||
    product.price_display_mode === "quote"
  ) {
    return "This item requires a quotation instead of direct checkout.";
  }

  /**
   * Customer cannot order genuinely unavailable inventory.
   */
  if (
    product.availability_status === "out_of_stock" ||
    product.stock_status === "out_of_stock"
  ) {
    return "This item is currently out of stock.";
  }

  if (
    product.availability_status === "coming_soon"
  ) {
    return "This item is not available for ordering yet.";
  }

  /**
   * A previously selected variant may have been removed or
   * deactivated after the customer placed it in the cart.
   */
  if (
    line.variant_id &&
    !variant
  ) {
    return "The selected product option is no longer available.";
  }

  if (
    variant &&
    !variant.is_active
  ) {
    return "The selected product option is no longer active.";
  }

  /**
   * Direct checkout requires an actual commercial price.
   */
  if (
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    return "A confirmed checkout price is not currently available.";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* CART PAGE                                                                  */
/* -------------------------------------------------------------------------- */

function CartPage() {
  const {
    cart,
    hydrated,
    setCartQuantity,
    removeFromCart,
    clearCart,
  } = useCommerce();

  /**
   * One product may appear in multiple cart lines because each
   * selected variant is a separate commerce line.
   *
   * Fetch each underlying product only once.
   */
  const productIds = useMemo(
    () =>
      Array.from(
        new Set(
          cart.map(
            (line) => line.product_id,
          ),
        ),
      ),
    [cart],
  );

  const query = useQuery({
    ...productsByIdsQuery(
      productIds,
    ),

    enabled:
      hydrated &&
      productIds.length > 0,
  });

  const products =
    query.data ?? [];

  /* ---------------------------------------------------------------------- */
  /* RESOLVE CART LINES                                                     */
  /* ---------------------------------------------------------------------- */

  const resolvedLines =
    useMemo<ResolvedCartLine[]>(
      () =>
        cart
          .map((line) => {
            const product =
              products.find(
                (candidate) =>
                  candidate.id ===
                  line.product_id,
              );

            if (!product) {
              return null;
            }

            const variant =
              resolveVariant(
                product,
                line.variant_id,
              );

            const unitPrice =
              resolveUnitPrice(
                product,
                variant,
              );

            const compareAtPrice =
              resolveCompareAtPrice(
                product,
                variant,
                unitPrice,
              );

            const issue =
              lineIssue(
                product,
                variant,
                line,
                unitPrice,
              );

            return {
              line,
              product,
              variant,

              unitPrice,

              compareAtPrice,

              lineTotal:
                unitPrice *
                line.quantity,

              purchasable:
                issue === null,

              issue,
            };
          })
          .filter(
            (
              value,
            ): value is ResolvedCartLine =>
              value !== null,
          ),
      [
        cart,
        products,
      ],
    );

  /**
   * Count saved cart lines that no longer resolve to the
   * current catalogue.
   *
   * IMPORTANT:
   * A temporary network/query failure must NOT make the Store
   * claim that products were removed.
   *
   * This value must always be a number.
   */
  const unresolvedLines =
    hydrated &&
    !query.isPending &&
    !query.isError
      ? Math.max(
          0,
          cart.length -
            resolvedLines.length,
        )
      : 0;

  /* ---------------------------------------------------------------------- */
  /* TOTALS                                                                 */
  /* ---------------------------------------------------------------------- */

  const subtotal =
    resolvedLines.reduce(
      (total, item) =>
        total +
        item.lineTotal,
      0,
    );

  const blockedLines =
    resolvedLines.filter(
      (item) =>
        !item.purchasable,
    );

  /**
   * Checkout is allowed only when every saved cart line:
   *
   * - resolves to the current catalogue;
   * - remains commercially valid;
   * - has no blocking condition;
   * - and the catalogue query itself succeeded.
   */
  const canCheckout =
    hydrated &&
    !query.isPending &&
    !query.isError &&
    cart.length > 0 &&
    resolvedLines.length ===
      cart.length &&
    blockedLines.length === 0 &&
    unresolvedLines === 0;

  /**
   * We deliberately do not calculate a blanket 15% VAT amount.
   *
   * Products may have different tax classifications.
   *
   * catalog.service.ts will later map the authoritative database
   * tax_class + product_prices.vat_inclusive fields into vat_status.
   */
  const allVatInclusive =
    resolvedLines.length > 0 &&
    resolvedLines.every(
      ({ product }) =>
        product.vat_status ===
        "vat_inclusive",
    );

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div>
      <PageHeader
        eyebrow="Cart"
        title="Shopping cart"
        description={
          DESCRIPTION
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* HYDRATION */}
        {!hydrated ? (
          <LoadingBlock label="Loading your cart…" />
        ) : null}

        {/* EMPTY CART */}
        {hydrated &&
        cart.length === 0 ? (
          <EmptyBlock
            title="Your cart is empty"
            description="Browse products, build a project kit or request a quotation for larger requirements."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/shop">
                    Shop products
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                >
                  <Link to="/shop-by-project">
                    Shop by project
                  </Link>
                </Button>
              </div>
            }
          />
        ) : null}

        {/* CART CONTENT */}
        {hydrated &&
        cart.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* ------------------------------------------------------------ */}
            {/* CART LINES                                                   */}
            {/* ------------------------------------------------------------ */}

            <div className="space-y-4">
              {query.isPending ? (
                <LoadingBlock label="Checking your cart…" />
              ) : null}

              {query.isError ? (
                <ErrorBlock
                  description="Your cart products could not be loaded. Your saved cart has not been changed."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        query.refetch()
                      }
                    >
                      Try again
                    </Button>
                  }
                />
              ) : null}

              {unresolvedLines > 0 ? (
                <NoticeBlock
                  tone="pending"
                  title="Some cart items need attention"
                >
                  {unresolvedLines}{" "}
                  {unresolvedLines === 1
                    ? "item could"
                    : "items could"}{" "}
                  not be matched to the current public catalogue. The product
                  may have been removed, unpublished or changed since it was
                  added to your cart.
                </NoticeBlock>
              ) : null}

              {resolvedLines.map(
                ({
                  line,
                  product,
                  variant,
                  unitPrice,
                  compareAtPrice,
                  lineTotal,
                  issue,
                }) => {
                  const tax =
                    vatLabel(
                      product.vat_status,
                    );

                  /**
                   * Product + variant is the unique commerce line.
                   */
                  const lineId =
                    `${product.id}-${line.variant_id ?? "base"}`;

                  return (
                    <article
                      key={lineId}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {/* PRODUCT INFORMATION */}
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/product/$slug"
                            params={{
                              slug:
                                product.slug,
                            }}
                            className="font-medium hover:underline"
                          >
                            {
                              product.name
                            }
                          </Link>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Product SKU{" "}
                            {product.sku}
                          </p>

                          {/* SELECTED VARIANT */}
                          {variant ? (
                            <div className="mt-2 rounded-md bg-secondary/50 px-3 py-2 text-xs">
                              <p className="font-medium text-foreground">
                                Selected option:{" "}
                                {
                                  variant.name
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                                {variant.sku ? (
                                  <span>
                                    SKU{" "}
                                    {
                                      variant.sku
                                    }
                                  </span>
                                ) : null}

                                {variant.colour ? (
                                  <span>
                                    Colour:{" "}
                                    {
                                      variant.colour
                                    }
                                  </span>
                                ) : null}

                                {variant.size ? (
                                  <span>
                                    Size:{" "}
                                    {
                                      variant.size
                                    }
                                  </span>
                                ) : null}

                                {variant.finish ? (
                                  <span>
                                    Finish:{" "}
                                    {
                                      variant.finish
                                    }
                                  </span>
                                ) : null}

                                {variant.material ? (
                                  <span>
                                    Material:{" "}
                                    {
                                      variant.material
                                    }
                                  </span>
                                ) : null}

                                {variant.phone_model ? (
                                  <span>
                                    Model:{" "}
                                    {
                                      variant.phone_model
                                    }
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          {/* PRICE */}
                          <div className="mt-2 flex flex-wrap items-baseline gap-2">
                            <span className="text-sm font-medium">
                              {formatZar(
                                unitPrice,
                              )}
                            </span>

                            {compareAtPrice ? (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatZar(
                                  compareAtPrice,
                                )}
                              </span>
                            ) : null}

                            {tax ? (
                              <span className="text-xs text-muted-foreground">
                                · {tax}
                              </span>
                            ) : null}
                          </div>

                          {/* LINE BLOCKER */}
                          {issue ? (
                            <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-xs text-warning">
                              <AlertTriangle
                                className="mt-0.5 h-4 w-4 shrink-0"
                                aria-hidden
                              />

                              <span>
                                {issue}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* LINE CONTROLS */}
                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <div>
                            <label
                              className="sr-only"
                              htmlFor={`qty-${lineId}`}
                            >
                              Quantity for{" "}
                              {
                                product.name
                              }
                              {variant
                                ? ` — ${variant.name}`
                                : ""}
                            </label>

                            <input
                              id={`qty-${lineId}`}
                              type="number"
                              min={1}
                              step={1}
                              inputMode="numeric"
                              value={
                                line.quantity
                              }
                              onChange={(
                                event,
                              ) => {
                                const nextQuantity =
                                  Number(
                                    event
                                      .target
                                      .value,
                                  );

                                if (
                                  !Number.isFinite(
                                    nextQuantity,
                                  ) ||
                                  nextQuantity <
                                    1
                                ) {
                                  return;
                                }

                                setCartQuantity(
                                  product.id,
                                  Math.floor(
                                    nextQuantity,
                                  ),
                                  line.variant_id,
                                );
                              }}
                              className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>

                          <span className="min-w-28 text-right font-medium">
                            {formatZar(
                              lineTotal,
                            )}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${product.name}${
                              variant
                                ? ` — ${variant.name}`
                                : ""
                            }`}
                            onClick={() =>
                              removeFromCart(
                                product.id,
                                line.variant_id,
                              )
                            }
                          >
                            <Trash2
                              className="h-4 w-4"
                              aria-hidden
                            />
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}

              {/* CART ACTIONS */}
              {!query.isPending ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      clearCart
                    }
                  >
                    Clear cart
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                  >
                    <Link to="/shop">
                      Continue shopping
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>

            {/* ------------------------------------------------------------ */}
            {/* ORDER SUMMARY                                                */}
            {/* ------------------------------------------------------------ */}

            <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-semibold">
                Order summary
              </h2>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Merchandise subtotal
                  </dt>

                  <dd className="font-medium">
                    {formatZar(
                      subtotal,
                    )}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Tax
                  </dt>

                  <dd className="max-w-[190px] text-right text-xs">
                    {allVatInclusive
                      ? "Included in listed prices where applicable"
                      : "Handled according to each product's applicable tax treatment"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Delivery
                  </dt>

                  <dd className="max-w-[190px] text-right text-xs">
                    Confirmed before payment
                  </dd>
                </div>

                <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
                  <dt>
                    Current subtotal
                  </dt>

                  <dd>
                    {formatZar(
                      subtotal,
                    )}
                  </dd>
                </div>
              </dl>

              {/* BLOCKED PRODUCTS */}
              {blockedLines.length >
              0 ? (
                <NoticeBlock
                  tone="pending"
                  title="Checkout requires attention"
                >
                  {blockedLines.length}{" "}
                  {blockedLines.length === 1
                    ? "item is"
                    : "items are"}{" "}
                  not currently eligible for direct checkout. Remove or resolve
                  those items, or use the quotation route where appropriate.
                </NoticeBlock>
              ) : null}

              {/* STALE PRODUCTS */}
              {unresolvedLines > 0 ? (
                <NoticeBlock
                  tone="pending"
                  title="Catalogue changed"
                >
                  Some saved items can no longer be verified against the current
                  public catalogue. Checkout remains disabled until the cart is
                  resolved.
                </NoticeBlock>
              ) : null}

              {/* QUERY FAILURE */}
              {query.isError ? (
                <NoticeBlock
                  tone="pending"
                  title="Catalogue verification unavailable"
                >
                  Checkout is temporarily disabled because Cossa Store could
                  not verify the current product information. Your cart remains
                  saved.
                </NoticeBlock>
              ) : null}

              {/* CHECKOUT */}
              {canCheckout ? (
                <Button
                  asChild
                  className="w-full"
                  size="lg"
                >
                  <Link to="/checkout">
                    Continue to checkout
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  disabled
                >
                  Checkout unavailable
                </Button>
              )}

              {/* QUOTATION */}
              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <Link to="/request-a-quote">
                  Request a quote instead
                </Link>
              </Button>

              {/* PAYMENT STATUS */}
              <NoticeBlock
                tone="pending"
                title="Online payments are not live yet"
              >
                Merchant verification and production payment integrations are
                still being completed. Cossa Store will only present payment
                methods as available once they are approved and operational.
              </NoticeBlock>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
