import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrder } from "@/services/account.service";

export const Route = createFileRoute("/account/orders")({
  component: AccountOrders,
});

function AccountOrders() {
  const [message, setMessage] = useState<string | null>(null);

  async function handleTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await trackOrder(String(form.get("reference") ?? ""));
    setMessage(result.message);
  }

  return (
    <div className="space-y-6">
      <NoticeBlock tone="pending" title="Order history is not available yet">
        Orders will appear here once online ordering and customer accounts are connected. Quote and
        application references you have submitted are shown on their confirmation screens.
      </NoticeBlock>

      <form className="max-w-md space-y-3 rounded-lg border border-border bg-card p-6" onSubmit={handleTrack}>
        <h2 className="font-display text-lg font-semibold">Track an order or reference</h2>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference number</Label>
          <Input id="reference" name="reference" placeholder="e.g. QR-2026-0001" />
        </div>
        <Button type="submit">Track</Button>
        {message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}