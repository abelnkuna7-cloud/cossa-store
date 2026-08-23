import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { CatalogueShell } from "@/components/admin/CatalogueShell";
import { CjProductSyncPanel } from "@/components/admin/CjProductSyncPanel";
import { PrintifySyncPanel } from "@/components/admin/PrintifySyncPanel";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatZar } from "@/lib/format";

const db = supabase as any;
const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const STORE_PRODUCT_URL = "https://store.cossanexusholdings.co.za/product";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  product_type: string;
  status: string;
  category: string | null;
  brand: string | null;
  supplier_name: string | null;
  fulfilment_model: string;
  price: number;
  stock_quantity: number;
  unlimited_stock: boolean;
  featured: boolean;
  updated_at: string;
};

function publicProductUrl(slug: string): string {
  return `${STORE_PRODUCT_URL}/${encodeURIComponent(slug)}`;
}

async function copyProductLink(row: ProductRow): Promise<void> {
  const url = publicProductUrl(row.slug);

  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable");
    await navigator.clipboard.writeText(url);
    toast.success("Product link copied", { description: url });
  } catch {
    window.prompt("Copy this public product link", url);
  }
}

async function shareProduct(row: ProductRow): Promise<void> {
  const url = publicProductUrl(row.slug);

  if (navigator.share) {
    try {
      await navigator.share({
        title: row.name,
        text: `Shop ${row.name} from Cossa Store`,
        url,
      });
      return;
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return;
    }
  }

  await copyProductLink(row);
}

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

function CatalogueManager() {
  const navigate = useNavigate();
  return (
    <CatalogueShell
      title="Catalogue manager"
      description="Create, review and publish real Cossa Store products from the consolidated Growth database."
      actions={<Button onClick={() => navigate({ to: "/admin/catalogue/new" })}>Create product</Button>}
    >
      <CatalogueTable />
    </CatalogueShell>
  );
}

function listProducts() {
  return db
    .from("store_products")
    .select("id,name,slug,sku,product_type,status,category,brand,supplier_name,fulfilment_model,price,stock_quantity,unlimited_stock,featured,updated_at")
    .eq("organisation_id", ORGANISATION_ID)
    .order("updated_at", { ascending: false })
    .then(({ data, error }: any) => {
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    });
}

function CatalogueTable() {
  const queryClient = useQueryClient();
  const products = useQuery({ queryKey: ["admin", "store-products"], queryFn: listProducts });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [fulfilment, setFulfilment] = useState("all");

  const rows = products.data ?? [];
  const options = useMemo(() => {
    const unique = (values: Array<string | null>) => Array.from(new Set(values.filter(Boolean) as string[])).sort();
    return {
      statuses: unique(rows.map((row) => row.status)),
      categories: unique(rows.map((row) => row.category)),
      types: unique(rows.map((row) => row.product_type)),
      fulfilments: unique(rows.map((row) => row.fulfilment_model)),
    };
  }, [rows]);

  const filtered = rows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (category !== "all" && row.category !== category) return false;
    if (type !== "all" && row.product_type !== type) return false;
    if (fulfilment !== "all" && row.fulfilment_model !== fulfilment) return false;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      if (![row.name, row.sku ?? "", row.slug].join(" ").toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const mutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: "draft" | "active" | "archived" }) => {
      const { error } = await db
        .from("store_products")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organisation_id", ORGANISATION_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "store-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product status updated.");
    },
    onError: (error: any) => toast.error(error?.message ?? "The product could not be updated."),
  });

  if (products.isPending) return <LoadingBlock label="Loading the catalogue…" />;
  if (products.isError) return <ErrorBlock description="The catalogue could not be loaded from cossa-growth." />;

  const invalidateCatalogue = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "store-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="space-y-5">
      <PrintifySyncPanel onSynced={invalidateCatalogue} />
      <CjProductSyncPanel onSynced={invalidateCatalogue} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input placeholder="Search product or code" value={search} onChange={(event) => setSearch(event.target.value)} className="lg:col-span-2" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={["all", ...options.statuses]} />
        <FilterSelect label="Category" value={category} onChange={setCategory} options={["all", ...options.categories]} />
        <FilterSelect label="Type" value={type} onChange={setType} options={["all", ...options.types]} />
        <FilterSelect label="Fulfilment" value={fulfilment} onChange={setFulfilment} options={["all", ...options.fulfilments]} />
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock
          title="No products yet"
          description="Create your first real product. It will be saved in cossa-growth and only appear on the Store when its status is Active."
          action={
            <Button asChild>
              <Link to="/admin/catalogue/new">Create first product</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Fulfilment</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-2 font-mono text-xs">{row.sku ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    {row.brand ? <div className="text-xs text-muted-foreground">{row.brand}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.category ?? "—"}</td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">{row.product_type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">{row.fulfilment_model.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">{formatZar(Number(row.price ?? 0))}</td>
                  <td className="px-3 py-2">{row.unlimited_stock ? "Unlimited" : row.stock_quantity}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize">{row.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleDateString("en-ZA")}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/catalogue/$id" params={{ id: row.id }}>Edit</Link>
                      </Button>
                      {row.status === "active" ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => void copyProductLink(row)}>
                            <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
                            Copy link
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void shareProduct(row)}>
                            <Share2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                            Share
                          </Button>
                        </>
                      ) : null}
                      {row.status === "active" ? (
                        <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: row.id, nextStatus: "draft" })}>Unpublish</Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: row.id, nextStatus: "active" })}>Publish</Button>
                      )}
                      {row.status !== "archived" ? (
                        <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: row.id, nextStatus: "archived" })}>Archive</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option === "all" ? "All" : option.replace(/_/g, " ")}</option>
        ))}
      </select>
    </label>
  );
}
