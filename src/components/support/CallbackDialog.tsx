import { useState, type FormEvent } from "react";
import { PhoneCall } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { CALLBACK_REASONS, SA_PROVINCES, SITE } from "@/config/site";
import { CATEGORIES } from "@/data/categories";
import { trackEvent } from "@/lib/analytics";
import { isValidSaPhone, requestCallback } from "@/services/leads.service";
import { useSupport } from "@/components/support/support-context";
import { CallButton, WhatsAppButton } from "@/components/support/ContactActions";

type State = "idle" | "submitting" | "pending" | "error";

export function CallbackDialog() {
  const { panel, close } = useSupport();
  const [state, setState] = useState<State>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const found: string[] = [];
    if (!get("full_name")) found.push("Full name is required.");
    if (!isValidSaPhone(get("phone")))
      found.push("Enter a valid South African phone number, for example 067 801 1907.");
    if (!get("reason")) found.push("Select a reason for the callback.");
    if (!consent) found.push("Please confirm you consent to being contacted.");
    setErrors(found);
    if (found.length > 0) return;

    setState("submitting");
    try {
      const result = await requestCallback({
        full_name: get("full_name"),
        phone: get("phone"),
        email: get("email") || null,
        preferred_time: get("preferred_time"),
        reason: get("reason"),
        product_category: get("product_category"),
        location: get("location"),
        consent,
      });
      trackEvent("callback_submitted", { backend: result.status });
      setState("pending");
    } catch {
      setState("error");
    }
  }

  return (
    <Dialog open={panel === "callback"} onOpenChange={(v) => (v ? null : close())}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" aria-hidden /> Request a callback
          </DialogTitle>
          <DialogDescription>
            Tell us when to call and what you need. A Cossa team member will call you back.
          </DialogDescription>
        </DialogHeader>

        {state === "pending" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">
              <p className="font-semibold">Callback request system is being connected.</p>
              <p className="mt-1 text-muted-foreground">
                Please contact us directly on {SITE.phoneDisplay} or WhatsApp us.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CallButton variant="default" />
              <WhatsAppButton
                variant="outline"
                message="Hello Cossa Store, I would like a callback."
              />
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
                We could not record your request. Please call or WhatsApp {SITE.phoneDisplay}.
              </p>
            ) : null}

            <Field id="cb-name" name="full_name" label="Full name" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="cb-phone" name="phone" label="Phone number" type="tel" required />
              <Field id="cb-email" name="email" label="Email (optional)" type="email" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="cb-time" name="preferred_time" label="Preferred callback time" />
              <div className="space-y-1.5">
                <Label htmlFor="cb-location">Province or location</Label>
                <select
                  id="cb-location"
                  name="location"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="">Select</option>
                  {SA_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cb-reason">
                  Reason for callback <span className="text-primary">*</span>
                </Label>
                <select
                  id="cb-reason"
                  name="reason"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                  required
                >
                  <option value="">Select a reason</option>
                  {CALLBACK_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-category">Product category</Label>
                <select
                  id="cb-category"
                  name="product_category"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="">Not specific</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="cb-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="cb-consent" className="text-sm font-normal leading-snug">
                I consent to Cossa Store contacting me about this enquiry.
              </Label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={state === "submitting"} className="min-h-11">
                {state === "submitting" ? "Sending…" : "Request callback"}
              </Button>
              <CallButton />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
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
