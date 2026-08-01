/**
 * Administrator moderation: product review queue and catalogue-access
 * approvals. Every call runs as the signed-in user; row-level security
 * enforces that only administrators can approve or reject.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ReviewProductRow {
  id: string;
  name: string;
  sku: string;
  slug: string;
  item_type: string | null;
  publication_state: string;
  created_by: string | null;
  updated_at: string;
  review_notes: string | null;
  submitter: { full_name: string | null; business_name: string | null } | null;
  imageCount: number;
  variantCount: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listReviewQueue(): Promise<ReviewProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, sku, slug, item_type, publication_state, created_by, updated_at, review_notes, product_media(id), product_variants(id)",
    )
    .in("publication_state", ["pending_review", "approved"])
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as any[];
  const ids = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean)));
  let profiles: Record<string, { full_name: string | null; business_name: string | null }> = {};
  if (ids.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, business_name")
      .in("id", ids as string[]);
    profiles = Object.fromEntries(
      (people ?? []).map((p: any) => [p.id, { full_name: p.full_name, business_name: p.business_name }]),
    );
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    item_type: row.item_type,
    publication_state: row.publication_state,
    created_by: row.created_by,
    updated_at: row.updated_at,
    review_notes: row.review_notes,
    submitter: row.created_by ? (profiles[row.created_by] ?? null) : null,
    imageCount: (row.product_media ?? []).length,
    variantCount: (row.product_variants ?? []).length,
  }));
}

export async function approveProduct(id: string, publish: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  const patch: Record<string, unknown> = {
    publication_state: publish ? "published" : "approved",
    review_notes: null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: auth.user?.id ?? null,
    approved_at: new Date().toISOString(),
    approved_by: auth.user?.id ?? null,
  };
  const { error } = await supabase.from("products").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function rejectProduct(id: string, notes: string) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("products")
    .update({
      publication_state: "draft",
      status: "draft",
      review_notes: notes.trim() || "Returned for changes.",
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user?.id ?? null,
    } as any)
    .eq("id", id);
  if (error) throw error;
}

export interface MemberRow {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  catalogue_status: string;
  catalogue_review_notes: string | null;
  catalogue_reviewed_at: string | null;
  created_at: string;
}

export async function listMembers(): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, business_name, phone, catalogue_status, catalogue_review_notes, catalogue_reviewed_at, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any as MemberRow[];
}

export async function setMemberCatalogueStatus(
  id: string,
  status: "pending" | "approved" | "rejected",
  notes?: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      catalogue_status: status,
      catalogue_review_notes: notes?.trim() || null,
      catalogue_reviewed_at: new Date().toISOString(),
      catalogue_reviewed_by: auth.user?.id ?? null,
    } as any)
    .eq("id", id);
  if (error) throw error;
}
/* eslint-enable @typescript-eslint/no-explicit-any */