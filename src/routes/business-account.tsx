import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/data/categories";
import { submitBusinessAccountApplication } from "@/services/submissions.service";
import type { SubmissionState } from "@/types/catalog";

const TITLE = "Business account application | Cossa Store";
const DESCRIPTION =
  "Apply for a Cossa Store business account for bulk pricing, contract supply and account terms.";

export const Route = createFileRoute("/business-account")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: BusinessAccountPage,
});

function BusinessAccountPage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();

    if (!get("registered_name") || !get("registration_number") || !get("email")) {
      setError("Please complete all required fields.");
      return;
    }

    setState("submitting");
    setError(null);
    try {
      const result = await submitBusinessAccountApplication({
        registered_name: get("registered_name"),
        trading_name: get("trading_name") || null,
        registration_number: get("registration_number"),
        vat_number: get("vat_number") || null,
        contact_person: get("contact_person"),
        email: get("email"),
        phone: get("phone"),
        billing_address: get("billing_address"),
        delivery_address: get("delivery_address"),
        industry: get("industry"),
        estimated_monthly_spend: get("estimated_monthly_spend"),
        required_categories: form.getAll("required_categories").map(String),
        bulk_requirements: get("bulk_requirements"),
        preferred_payment_method: get("preferred_payment_method"),
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
        <h1 className="font-display text-3xl font-semibold">Application recorded</h1>
        <p className="mt-3 text-muted-foreground">
          Reference <span className="font-medium text-foreground">{reference}</span>. Our accounts
          team reviews applications and verifies company details before approval.
        </p>
        <div className="mt-6">
          <NoticeBlock tone="pending" title="Awaiting backend connection">
            Applications are stored on this device until our account system is connected. Please
            also contact us so we can begin verification.
          </NoticeBlock>
        </div>
        <Button asChild className="mt-6">
          <Link to="/contact">Contact the team</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="For business"
        title="Business account application"
        description={DESCRIPTION}
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          <fieldset className="space-y-5">
            <legend className="font-sans text-sm font-semibold uppercase tracking-wide">
              Company details
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="registered_name" label="Registered company name" required />
              <Field name="trading_name" label="Trading name (optional)" />
              <Field name="registration_number" label="Company registration number" required />
              <Field name="vat_number" label="VAT number (optional)" />
              <Field name="industry" label="Industry" />
              <Field name="estimated_monthly_spend" label="Estimated monthly spend (ZAR)" />
            </div>
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="font-sans text-sm font-semibold uppercase tracking-wide">
              Contact and addresses
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="contact_person" label="Contact person" required />
              <Field name="email" label="Email address" type="email" required />
              <Field name="phone" label="Phone number" type="tel" required />
              <Field name="preferred_payment_method" label="Preferred payment method" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_address">Billing address</Label>
              <Textarea id="billing_address" name="billing_address" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_address">Delivery address</Label>
              <Textarea id="delivery_address" name="delivery_address" rows={3} />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="font-sans text-sm font-semibold uppercase tracking-wide">
              Requirements
            </legend>
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Categories required</span>
              <div className="flex flex-wrap gap-4">
                {CATEGORIES.map((category) => (
                  <label key={category.slug} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="required_categories"
                      value={category.slug}
                      className="h-4 w-4 rounded border-input"
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_requirements">Bulk or contract requirements</Label>
              <Textarea id="bulk_requirements" name="bulk_requirements" rows={5} />
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={state === "submitting"}>
            {state === "submitting" ? "Submitting…" : "Submit application"}
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
