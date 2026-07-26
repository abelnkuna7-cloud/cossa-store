import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCommerce } from "@/lib/commerce-store";
import { productsByIdsQuery } from "@/lib/queries";
import { submitQuoteRequest } from "@/services/submissions.service";
import type { QuoteScope, SubmissionState } from "@/types/catalog";

const TITLE = "Request a quote | Cossa Store";
const DESCRIPTION =
  "Request a professional quotation for bulk product supply, project requirements or combined product and service scopes.";

export const Route = createFileRoute("/request-a-quote")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: QuotePage,
});

function QuotePage() {
  const { quoteBasket, hydrated, removeFromQuote, clearQuote } = useCommerce();
  const ids = quoteBasket.map((l) => l.product_id);
  const productsQ = useQuery({ ...productsByIdsQuery(ids), enabled: hydrated && ids.length > 0 });
  const products = productsQ.data ?? [];

  const [state, setState] = useState<SubmissionState>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();

    if (!get("contact_name") || !get("email") || !get("phone") || !get("project_description")) {
      setError("Please complete all required fields.");
      return;
    }

    setState("submitting");
    setError(null);
    try {
      const result = await submitQuoteRequest({
        contact_name: get("contact_name"),
        company: get("company") || null,
        email: get("email"),
        phone: get("phone"),
        location: get("location"),
        scope: get("scope") as QuoteScope,
        project_description: get("project_description"),
        items: quoteBasket,
      });
      setReference(result.reference);
      setState("pending");
      clearQuote();
    } catch {
      setState("error");
      setError("We could not record your request. Please try again or contact us on WhatsApp.");
    }
  }

  if (state === "pending" && reference) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">Quote request recorded</h1>
        <p className="mt-3 text-muted-foreground">
          Your reference is <span className="font-medium text-foreground">{reference}</span>. Keep
          it for follow-up.
        </p>
        <div className="mt-6">
          <NoticeBlock tone="pending" title="Awaiting backend connection">
            Your request has been saved on this device only. Automated quotation emails are not yet
            live, so please also reach out via the contact page so our team can action it.
          </NoticeBlock>
        </div>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link to="/contact">Contact the team</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/shop">Back to shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Professional service" title="Request a quote" description={DESCRIPTION} />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="contact_name" label="Contact name" required />
              <Field name="company" label="Company (optional)" />
              <Field name="email" label="Email address" type="email" required />
              <Field name="phone" label="Phone number" type="tel" required />
              <Field name="location" label="Delivery location / city" required />
              <div className="space-y-2">
                <Label htmlFor="scope">Scope of requirement</Label>
                <select
                  id="scope"
                  name="scope"
                  defaultValue="products_only"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="products_only">Products only</option>
                  <option value="products_and_services">Products and services</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_description">Project or requirement description</Label>
              <Textarea
                id="project_description"
                name="project_description"
                rows={6}
                required
                placeholder="Quantities, specifications, timelines and site details."
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={state === "submitting"}>
              {state === "submitting" ? "Submitting…" : "Submit quote request"}
            </Button>
          </form>

          <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Items on this request</h2>
            {!hydrated || quoteBasket.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products added yet. You can still describe your requirement in the form, or add
                products from the{" "}
                <Link to="/shop" className="underline">
                  catalogue
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {quoteBasket.map((line) => {
                  const product = products.find((p) => p.id === line.product_id);
                  return (
                    <li key={line.product_id} className="flex items-start justify-between gap-3">
                      <span>
                        {product?.name ?? line.product_id}
                        <span className="block text-xs text-muted-foreground">
                          Qty {line.quantity}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => removeFromQuote(line.product_id)}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <NoticeBlock tone="pending" title="Quotations are handled manually">
              Pricing for bulk and project scopes is confirmed by our team before any order is
              placed.
            </NoticeBlock>
          </aside>
        </div>
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