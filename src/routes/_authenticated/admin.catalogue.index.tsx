import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CatalogueShell, useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatZar } from "@/lib/format";
import {
  duplicateProduct,
  listAdminProducts,
  setPublicationState,
  type AdminProductRow,
} from "@/services/catalogue.admin";

export const Route = createFileRoute("/_authenticated/admin/catalogue/")({
  head: () => ({
    meta: [
      { title: "Catalogue manager | Cossa internal" },
      { name: "description", content: "Internal Cossa Store catalogue management." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CatalogueManager,
});

const STATES = ["all", "draft", "pending_review", "approved", "published", "unpublished", "archived"] as const;

function CatalogueManager() {
  const navigate = useNavigate();
  return (
    <CatalogueShell
      title="Catalogue manager"
      description="Create, review and publish real Cossa products. Nothing appears on the storefront until an administrator publishes it."
      actions={
        <Button onClick={() => navigate({ to: "/admin/catalogue/new" })}>Create product</Button>
      }
    >
      <CatalogueTable />
    </CatalogueShell>
  );
}

function CatalogueTable() {
  const access = useCatalogueAccess();
  const queryClient = useQueryClient();
  const products = useQuery({ queryKey: ["admin", "products"], queryFn: listAdminProducts });
  const [search, setSearch] = useState("");
  const [state, setState] = useState<(typeof STATES)[number]>("all");
  const [category, setCategory] = useState("all");
  const [itemType, setItemType] = useState("all");
  const [fulfilment, setFulfilment] = useState("all");
  const [collection, setCollection] = useState("all");

  const rows = products.data ?? [];

  const options = useMemo(() => {
    const unique = (values: (string | null | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
    return {
      categories: unique(rows.map((r) => r.category?.slug)),
      itemTypes: unique(rows.map((r) => r.item_type)),
      fulfilments: unique(rows.map((r) => r.sourcing_model)),
      collections: unique(rows.map((r) => r.collection?.slug)),
    };
  }, [rows]);

  const filtered = rows.filter((row) => {
    if (state !== "all" && row.publication_state !== state) return false;
    if (category !== "all" && row.category?.slug !== category) return false;
    if (itemType !== "all" && row.item_type !== itemType) return false;
    if (fulfilment !== "all" && row.sourcing_model !== fulfilment) return false;
    if (collection !== "all" && row.collection?.slug !== collection) return false;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      if (![row.name, row.sku, row.slug].join(" ").toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const mutate = useMutation({
    mutationFn: async (job: { type: "archive" | "duplicate"; id: string }) =>
      job.type === "archive" ? setPublicationState(job.id, "archived") : duplicateProduct(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Catalogue updated");
    },
    onError: () => toast.error("That action could not be completed with your current permissions."),
  });

  if (products.isPending) return <LoadingBlock label="Loading the catalogue…" />;
  if (products.isError) return <ErrorBlock description="The catalogue could not be loaded." />;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          placeholder="Search name or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="lg:col-span-2"
        />
        <FilterSelect label="Status" value={state} onChange={(v) => setState(v as never)} options={STATES.map(String)} />
        <FilterSelect label="Category" value={category} onChange={setCategory} options={["all", ...options.categories]} />
        <FilterSelect label="Item type" value={itemType} onChange={setItemType} options={["all", ...options.itemTypes]} />
        <FilterSelect label="Fulfilment" value={fulfilment} onChange={setFulfilment} options={["all", ...options.fulfilments]} />
        <FilterSelect label="Collection" value={collection} onChange={setCollection} options={["all", ...options.collections]} />
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock
          title="No products yet"
          description="No real products have been captured. Use “Create product” to add your first Printify item manually."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Collection</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Item type</th>
                <th className="px-3 py-2">Fulfilment</th>
                <th className="px-3 py-2">Variants</th>
                <th className="px-3 py-2">Public price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  busy={mutate.isPending}
                  onArchive={() => mutate.mutate({ type: "archive", id: row.id })}
                  onDuplicate={() => mutate.mutate({ type: "duplicate", id: row.id })}
                  canArchive={access.isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  row,
  busy,
  onArchive,
  onDuplicate,
  canArchive,
}: {
  row: AdminProductRow;
  busy: boolean;
  onArchive: () => void;
  onDuplicate: () => void;
  canArchive: boolean;
}) {
  return (
    <tr className="align-top">
      <td className="px-3 py-2 font-mono text-xs">{row.sku}</td>
      <td className="px-3 py-2 font-medium">{row.name}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.collection?.name ?? "—"}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.category?.name ?? "—"}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.item_type ?? "—"}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.sourcing_model.replace(/_/g, " ")}</td>
      <td className="px-3 py-2">{row.variantCount}</td>
      <td className="px-3 py-2">
        {row.requires_quote ? "Quote only" : row.publicPrice ? formatZar(row.publicPrice) : "—"}
      </td>
      <td className="px-3 py-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize">
          {row.publication_state.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {new Date(row.updated_at).toLocaleDateString("en-ZA")}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/catalogue/$id" params={{ id: row.id }}>
              Edit
            </Link>
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDuplicate}>
            Duplicate
          </Button>
          {row.publication_state === "published" ? (
            <Button asChild size="sm" variant="ghost">
              <Link to="/products/$slug" params={{ slug: row.slug }} target="_blank">
                Preview
              </Link>
            </Button>
          ) : null}
          {canArchive ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onArchive}>
              Archive
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
