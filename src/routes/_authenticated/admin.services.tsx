import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const db = supabase as any;

type ServiceStatus = "draft" | "active" | "archived";

type ServiceRow = {
  id: string;
  name: string;
  eyebrow: string | null;
  description: string;
  image_url: string | null;
  destination_url: string;
  cta_label: string;
  status: ServiceStatus;
  sort_order: number;
  featured: boolean;
};

type FormState = {
  id?: string;
  name: string;
  eyebrow: string;
  description: string;
  image_url: string;
  destination_url: string;
  cta_label: string;
  status: ServiceStatus;
  sort_order: string;
  featured: boolean;
};

const EMPTY: FormState = {
  name: "",
  eyebrow: "",
  description: "",
  image_url: "",
  destination_url: "",
  cta_label: "Learn more",
  status: "draft",
  sort_order: "0",
  featured: true,
};

export const Route = createFileRoute("/_authenticated/admin/services")({
  component: ServicesAdminPage,
});

function ServicesAdminPage() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await db
      .from("store_services")
      .select("id,name,eyebrow,description,image_url,destination_url,cta_label,status,sort_order,featured")
      .eq("organisation_id", ORGANISATION_ID)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Service directory could not be loaded.");
      setRows([]);
    } else {
      setRows((data ?? []) as ServiceRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(row: ServiceRow) {
    setForm({
      id: row.id,
      name: row.name,
      eyebrow: row.eyebrow ?? "",
      description: row.description,
      image_url: row.image_url ?? "",
      destination_url: row.destination_url,
      cta_label: row.cta_label,
      status: row.status,
      sort_order: String(row.sort_order),
      featured: row.featured,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.name.trim() || !form.description.trim() || !form.destination_url.trim()) {
      toast.error("Name, description and destination URL are required.");
      return;
    }

    try {
      new URL(form.destination_url);
    } catch {
      toast.error("Destination URL must be a complete https:// or http:// URL.");
      return;
    }

    setSaving(true);
    const payload = {
      organisation_id: ORGANISATION_ID,
      name: form.name.trim(),
      eyebrow: form.eyebrow.trim() || null,
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      destination_url: form.destination_url.trim(),
      cta_label: form.cta_label.trim() || "Learn more",
      status: form.status,
      sort_order: Number.parseInt(form.sort_order || "0", 10) || 0,
      featured: form.featured,
      updated_at: new Date().toISOString(),
    };

    const query = form.id
      ? db.from("store_services").update(payload).eq("id", form.id).eq("organisation_id", ORGANISATION_ID)
      : db.from("store_services").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      toast.error("Service could not be saved.");
      return;
    }

    toast.success(form.id ? "Service updated." : "Service added.");
    setForm(EMPTY);
    await load();
  }

  async function archive(id: string) {
    const { error } = await db
      .from("store_services")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organisation_id", ORGANISATION_ID);

    if (error) {
      toast.error("Service could not be archived.");
      return;
    }

    toast.success("Service archived.");
    if (form.id === id) setForm(EMPTY);
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Store administration</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Cossa services directory</h1>
        <p className="mt-2 max-w-3xl text-base text-muted-foreground">
          Add, edit, publish, reorder or archive Cossa group services without changing GitHub or redeploying the Store.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{form.id ? "Edit service" : "Add service"}</h2>
          {form.id ? <Button variant="outline" onClick={() => setForm(EMPTY)}><Plus className="mr-2 h-4 w-4" />New service</Button> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Service / business name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cossa Tech" /></Field>
          <Field label="Short category line"><Input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} placeholder="e.g. Marketing · AI · Business Growth" /></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="What this service does and why a customer would use it." /></Field></div>
          <Field label="Image URL or Store asset path"><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="/assets/demo/technology-laptop.jpg" /></Field>
          <Field label="Destination URL"><Input value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder="https://cossanexusholdings.co.za/tech" /></Field>
          <Field label="CTA label"><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Explore service" /></Field>
          <Field label="Sort order"><Input inputMode="numeric" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
          <Field label="Publication status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceStatus })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="draft">Draft</option>
              <option value="active">Active / public</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Homepage visibility">
            <label className="flex h-10 items-center gap-3 rounded-md border border-input px-3 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Show in the Cossa group solutions section
            </label>
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : form.id ? "Save changes" : "Add service"}</Button>
          <Button variant="outline" onClick={() => setForm(EMPTY)}>Clear</Button>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Current services</h2><span className="text-sm text-muted-foreground">{rows.length} records</span></div>
        {loading ? <p className="text-muted-foreground">Loading services…</p> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((row) => (
              <article key={row.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{row.eyebrow || "Cossa service"}</p><h3 className="mt-1 text-lg font-semibold">{row.name}</h3></div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold uppercase">{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{row.description}</p>
                <a href={row.destination_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center text-sm font-medium text-primary">Open destination <ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
                <div className="mt-5 flex flex-wrap gap-2"><Button size="sm" onClick={() => edit(row)}>Edit</Button><Button size="sm" variant="outline" onClick={() => archive(row.id)} disabled={row.status === "archived"}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Archive</Button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
