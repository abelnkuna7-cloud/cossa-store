import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { SITE_URL } from "@/config/seo";
import { SITE } from "@/config/site";

import { PageHeader } from "@/components/common/PageHeader";
import { GroupBadge } from "@/components/company/GroupBadge";
import {
  ErrorBlock,
  LoadingBlock,
  NoticeBlock,
} from "@/components/common/StateBlocks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  useCommerce,
  type CommerceQuoteLine,
} from "@/lib/commerce-store";

import { productsByIdsQuery } from "@/lib/queries";

import {
  submitQuoteRequest,
  type QuoteScope,
} from "@/services/quotes";

import type {
  Product,
  ProductVariantPublic,
  SubmissionState,
} from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* ROUTE METADATA                                                             */
/* -------------------------------------------------------------------------- */

const TITLE =
  "Request a quote | Cossa Store";

const DESCRIPTION =
  "Request a professional Cossa Store quotation for products, bulk purchasing, project requirements or combined product and specialist-service needs.";

export const Route =
  createFileRoute(
    "/request-a-quote",
  )({
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
          property: "og:type",
          content: "website",
        },

        {
          property: "og:site_name",
          content: SITE.name,
        },

        {
          property: "og:title",
          content: TITLE,
        },

        {
          property: "og:description",
          content: DESCRIPTION,
        },

        {
          property: "og:url",
          content: `${SITE_URL}/request-a-quote`,
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
          content: TITLE,
        },

        {
          name: "twitter:description",
          content: DESCRIPTION,
        },
      ],

      links: [
        {
          rel: "canonical",
          href: `${SITE_URL}/request-a-quote`,
        },
      ],
    }),

    component: QuotePage,
  });

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface ResolvedQuoteItem {
  line: CommerceQuoteLine;

  product: Product;

  variant:
    | ProductVariantPublic
    | null;

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
      (variant) =>
        variant.id === variantId,
    ) ?? null
  );
}

