import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorBlock({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function NoticeBlock({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "pending";
  title: string;
  children?: ReactNode;
}) {
  let displayTitle = title;
  let displayChildren = children;

  if (title === "Secure EFT checkout is available") {
    displayTitle = "Secure checkout available";
    displayChildren = (
      <>
        Choose Yoco card payment or EFT at checkout. Cossa Store confirms your order total and
        delivery securely before payment.
      </>
    );
  } else if (title === "Sign in before creating an EFT order") {
    displayTitle = "Sign in to continue checkout";
    displayChildren = (
      <>
        Sign in or create an account so your order, payment and any digital downloads stay securely
        linked to you.
      </>
    );
  } else if (title === "EFT and Yoco test checkout") {
    displayTitle = "Secure Yoco and EFT checkout";
    displayChildren = (
      <>
        Pay securely by Yoco card checkout or EFT. Cossa Store confirms prices, delivery and order
        totals before payment.
      </>
    );
  } else if (title === "Yoco test checkout") {
    displayTitle = "Yoco payment status";
  }

  const toneClass =
    tone === "pending" ? "border-accent/50 bg-accent/10" : "border-border bg-secondary";
  return (
    <div className={`rounded-lg border px-4 py-4 text-sm ${toneClass}`}>
      <p className="font-semibold">{displayTitle}</p>
      {displayChildren ? <div className="mt-1 text-muted-foreground">{displayChildren}</div> : null}
    </div>
  );
}
