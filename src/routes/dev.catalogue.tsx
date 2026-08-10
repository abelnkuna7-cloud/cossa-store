import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_CATALOGUE } from "@/data/demo-catalogue";
import { productsQuery } from "@/lib/queries";
import { formatZar } from "@/lib/format";
import { FULFILMENT_LABELS } from "@/types/catalog";
import type { Product } from "@/types/catalog";

const TITLE = "Catalogue inspector | Cossa Store";

export const Route = createFileRoute("/dev/catalogue")({
  head: () => ({
    meta: [
      { title: TITLE },
      {
        name: "description",
        content:
          "Internal catalogue inspector for filtering demo, real, draft and published product records during build and migration.",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: "Internal catalogue inspector for Cossa Store." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CatalogueInspector,
});

type Source = "all" | "demo" | "real";
type Status = "all" | "draft" | "published";

function CatalogueInspector() {
  const live = useQuery(productsQuery({}));
  const [source, setSource] = useState<Source>("all");
  const [status, setStatus] = useState<Status>("all");
  const [fulfilment, setFulfilment] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [category, setCategory] = useState("all");
  const [term, setTerm] = useState("");

  const all: Product[] = useMemo(() => {
    const merged = [...(live.data ?? []), ...DEMO_CATALOGUE];
    return Array.from(new Map(merged.map((p) => [p.id, p])).values());
  }, [live.data]);

  const suppliers = Array.from(new Set(all.map((p) => p.supplier_name).filter(Boolean))) as string[];
  const categories = Array.from(new Set(all.map((p) => p.category)));

  const rows = all.filter((p) => {
    const isDemo = p.is_demo === true;
    const rowStatus = p.publication_status ?? (p.published_at ? "published" : "draft");
    if (source === "demo" && !isDemo) return false;
    if (source === "real" && isDemo) return false;
    if (status !== "all" && rowStatus !== status) return false;
    if (fulfilment !== "all" && p.fulfilment_type !== fulfilment) return false;
    if (supplier !== "all" && (p.supplier_name ?? "") !== supplier) return false;
    if (category !== "all" && p.category !== category) return false;
    if (term.trim()) {
      const needle = term.trim().toLowerCase();
      if (![p.name, p.sku, p.slug].join(" ").toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  const demoCount = all.filter((p) => p.is_demo).length;

  const select =
    "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div>
      <PageHeader
        eyebrow="Internal tool"
        title="Catalogue inspector"
        description="Filter every catalogue record by demo/real, draft/published, fulfilment model, supplier and category. Use this to track replacement of placeholder products with real inventory."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm text-warning">
          <strong className="font-semibold">{demoCount} demo products</strong> are still in the
          catalogue and must be replaced before launch.
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search name, SKU or slug"
            aria-label="Search catalogue"
            className="max-w-xs"
          />
          <select
            aria-label="Record source"
            className={select}
            value={source}
            onChange={(e) => setSource(e.target.value as Source)}
          >
            <option value="all">All records</option>
            <option value="demo">Demo products</option>
            <option value="real">Real products</option>
          </select>
          <select
            aria-label="Publication status"
            className={select}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="all">Any status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <select
            aria-label="Fulfilment type"
            className={select}
            value={fulfilment}
            onChange={(e) => setFulfilment(e.target.value)}
          >
            <option value="all">Any fulfilment</option>
            {Object.entries(FULFILMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Supplier"
            className={select}
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="all">Any supplier</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            aria-label="Category"
            className={select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Any category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {rows.length} of {all.length} records
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-card text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Fulfilment</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link
                      to="/product/$slug"
                      params={{ slug: p.slug }}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {p.display_category ?? p.category}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.sku}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.product_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {FULFILMENT_LABELS[p.fulfilment_type]}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.supplier_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.requires_quote || p.selling_price <= 0
                      ? "On request"
                      : formatZar(p.selling_price)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                      {p.publication_status ?? (p.published_at ? "published" : "draft")}
                    </span>
                    {p.is_demo ? (
                      <span className="ml-1 rounded-full border border-warning/50 px-2 py-0.5 text-[11px] text-warning">
                        demo
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/shop">Back to the storefront</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}