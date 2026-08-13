import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  PackagePlus,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { LoadingBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { formatZar } from "@/lib/format";
import {
  formatBytes,
  optimiseImage,
  suggestAltText,
} from "@/lib/image-optimize";
import { uploadProductMedia } from "@/lib/media";
import { parsePastedProduct } from "@/lib/printify-paste";

import {
  addProductMedia,
  addProductPrice,
  createProduct,
  createVariant,
  deactivateVariant,
  fetchAdminProduct,
  isProductCodeTaken,
  isSlugTaken,
  isVariantSkuTaken,
  listAllCollections,
  listBrands,
  listCommerceCategories,
  listProductMedia,
  listProductPrices,
  listVariants,
  removeProductMedia,
  removeProductPrice,
  setPublicationState,
  updateProduct,
  updateProductMediaAlt,
  upsertPodDetails,
  type PodProvider,
  type ProductDraftInput,
} from "@/services/catalogue.admin";

import type { PublicationState } from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type ProductEditorMode = "create" | "edit";

type CatalogueEntryType =
  | "cossa_stocked_product"
  | "local_supplier_product"
  | "dropshipping_product"
  | "print_on_demand_product"
  | "affiliate_partner_offer"
  | "digital_product"
  | "service_supported_product"
  | "quote_only_product"
  | "project_kit";

interface EntryDefinition {
  value: CatalogueEntryType;
  label: string;
  description: string;
  sourcingModel: ProductDraftInput["sourcing_model"];
  productType: ProductDraftInput["product_type"];
  requiresShipping: boolean;
  requiresQuote: boolean;
  sourcingEnabled: boolean;
}

interface ProductEditorProps {
  productId?: string;
  mode?: ProductEditorMode;
}

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

const POD_PROVIDERS: PodProvider[] = [
  "printify",
  "gelato",
  "printful",
  "other",
];

const ENTRY_TYPES: EntryDefinition[] = [
  {
    value: "cossa_stocked_product",
    label: "Cossa stocked product",
    description:
      "A physical product held as Cossa-owned inventory and sold directly through the Store.",
    sourcingModel: "own_stock",
    productType: "physical",
    requiresShipping: true,
    requiresQuote: false,
    sourcingEnabled: false,
  },
  {
    value: "local_supplier_product",
    label: "Local supplier / white-label product",
    description:
      "A physical item supplied by an approved local supplier or white-label partner.",
    sourcingModel: "local_supplier",
    productType: "physical",
    requiresShipping: true,
    requiresQuote: false,
    sourcingEnabled: true,
  },
  {
    value: "dropshipping_product",
    label: "Dropshipping product",
    description:
      "A product sold through Cossa Store and fulfilled by a dropshipping supplier.",
    sourcingModel: "local_dropshipping",
    productType: "physical",
    requiresShipping: true,
    requiresQuote: false,
    sourcingEnabled: true,
  },
  {
    value: "print_on_demand_product",
    label: "Print-on-demand product",
    description:
      "Apparel, mugs, cases, accessories and other products produced after the customer orders.",
    sourcingModel: "print_on_demand",
    productType: "physical",
    requiresShipping: true,
    requiresQuote: false,
    sourcingEnabled: true,
  },
  {
    value: "affiliate_partner_offer",
    label: "Affiliate / partner offer",
    description:
      "A partner product discovered through Cossa Store but purchased on the partner website.",
    sourcingModel: "affiliate",
    productType: "affiliate",
    requiresShipping: false,
    requiresQuote: false,
    sourcingEnabled: true,
  },
  {
    value: "digital_product",
    label: "Digital product",
    description:
      "Downloads, templates, guides, digital tools, files or other electronically delivered products.",
    sourcingModel: "digital",
    productType: "digital",
    requiresShipping: false,
    requiresQuote: false,
    sourcingEnabled: false,
  },
  {
    value: "service_supported_product",
    label: "Service-supported product",
    description:
      "A product that may also require installation, setup, cleaning, construction or technical support.",
    sourcingModel: "service",
    productType: "service",
    requiresShipping: false,
    requiresQuote: true,
    sourcingEnabled: false,
  },
  {
    value: "quote_only_product",
    label: "Quote-only product",
    description:
      "A product or requirement where price must be confirmed before the customer can order.",
    sourcingModel: "local_supplier",
    productType: "physical",
    requiresShipping: true,
    requiresQuote: true,
    sourcingEnabled: true,
  },
  {
    value: "project_kit",
    label: "Project kit / bundle",
    description:
      "A grouped solution containing products or requirements for a complete customer project.",
    sourcingModel: "local_supplier",
    productType: "bundle",
    requiresShipping: true,
    requiresQuote: true,
    sourcingEnabled: true,
  },
];

const SOURCING_OPTIONS = [
  {
    value: "own_stock",
    label: "Cossa-owned stock",
  },
  {
    value: "local_supplier",
    label: "Local supplier",
  },
  {
    value: "local_dropshipping",
    label: "Local dropshipping",
  },
  {
    value: "international_dropshipping",
    label: "International dropshipping",
  },
  {
    value: "print_on_demand",
    label: "Print on demand",
  },
  {
    value: "affiliate",
    label: "Affiliate / partner",
  },
  {
    value: "digital",
    label: "Digital delivery",
  },
  {
    value: "service",
    label: "Service",
  },
] as const;

const PRODUCT_TYPES = [
  {
    value: "physical",
    label: "Physical product",
  },
  {
    value: "digital",
    label: "Digital product",
  },
  {
    value: "service",
    label: "Service",
  },
  {
    value: "bundle",
    label: "Bundle / project kit",
  },
  {
    value: "affiliate",
    label: "Affiliate offer",
  },
] as const;

const VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "Public storefront",
  },
  {
    value: "business_only",
    label: "Business customers only",
  },
  {
    value: "hidden",
    label: "Hidden",
  },
] as const;

const EMPTY: ProductDraftInput = {
  name: "",
  sku: "",
  slug: "",
  short_description: "",
  full_description: "",
  category_id: null,
  brand_id: null,
  collection_id: null,
  item_type: "",
  sourcing_model: "own_stock",
  product_type: "physical",
  visibility: "public",
  is_featured: false,
  requires_shipping: true,
  requires_quote: false,
  is_customisable: false,
  sourcing_enabled: false,
  campaign_name: null,
  design_name: null,
  slogan: null,
  product_story: null,
  audience: null,
  tags: [],
  features: [],
  care_instructions: null,
  warranty: null,
  return_policy: null,
  seo_title: null,
  seo_description: null,
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function cleanSku(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "");
}

