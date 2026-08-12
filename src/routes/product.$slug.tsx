import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Heart,
  Info,
  Package,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { ProductImage } from "@/components/shop/ProductImage";
import { FulfilmentDetails } from "@/components/shop/FulfilmentDetails";
import {
  FulfilmentBadge,
  StockBadge,
} from "@/components/shop/ProductMeta";
import { ServiceCrossSell } from "@/components/support/ServiceCrossSell";

import { subcategoryName } from "@/data/categories";
import { useCommerce } from "@/lib/commerce-store";
import { formatZar } from "@/lib/format";
import {
  productQuery,
  relatedProductsQuery,
} from "@/lib/queries";

import type {
  AvailabilityStatus,
  Product,
  VatStatus,
} from "@/types/catalog";

import { SITE_URL } from "@/config/seo";
import { SITE } from "@/config/site";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function absoluteUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return undefined;
  }
}

function schemaAvailability(product: Product): string {
  const availability =
    product.availability_status ??
    product.stock_status;

  switch (availability) {
    case "in_stock":
      return "https://schema.org/InStock";

    case "low_stock":
      return "https://schema.org/LimitedAvailability";

    case "out_of_stock":
      return "https://schema.org/OutOfStock";

    case "backorder":
      return "https://schema.org/BackOrder";

    case "made_to_order":
      return "https://schema.org/PreOrder";

    case "available_from_supplier":
    case "available_to_order":
      return "https://schema.org/LimitedAvailability";

    case "digital_available":
    case "service_available":
    case "partner_offer":
      return "https://schema.org/InStock";

    case "quote_required":
      return "https://schema.org/LimitedAvailability";

    case "coming_soon":
      return "https://schema.org/PreOrder";

    default:
      return "https://schema.org/LimitedAvailability";
  }
}

