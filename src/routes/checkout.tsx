import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth";
import { useCommerce } from "@/lib/commerce-store";
import { formatZar } from "@/lib/format";
import {
  startStoreEftPayment,
  submitEftProof,
  type EftPaymentDetail,
} from "@/services/eft-payments";

const TITLE = "Checkout | Cossa Store";
const DESCRIPTION =
  "Create a secure Cossa Store EFT payment request and submit proof of payment for review.";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),

  component: CheckoutPage,
});

function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-cossa-checkout`;
}

function CheckoutPage() {
  const { session, loading: authLoading } = useSession();
  const { cart, hydrated, clearCart } = useCommerce();
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [requestId] = useState(newRequestId);
  const [payment, setPayment] = useState<EftPaymentDetail | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [payerNote, setPayerNote] = useState("");
  const [starting, setStarting] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);

  useEffect(() => {
    const suggestedName = session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.display_name;
    if (!customerName && typeof suggestedName === "string") setCustomerName(suggestedName);
  }, [customerName, session?.user.user_metadata?.display_name, session?.user.user_metadata?.full_name]);

  const canStartPayment =
    Boolean(session?.user) &&
    hydrated &&
    cart.length > 0 &&
    acceptedPolicies &&
    customerName.trim().length >= 2 &&
    !starting;

  async function createPaymentRequest() {
    if (!canStartPayment) return;

    setStarting(true);
    try {
      const result = await startStoreEftPayment({
        customerName,
        customerPhone,
        clientRequestId: requestId,
        cart: cart.map((line) => ({ productId: line.product_id, quantity: line.quantity })),
      });
      setPayment(result);
      clearCart();
      toast.success("Your EFT order is ready", {
        description: "Use the exact amount and unique reference below, then upload your proof of payment.",
      });
    } catch (error) {
      toast.error("Your EFT order could not be created", {
        description: error instanceof Error ? error.message : "Please review your cart and try again.",
      });
    } finally {
      setStarting(false);
    }
  }

  async function uploadProof(event: React.FormEvent) {
    event.preventDefault();
    if (!payment || !proof) return;

    setSubmittingProof(true);
    try {
      const result = await submitEftProof({ paymentId: payment.payment.id, proof, payerNote });
      setPayment((current) =>
        current ? { ...current, payment: { ...current.payment, ...result.payment } } : current,
      );
      setProof(null);
      toast.success("Proof of payment submitted", { description: result.message });
    } catch (error) {
      toast.error("Proof of payment could not be submitted", {
        description: error instanceof Error ? error.message : "Please try again with a PDF, JPG or PNG file.",
      });
    } finally {
      setSubmittingProof(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Checkout" title="Secure EFT checkout" description={DESCRIPTION} />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <NoticeBlock tone="pending" title="Pay by EFT while online payments are being activated">
          Cossa Store will generate a unique payment reference and exact amount for this order. Your order is only paid after Cossa reviews your proof of payment; paid digital products are then released securely to your member account.
        </NoticeBlock>

        {payment ? (
          <>
            <section className="rounded-lg border border-primary/35 bg-card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Payment instructions</p>
                  <h2 className="mt-1 font-display text-xl font-semibold">Transfer {formatZar(payment.instructions.exactAmount)} exactly</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{payment.instructions.instruction}</p>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 rounded-md border border-border bg-background/40 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Bank</dt><dd className="mt-1 font-medium">{payment.instructions.bankName}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Account holder</dt><dd className="mt-1 font-medium">{payment.instructions.accountHolder}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Account type</dt><dd className="mt-1 font-medium">{payment.instructions.accountType}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Account number</dt><dd className="mt-1 break-all font-medium">{payment.instructions.accountNumber}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Branch code</dt><dd className="mt-1 font-medium">{payment.instructions.branchCode}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Unique reference</dt><dd className="mt-1 break-all font-semibold text-primary">{payment.instructions.reference}</dd></div>
              </dl>
            </section>

            {payment.order ? (
              <section className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">Order {payment.order.orderNumber}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Product details and pricing are fixed before you transfer payment.</p>
                  </div>
                  <span className="font-semibold text-primary">{formatZar(payment.order.total)}</span>
                </div>
                <ul className="mt-4 divide-y divide-border rounded-md border border-border">
                  {payment.order.items.map((item) => (
                    <li key={`${item.sku ?? item.productName}-${item.quantity}`} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                      <span className="min-w-0"><span className="block font-medium">{item.productName}</span><span className="mt-1 block text-xs text-muted-foreground">{item.sku ? `SKU ${item.sku} · ` : ""}Quantity {item.quantity}</span></span>
                      <span className="shrink-0 font-medium">{formatZar(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Upload proof of payment</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Upload the unaltered proof from your bank as a PDF, JPG or PNG (up to 10 MB). Cossa reviews the proof before dispatching goods, activating subscriptions or releasing digital downloads.</p>

              {payment.payment.status === "proof_submitted" ? (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-primary/35 bg-primary/5 p-4 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>Proof submitted. Your payment is awaiting Cossa review. We will not release the order before approval.</span>
                </div>
              ) : payment.payment.status === "approved" ? (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-primary/35 bg-primary/5 p-4 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>Payment approved. Digital downloads are available in <Link to="/account/orders" className="font-medium text-primary underline underline-offset-2">your account</Link>.</span>
                </div>
              ) : payment.payment.status === "expired" ? (
                <NoticeBlock tone="pending" title="This payment request has expired">Return to your cart and create a new EFT payment request before transferring funds.</NoticeBlock>
              ) : (
                <form className="mt-5 space-y-4" onSubmit={uploadProof}>
                  <div className="space-y-2">
                    <Label htmlFor="proof">Proof of payment</Label>
                    <Input id="proof" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={(event) => setProof(event.target.files?.[0] ?? null)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payer-note">Optional note for the reviewer</Label>
                    <textarea id="payer-note" value={payerNote} onChange={(event) => setPayerNote(event.target.value)} maxLength={1000} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="For example: payment made from a different account name." />
                  </div>
                  {payment.payment.reviewerNote ? <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">{payment.payment.reviewerNote}</p> : null}
                  <Button type="submit" disabled={!proof || submittingProof} className="w-full sm:w-auto">
                    {submittingProof ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    {submittingProof ? "Submitting proof…" : "Submit proof of payment"}
                  </Button>
                </form>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h2 className="font-display text-lg font-semibold">Order protection</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Prices, product descriptions and stock eligibility are confirmed on Cossa’s server before the EFT reference is issued. We never ask for a banking password, card PIN or online-banking security code.</p>
                </div>
              </div>
            </section>

            {!authLoading && !session ? (
              <NoticeBlock tone="pending" title="Sign in before creating an EFT order">
                Your order, payment proof and any digital download must stay attached to your account. <Link to="/auth" className="font-medium text-primary underline underline-offset-2">Sign in or create an account</Link> to continue.
              </NoticeBlock>
            ) : null}

            <section className="rounded-lg border border-primary/30 bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Terms acknowledgement</h2>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-current" />
                <span className="text-sm leading-relaxed text-muted-foreground">I agree to the <Link to="/terms" className="font-medium text-primary underline underline-offset-2">Terms and Conditions</Link>, <Link to="/returns" className="font-medium text-primary underline underline-offset-2">Returns & Refunds Policy</Link>, <Link to="/delivery" className="font-medium text-primary underline underline-offset-2">Shipping & Delivery Policy</Link> and <Link to="/privacy" className="font-medium text-primary underline underline-offset-2">Privacy Policy</Link>.</span>
              </label>
            </section>

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Create your EFT order</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your cart currently has {hydrated ? cart.length : "…"} product{hydrated && cart.length === 1 ? "" : "s"}. The exact total and product description are shown before you pay.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="customer-name">Full name</Label><Input id="customer-name" autoComplete="name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="customer-phone">Phone number (optional)</Label><Input id="customer-phone" type="tel" autoComplete="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" size="lg" disabled={!canStartPayment} onClick={() => void createPaymentRequest()}>{starting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}{starting ? "Preparing secure payment…" : "Create EFT payment request"}</Button>
                <Button asChild variant="outline" size="lg"><Link to="/cart">Back to cart</Link></Button>
              </div>
              {!hydrated || cart.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">Add active Cossa Store products to your cart before creating an EFT payment request.</p> : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
