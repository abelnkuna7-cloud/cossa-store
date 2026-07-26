import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SA_PROVINCES, SITE } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { isValidSaPhone, requestQuote, type QuickQuoteScope } from "@/services/leads.service";
import { useSupport } from "@/components/support/support-context";
import { CallButton, WhatsAppButton } from "@/components/support/ContactActions";

const SCOPES: { value: QuickQuoteScope; label: string }[] = [
  { value: "products_only", label: "Products only" },
  { value: "services_only", label: "Services only" },
  { value: "products_and_services", label: "Products plus services" },
  { value: "bulk_order", label: "Bulk order" },
  { value: "product_sourcing", label: "Product sourcing request" },
];

type State = "idle" | "submitting" | "pending" | "error";

export function QuickQuoteDialog() {
  const { panel, close } = useSupport();
  const [state, setState] = useState<State>("idle");
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const found: string[] = [];
    if (!get("name")) found.push("Name is required.");
    if (!isValidSaPhone(get("phone"))) found.push("Enter a valid South African phone number.");
    if (!get("email")) found.push("Email is required.");
    if (!get("requirements")) found.push("Describe the products or services you need.");
    setErrors(found);
    if (found.length > 0) return;

    setState("submitting");
    try {
      const result = await requestQuote({
        name: get("name"),
        company: get("company") || null,
        phone: get("phone"),
        email: get("email"),
        location: get("location"),
        scope: (get("scope") || "products_only") as QuickQuoteScope,
        requirements: get("requirements"),
        estimated_quantity: get("estimated_quantity"),
        required_date: get("required_date"),
        budget: get("budget") || null,
        additional_information: get("additional_information"),
      });
      trackEvent("quote_submitted", { backend: result.status });
      setState("pending");
    } catch {
      setState("error");
    }
  }

  return (
    <Dialog open={panel === "quote"} onOpenChange={(v) => (v ? null : close())}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden /> Quick quote request
          </DialogTitle>
          <DialogDescription>
            Submit your requirements and the Cossa team will review the request.
          </DialogDescription>
        </DialogHeader>

        {state === "pending" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">
              <p className="font-semibold">Quote submission is being connected.</p>
              <p className="mt-1 text-muted-foreground">
                Your requirements were not sent yet. Please contact us on {SITE.phoneDisplay} or
                WhatsApp so the team can prepare your quotation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <WhatsAppButton message="Hello Cossa Store, I would like a quotation for products or services." />
              <CallButton />
              <Button asChild variant="outline" onClick={close}>
                <Link to="/request-a-quote">Full quote page</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errors.length > 0 ? (
              <ul
                className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
            {state === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                We could not record your request. Please WhatsApp or call {SITE.phoneDisplay}.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="qq-scope">What do you need quoted?</Label>
              <select
                id="qq-scope"
                name="scope"
                defaultValue="products_only"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="qq-name" name="name" label="Name" required />
              <TextField id="qq-company" name="company" label="Company (optional)" />
              <TextField id="qq-phone" name="phone" label="Phone" type="tel" required />
              <TextField id="qq-email" name="email" label="Email" type="email" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qq-location">Location</Label>
              <select
                id="qq-location"
                name="location"
                defaultValue=""
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select</option>
                {SA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qq-requirements">
                Required products or services <span className="text-primary">*</span>
              </Label>
              <Textarea id="qq-requirements" name="requirements" rows={3} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <TextField id="qq-qty" name="estimated_quantity" label="Estimated quantity" />
              <TextField id="qq-date" name="required_date" label="Required date" type="date" />
              <TextField id="qq-budget" name="budget" label="Budget (optional)" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qq-info">Additional information</Label>
              <Textarea id="qq-info" name="additional_information" rows={2} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={state === "submitting"} className="min-h-11">
                {state === "submitting" ? "Sending…" : "Submit requirements"}
              </Button>
              <Button asChild variant="outline" onClick={close}>
                <Link to="/request-a-quote">Continue to full quote page</Link>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  id,
  name,
  label,
  type = "text",
  required,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required ? <span className="text-primary">*</span> : null}
      </Label>
      <Input id={id} name={name} type={type} />
    </div>
  );
}
