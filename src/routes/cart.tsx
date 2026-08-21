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
       * Cart pages are customer-specific utility pages.
       *
       * They should remain crawlable enough for robots directives
       * to be read, but must not enter search results.
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
    variant.retail_price > 0
  ) {
    return variant.retail_price;
  }

  return product.selling_price;
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
    variantCompare > unitPrice
  ) {
    return variantCompare;
  }

  if (
    typeof product.compare_at_price === "number" &&
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
  if (product.is_demo) {
    return "Demo products cannot be purchased.";
  }

  if (product.status !== "active") {
    return "This product is no longer active.";
  }

  if (
    product.publication_state &&
    product.publication_state !== "published"
  ) {
    return "This product is no longer publicly available.";
  }

  if (
    product.visibility &&
    product.visibility !== "public"
  ) {
    return "This product is no longer publicly available.";
  }

  if (product.affiliate) {
    return "Partner offers must be purchased on the partner website.";
  }

  if (product.requires_quote) {
    return "This item requires a quotation instead of direct checkout.";
  }

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

  if (line.variant_id && !variant) {
    return "The selected product option is no longer available.";
  }

  if (variant && !variant.is_active) {
    return "The selected product option is no longer active.";
  }

  if (unitPrice <= 0) {
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
   * Fetch each product once even if multiple variants of the
   * same product exist in the cart.
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
    ...productsByIdsQuery(productIds),
    enabled:
      hydrated &&
      productIds.length > 0,
  });

  const products =
    query.data ?? [];

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
      [cart, products],
    );

  const unresolvedLines =
    hydrated &&
    !query.isPending &&
    cart.length -
      resolvedLines.length;

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

  const canCheckout =
    hydrated &&
    resolvedLines.length > 0 &&
    blockedLines.length === 0 &&
    unresolvedLines === 0;

  /**
   * VAT summary must not assume every line uses the same tax treatment.
   *
   * Until the catalogue has authoritative per-product VAT data,
   * the cart deliberately avoids calculating a blanket 15% VAT portion.
   */
  const allVatInclusive =
    resolvedLines.length > 0 &&
    resolvedLines.every(
      ({ product }) =>
        product.vat_status ===
        "vat_inclusive",
    );

  return (
    <div>
      <PageHeader
        eyebrow="Cart"
        title="Shopping cart"
        description={DESCRIPTION}
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

        {/* CART */}
        {hydrated &&
        cart.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* LINES */}
            <div className="space-y-4">
              {query.isPending ? (
                <LoadingBlock />
              ) : null}

              {query.isError ? (
                <ErrorBlock
                  description="Your cart products could not be loaded."
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
                  not be matched to the current public catalogue. They may have
                  been removed, unpublished or changed since being added.
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

                  const lineId =
                    `${product.id}-${line.variant_id ?? "base"}`;

                  return (
                    <article
                      key={lineId}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/product/$slug"
                            params={{
                              slug: product.slug,
                            }}
                            className="font-medium hover:underline"
                          >
                            {product.name}
                          </Link>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Product SKU{" "}
                            {product.sku}
                          </p>

                          {variant ? (
                            <div className="mt-2 rounded-md bg-secondary/50 px-3 py-2 text-xs">
                              <p className="font-medium text-foreground">
                                Selected option:{" "}
                                {variant.name}
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

                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <div>
                            <label
                              className="sr-only"
                              htmlFor={`qty-${lineId}`}
                            >
                              Quantity for{" "}
                              {product.name}
                              {variant
                                ? ` — ${variant.name}`
                                : ""}
                            </label>

                            <input
                              id={`qty-${lineId}`}
                              type="number"
                              min={1}
                              inputMode="numeric"
                              value={
                                line.quantity
                              }
                              onChange={(
                                event,
                              ) =>
                                setCartQuantity(
                                  product.id,
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                  line.variant_id,
                                )
                              }
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
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}

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
            </div>

            {/* ORDER SUMMARY */}
            <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-semibold">
                Order summary
              </h2>

              <dl className="space-y-2 text-sm">
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

                  <dd className="text-right">
                    {allVatInclusive
                      ? "Included where applicable"
                      : "Calculated according to applicable product tax treatment"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Delivery
                  </dt>

                  <dd className="text-right">
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

              {unresolvedLines > 0 ? (
                <NoticeBlock
                  tone="pending"
                  title="Catalogue changed"
                >
                  Some saved items can no longer be verified against the current
                  catalogue. Checkout remains disabled until the cart is
                  resolved.
                </NoticeBlock>
              ) : null}

              <Button
                asChild={
                  canCheckout
                }
                disabled={
                  !canCheckout
                }
                className="w-full"
                size="lg"
              >
                {canCheckout ? (
                  <a href="/checkout">
                    Continue to checkout
                  </a>
                ) : (
                  <span>
                    Checkout unavailable
                  </span>
                )}
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <Link to="/request-a-quote">
                  Request a quote instead
                </Link>
              </Button>

              <NoticeBlock
                tone="pending"
                title="Secure EFT checkout is available"
              >
                Card and instant-payment integrations are still being completed.
                Continue to checkout to create a secure EFT payment request with
                the exact amount and a unique reference, then upload your proof
                of payment for review. Digital access is released only after the
                payment is approved.
              </NoticeBlock>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}