function vatLabel(status: VatStatus): string | null {
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

function availabilityLabel(product: Product): string {
  const status: AvailabilityStatus | undefined =
    product.availability_status;

  if (status) {
    switch (status) {
      case "in_stock":
        return "In stock";

      case "low_stock":
        return "Low stock";

      case "out_of_stock":
        return "Out of stock";

      case "backorder":
        return "Available on backorder";

      case "made_to_order":
        return "Made to order";

      case "available_from_supplier":
        return "Available from supplier";

      case "available_to_order":
        return "Available to order";

      case "digital_available":
        return "Digital product available";

      case "service_available":
        return "Service available";

      case "partner_offer":
        return "Available from partner";

      case "quote_required":
        return "Quotation required";

      case "coming_soon":
        return "Coming soon";
    }
  }

  switch (product.fulfilment_type) {
    case "local_supplier":
      return "Supplier fulfilled";

    case "local_dropshipping":
      return "Ships from local dropshipping supplier";

    case "international_dropshipping":
      return "International fulfilment";

    case "print_on_demand":
      return "Made to order";

    case "affiliate":
      return "Available from partner";

    case "digital":
      return "Digital product";

    case "service":
      return "Service available";

    case "quote_only":
      return "Quotation required";

    case "project_kit":
      return product.requires_quote
        ? "Project quotation required"
        : "Project kit available";

    case "cossa_stock":
    default:
      return product.stock_status === "out_of_stock"
        ? "Out of stock"
        : product.stock_status === "low_stock"
          ? "Low stock"
          : product.stock_status === "backorder"
            ? "Available on backorder"
            : "In stock";
  }
}

function fulfilmentTimingLabel(product: Product): string {
  switch (product.fulfilment_type) {
    case "digital":
      return "Access / delivery";

    case "affiliate":
      return "Partner fulfilment";

    case "service":
      return "Scheduling";

    case "quote_only":
      return "Fulfilment";

    default:
      return "Estimated delivery";
  }
}

function shouldShowPhysicalStockBadge(product: Product): boolean {
  return (
    product.fulfilment_type === "cossa_stock" ||
    product.fulfilment_type === "print_on_demand"
  );
}

function isPublicIndexableProduct(product: Product): boolean {
  if (product.is_demo) return false;

  if (product.status !== "active") return false;

  if (
    product.publication_state &&
    product.publication_state !== "published"
  ) {
    return false;
  }

  if (
    product.visibility &&
    product.visibility !== "public"
  ) {
    return false;
  }

  return true;
}

function buildProductStructuredData(product: Product, url: string) {
  const imageUrls = product.images
    .map((image) => absoluteUrl(image.url))
    .filter((value): value is string => Boolean(value));

  const breadcrumbId = `${url}#breadcrumb`;
  const productId = `${url}#product`;

  const isAffiliate = Boolean(product.affiliate);

  const hasDirectOffer =
    !isAffiliate &&
    !product.requires_quote &&
    product.price_display_mode !== "quote" &&
    product.selling_price > 0 &&
    product.variants.length === 0;

  const productNode: Record<string, unknown> = {
    "@type": "Product",
    "@id": productId,

    name: product.name,
    description:
      product.seo_description ||
      product.short_description ||
      product.full_description,

    sku: product.sku,
    url,

    image:
      imageUrls.length === 1
        ? imageUrls[0]
        : imageUrls.length > 1
          ? imageUrls
          : undefined,

    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,

    category: product.category,

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  /**
   * Only describe a direct Cossa Store commercial offer when:
   *
   * - Cossa Store is selling it directly;
   * - the price is known;
   * - it is not quote-only;
   * - it is not an affiliate redirect;
   * - variant pricing cannot make the single Offer price misleading.
   *
   * Variant/ProductGroup structured data will be added later once
   * variant commerce is fully connected end-to-end.
   */
  if (hasDirectOffer) {
    productNode.offers = {
      "@type": "Offer",

      url,

      price: product.selling_price,
      priceCurrency: SITE.currency,

      availability: schemaAvailability(product),

      seller: {
        "@id": SITE.structuredDataId,
      },

      itemCondition: "https://schema.org/NewCondition",
    };
  }

  return {
    "@context": "https://schema.org",

    "@graph": [
      productNode,

      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,

        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE.name,
            item: `${SITE_URL}/`,
          },

          {
            "@type": "ListItem",
            position: 2,
            name: "Shop",
            item: `${SITE_URL}/shop`,
          },

          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: url,
          },
        ],
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/product/$slug")({
  loader: async ({
    params,
    context,
  }): Promise<{ product: Product }> => {
    const product =
      await context.queryClient.ensureQueryData(
        productQuery(params.slug),
      );

    if (!product) {
      throw notFound();
    }

    return { product };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          {
            title: "Product unavailable | Cossa Store",
          },
          {
            name: "robots",
            content: "noindex, nofollow",
          },
        ],
      };
    }

    const product = loaderData.product;

    const url =
      `${SITE_URL}/product/${product.slug}`;

    const indexable =
      isPublicIndexableProduct(product);

    const image =
      absoluteUrl(product.images[0]?.url);

    const meta = [
      {
        title:
          product.seo_title ||
          `${product.name} | Cossa Store`,
      },

      {
        name: "description",
        content:
          product.seo_description ||
          product.short_description,
      },

      {
        property: "og:type",
        content: "product",
      },

      {
        property: "og:site_name",
        content: SITE.name,
      },

      {
        property: "og:title",
        content:
          product.seo_title ||
          `${product.name} | Cossa Store`,
      },

      {
        property: "og:description",
        content:
          product.seo_description ||
          product.short_description,
      },

      {
        property: "og:url",
        content: url,
      },

      {
        property: "og:locale",
        content: "en_ZA",
      },

      {
        name: "twitter:card",
        content: "summary_large_image",
      },

      {
        name: "twitter:title",
        content:
          product.seo_title ||
          `${product.name} | Cossa Store`,
      },

      {
        name: "twitter:description",
        content:
          product.seo_description ||
          product.short_description,
      },

      /**
       * Development/demo/private products remain directly viewable
       * when their URL is known, but must not be submitted as genuine
       * search inventory.
       */
      ...(!indexable
        ? [
            {
              name: "robots",
              content: "noindex, nofollow",
            },
          ]
        : []),

      ...(image
        ? [
            {
              property: "og:image",
              content: image,
            },
            {
              name: "twitter:image",
              content: image,
            },
          ]
        : []),
    ];

    return {
      meta,

      links: [
        {
          rel: "canonical",
          href: url,
        },
      ],

      /**
       * Never publish product commercial structured data for demo,
       * draft, hidden or otherwise non-indexable records.
       */
      scripts: indexable
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify(
                buildProductStructuredData(
                  product,
                  url,
                ),
              ),
            },
          ]
        : [],
    };
  },

  errorComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <ErrorBlock description="This product could not be loaded." />
    </div>
  ),

  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyBlock
        title="Product not found"
        description="This product is no longer listed or is not publicly available."
        action={
          <Button asChild>
            <Link to="/shop">
              Browse the catalogue
            </Link>
          </Button>
        }
      />
    </div>
  ),

  component: ProductPage,
});

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function ProductPage() {
  const { product } = Route.useLoaderData();

  return <ProductDetail product={product} />;
}