function resolveQuoteIssue(
  product: Product,
  line: CommerceQuoteLine,
  variant: ProductVariantPublic | null,
): string | null {
  if (product.is_demo) {
    return "Demo products cannot be submitted as real quotation items.";
  }

  if (product.status !== "active") {
    return "This product is no longer active.";
  }

  if (
    product.publication_state &&
    product.publication_state !==
      "published"
  ) {
    return "This product is no longer publicly available.";
  }

  if (
    product.visibility &&
    product.visibility !== "public"
  ) {
    return "This product is no longer publicly available.";
  }

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

  return null;
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function QuotePage() {
  const {
    quoteBasket,
    hydrated,
    removeFromQuote,
    clearQuote,
  } = useCommerce();

  const productIds =
    useMemo(
      () =>
        Array.from(
          new Set(
            quoteBasket.map(
              (line) =>
                line.product_id,
            ),
          ),
        ),
      [quoteBasket],
    );

  const productsQ =
    useQuery({
      ...productsByIdsQuery(
        productIds,
      ),

      enabled:
        hydrated &&
        productIds.length > 0,
    });

  const products =
    productsQ.data ?? [];

  const resolvedItems =
    useMemo<ResolvedQuoteItem[]>(
      () =>
        quoteBasket
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

            return {
              line,
              product,
              variant,

              issue:
                resolveQuoteIssue(
                  product,
                  line,
                  variant,
                ),
            };
          })
          .filter(
            (
              item,
            ): item is ResolvedQuoteItem =>
              item !== null,
          ),

      [
        quoteBasket,
        products,
      ],
    );

  const unresolvedCount =
    hydrated &&
    !productsQ.isPending
      ? quoteBasket.length -
        resolvedItems.length
      : 0;

  const invalidItems =
    resolvedItems.filter(
      (item) =>
        Boolean(item.issue),
    );

  const [state, setState] =
    useState<SubmissionState>(
      "idle",
    );

  const [
    reference,
    setReference,
  ] =
    useState<string | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(
      null,
    );

  /* ---------------------------------------------------------------------- */
  /* SUBMISSION                                                             */
  /* ---------------------------------------------------------------------- */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      state === "submitting"
    ) {
      return;
    }

    const form =
      new FormData(
        event.currentTarget,
      );

    const get = (
      key: string,
    ) =>
      String(
        form.get(key) ?? "",
      ).trim();

    const contactName =
      get("contact_name");

    const email =
      get("email");

    const phone =
      get("phone");

    const location =
      get("location");

    const requirements =
      get(
        "project_description",
      );

    if (
      !contactName ||
      !email ||
      !phone ||
      !location ||
      !requirements
    ) {
      setError(
        "Please complete all required fields.",
      );

      return;
    }

    if (
      invalidItems.length > 0
    ) {
      setError(
        "Please remove or resolve quotation items that are no longer valid before submitting.",
      );

      return;
    }

    if (
      unresolvedCount > 0
    ) {
      setError(
        "Some quotation items can no longer be matched to the current catalogue. Please remove them before submitting.",
      );

      return;
    }

    /**
     * Preserve product + variant + quantity.
     *
     * Do not collapse variants belonging to the same product.
     */
    const validItems =
      resolvedItems.map(
        ({ line }) => ({
          product_id:
            line.product_id,

          quantity:
            line.quantity,

          variant_id:
            line.variant_id,
        }),
      );

    setState(
      "submitting",
    );

    setError(null);

    try {
      const result =
        await submitQuoteRequest({
          contact_name:
            contactName,

          company:
            get("company") ||
            null,

          email,

          phone,

          location,

          scope:
            (get("scope") ||
              "products_only") as QuoteScope,

          requirements,

          items:
            validItems,
        });

      if (result.success) {
        setReference(
          result.referenceNumber,
        );

        setState(
          "pending",
        );

        clearQuote();

        return;
      }

      setState(
        "error",
      );

      setError(
        result.error,
      );
    } catch {
      setState(
        "error",
      );

      setError(
        "We could not submit your quotation request. Please try again or contact Cossa Store.",
      );
    }
  }

  /* ---------------------------------------------------------------------- */
  /* SUCCESS STATE                                                          */
  /* ---------------------------------------------------------------------- */

  if (
    state === "pending" &&
    reference
  ) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Cossa Store quotation
        </p>

        <h1 className="mt-2 font-display text-3xl font-semibold">
          Quote request received
        </h1>

        <p className="mt-3 text-muted-foreground">
          Your reference is{" "}
          <span className="font-medium text-foreground">
            {reference}
          </span>
          . Keep this reference for
          follow-up.
        </p>

        <div className="mt-6">
          <NoticeBlock
            tone="pending"
            title="Your requirement is being reviewed"
          >
            Cossa Store reviews the
            products, quantities,
            specifications, delivery
            requirements and any
            specialist support needed
            before issuing a formal
            quotation. We will contact
            you using the details you
            provided.
          </NoticeBlock>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/contact">
              Contact Cossa Store
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
          >
            <Link to="/shop">
              Back to shop
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* QUOTE FORM                                                             */
  /* ---------------------------------------------------------------------- */

  return (
    <div>
      <PageHeader
        eyebrow="Business & project buying"
        title="Request a quote"
        description={
          DESCRIPTION
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/*
         * Quote requests belong to Cossa Store as a whole.
         *
         * Specialist Cossa companies can support the enquiry after
         * qualification where Construction, Facility Services or
         * Technology expertise is appropriate.
         */}
        <GroupBadge className="mb-8" />

        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* -------------------------------------------------------------- */}
          {/* FORM                                                           */}
          {/* -------------------------------------------------------------- */}

          <form
            className="space-y-5"
            onSubmit={
              handleSubmit
            }
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                name="contact_name"
                label="Contact name"
                autoComplete="name"
                required
              />

              <Field
                name="company"
                label="Company (optional)"
                autoComplete="organization"
              />

              <Field
                name="email"
                label="Email address"
                type="email"
                autoComplete="email"
                required
              />

              <Field
                name="phone"
                label="Phone number"
                type="tel"
                autoComplete="tel"
                required
              />

              <Field
                name="location"
                label="Delivery / project location"
                autoComplete="address-level2"
                required
              />

              <div className="space-y-2">
                <Label htmlFor="scope">
                  Scope of requirement
                </Label>

                <select
                  id="scope"
                  name="scope"
                  defaultValue="products_only"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="products_only">
                    Products only
                  </option>

                  <option value="products_and_services">
                    Products and specialist
                    services
                  </option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_description">
                Project or requirement
                description
              </Label>

              <Textarea
                id="project_description"
                name="project_description"
                rows={7}
                required
                placeholder="Tell us what you need, including quantities, specifications, required dates, delivery or site details and any installation, cleaning, facility or technology support required."
              />
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-xs leading-relaxed text-muted-foreground">
              By submitting this form,
              you provide your details
              so Cossa Store can review
              and respond to your
              quotation request. Personal
              information is handled
              according to our{" "}
              <Link
                to="/privacy"
                className="font-medium text-foreground underline"
              >
                Privacy Policy
              </Link>
              .
            </div>

            {error ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={
                state ===
                "submitting"
              }
            >
              {state ===
              "submitting"
                ? "Submitting…"
                : "Submit quote request"}
            </Button>
          </form>

          {/* -------------------------------------------------------------- */}
          {/* QUOTE BASKET                                                   */}
          {/* -------------------------------------------------------------- */}

          <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-semibold">
              Items on this request
            </h2>

            {!hydrated ? (
              <LoadingBlock label="Loading quotation items…" />
            ) : null}

            {productsQ.isError ? (
              <ErrorBlock
                description="Quotation items could not be loaded."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      productsQ.refetch()
                    }
                  >
                    Try again
                  </Button>
                }
              />
            ) : null}

            {hydrated &&
            quoteBasket.length ===
              0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                No products have been
                added yet. You can still
                describe your requirement
                in the form, or add
                products from the{" "}
                <Link
                  to="/shop"
                  className="underline"
                >
                  catalogue
                </Link>
                .
              </p>
            ) : null}

            {unresolvedCount >
            0 ? (
              <NoticeBlock
                tone="pending"
                title="Some items changed"
              >
                {unresolvedCount} saved{" "}
                {unresolvedCount ===
                1
                  ? "item can"
                  : "items can"}{" "}
                no longer be matched to
                the current catalogue.
              </NoticeBlock>
            ) : null}

            {resolvedItems.length >
            0 ? (
              <ul className="space-y-4">
                {resolvedItems.map(
                  ({
                    line,
                    product,
                    variant,
                    issue,
                  }) => {
                    const key =
                      `${product.id}-${line.variant_id ?? "base"}`;

                    return (
                      <li
                        key={key}
                        className="border-b border-border pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              to="/product/$slug"
                              params={{
                                slug: product.slug,
                              }}
                              className="text-sm font-medium hover:underline"
                            >
                              {product.name}
                            </Link>

                            {variant ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                <p>
                                  {
                                    variant.name
                                  }
                                </p>

                                <div className="mt-0.5 flex flex-wrap gap-x-2">
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

                                  {variant.phone_model ? (
                                    <span>
                                      Model:{" "}
                                      {
                                        variant.phone_model
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
                                </div>
                              </div>
                            ) : null}

                            <p className="mt-1 text-xs text-muted-foreground">
                              Qty{" "}
                              {
                                line.quantity
                              }
                            </p>
                          </div>

                          <button
                            type="button"
                            className="shrink-0 text-xs text-muted-foreground underline"
                            onClick={() =>
                              removeFromQuote(
                                line.product_id,
                                line.variant_id,
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>

                        {issue ? (
                          <div className="mt-2 flex gap-2 rounded-md border border-warning/50 bg-warning/10 p-2 text-xs text-warning">
                            <AlertTriangle
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />

                            <span>
                              {issue}
                            </span>
                          </div>
                        ) : null}
                      </li>
                    );
                  },
                )}
              </ul>
            ) : null}

            <NoticeBlock
              tone="pending"
              title="Quotation review"
            >
              Product pricing,
              availability, delivery and
              specialist service
              requirements are verified
              before a formal quotation
              is issued.
            </NoticeBlock>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FIELD                                                                      */
/* -------------------------------------------------------------------------- */

function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
      </Label>

      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={
          autoComplete
        }
      />
    </div>
  );
}
