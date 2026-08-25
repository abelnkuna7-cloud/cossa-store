import { createFileRoute } from "@tanstack/react-router";

import { CatalogueShell, useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { EmptyBlock, LoadingBlock } from "@/components/common/StateBlocks";

export const Route = createFileRoute("/_authenticated/admin/email-operations")({
  head: () => ({
    meta: [
      { title: "Email operations | Cossa internal" },
      { name: "description", content: "Private approval-first email operations for Cossa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailOperationsPage,
});

function EmailOperationsPage() {
  return (
    <CatalogueShell
      title="Email operations"
      description="Private operations workspace for Cossa Store, NexDocs and Cossa Growth. Email sending remains disabled until an administrator explicitly enables a reviewed provider connection."
    >
      <AdminOnly />
    </CatalogueShell>
  );
}

function AdminOnly() {
  const access = useCatalogueAccess();

  if (access.loading) return <LoadingBlock label="Checking your accessâ€¦" />;
  if (!access.isAdmin) {
    return <EmptyBlock title="Administrators only" description="Only a Cossa administrator can view email operations." />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Foundation mode is active</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No mailbox is connected, no AI provider is connected, and no email can be sent automatically.
          This protects customers, suppliers and Cossa while the operating rules are set up.
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Status label="Mailbox connection" value="Not configured" />
          <Status label="Outgoing email" value="Disabled" />
          <Status label="Marketing" value="Disabled" />
          <Status label="Send limits" value="0 per day / 0 per month" />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">What will be managed here</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Supplier and payment-provider replies, with a draft and human approval before sending.</li>
          <li>Customer support follow-ups for Cossa Store, NexDocs and Cossa Growth.</li>
          <li>Opt-in marketing contacts only; unsubscribed contacts remain excluded.</li>
          <li>Due-date reminders and escalation summaries without exposing passwords or API keys.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5 text-sm text-muted-foreground">
        Next: create a dedicated Truehost mailbox for operations, store its credential only as a
        Supabase Edge Function secret, and connect it in approval-only mode. Do not place the
        current mailbox password in the browser, database, source code or chat.
      </section>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}
