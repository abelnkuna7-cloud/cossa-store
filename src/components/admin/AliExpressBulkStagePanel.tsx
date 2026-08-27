import { useMemo, useState } from "react";
import { LoaderCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";

const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const db = supabase as any;

type ParsedRow = {
  line: number;
  name: string;
  affiliateUrl: string;
  price: number;
  category: string;
  imageUrl: string | null;
  brand: string | null;
  error: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function canonicalCategory(value: string) {
  const clean = value.trim().toLowerCase();
  if (!clean) return "";
  return (
    CATEGORIES.find(
      (category) =>
        category.slug === clean || category.name.toLowerCase() === clean,
    )?.slug ?? clean
  );
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseRows(raw: string): ParsedRow[] {
  return raw
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((row) => row.line.length > 0)
    .map(({ line, lineNumber }) => {
      const [nameRaw = "", urlRaw = "", priceRaw = "", categoryRaw = "", imageRaw = "", brandRaw = ""] =
        line.split("|").map((value) => value.trim());

      const name = nameRaw.trim();
      const affiliateUrl = urlRaw.trim();
      const price = Number(priceRaw.replace(/[^0-9.,-]/g, "").replace(",", "."));
      const category = canonicalCategory(categoryRaw);
      const imageUrl = imageRaw.trim() || null;
      const brand = brandRaw.trim() || null;

      let error: string | null = null;
      if (!name) error = "missing product name";
      else if (!isHttpsUrl(affiliateUrl)) error = "affiliate URL must be HTTPS";
      else if (!Number.isFinite(price) || price < 0) error = "invalid price";
      else if (!category) error = "missing category";
      else if (imageUrl && !isHttpsUrl(imageUrl)) error = "image URL must be HTTPS";

      return {
        line: lineNumber,
        name,
        affiliateUrl,
        price,
        category,
        imageUrl,
        brand,
        error,
      };
    });
}

export function AliExpressBulkStagePanel({ onStaged }: { onStaged?: () => void }) {
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => parseRows(raw), [raw]);
  const validRows = rows.filter((row) => !row.error);
  const invalidRows = rows.filter((row) => row.error);

  const stage = async () => {
    if (validRows.length === 0) {
      toast.error("Add at least one valid AliExpress affiliate row first.");
      return;
    }
    if (invalidRows.length > 0) {
      toast.error("Fix invalid rows before staging the batch.");
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Please sign in again before staging products.");

      const urls = validRows.map((row) => row.affiliateUrl);
      const { data: existing, error: existingError } = await db
        .from("store_products")
        .select("affiliate_url")
        .eq("organisation_id", ORGANISATION_ID)
        .in("affiliate_url", urls);
      if (existingError) throw existingError;

      const existingUrls = new Set((existing ?? []).map((row: any) => row.affiliate_url));
      const fresh = validRows.filter((row) => !existingUrls.has(row.affiliateUrl));
      const skipped = validRows.length - fresh.length;

      if (fresh.length === 0) {
        toast.info("Every tracked link in this batch already exists in the catalogue.");
        return;
      }

      const now = Date.now().toString(36);
      const payload = fresh.map((row, index) => ({
        organisation_id: ORGANISATION_ID,
        name: row.name,
        slug: `${slugify(row.name) || "aliexpress-offer"}-${now}-${index + 1}`,
        sku: null,
        product_type: "affiliate",
        fulfilment_model: "affiliate",
        status: "draft",
        short_description: `AliExpress partner offer. Review merchant details, pricing and disclosure before publishing.`,
        description: null,
        category: row.category,
        brand: row.brand,
        supplier_name: "AliExpress",
        supplier_product_ref: null,
        supplier_url: null,
        affiliate_url: row.affiliateUrl,
        currency: "ZAR",
        cost_price: 0,
        price: row.price,
        compare_at_price: null,
        track_inventory: false,
        stock_quantity: 0,
        unlimited_stock: false,
        featured: false,
        image_urls: row.imageUrl ? [row.imageUrl] : [],
        seo_title: row.name,
        seo_description: null,
        created_by: authData.user.id,
        updated_by: authData.user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await db.from("store_products").insert(payload);
      if (error) throw error;

      toast.success(`${fresh.length} AliExpress offer${fresh.length === 1 ? "" : "s"} staged as Draft.`, {
        description: skipped ? `${skipped} duplicate tracked link${skipped === 1 ? " was" : "s were"} skipped.` : undefined,
      });
      setRaw("");
      onStaged?.();
    } catch (error: any) {
      toast.error(error?.message ?? "AliExpress products could not be staged.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">AliExpress bulk staging</p>
          <h2 className="mt-1 text-lg font-semibold">Stage tracked offers in a controlled batch</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            One product per line. Nothing is published automatically. Every row is stored as an AliExpress affiliate Draft with zero Cossa inventory.
          </p>
        </div>
        <Button disabled={saving || validRows.length === 0 || invalidRows.length > 0} onClick={() => void stage()}>
          {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          Stage {validRows.length || "batch"}
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Format:</strong> Product name | tracked affiliate URL | price in ZAR | category | image URL | brand
        <br />
        <span>Example structure only: Cordless Drill | https://tracked-link.example/... | 899.00 | construction-diy | https://image.example/drill.jpg | Brand</span>
      </div>

      <Textarea
        className="mt-4 min-h-40 font-mono text-xs"
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        placeholder="Product name | https://tracked-link... | 299.00 | technology | https://image... | Brand"
      />

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">Rows: {rows.length}</span>
        <span className="rounded-full border border-primary/30 px-2 py-1 text-primary">Valid: {validRows.length}</span>
        {invalidRows.length ? (
          <span className="rounded-full border border-destructive/40 px-2 py-1 text-destructive">Invalid: {invalidRows.length}</span>
        ) : null}
      </div>

      {invalidRows.length ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <p className="font-semibold text-destructive">Fix before staging</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {invalidRows.slice(0, 8).map((row) => (
              <li key={row.line}>Line {row.line}: {row.error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
