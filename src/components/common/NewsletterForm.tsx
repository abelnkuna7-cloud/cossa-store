import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitNewsletterSignup } from "@/services/submissions.service";
import type { SubmissionState } from "@/types/catalog";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setState("submitting");
    try {
      const result = await submitNewsletterSignup({ email });
      setReference(result.reference);
      setState("pending");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-display text-lg font-semibold">Product updates and new ranges</p>
        <p className="text-sm text-primary-foreground/70">
          Occasional emails about new stock, business pricing and Cossa services.
        </p>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-md">
        <div className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.za"
            aria-label="Email address"
            className="bg-background text-foreground"
            required
          />
          <Button type="submit" variant="secondary" disabled={state === "submitting"}>
            {state === "submitting" ? "Saving…" : "Subscribe"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-destructive-foreground">{error}</p> : null}
        {state === "pending" ? (
          <p className="mt-2 text-xs text-primary-foreground/80">
            Saved locally as {reference}. Email delivery is not connected yet, so no message has
            been sent.
          </p>
        ) : null}
        {state === "error" ? (
          <p className="mt-2 text-xs text-destructive-foreground">
            We could not record your request. Please try again.
          </p>
        ) : null}
      </form>
    </div>
  );
}
