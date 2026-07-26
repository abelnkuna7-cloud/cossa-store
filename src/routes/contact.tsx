import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SITE, whatsappLink } from "@/config/site";
import { submitContactMessage } from "@/services/submissions.service";
import type { SubmissionState } from "@/types/catalog";

const TITLE = "Contact Cossa Store | Support and sales";
const DESCRIPTION =
  "Contact the Cossa Store team for product sourcing, bulk supply, order support and partnership enquiries.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    if (!get("name") || !get("email") || !get("message")) {
      setError("Please complete all fields.");
      return;
    }
    setState("submitting");
    setError(null);
    try {
      const result = await submitContactMessage({
        name: get("name"),
        email: get("email"),
        phone: get("phone"),
        subject: get("subject"),
        message: get("message"),
      });
      setReference(result.reference);
      setState("pending");
    } catch {
      setState("error");
      setError("We could not record your message. Please use WhatsApp instead.");
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Support" title="Contact us" description={DESCRIPTION} />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div>
          {state === "pending" && reference ? (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-semibold">Message recorded</h2>
              <p className="text-muted-foreground">
                Reference <span className="font-medium text-foreground">{reference}</span>.
              </p>
              <NoticeBlock tone="pending" title="Email delivery is not connected yet">
                Your message is stored on this device only. For anything urgent, please use
                WhatsApp.
              </NoticeBlock>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" rows={6} required />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" disabled={state === "submitting"}>
                {state === "submitting" ? "Sending…" : "Send message"}
              </Button>
            </form>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6 text-sm">
          <h2 className="font-display text-lg font-semibold">Direct contact</h2>
          <p className="text-muted-foreground">{SITE.parent}</p>
          <p>
            <a href={`mailto:${SITE.email}`} className="underline">
              {SITE.email}
            </a>
          </p>
          <p>
            <a href={SITE.phoneHref} className="underline">
              Call {SITE.phoneDisplay}
            </a>
          </p>
          <p>
            <a href={whatsappLink()} className="underline" target="_blank" rel="noreferrer">
              WhatsApp {SITE.phoneDisplay}
            </a>
          </p>
          <p>
            <a href={SITE.website} className="underline" target="_blank" rel="noreferrer">
              {SITE.domain}
            </a>
          </p>
          <p className="text-muted-foreground">
            Support hours are confirmed with each enquiry while we finalise our service desk.
          </p>
        </aside>
      </div>
    </div>
  );
}