/* -------------------------------------------------------------------------- */
/* PRODUCT DETAIL                                                             */
/* -------------------------------------------------------------------------- */

function ProductDetail({
  product,
}: {
  product: Product;
}) {
  const [quantity, setQuantity] =
    useState(1);

  const [variantId, setVariantId] =
    useState<string | null>(
      product.variants[0]?.id ?? null,
    );

  const {
    addToCart,
    addToQuote,
    toggleWishlist,
    isWishlisted,
    hydrated,
  } = useCommerce();

  const related = useQuery(
    relatedProductsQuery(product),
  );

  const wishlisted =
    hydrated && isWishlisted(product.id);

  const selectedVariant =
    useMemo(
      () =>
        product.variants.find(
          (variant) =>
            variant.id === variantId,
        ) ?? null,
      [product.variants, variantId],
    );

  const affiliate =
    Boolean(product.affiliate);

  const isDemo =
    Boolean(product.is_demo);

  const currentlyUnavailable =
    product.availability_status ===
      "out_of_stock" ||
    product.availability_status ===
      "coming_soon" ||
    product.stock_status ===
      "out_of_stock";

  const displayedPrice =
    selectedVariant?.retail_price &&
    selectedVariant.retail_price > 0
      ? selectedVariant.retail_price
      : product.selling_price;

  const displayedCompareAt =
    selectedVariant?.compare_at_price &&
    selectedVariant.compare_at_price >
      displayedPrice
      ? selectedVariant.compare_at_price
      : product.compare_at_price &&
          product.compare_at_price >
            displayedPrice
        ? product.compare_at_price
        : null;

  const hasPrice =
    displayedPrice > 0 &&
    product.price_display_mode !==
      "quote" &&
    !product.requires_quote;

  const purchasable =
    !isDemo &&
    !affiliate &&
    !currentlyUnavailable &&
    !product.requires_quote &&
    hasPrice;

  const quoteable =
    !isDemo;

  const image =
    product.images[0];

  const taxLabel =
    vatLabel(product.vat_status);

  const productCategoryName =
    subcategoryName(
      product.category,
      product.subcategory,
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* BREADCRUMB */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-sm text-muted-foreground"
      >
        <Link
          to="/shop"
          className="hover:underline"
        >
          Shop
        </Link>

        <span
          className="px-2"
          aria-hidden
        >
          /
        </span>

        <Link
          to="/category/$slug"
          params={{
            slug: product.category,
          }}
          className="hover:underline"
        >
          {productCategoryName}
        </Link>

        <span
          className="px-2"
          aria-hidden
        >
          /
        </span>

        <span
          className="text-foreground"
          aria-current="page"
        >
          {product.name}
        </span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* MEDIA */}
        <div>
          <div className="relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-secondary">
            {image?.url ? (
              <ProductImage
                url={image.url}
                alt={image.alt}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center">
                <div>
                  <Package
                    className="mx-auto h-12 w-12 text-muted-foreground"
                    aria-hidden
                  />

                  <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                    Product image pending
                  </p>
                </div>
              </div>
            )}

            {isDemo ? (
              <span className="absolute left-0 top-4 bg-warning px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
                Demo product — not for sale
              </span>
            ) : null}
          </div>

          {product.images.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images
                .slice(0, 4)
                .map((img, index) => (
                  <div
                    key={`${img.url ?? "image"}-${index}`}
                    className="aspect-square overflow-hidden rounded border border-border"
                  >
                    <ProductImage
                      url={img.url}
                      alt={img.alt}
                      className="h-full w-full"
                    />
                  </div>
                ))}
            </div>
          ) : null}
        </div>

        {/* PRODUCT INFORMATION */}
        <div>
          {isDemo ? (
            <div className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-4 text-xs text-warning">
              <strong className="font-semibold uppercase tracking-wide">
                Demo product — not a live commercial offer.
              </strong>{" "}
              This placeholder demonstrates how this product type will
              appear in Cossa Store. Its stock, supplier, price and
              fulfilment information must not be treated as a real
              customer offer.
            </div>
          ) : null}

          {product.brand ? (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {product.brand}
            </p>
          ) : null}

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {product.short_description}
          </p>

          {/* PRICE */}
          {!hasPrice ? (
            <p className="mt-6 text-2xl font-semibold">
              {product.price_display_mode ===
              "free"
                ? "Free"
                : "Price on request"}
            </p>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-semibold">
                  {product.price_display_mode ===
                  "from"
                    ? `From ${formatZar(
                        displayedPrice,
                      )}`
                    : formatZar(
                        displayedPrice,
                      )}
                </span>

                {displayedCompareAt ? (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatZar(
                      displayedCompareAt,
                    )}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {taxLabel
                  ? `${taxLabel} · `
                  : ""}
                SKU {product.sku}
              </p>
            </>
          )}

          {/* AVAILABILITY / FULFILMENT */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {shouldShowPhysicalStockBadge(
              product,
            ) ? (
              <StockBadge
                status={
                  product.stock_status
                }
              />
            ) : (
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {availabilityLabel(
                  product,
                )}
              </span>
            )}

            <FulfilmentBadge
              type={
                product.fulfilment_type
              }
            />
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {fulfilmentTimingLabel(
                product,
              )}
              :
            </span>{" "}
            {product.estimated_delivery}
          </p>

          {/* AFFILIATE DISCLOSURE */}
          {product.affiliate ? (
            <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />

                <div className="text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Partner offer
                  </p>

                  <p className="mt-1">
                    {product.affiliate
                      .disclosure_text ??
                      `This product is offered by ${product.affiliate.partner_name}. If you continue to the partner website, their pricing, availability, checkout, delivery, returns and privacy terms apply.`}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* VARIANTS */}
          {product.variants.length > 0 ? (
            <div className="mt-6">
              <label
                htmlFor="variant"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Choose an option
              </label>

              <select
                id="variant"
                value={variantId ?? ""}
                onChange={(event) =>
                  setVariantId(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {product.variants.map(
                  (variant) => (
                    <option
                      key={variant.id}
                      value={variant.id}
                    >
                      {variant.name}
                      {variant.retail_price
                        ? ` — ${formatZar(
                            variant.retail_price,
                          )}`
                        : ""}
                    </option>
                  ),
                )}
              </select>

              {selectedVariant ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Selected:{" "}
                  {selectedVariant.name}
                  {selectedVariant.sku
                    ? ` · SKU ${selectedVariant.sku}`
                    : ""}
                </p>
              ) : null}

              {/*
               * IMPORTANT:
               *
               * The current commerce store does not yet persist variantId
               * when adding a line to cart/quote.
               *
               * The next file we will upgrade is commerce-store.ts so
               * real variant selection flows into cart, quote, checkout
               * and orders correctly.
               */}
            </div>
          ) : null}

          {/* ACTIONS */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!affiliate && !isDemo ? (
              <div className="flex items-center rounded-md border border-input">
                <button
                  type="button"
                  className="px-3 py-2 text-sm"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                    )
                  }
                >
                  −
                </button>

                <span
                  className="w-10 text-center text-sm"
                  aria-live="polite"
                >
                  {quantity}
                </span>

                <button
                  type="button"
                  className="px-3 py-2 text-sm"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantity(
                      (current) =>
                        current + 1,
                    )
                  }
                >
                  +
                </button>
              </div>
            ) : null}

            {isDemo ? (
              <Button
                size="lg"
                disabled
              >
                Demo — not for sale
              </Button>
            ) : product.affiliate ? (
              <Button
                asChild
                size="lg"
              >
                <a
                  href={
                    product.affiliate
                      .tracking_url
                  }
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                >
                  View at{" "}
                  {
                    product.affiliate
                      .partner_name
                  }
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button
                size="lg"
                disabled={!purchasable}
                onClick={() => {
                  addToCart(
                    product.id,
                    quantity,
                  );

                  toast.success(
                    (product.kit_items
                      ?.length ??
                      0) > 0
                      ? "Full kit added to cart"
                      : "Added to cart",
                    {
                      description:
                        product.name,
                    },
                  );
                }}
              >
                {purchasable
                  ? (product.kit_items
                      ?.length ??
                      0) > 0
                    ? "Add full kit to cart"
                    : "Add to cart"
                  : product.requires_quote
                    ? "Quote required"
                    : "Currently unavailable"}
              </Button>
            )}

            {quoteable ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  addToQuote(
                    product.id,
                    quantity,
                  );

                  toast.success(
                    "Added to your quote request",
                    {
                      description:
                        product.name,
                    },
                  );
                }}
              >
                Add to quote
              </Button>
            ) : null}

            <Button
              size="icon"
              variant="outline"
              aria-pressed={
                wishlisted
              }
              aria-label={
                wishlisted
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
              onClick={() =>
                toggleWishlist(
                  product.id,
                )
              }
            >
              <Heart
                className={
                  wishlisted
                    ? "h-4 w-4 fill-current text-accent"
                    : "h-4 w-4"
                }
              />
            </Button>
          </div>

          {/* PRODUCT INFORMATION */}
          <div className="mt-8 space-y-6 border-t border-border pt-6">
            {product.full_description ? (
              <section>
                <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
                  Description
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {
                    product.full_description
                  }
                </p>
              </section>
            ) : null}

            {product.features.length >
            0 ? (
              <section>
                <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
                  Features
                </h2>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {product.features.map(
                    (feature) => (
                      <li key={feature}>
                        {feature}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ) : null}

            {product.specifications
              .length > 0 ? (
              <section>
                <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
                  Specifications
                </h2>

                <dl className="mt-2 divide-y divide-border border-y border-border text-sm">
                  {product.specifications.map(
                    (spec) => (
                      <div
                        key={`${spec.label}-${spec.value}`}
                        className="flex justify-between gap-4 py-2"
                      >
                        <dt className="text-muted-foreground">
                          {spec.label}
                        </dt>

                        <dd className="text-right font-medium">
                          {spec.value}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              </section>
            ) : null}

            <section className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  Warranty:
                </span>{" "}
                {product.warranty ??
                  "No additional manufacturer warranty is currently listed for this product."}
              </p>

              <p className="mt-1">
                <span className="font-medium text-foreground">
                  Returns:
                </span>{" "}
                {
                  product.return_eligibility
                }{" "}
                <Link
                  to="/returns"
                  className="underline"
                >
                  Full returns policy
                </Link>
              </p>
            </section>

            <FulfilmentDetails
              product={product}
            />

            {/*
             * Preserve Cossa ecosystem cross-support.
             *
             * Construction / Facility / Tech recommendations should remain
             * contextual to the product/category rather than becoming a
             * generic corporate directory.
             */}
            <ServiceCrossSell
              categorySlug={
                product.category
              }
            />
          </div>
        </div>
      </div>

      {/* RELATED PRODUCTS */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Related products
        </h2>

        <div className="mt-6">
          {related.isPending ? (
            <LoadingBlock />
          ) : null}

          {related.isError ? (
            <ErrorBlock
              description="Related products could not be loaded."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    related.refetch()
                  }
                >
                  Try again
                </Button>
              }
            />
          ) : null}

          {related.data &&
          related.data.length > 0 ? (
            <ProductGrid
              products={related.data}
            />
          ) : null}

          {related.data &&
          related.data.length === 0 ? (
            <EmptyBlock title="No related products yet" />
          ) : null}
        </div>
      </section>
    </div>
  );
}
