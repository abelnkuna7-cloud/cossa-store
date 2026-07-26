import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/data/categories";
import { submitSupplierApplication } from "@/services/submissions.service";
import type { SubmissionState } from "@/types/catalog";

const TITLE = "Become a supplier | Cossa Store";
const DESCRIPTION =
  "Apply to supply Cossa Store with construction, cleaning or technology products through wholesale or dropshipping.";

export const Route = createFileRoute("/supplier-application")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: SupplierPage,
});

function SupplierPage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();

    if (!get("company_name") || !get("email") || !get("contact_person")) {
      setError("Please complete all required fields.");
      return;
    }

    setState("submitting");
    setError(null);
    try {
      const result = await submitSupplierApplication({
        company_name: get("company_name"),
        registration_details: get("registration_details"),
        contact_person: get("contact_person"),
        email: get("email"),
        phone: get("phone"),
        website: get("website") || null,
        product_categories: form.getAll("product_categories").map(String),
        brands_supplied: get("brands_supplied"),
        wholesale_available: form.get("wholesale_available") === "on",
        dropshipping_available: form.get("dropshipping_available") === "on",
        minimum_order: get("minimum_order"),
        delivery_areas: get("delivery_areas"),
        lead_times: get("lead_times"),
        catalogue_upload_available: form.get("catalogue_upload_available") === "on",
        feed_capability: get("feed_capability"),
      });
      setReference(result.reference);
      setState("pending");
    } catch {
      setState("error");
      setError("We could not record your application. Please try again.");
    }
  }

  if (state === "pending" && reference) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">Supplier application recorded</h1>
        <p className="mt-3 text-muted-foreground">
          Reference <span className="font-medium text-foreground">{reference}</span>. Our sourcing
          team reviews every supplier before onboarding.
        </p>
        <div className="mt-6">
          <NoticeBlock tone="pending" title="Awaiting backend connection">
            Supplier applications are stored on this device until the supplier portal is connected.
          </NoticeBlock>
        </div>
        <Button asChild className="mt-6">
          <Link to="/contact">Contact the sourcing team</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Partnerships" title="Become a supplier" description={DESCRIPTION} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          <fieldset className="space-y-5">
            <legend className="font-sans text-sm font-semibold uppercase tracking-wide">
              Company
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="company_name" label="Company name" required />
              <Field name="registration_details" label="Registration / VAT details" />
              <Field name="contact_person" label="Contact person" required />
              <Field name="email" label="Email address" type="email" required />
              <Field name="phone" label="Phone number" type="tel" />
              <Field name="website" label="Website (optional)" type="url" />
            </div>
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="font-sans text-sm font-semibold uppercase tracking-wide">
              Supply capability
            </legend>
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Product categories supplied</span>
              <div className="flex flex-wrap gap-4">
                {CATEGORIES.map((category) => (
                  <label key={category.slug} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="product_categories"
                      value={category.slug}
                      className="h-4 w-4 rounded border-input"
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brands_supplied">Brands supplied</Label>
              <Textarea id="brands_supplied" name="brands_supplied" rows={3} />
            </div>
            <div className="flex flex-wrap gap-6">
              <Check name="wholesale_available" label="Wholesale pricing available" />
              <Check name="dropshipping_available" label="Dropshipping available" />
              <Check name="catalogue_upload_available" label="Catalogue available to share" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="minimum_order" label="Minimum order requirements" />
              <Field name="lead_times" label="Typical lead times" />
              <Field name="delivery_areas" label="Delivery areas covered" />
              <Field name="feed_capability" label="Product feed capability (CSV, API, none)" />
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={state === "submitting"}>
            {state === "submitting" ? "Submitting…" : "Submit supplier application"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} className="h-4 w-4 rounded border-input" />
      {label}
    </label>
  );
}