function commaList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function deriveEntryType(
  product: ProductDraftInput,
): CatalogueEntryType {
  if (
    product.product_type === "affiliate" ||
    product.sourcing_model === "affiliate"
  ) {
    return "affiliate_partner_offer";
  }

  if (
    product.product_type === "digital" ||
    product.sourcing_model === "digital"
  ) {
    return "digital_product";
  }

  if (product.product_type === "bundle") {
    return "project_kit";
  }

  if (
    product.sourcing_model ===
    "print_on_demand"
  ) {
    return "print_on_demand_product";
  }

  if (
    product.sourcing_model ===
      "local_dropshipping" ||
    product.sourcing_model ===
      "international_dropshipping"
  ) {
    return "dropshipping_product";
  }

  if (
    product.requires_quote &&
    product.product_type === "physical"
  ) {
    return "quote_only_product";
  }

  if (
    product.product_type === "service" ||
    product.sourcing_model === "service"
  ) {
    return "service_supported_product";
  }

  if (
    product.sourcing_model ===
    "local_supplier"
  ) {
    return "local_supplier_product";
  }

  return "cossa_stocked_product";
}

/* -------------------------------------------------------------------------- */
/* UI BUILDING BLOCKS                                                         */
/* -------------------------------------------------------------------------- */

function Section({
  number,
  title,
  description,
  children,
  defaultOpen = true,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] =
    useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5"
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
        aria-expanded={open}
      >
        <div className="flex min-w-0 gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {number}
          </span>

          <div className="min-w-0">
            <h2 className="font-semibold text-foreground">
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {open ? (
          <ChevronUp
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        ) : (
          <ChevronDown
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
      </button>

      {open ? (
        <div className="space-y-5 border-t border-border p-4 sm:p-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}

        {required ? (
          <span className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </Label>

      {children}

      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-border p-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {label}
        </span>

        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>

      <Switch
        checked={value}
        onCheckedChange={onChange}
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* PRODUCT EDITOR                                                             */
/* -------------------------------------------------------------------------- */

export function ProductEditor({
  productId,
  mode,
}: ProductEditorProps) {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const access =
    useCatalogueAccess();

  const resolvedMode: ProductEditorMode =
    mode ??
    (productId
      ? "edit"
      : "create");

  const [form, setForm] =
    useState<ProductDraftInput>(
      EMPTY,
    );

  const [
    entryType,
    setEntryType,
  ] =
    useState<CatalogueEntryType>(
      "cossa_stocked_product",
    );

  const [
    publicationState,
    setPublicationStateLocal,
  ] =
    useState<PublicationState>(
      "draft",
    );

  const [saving, setSaving] =
    useState(false);

  const [
    slugEdited,
    setSlugEdited,
  ] =
    useState(false);

  const existing = useQuery({
    queryKey: [
      "admin",
      "product",
      productId,
    ],
    enabled: Boolean(productId),
    queryFn: () =>
      fetchAdminProduct(
        productId as string,
      ),
  });

  const categories = useQuery({
    queryKey: [
      "admin",
      "categories",
    ],
    queryFn:
      listCommerceCategories,
  });

  const brands = useQuery({
    queryKey: [
      "admin",
      "brands",
    ],
    queryFn: listBrands,
  });

  const collections = useQuery({
    queryKey: [
      "admin",
      "collections",
    ],
    queryFn:
      listAllCollections,
  });

  useEffect(() => {
    const row =
      existing.data as
        | Record<
            string,
            unknown
          >
        | null
        | undefined;

    if (!row) {
      return;
    }

    const next = {
      ...EMPTY,
      ...(Object.fromEntries(
        Object.keys(EMPTY).map(
          (key) => [
            key,
            row[key] ??
              EMPTY[
                key as keyof ProductDraftInput
              ],
          ],
        ),
      ) as unknown as ProductDraftInput),
    };

    setForm(next);

    setEntryType(
      deriveEntryType(next),
    );

    setPublicationStateLocal(
      (row.publication_state as PublicationState) ??
        "draft",
    );

    setSlugEdited(true);
  }, [existing.data]);

  const set = <
    K extends keyof ProductDraftInput,
  >(
    key: K,
    value: ProductDraftInput[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  function selectEntryType(
    value: CatalogueEntryType,
  ) {
    const definition =
      ENTRY_TYPES.find(
        (item) =>
          item.value === value,
      );

    if (!definition) {
      return;
    }

    setEntryType(value);

    setForm((previous) => ({
      ...previous,
      sourcing_model:
        definition.sourcingModel,
      product_type:
        definition.productType,
      requires_shipping:
        definition.requiresShipping,
      requires_quote:
        definition.requiresQuote,
      sourcing_enabled:
        definition.sourcingEnabled,
    }));
  }

  function updateName(
    value: string,
  ) {
    set("name", value);

    if (
      !slugEdited ||
      !form.slug
    ) {
      set(
        "slug",
        slugify(value),
      );
    }
  }

  async function validate(): Promise<
    string | null
  > {
    if (!form.name.trim()) {
      return "A product name is required.";
    }

    if (!form.sku.trim()) {
      return "A product code is required.";
    }

    if (!form.slug.trim()) {
      return "A product URL slug is required.";
    }

    if (!form.item_type.trim()) {
      return "An item type is required.";
    }

    if (
      !form.short_description.trim()
    ) {
      return "A short description is required.";
    }

    if (!form.category_id) {
      return "Choose a Store department/category.";
    }

    if (
      await isProductCodeTaken(
        form.sku.trim(),
        productId,
      )
    ) {
      return "That product code is already used.";
    }

    if (
      await isSlugTaken(
        form.slug.trim(),
        productId,
      )
    ) {
      return "That product URL is already used.";
    }

    return null;
  }

  async function save() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const problem =
        await validate();

      if (problem) {
        toast.error(problem);
        return;
      }

      const payload: ProductDraftInput =
        {
          ...form,
          name:
            form.name.trim(),
          sku:
            cleanSku(
              form.sku.trim(),
            ),
          slug:
            slugify(
              form.slug,
            ),
          item_type:
            form.item_type.trim(),
          short_description:
            form.short_description.trim(),
          full_description:
            form.full_description.trim(),
          tags:
            Array.from(
              new Set(
                form.tags.filter(
                  Boolean,
                ),
              ),
            ),
          features:
            Array.from(
              new Set(
                form.features.filter(
                  Boolean,
                ),
              ),
            ),
        };

      if (productId) {
        await updateProduct(
          productId,
          payload,
        );

        toast.success(
          "Product saved",
        );

        await queryClient.invalidateQueries(
          {
            queryKey: [
              "admin",
            ],
          },
        );

        await queryClient.invalidateQueries(
          {
            queryKey: [
              "products",
            ],
          },
        );

        return;
      }

      const id =
        await createProduct(
          payload,
        );

      toast.success(
        "Draft created",
        {
          description:
            "You can now add images, variants, pricing and fulfilment details.",
        },
      );

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "admin",
          ],
        },
      );

      navigate({
        to: "/admin/catalogue/$id",
        params: {
          id,
        },
      });
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : undefined;

      toast.error(
        "The product could not be saved.",
        {
          description,
        },
      );
    } finally {
      setSaving(false);
    }
  }

  async function transition(
    next: PublicationState,
  ) {
    if (!productId) {
      toast.error(
        "Save the product first.",
      );
      return;
    }

    try {
      await setPublicationState(
        productId,
        next,
      );

      setPublicationStateLocal(
        next,
      );

      toast.success(
        `Product ${next.replace(
          /_/g,
          " ",
        )}`,
      );

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "admin",
          ],
        },
      );

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "products",
          ],
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "";

      toast.error(
        "Could not change the publication status.",
        {
          description:
            /required|administrator|permission/i.test(
              message,
            )
              ? message
              : "Check the publication requirements and your permissions.",
        },
      );
    }
  }

  const selectedEntry =
    ENTRY_TYPES.find(
      (item) =>
        item.value ===
        entryType,
    );

  const isPod =
    form.sourcing_model ===
    "print_on_demand";

  const isDigital =
    form.product_type ===
      "digital" ||
    form.sourcing_model ===
      "digital";

  const isAffiliate =
    form.product_type ===
      "affiliate" ||
    form.sourcing_model ===
      "affiliate";

  const isService =
    form.product_type ===
      "service" ||
    form.sourcing_model ===
      "service";

  if (
    productId &&
    existing.isPending
  ) {
    return (
      <LoadingBlock label="Loading product…" />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-28 sm:space-y-6">
      {/* STATUS / PURPOSE */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Cossa Catalogue Manager
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              {resolvedMode ===
              "create"
                ? "Add product without coding"
                : "Manage product"}
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Capture the commercial
              information here. New
              products remain drafts
              until the review and
              publication workflow is
              completed.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-primary" />

            <span className="capitalize">
              {publicationState.replace(
                /_/g,
                " ",
              )}
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1 */}
      <Section
        number={1}
        title="What are you adding?"
        description="Choose the closest commercial model. We will configure the important fulfilment defaults automatically."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ENTRY_TYPES.map(
            (entry) => {
              const selected =
                entryType ===
                entry.value;

              return (
                <button
                  key={
                    entry.value
                  }
                  type="button"
                  onClick={() =>
                    selectEntryType(
                      entry.value,
                    )
                  }
                  className={[
                    "rounded-xl border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold">
                      {
                        entry.label
                      }
                    </span>

                    {selected ? (
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {
                      entry.description
                    }
                  </p>
                </button>
              );
            },
          )}
        </div>

        {selectedEntry ? (
          <div className="flex gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-xs">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />

            <p className="leading-relaxed text-muted-foreground">
              <strong className="text-foreground">
                Current model:
              </strong>{" "}
              {
                selectedEntry.label
              }
              . You can still adjust
              fulfilment manually in
              Step 4.
            </p>
          </div>
        ) : null}
      </Section>

      {/* OPTIONAL PASTE */}
      <PasteHelper
        onApply={(
          details,
        ) => {
          setForm(
            (previous) => {
              const nextName =
                details.title ??
                previous.name;

              return {
                ...previous,
                name:
                  nextName,
                slug:
                  previous.slug ||
                  slugify(
                    nextName,
                  ),
                full_description:
                  details.description ??
                  previous.full_description,
                features:
                  details.features
                    ?.length
                    ? details.features
                    : previous.features,
                care_instructions:
                  details.care_instructions ??
                  previous.care_instructions,
              };
            },
          );

          toast.success(
            "Suggested product details applied.",
            {
              description:
                "Review everything before saving.",
            },
          );
        }}
      />

      {/* STEP 2 */}
      <Section
        number={2}
        title="Product details"
        description="The basic customer-facing identity of this product."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Product name"
            required
          >
            <Input
              value={form.name}
              onChange={(event) =>
                updateName(
                  event.target
                    .value,
                )
              }
              placeholder="Example: 20V Cordless Drill Kit"
            />
          </Field>

          <Field
            label="Product code / SKU"
            required
            hint="Internal unique code. Example: COS-DRILL-001."
          >
            <Input
              value={form.sku}
              onChange={(event) =>
                set(
                  "sku",
                  cleanSku(
                    event.target
                      .value,
                  ),
                )
              }
              placeholder="COS-DRILL-001"
            />
          </Field>

          <Field
            label="URL slug"
            required
            hint="Automatically generated from the product name. You can edit it when necessary."
          >
            <Input
              value={form.slug}
              onChange={(event) => {
                setSlugEdited(
                  true,
                );

                set(
                  "slug",
                  slugify(
                    event.target
                      .value,
                  ),
                );
              }}
              placeholder="20v-cordless-drill-kit"
            />
          </Field>

          <Field
            label="Item type"
            required
            hint="Examples: laptop, phone, dress, drill, mug, cleaning chemical, template."
          >
            <Input
              value={
                form.item_type
              }
              onChange={(event) =>
                set(
                  "item_type",
                  event.target
                    .value,
                )
              }
              placeholder="Example: laptop"
            />
          </Field>
        </div>

        <Field
          label="Short description"
          required
          hint="The quick selling description shown in product listings."
        >
          <Textarea
            rows={3}
            value={
              form.short_description
            }
            onChange={(event) =>
              set(
                "short_description",
                event.target
                  .value,
              )
            }
            placeholder="Describe the product clearly in one or two sentences."
          />
        </Field>

        <Field label="Full description">
          <Textarea
            rows={6}
            value={
              form.full_description
            }
            onChange={(event) =>
              set(
                "full_description",
                event.target
                  .value,
              )
            }
            placeholder="Features, benefits, usage, important details and customer information."
          />
        </Field>
      </Section>

      {/* STEP 3 */}
      <Section
        number={3}
        title="Department and classification"
        description="Place the item in the correct Cossa Store department so customers can discover it through navigation and search."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Store department / category"
            required
          >
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={
                form.category_id ??
                ""
              }
              onChange={(event) =>
                set(
                  "category_id",
                  event.target
                    .value ||
                    null,
                )
              }
            >
              <option value="">
                Select department
              </option>

              {(
                categories.data ??
                []
              ).map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Brand">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={
                form.brand_id ??
                ""
              }
              onChange={(event) =>
                set(
                  "brand_id",
                  event.target
                    .value ||
                    null,
                )
              }
            >
              <option value="">
                No brand selected
              </option>

              {(
                brands.data ??
                []
              ).map(
                (brand) => (
                  <option
                    key={
                      brand.id
                    }
                    value={
                      brand.id
                    }
                  >
                    {
                      brand.name
                    }
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Collection">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={
                form.collection_id ??
                ""
              }
              onChange={(event) =>
                set(
                  "collection_id",
                  event.target
                    .value ||
                    null,
                )
              }
            >
              <option value="">
                No collection
              </option>

              {(
                collections.data ??
                []
              ).map(
                (collection) => (
                  <option
                    key={
                      collection.id
                    }
                    value={
                      collection.id
                    }
                  >
                    {
                      collection.name
                    }
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field
            label="Audience"
            hint="Examples: women, men, kids, home, business, contractors."
          >
            <Input
              value={
                form.audience ??
                ""
              }
              onChange={(event) =>
                set(
                  "audience",
                  event.target
                    .value ||
                    null,
                )
              }
              placeholder="Example: business, contractors"
            />
          </Field>
        </div>
      </Section>

      {/* STEP 4 */}
      <Section
        number={4}
        title="Selling and fulfilment"
        description="Control how this product is supplied, who can see it and whether Cossa can sell it directly."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Product type">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={
                form.product_type
              }
              onChange={(event) =>
                set(
                  "product_type",
                  event.target
                    .value as ProductDraftInput["product_type"],
                )
              }
            >
              {PRODUCT_TYPES.map(
                (type) => (
                  <option
                    key={
                      type.value
                    }
                    value={
                      type.value
                    }
                  >
                    {
                      type.label
                    }
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Fulfilment model">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={
                form.sourcing_model
              }
              onChange={(event) =>
                set(
                  "sourcing_model",
                  event.target
                    .value as ProductDraftInput["sourcing_model"],
                )
              }
            >
              {SOURCING_OPTIONS.map(
                (model) => (
                  <option
                    key={
                      model.value
                    }
                    value={
                      model.value
                    }
                  >
                    {
                      model.label
                    }
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Visibility">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={
                form.visibility
              }
              onChange={(event) =>
                set(
                  "visibility",
                  event.target
                    .value as ProductDraftInput["visibility"],
                )
              }
            >
              {VISIBILITY_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Toggle
            label="Requires shipping"
            description={
              isDigital ||
              isService ||
              isAffiliate
                ? "Normally disabled for this product model."
                : "Customer order requires physical delivery."
            }
            value={
              form.requires_shipping
            }
            onChange={(value) =>
              set(
                "requires_shipping",
                value,
              )
            }
          />

          <Toggle
            label="Quotation required"
            description="Customer cannot complete normal fixed-price checkout."
            value={
              form.requires_quote
            }
            onChange={(value) =>
              set(
                "requires_quote",
                value,
              )
            }
          />

          <Toggle
            label="Customisable"
            description="Useful for personalised, branded and configurable products."
            value={
              form.is_customisable
            }
            onChange={(value) =>
              set(
                "is_customisable",
                value,
              )
            }
          />

          <Toggle
            label="External sourcing enabled"
            description="Cossa may need to source this product from a supplier or provider."
            value={
              form.sourcing_enabled
            }
            onChange={(value) =>
              set(
                "sourcing_enabled",
                value,
              )
            }
          />

          <Toggle
            label="Featured product"
            description="Eligible for featured Store merchandising."
            value={
              form.is_featured
            }
            onChange={(value) =>
              set(
                "is_featured",
                value,
              )
            }
          />
        </div>
      </Section>

      {/* INITIAL SAVE */}
      <div className="sticky bottom-3 z-20 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {productId
              ? "Save changes before publishing."
              : "Create the draft first. Images, variants and pricing become available immediately afterwards."}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            {productId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/admin/catalogue",
                  })
                }
              >
                Back to catalogue
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={() =>
                void save()
              }
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />

              {saving
                ? "Saving…"
                : productId
                  ? "Save product"
                  : "Create draft"}
            </Button>
          </div>
        </div>
      </div>

      {productId ? (
        <>
          {/* STEP 5 */}
          <MediaSection
            productId={
              productId
            }
            productName={
              form.name
            }
            itemType={
              form.item_type
            }
          />

          {/* STEP 6 */}
          <VariantSection
            productId={
              productId
            }
            isAdmin={
              access.isAdmin
            }
            podProduct={
              isPod
            }
          />

          {/* STEP 7 */}
          <PricingSection
            productId={
              productId
            }
            quoteOnly={
              form.requires_quote
            }
          />

          {/* STEP 8 — SOURCING / PARTNERS / FULFILMENT */}
          {isPod ? (
            <PodSection
              productId={
                productId
              }
            />
          ) : (
            <Section
              number={8}
              title="Sourcing and fulfilment"
              description={
                isAffiliate
                  ? "This affiliate product is fulfilled by an external partner."
                  : "Review how this product is sourced and fulfilled."
              }
              defaultOpen={false}
            >
              <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm">
                <p className="font-medium">
                  {isAffiliate
                    ? "Affiliate / partner fulfilment"
                    : form.sourcing_enabled
                      ? "External sourcing enabled"
                      : "No external sourcing required"}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This product is
                  currently configured
                  as{" "}
                  <strong className="text-foreground">
                    {form.sourcing_model.replace(
                      /_/g,
                      " ",
                    )}
                  </strong>
                  .

                  {form.sourcing_enabled
                    ? " Supplier and fulfilment details can be expanded in a dedicated sourcing workflow without affecting storefront publication."
                    : " You can change the fulfilment model in Step 4 if the commercial arrangement changes."}
                </p>
              </div>
            </Section>
          )}

          {/* STEP 9 */}
          <Section
            number={9}
            title="Merchandising, content and SEO"
            description="Optional enhancements that improve product discovery, campaigns and customer understanding."
            defaultOpen={false}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Toggle
                label="Trending"
                description="Manual merchandising selection. Do not use this as a fake sales claim."
                value={
                  form.tags.includes(
                    "trending",
                  )
                }
                onChange={(
                  value,
                ) =>
                  set(
                    "tags",
                    value
                      ? Array.from(
                          new Set([
                            ...form.tags,
                            "trending",
                          ]),
                        )
                      : form.tags.filter(
                          (
                            tag,
                          ) =>
                            tag !==
                            "trending",
                        ),
                  )
                }
              />

              <Toggle
                label="Business buying deal"
                value={
                  form.tags.includes(
                    "business-deal",
                  )
                }
                onChange={(
                  value,
                ) =>
                  set(
                    "tags",
                    value
                      ? Array.from(
                          new Set([
                            ...form.tags,
                            "business-deal",
                          ]),
                        )
                      : form.tags.filter(
                          (
                            tag,
                          ) =>
                            tag !==
                            "business-deal",
                        ),
                  )
                }
              />
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              New-arrival status
              should continue to be
              derived from the real
              publication date rather
              than manually invented.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Campaign name">
                <Input
                  value={
                    form.campaign_name ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "campaign_name",
                      event.target
                        .value ||
                        null,
                    )
                  }
                />
              </Field>

              <Field label="Design name">
                <Input
                  value={
                    form.design_name ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "design_name",
                      event.target
                        .value ||
                        null,
                    )
                  }
                />
              </Field>

              <Field label="Slogan">
                <Input
                  value={
                    form.slogan ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "slogan",
                      event.target
                        .value ||
                        null,
                    )
                  }
                />
              </Field>

              <Field
                label="Tags"
                hint="Comma separated."
              >
                <Input
                  value={
                    form.tags.join(
                      ", ",
                    )
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "tags",
                      commaList(
                        event.target
                          .value,
                      ),
                    )
                  }
                />
              </Field>

              <Field
                label="Features"
                hint="Comma separated."
              >
                <Input
                  value={
                    form.features.join(
                      ", ",
                    )
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "features",
                      commaList(
                        event.target
                          .value,
                      ),
                    )
                  }
                />
              </Field>

              <Field label="SEO title">
                <Input
                  value={
                    form.seo_title ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "seo_title",
                      event.target
                        .value ||
                        null,
                    )
                  }
                />
              </Field>
            </div>

            <Field label="SEO description">
              <Textarea
                rows={3}
                value={
                  form.seo_description ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  set(
                    "seo_description",
                    event.target
                      .value ||
                      null,
                  )
                }
              />
            </Field>

            <Field label="Product story">
              <Textarea
                rows={4}
                value={
                  form.product_story ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  set(
                    "product_story",
                    event.target
                      .value ||
                      null,
                  )
                }
              />
            </Field>

            <Field label="Care instructions">
              <Textarea
                rows={3}
                value={
                  form.care_instructions ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  set(
                    "care_instructions",
                    event.target
                      .value ||
                      null,
                  )
                }
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Warranty">
                <Textarea
                  rows={3}
                  value={
                    form.warranty ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "warranty",
                      event.target
                        .value ||
                        null,
                    )
                  }
                />
              </Field>

              <Field label="Return policy">
                <Textarea
                  rows={3}
                  value={
                    form.return_policy ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      "return_policy",
                      event.target
                        .value ||
                        null,
                    )
                  }
                />
              </Field>
            </div>
          </Section>

          {/* STEP 10 */}
          <Section
            number={10}
            title="Review and publication"
            description="Products remain controlled by the Cossa review workflow. Suppliers or staff should submit; administrators control final publication."
          >
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-sm">
                Current status:{" "}
                <strong className="capitalize">
                  {publicationState.replace(
                    /_/g,
                    " ",
                  )}
                </strong>
              </p>

              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
                <li>
                  Product name,
                  product code, URL
                  slug, item type,
                  category and short
                  description are
                  required.
                </li>

                <li>
                  At least one useful
                  public product image
                  should be supplied
                  before publication.
                </li>

                <li>
                  Variant products
                  should have active
                  variants.
                </li>

                <li>
                  Fixed-price products
                  require valid customer
                  pricing.
                </li>

                <li>
                  Quote-only items may
                  remain without a
                  fixed retail price.
                </li>

                <li>
                  Final approval,
                  publishing,
                  unpublishing and
                  archiving remain
                  administrator
                  controls.
                </li>
              </ul>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void transition(
                    "pending_review",
                  )
                }
              >
                Submit for review
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={
                  !access.isAdmin
                }
                onClick={() =>
                  void transition(
                    "approved",
                  )
                }
              >
                Approve
              </Button>

              <Button
                type="button"
                disabled={
                  !access.isAdmin
                }
                onClick={() =>
                  void transition(
                    "published",
                  )
                }
              >
                Publish
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={
                  !access.isAdmin
                }
                onClick={() =>
                  void transition(
                    "unpublished",
                  )
                }
              >
                Unpublish
              </Button>

              <Button
                type="button"
                variant="ghost"
                disabled={
                  !access.isAdmin
                }
                onClick={() =>
                  void transition(
                    "archived",
                  )
                }
              >
                Archive
              </Button>
            </div>
          </Section>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <PackagePlus className="mx-auto h-8 w-8 text-muted-foreground" />

          <p className="mt-3 text-sm font-medium">
            Create the draft to
            continue
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Images, pricing,
            variants, fulfilment
            details and publication
            controls become available
            after the first save.
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PASTE HELPER                                                               */
/* -------------------------------------------------------------------------- */

function PasteHelper({
  onApply,
}: {
  onApply: (
    details: ReturnType<
      typeof parsePastedProduct
    >,
  ) => void;
}) {
  const [open, setOpen] =
    useState(false);

  const [raw, setRaw] =
    useState("");

  const parsed = useMemo(
    () =>
      parsePastedProduct(
        raw,
      ),
    [raw],
  );

  const hasSuggestions =
    Object.keys(parsed).length >
    0;

  return (
    <section className="rounded-xl border border-dashed border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">
            Fast product import
          </h2>

          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Optional. Paste labelled
            product information copied
            from Printify or another
            source. Nothing is saved or
            published automatically.
            Always review supplier
            information before using it.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setOpen(
              (current) =>
                !current,
            )
          }
        >
          {open
            ? "Close"
            : "Paste details"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <Textarea
            rows={7}
            value={raw}
            onChange={(event) =>
              setRaw(
                event.target
                  .value,
              )
            }
            placeholder={
              "Title: ...\nDescription: ...\nFeatures: ..."
            }
          />

          {hasSuggestions ? (
            <div className="overflow-hidden rounded-md border border-border p-3 text-xs">
              <p className="mb-2 font-semibold uppercase tracking-wide">
                Review suggestions
              </p>

              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-muted-foreground">
                {JSON.stringify(
                  parsed,
                  null,
                  2,
                )}
              </pre>

              <Button
                type="button"
                size="sm"
                className="mt-3"
                onClick={() => {
                  onApply(
                    parsed,
                  );
                  setOpen(
                    false,
                  );
                }}
              >
                Apply suggestions
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No recognised labelled
              product fields detected
              yet.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* POD                                                                        */
/* -------------------------------------------------------------------------- */

function PodSection({
  productId,
}: {
  productId: string;
}) {
  const queryClient =
    useQueryClient();

  const existing = useQuery({
    queryKey: [
      "admin",
      "pod",
      productId,
    ],
    queryFn: () =>
      fetchAdminProduct(
        productId,
      ),
  });

  const current =
    (
      (
        existing.data as
          | {
              product_pod_details?:
                | Record<
                    string,
                    unknown
                  >[]
                | null;
            }
          | null
          | undefined
      )
        ?.product_pod_details?.[0] ??
      {}
    ) as Record<
      string,
      unknown
    >;

  const [
    podForm,
    setPodForm,
  ] =
    useState<
      Record<string, unknown>
    >({});

  useEffect(() => {
    setPodForm(current);
  }, [existing.data]);

  const value = (
    key: string,
  ): string => {
    const currentValue =
      podForm[key];

    return typeof currentValue ===
      "string"
      ? currentValue
      : "";
  };

  const set = (
    key: string,
    next: unknown,
  ) => {
    setPodForm(
      (previous) => ({
        ...previous,
        [key]: next,
      }),
    );
  };

  const save =
    useMutation({
      mutationFn: () =>
        upsertPodDetails(
          productId,
          {
            provider:
              (value(
                "provider",
              ) ||
                "printify") as PodProvider,

            external_product_id:
              value(
                "external_product_id",
              ) || null,

            external_blueprint_id:
              value(
                "external_blueprint_id",
              ) || null,

            external_print_provider_id:
              value(
                "external_print_provider_id",
              ) || null,

            provider_product_url:
              value(
                "provider_product_url",
              ) || null,

            provider_dashboard_url:
              value(
                "provider_dashboard_url",
              ) || null,

            production_region:
              value(
                "production_region",
              ) || null,

            production_time_estimate:
              value(
                "production_time_estimate",
              ) || null,

            shipping_estimate:
              value(
                "shipping_estimate",
              ) || null,

            fulfilment_notes:
              value(
                "fulfilment_notes",
              ) || null,

            manual_fulfilment_required:
              podForm.manual_fulfilment_required !==
              false,

            api_integration_status:
              value(
                "api_integration_status",
              ) || "manual",

            last_reviewed_at:
              value(
                "last_reviewed_at",
              ) || null,
          },
        ),

      onSuccess: async () => {
        toast.success(
          "Print-on-demand details saved",
        );

        await queryClient.invalidateQueries(
          {
            queryKey: [
              "admin",
              "pod",
              productId,
            ],
          },
        );
      },

      onError: () =>
        toast.error(
          "Those POD details could not be saved.",
        ),
    });

  const invalidUrl = [
    "provider_product_url",
    "provider_dashboard_url",
  ].some(
    (key) =>
      Boolean(
        value(key),
      ) &&
      !/^https?:\/\//i.test(
        value(key),
      ),
  );

  return (
    <Section
      number={8}
      title="Print-on-demand provider"
      description="Private provider information. This section appears only for print-on-demand products."
      defaultOpen={false}
    >
      <div className="inline-flex rounded-full border border-warning/50 px-2.5 py-1 text-[11px] text-warning">
        Internal fulfilment
        information
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="POD provider">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
            value={
              value(
                "provider",
              ) || "printify"
            }
            onChange={(event) =>
              set(
                "provider",
                event.target
                  .value,
              )
            }
          >
            {POD_PROVIDERS.map(
              (provider) => (
                <option
                  key={
                    provider
                  }
                  value={
                    provider
                  }
                >
                  {provider}
                </option>
              ),
            )}
          </select>
        </Field>

        {[
          [
            "external_product_id",
            "Provider product ID",
          ],
          [
            "external_blueprint_id",
            "Blueprint ID",
          ],
          [
            "external_print_provider_id",
            "Print provider ID",
          ],
          [
            "provider_product_url",
            "Provider product URL",
          ],
          [
            "provider_dashboard_url",
            "Provider dashboard URL",
          ],
          [
            "production_region",
            "Production region",
          ],
          [
            "production_time_estimate",
            "Production estimate",
          ],
          [
            "shipping_estimate",
            "Shipping estimate",
          ],
          [
            "api_integration_status",
            "Integration status",
          ],
        ].map(
          ([key, label]) => (
            <Field
              key={key}
              label={label}
            >
              <Input
                value={
                  value(
                    key,
                  )
                }
                onChange={(
                  event,
                ) =>
                  set(
                    key,
                    event.target
                      .value,
                  )
                }
              />
            </Field>
          ),
        )}
      </div>

      <Field label="Fulfilment notes">
        <Textarea
          rows={3}
          value={
            value(
              "fulfilment_notes",
            )
          }
          onChange={(event) =>
            set(
              "fulfilment_notes",
              event.target
                .value,
            )
          }
        />
      </Field>

      <Toggle
        label="Manual fulfilment required"
        description="Keep enabled while provider ordering is handled manually."
        value={
          podForm.manual_fulfilment_required !==
          false
        }
        onChange={(value) =>
          set(
            "manual_fulfilment_required",
            value,
          )
        }
      />

      {invalidUrl ? (
        <p className="text-xs text-destructive">
          Provider URLs must start
          with http:// or https://.
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        disabled={
          invalidUrl ||
          save.isPending
        }
        onClick={() =>
          save.mutate()
        }
      >
        Save POD details
      </Button>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* MEDIA                                                                      */
/* -------------------------------------------------------------------------- */

function MediaSection({
  productId,
  productName,
  itemType,
}: {
  productId: string;
  productName?: string;
  itemType?: string;
}) {
  const queryClient =
    useQueryClient();

  const media = useQuery({
    queryKey: [
      "admin",
      "media",
      productId,
    ],
    queryFn: () =>
      listProductMedia(
        productId,
      ),
  });

  const [alt, setAlt] =
    useState("");

  const [url, setUrl] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const rows =
    media.data ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries(
      {
        queryKey: [
          "admin",
          "media",
          productId,
        ],
      },
    );
  };

  const suggestion = (
    fileName?: string,
  ) =>
    suggestAltText({
      productName,
      itemType,
      index:
        rows.length,
      fileName,
    });

  async function addExternal() {
    const cleanUrl =
      url.trim();

    if (
      !/^https?:\/\//i.test(
        cleanUrl,
      )
    ) {
      toast.error(
        "Enter a valid image URL starting with http:// or https://",
      );

      return;
    }

    setBusy(true);

    try {
      await addProductMedia({
        product_id:
          productId,
        url:
          cleanUrl,
        alt_text:
          alt.trim() ||
          suggestion() ||
          null,
        display_order:
          rows.length,
        is_primary:
          rows.length === 0,
        is_public:
          true,
      });

      setUrl("");
      setAlt("");

      await refresh();

      toast.success(
        "Product image added",
      );
    } catch {
      toast.error(
        "That image could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function upload(
    file: File,
  ) {
    setBusy(true);

    try {
      const optimised =
        await optimiseImage(
          file,
        );

      const path =
        await uploadProductMedia(
          optimised.file,
          productId,
        );

      await addProductMedia({
        product_id:
          productId,
        url:
          path,
        alt_text:
          alt.trim() ||
          suggestion(
            file.name,
          ) ||
          null,
        display_order:
          rows.length,
        is_primary:
          rows.length === 0,
        is_public:
          true,
      });

      setAlt("");

      await refresh();

      toast.success(
        optimised.bytes <
          optimised.originalBytes
          ? `Image uploaded and optimised (${formatBytes(
              optimised.originalBytes,
            )} → ${formatBytes(
              optimised.bytes,
            )})`
          : "Image uploaded",
      );
    } catch {
      toast.error(
        "That image could not be uploaded.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      number={5}
      title="Product images"
      description="Upload customer-facing product images or use approved supplier/provider image URLs."
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        Uploaded images are
        optimised for storefront
        performance. Use useful
        descriptive alt text for
        accessibility and search
        visibility.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Alt text for next image"
          hint={
            suggestion()
              ? `Suggested: ${suggestion()}`
              : undefined
          }
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={alt}
              onChange={(
                event,
              ) =>
                setAlt(
                  event.target
                    .value,
                )
              }
            />

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                !suggestion()
              }
              onClick={() =>
                setAlt(
                  suggestion(),
                )
              }
            >
              Suggest
            </Button>
          </div>
        </Field>

        <Field label="Upload image">
          <Input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(event) => {
              const file =
                event.target
                  .files?.[0];

              if (file) {
                void upload(
                  file,
                );
              }
            }}
          />
        </Field>

        <Field label="Supplier / provider image URL">
          <Input
            value={url}
            onChange={(
              event,
            ) =>
              setUrl(
                event.target
                  .value,
              )
            }
            placeholder="https://…"
          />
        </Field>

        <div className="flex items-end">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() =>
              void addExternal()
            }
          >
            Add image URL
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No product images yet.
          Add at least one useful
          public image before
          publication.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(
            (mediaItem) => (
              <MediaRow
                key={
                  mediaItem.id
                }
                id={
                  mediaItem.id
                }
                url={
                  mediaItem.url
                }
                altText={
                  mediaItem.alt_text
                }
                isPrimary={
                  mediaItem.is_primary
                }
                isPublic={
                  mediaItem.is_public
                }
                suggestion={
                  suggestAltText(
                    {
                      productName,
                      itemType,
                      fileName:
                        mediaItem.url,
                    },
                  )
                }
                onChanged={
                  refresh
                }
              />
            ),
          )}
        </ul>
      )}
    </Section>
  );
}

function MediaRow({
  id,
  url,
  altText,
  isPrimary,
  isPublic,
  suggestion,
  onChanged,
}: {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  isPublic: boolean;
  suggestion: string;
  onChanged: () =>
    void | Promise<void>;
}) {
  const [
    value,
    setValue,
  ] =
    useState(
      altText ?? "",
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  async function saveAltText(
    next: string,
  ) {
    setSaving(true);

    try {
      await updateProductMediaAlt(
        id,
        next.trim() ||
          null,
      );

      await onChanged();

      toast.success(
        "Alt text saved",
      );
    } catch {
      toast.error(
        "Alt text could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 truncate text-xs">
          {isPrimary
            ? "★ "
            : ""}
          {url}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isPublic
              ? "Public"
              : "Private"}
          </span>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await removeProductMedia(
                  id,
                );

                await onChanged();

                toast.success(
                  "Image removed",
                );
              } catch {
                toast.error(
                  "Image could not be removed.",
                );
              }
            }}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="h-9 min-w-0 flex-1"
          placeholder={
            suggestion ||
            "Describe this image"
          }
          value={value}
          onChange={(event) =>
            setValue(
              event.target
                .value,
            )
          }
        />

        {suggestion &&
        !value ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setValue(
                suggestion,
              )
            }
          >
            Suggest
          </Button>
        ) : null}

        <Button
          type="button"
          size="sm"
          disabled={
            saving ||
            value ===
              (altText ?? "")
          }
          onClick={() =>
            void saveAltText(
              value,
            )
          }
        >
          Save alt text
        </Button>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* VARIANTS                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_VARIANT = {
  name: "",
  variant_sku: "",
  colour: "",
  size: "",
  finish: "",
  phone_model: "",
  material: "",
  retail_price: "",
  compare_at_price: "",
  shipping_estimate: "",
  provider_sku: "",
  external_variant_id: "",
  production_cost: "",
  provider_currency: "USD",
};

function VariantSection({
  productId,
  isAdmin,
  podProduct,
}: {
  productId: string;
  isAdmin: boolean;
  podProduct: boolean;
}) {
  const queryClient =
    useQueryClient();

  const variants = useQuery({
    queryKey: [
      "admin",
      "variants",
      productId,
    ],
    queryFn: () =>
      listVariants(
        productId,
      ),
  });

  const [
    draft,
    setDraft,
  ] =
    useState({
      ...EMPTY_VARIANT,
    });

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const set = (
    key: keyof typeof EMPTY_VARIANT,
    value: string,
  ) => {
    setDraft(
      (previous) => ({
        ...previous,
        [key]: value,
      }),
    );
  };

  async function add() {
    const price =
      draft.retail_price
        ? Number(
            draft.retail_price,
          )
        : null;

    const compareAt =
      draft.compare_at_price
        ? Number(
            draft.compare_at_price,
          )
        : null;

    const cost =
      draft.production_cost
        ? Number(
            draft.production_cost,
          )
        : null;

    if (
      !draft.name.trim() ||
      !draft.variant_sku.trim()
    ) {
      toast.error(
        "A variant name and SKU are required.",
      );

      return;
    }

    if (
      price !== null &&
      (!Number.isFinite(
        price,
      ) ||
        price < 0)
    ) {
      toast.error(
        "Retail price must be a valid non-negative number.",
      );

      return;
    }

    if (
      compareAt !== null &&
      (!Number.isFinite(
        compareAt,
      ) ||
        compareAt < 0)
    ) {
      toast.error(
        "Compare-at price must be a valid non-negative number.",
      );

      return;
    }

    if (
      cost !== null &&
      (!Number.isFinite(
        cost,
      ) ||
        cost < 0)
    ) {
      toast.error(
        "Provider cost must be a valid non-negative number.",
      );

      return;
    }

    const variantSku =
      cleanSku(
        draft.variant_sku,
      );

    if (
      await isVariantSkuTaken(
        variantSku,
      )
    ) {
      toast.error(
        "That variant SKU is already used.",
      );

      return;
    }

    setBusy(true);

    try {
      await createVariant(
        productId,
        {
          name:
            draft.name.trim(),

          variant_sku:
            variantSku,

          colour:
            draft.colour.trim() ||
            null,

          size:
            draft.size.trim() ||
            null,

          finish:
            draft.finish.trim() ||
            null,

          phone_model:
            draft.phone_model.trim() ||
            null,

          material:
            draft.material.trim() ||
            null,

          retail_price:
            price,

          compare_at_price:
            compareAt,

          shipping_estimate:
            draft.shipping_estimate.trim() ||
            null,

          currency:
            "ZAR",

          is_active:
            true,
        },

        podProduct
          ? {
              provider:
                "printify",

              external_variant_id:
                draft.external_variant_id.trim() ||
                null,

              provider_sku:
                draft.provider_sku.trim() ||
                null,

              production_cost:
                cost,

              provider_currency:
                draft.provider_currency.trim() ||
                "USD",

              manual_order_instructions:
                null,

              last_verified_at:
                new Date().toISOString(),
            }
          : null,
      );

      setDraft({
        ...EMPTY_VARIANT,
      });

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "admin",
            "variants",
            productId,
          ],
        },
      );

      toast.success(
        "Variant added",
      );
    } catch {
      toast.error(
        "That variant could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      number={6}
      title="Options and variants"
      description="Use variants for size, colour, finish, phone model, material or other selectable customer options."
      defaultOpen={false}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field
          label="Variant name"
          required
        >
          <Input
            value={
              draft.name
            }
            onChange={(
              event,
            ) =>
              set(
                "name",
                event.target
                  .value,
              )
            }
            placeholder="Black / Large"
          />
        </Field>

        <Field
          label="Variant SKU"
          required
        >
          <Input
            value={
              draft.variant_sku
            }
            onChange={(
              event,
            ) =>
              set(
                "variant_sku",
                cleanSku(
                  event.target
                    .value,
                ),
              )
            }
          />
        </Field>

        {(
          [
            [
              "colour",
              "Colour",
            ],
            [
              "size",
              "Size",
            ],
            [
              "finish",
              "Finish",
            ],
            [
              "phone_model",
              "Phone model",
            ],
            [
              "material",
              "Material",
            ],
            [
              "retail_price",
              "Variant retail price (ZAR)",
            ],
            [
              "compare_at_price",
              "Compare-at price (ZAR)",
            ],
            [
              "shipping_estimate",
              "Shipping estimate",
            ],
          ] as const
        ).map(
          ([key, label]) => (
            <Field
              key={key}
              label={label}
            >
              <Input
                value={
                  draft[key]
                }
                onChange={(
                  event,
                ) =>
                  set(
                    key,
                    event.target
                      .value,
                  )
                }
                inputMode={
                  key ===
                    "retail_price" ||
                  key ===
                    "compare_at_price"
                    ? "decimal"
                    : undefined
                }
              />
            </Field>
          ),
        )}
      </div>

      {podProduct &&
      isAdmin ? (
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <h3 className="text-sm font-semibold">
            Private POD variant
            information
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Provider identifiers
            and production costs
            are internal and must
            never appear on the
            public storefront.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                [
                  "provider_sku",
                  "Provider SKU",
                ],
                [
                  "external_variant_id",
                  "Provider variant ID",
                ],
                [
                  "production_cost",
                  "Production cost",
                ],
                [
                  "provider_currency",
                  "Provider currency",
                ],
              ] as const
            ).map(
              ([
                key,
                label,
              ]) => (
                <Field
                  key={key}
                  label={label}
                >
                  <Input
                    value={
                      draft[key]
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        key,
                        event.target
                          .value,
                      )
                    }
                  />
                </Field>
              ),
            )}
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() =>
          void add()
        }
      >
        Add variant
      </Button>

      {(
        variants.data ??
        []
      ).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variants captured.
          Products that do not need
          customer-selectable
          options may remain without
          variants.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {(
            variants.data ??
            []
          ).map(
            (variant) => {
              const provider =
                (
                  variant as unknown as {
                    product_variant_provider_details?:
                      | Array<{
                          production_cost?:
                            | number
                            | null;
                          provider_currency?:
                            | string
                            | null;
                        }>
                      | null;
                  }
                )
                  .product_variant_provider_details?.[0];

              return (
                <li
                  key={
                    variant.id
                  }
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <strong>
                      {
                        variant.name
                      }
                    </strong>

                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {
                          variant.variant_sku
                        }
                      </span>

                      {variant.retail_price ? (
                        <span>
                          {formatZar(
                            Number(
                              variant.retail_price,
                            ),
                          )}
                        </span>
                      ) : null}

                      {!variant.is_active ? (
                        <span>
                          Inactive
                        </span>
                      ) : null}

                      {isAdmin &&
                      provider?.production_cost ? (
                        <span>
                          Internal
                          cost:{" "}
                          {
                            provider.provider_currency
                          }{" "}
                          {
                            provider.production_cost
                          }
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {variant.is_active ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await deactivateVariant(
                            variant.id,
                          );

                          await queryClient.invalidateQueries(
                            {
                              queryKey:
                                [
                                  "admin",
                                  "variants",
                                  productId,
                                ],
                            },
                          );

                          toast.success(
                            "Variant deactivated",
                          );
                        } catch {
                          toast.error(
                            "Variant could not be deactivated.",
                          );
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : null}
                </li>
              );
            },
          )}
        </ul>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* PRICING                                                                    */
/* -------------------------------------------------------------------------- */

function PricingSection({
  productId,
  quoteOnly,
}: {
  productId: string;
  quoteOnly: boolean;
}) {
  const queryClient =
    useQueryClient();

  const prices = useQuery({
    queryKey: [
      "admin",
      "prices",
      productId,
    ],
    queryFn: () =>
      listProductPrices(
        productId,
      ),
  });

  const [
    priceType,
    setPriceType,
  ] =
    useState<
      | "retail"
      | "promotional"
      | "business"
    >("retail");

  const [
    amount,
    setAmount,
  ] =
    useState("");

  const [
    minimum,
    setMinimum,
  ] =
    useState("1");

  const [
    from,
    setFrom,
  ] =
    useState("");

  const [
    until,
    setUntil,
  ] =
    useState("");

  const [
    vatInclusive,
    setVatInclusive,
  ] =
    useState(true);

  async function add() {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount < 0
    ) {
      toast.error(
        "Enter a valid non-negative price.",
      );

      return;
    }

    const minimumQuantity =
      Math.max(
        1,
        Math.floor(
          Number(minimum) ||
            1,
        ),
      );

    try {
      await addProductPrice({
        product_id:
          productId,

        price_type:
          priceType,

        amount:
          numericAmount,

        currency:
          "ZAR",

        minimum_quantity:
          minimumQuantity,

        starts_at:
          from
            ? new Date(
                from,
              ).toISOString()
            : null,

        ends_at:
          until
            ? new Date(
                until,
              ).toISOString()
            : null,

        vat_inclusive:
          vatInclusive,
      });

      setAmount("");

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "admin",
            "prices",
            productId,
          ],
        },
      );

      toast.success(
        "Price added",
      );
    } catch {
      toast.error(
        "That price could not be saved.",
      );
    }
  }

  return (
    <Section
      number={7}
      title="Pricing"
      description="Set customer-facing retail, promotional or business pricing. Supplier costs do not belong in the public price list."
      defaultOpen={false}
    >
      {quoteOnly ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          This product is currently
          marked quotation-required.
          A fixed retail price is
          optional until you decide
          to enable direct checkout.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Price type">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={priceType}
            onChange={(event) =>
              setPriceType(
                event.target
                  .value as
                  | "retail"
                  | "promotional"
                  | "business",
              )
            }
          >
            <option value="retail">
              Retail
            </option>

            <option value="promotional">
              Promotional
            </option>

            <option value="business">
              Business / bulk
            </option>
          </select>
        </Field>

        <Field label="Amount (ZAR)">
          <Input
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target
                  .value,
              )
            }
            inputMode="decimal"
            placeholder="0.00"
          />
        </Field>

        <Field label="Minimum quantity">
          <Input
            value={minimum}
            onChange={(event) =>
              setMinimum(
                event.target
                  .value,
              )
            }
            inputMode="numeric"
          />
        </Field>

        <Field label="Valid from">
          <Input
            type="date"
            value={from}
            onChange={(event) =>
              setFrom(
                event.target
                  .value,
              )
            }
          />
        </Field>

        <Field label="Valid until">
          <Input
            type="date"
            value={until}
            onChange={(event) =>
              setUntil(
                event.target
                  .value,
              )
            }
          />
        </Field>
      </div>

      <Toggle
        label="Price includes VAT"
        description="Set this according to the actual approved product price and tax treatment."
        value={
          vatInclusive
        }
        onChange={
          setVatInclusive
        }
      />

      <Button
        type="button"
        size="sm"
        onClick={() =>
          void add()
        }
      >
        Add price
      </Button>

      {(
        prices.data ??
        []
      ).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No customer pricing has
          been captured yet.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {(
            prices.data ??
            []
          ).map(
            (price) => (
              <li
                key={
                  price.id
                }
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="capitalize">
                  {
                    price.price_type
                  }{" "}
                  ·{" "}
                  {formatZar(
                    Number(
                      price.amount,
                    ),
                  )}{" "}
                  · minimum{" "}
                  {
                    price.minimum_quantity
                  }
                  {price.vat_inclusive
                    ? " · VAT included"
                    : " · VAT excluded"}
                </span>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await removeProductPrice(
                        price.id,
                      );

                      await queryClient.invalidateQueries(
                        {
                          queryKey:
                            [
                              "admin",
                              "prices",
                              productId,
                            ],
                        },
                      );

                      toast.success(
                        "Price removed",
                      );
                    } catch {
                      toast.error(
                        "Price could not be removed.",
                      );
                    }
                  }}
                >
                  Remove
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
    </Section>
  );
}
