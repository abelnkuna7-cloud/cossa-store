import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoles, useSession } from "@/lib/auth";
import { useCommerce } from "@/lib/commerce-store";
import {
  checkoutQuoteFingerprint,
  deliveryAddressErrors,
  isCompleteDeliveryAddress,
  requiresPhysicalDelivery,
  SOUTH_AFRICAN_PROVINCES,
} from "@/lib/checkout-delivery";
import { formatZar } from "@/lib/format";
import { productsByIdsQuery } from "@/lib/queries";
import {
  confirmStoreDelivery,
  listMyStoreDeliveryQuoteRequests,
  quoteStoreEftCheckout,
  requestStoreDeliveryQuote,
  startStoreEftPayment,
  submitEftProof,
  type EftPaymentDetail,
  type StoreCheckoutQuote,
  type StoreDeliveryQuoteRequest,
} from "@/services/eft-payments";
import {
  getStoreYocoTestAttempt,
  recordStoreYocoTestReturn,
  startStoreYocoTestCheckout,
} from "@/services/yoco-payments";

const TITLE = "Checkout | Cossa Store";
const DESCRIPTION = "Create a secure Cossa Store EFT payment request or Yoco test card checkout.";

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
  const roles = useRoles(session?.user.id);
  const canTestYoco = (roles.data ?? []).includes("admin");
  const { selectedCartLines, hydrated, removePaidCartLines } = useCommerce();
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [zip, setZip] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [requestId] = useState(newRequestId);
  const [quote, setQuote] = useState<StoreCheckoutQuote["quote"] | null>(null);
  const [quotedFor, setQuotedFor] = useState<string | null>(null);
  const [quoteProblem, setQuoteProblem] = useState<string | null>(null);
  const [payment, setPayment] = useState<EftPaymentDetail | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"eft" | "yoco">("eft");
  const [yocoReturnMessage, setYocoReturnMessage] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [payerNote, setPayerNote] = useState("");
  const [starting, setStarting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [deliveryEvidence, setDeliveryEvidence] = useState("");
  const [requestingDeliveryQuote, setRequestingDeliveryQuote] = useState(false);
  const [submittedDeliveryQuote, setSubmittedDeliveryQuote] =
    useState<StoreDeliveryQuoteRequest | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  useEffect(() => {
    const suggestedName =
      session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.display_name;
    if (!customerName && typeof suggestedName === "string") setCustomerName(suggestedName);
  }, [
    customerName,
    session?.user.user_metadata?.display_name,
    session?.user.user_metadata?.full_name,
  ]);

  useEffect(() => {
    if (!canTestYoco && paymentMethod === "yoco") setPaymentMethod("eft");
  }, [canTestYoco, paymentMethod]);

  useEffect(() => {
    if (!session?.user || typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    const attemptId = search.get("yocoAttemptId");
    const returnState = search.get("yoco");
    if (
      !attemptId ||
      (returnState !== "success" && returnState !== "cancelled" && returnState !== "failed")
    ) {
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const returned = await recordStoreYocoTestReturn(attemptId, returnState);
        const latest = await getStoreYocoTestAttempt(attemptId);
        if (!mounted) return;
        if (latest.attempt.status === "succeeded") {
          setYocoReturnMessage(
            "Your Yoco test payment was verified by its signed webhook. Test mode does not release fulfilment, digital goods or stock.",
          );
          toast.success("Yoco test payment verified");
        } else if (returnState === "success") {
          setYocoReturnMessage(
            "Yoco returned you successfully. We are waiting for Yoco’s signed webhook before treating the test payment as verified.",
          );
        } else if (returned.attempt.status === "cancelled") {
          setYocoReturnMessage(
            "Yoco test checkout was cancelled. No payment was taken and your cart is unchanged.",
          );
        } else {
          setYocoReturnMessage(
            "Yoco did not complete the test checkout. No payment was taken and your cart is unchanged.",
          );
        }
      } catch (error) {
        if (mounted) {
          setYocoReturnMessage(
            error instanceof Error
              ? error.message
              : "We could not confirm the Yoco checkout return.",
          );
        }
      } finally {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session?.user]);

  const productIds = useMemo(
    () => Array.from(new Set(selectedCartLines.map((line) => line.product_id))),
    [selectedCartLines],
  );
  const cartProductsQuery = useQuery({
    ...productsByIdsQuery(productIds),
    enabled: hydrated && productIds.length > 0,
  });
  const myDeliveryQuotesQuery = useQuery({
    queryKey: ["checkout", "my-delivery-quote-requests", session?.user.id],
    queryFn: listMyStoreDeliveryQuoteRequests,
    enabled: Boolean(session?.user),
    staleTime: 15_000,
  });
  const cartProducts = cartProductsQuery.data ?? [];
  const cartProductsResolved =
    hydrated &&
    !cartProductsQuery.isPending &&
    !cartProductsQuery.isError &&
    cartProducts.length === productIds.length;
  const requiresDelivery = cartProductsResolved && cartProducts.some(requiresPhysicalDelivery);
  const deliveryAddress = useMemo(
    () => ({
      address1,
      address2,
      suburb,
      city,
      region,
      zip,
      country: "ZA" as const,
      deliveryInstructions,
    }),
    [address1, address2, city, deliveryInstructions, region, suburb, zip],
  );
  const addressErrors = deliveryAddressErrors(deliveryAddress);
  const hasDeliveryAddress = isCompleteDeliveryAddress(deliveryAddress);
  const quoteFingerprint = useMemo(
    () =>
      checkoutQuoteFingerprint({
        cart: selectedCartLines,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: requiresDelivery ? deliveryAddress : null,
      }),
    [customerName, customerPhone, deliveryAddress, requiresDelivery, selectedCartLines],
  );
  const activeQuote = quote && quotedFor === quoteFingerprint ? quote : null;

  const canQuote =
    Boolean(session?.user) &&
    hydrated &&
    selectedCartLines.length > 0 &&
    cartProductsResolved &&
    customerName.trim().length >= 2 &&
    (!requiresDelivery || hasDeliveryAddress) &&
    !quoting;

  const canRequestQuote =
    Boolean(session?.user) &&
    hydrated &&
    selectedCartLines.length > 0 &&
    cartProductsResolved &&
    !quoting;

  const canRequestStaffDeliveryQuote =
    canQuote && requiresDelivery && !requestingDeliveryQuote && !activeQuote;

  const canStartPayment =
    Boolean(session?.user) &&
    hydrated &&
    selectedCartLines.length > 0 &&
    cartProductsResolved &&
    acceptedPolicies &&
    customerName.trim().length >= 2 &&
    Boolean(activeQuote) &&
    !starting;

  function invalidateQuote() {
    setQuote(null);
    setQuotedFor(null);
    setQuoteProblem(null);
    setSubmittedDeliveryQuote(null);
  }

  async function calculateQuote() {
    setShowAddressErrors(true);
    if (!canQuote) {
      if (!session?.user) {
        toast.error("Sign in to confirm your order total.");
      } else if (!cartProductsResolved) {
        toast.error("Your cart is still being checked. Please try again shortly.");
      } else if (customerName.trim().length < 2) {
        toast.error("Enter your full name before confirming the order total.");
      }
      return;
    }

    setQuoting(true);
    setQuote(null);
    setQuoteProblem(null);
    try {
      const result = await quoteStoreEftCheckout({
        customerName,
        customerPhone,
        clientRequestId: requestId,
        cart: selectedCartLines.map((line) => ({
          productId: line.product_id,
          variantId: line.variant_id,
          quantity: line.quantity,
        })),
        shippingAddress: requiresDelivery ? deliveryAddress : undefined,
      });
      setQuote(result.quote);
      setQuotedFor(quoteFingerprint);
      toast.success("Order total confirmed", {
        description: "The delivery amount and total were checked securely before payment.",
      });
    } catch (error) {
      setQuotedFor(null);
      const message =
        error instanceof Error ? error.message : "Please review your checkout details.";
      setQuoteProblem(message);
      toast.error("Delivery total needs attention", {
        description: message,
      });
    } finally {
      setQuoting(false);
    }
  }

  async function confirmDeliveryEligibility() {
    setShowAddressErrors(true);
    if (!canTestYoco || !canQuote || !requiresDelivery || deliveryEvidence.trim().length < 3) {
      if (deliveryEvidence.trim().length < 3) {
        toast.error("Record the carrier or supplier evidence before confirming delivery.");
      }
      return;
    }

    setConfirmingDelivery(true);
    setQuoteProblem(null);
    try {
      const result = await confirmStoreDelivery({
        evidenceNote: deliveryEvidence,
        cart: selectedCartLines.map((line) => ({
          productId: line.product_id,
          variantId: line.variant_id,
          quantity: line.quantity,
        })),
        shippingAddress: deliveryAddress,
      });
      if (!result.quote) {
        throw new Error("The verified delivery rate could not be applied to this order.");
      }
      setQuote(result.quote);
      setQuotedFor(quoteFingerprint);
      toast.success("Delivery eligibility recorded", {
        description:
          "The verified delivery total is valid for this exact cart and address for 24 hours.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The delivery eligibility check could not be recorded.";
      setQuoteProblem(message);
      toast.error("Delivery eligibility needs attention", { description: message });
    } finally {
      setConfirmingDelivery(false);
    }
  }

  async function requestStaffDeliveryQuote() {
    setShowAddressErrors(true);
    if (!canRequestStaffDeliveryQuote) {
      if (customerName.trim().length < 2) {
        toast.error("Enter your full name before requesting a delivery quote.");
      }
      return;
    }

    setRequestingDeliveryQuote(true);
    setQuoteProblem(null);
    try {
      const result = await requestStoreDeliveryQuote({
        customerName,
        customerPhone,
        // Quote requests use their own idempotency key. A later address or
        // cart change must be able to create a separate exact-scope request.
        clientRequestId: newRequestId(),
        cart: selectedCartLines.map((line) => ({
          productId: line.product_id,
          variantId: line.variant_id,
          quantity: line.quantity,
        })),
        shippingAddress: deliveryAddress,
      });
      setSubmittedDeliveryQuote(result.request);
      void myDeliveryQuotesQuery.refetch();
      toast.success("Delivery quote requested", {
        description: "Cossa staff will verify the carrier charge for this exact cart and address.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Your delivery quote request could not be submitted.";
      setQuoteProblem(message);
      toast.error("Delivery quote needs attention", { description: message });
    } finally {
      setRequestingDeliveryQuote(false);
    }
  }

  async function createPaymentRequest() {
    if (!canStartPayment) return;

    setStarting(true);
    try {
      const checkoutInput = {
        customerName,
        customerPhone,
        clientRequestId: requestId,
        cart: selectedCartLines.map((line) => ({
          productId: line.product_id,
          variantId: line.variant_id,
          quantity: line.quantity,
        })),
        shippingAddress: requiresDelivery ? deliveryAddress : undefined,
      };
      if (paymentMethod === "yoco") {
        const result = await startStoreYocoTestCheckout(checkoutInput);
        window.location.assign(result.redirectUrl);
        return;
      }
      const result = await startStoreEftPayment({
        ...checkoutInput,
      });
      setPayment(result);
      removePaidCartLines(selectedCartLines);
      toast.success("Your EFT order is ready", {
        description:
          "Use the exact amount and unique reference below, then upload your proof of payment.",
      });
    } catch (error) {
      toast.error(
        paymentMethod === "yoco"
          ? "Yoco checkout could not be created"
          : "Your EFT order could not be created",
        {
          description:
            error instanceof Error ? error.message : "Please review your cart and try again.",
        },
      );
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
        description:
          error instanceof Error ? error.message : "Please try again with a PDF, JPG or PNG file.",
      });
    } finally {
      setSubmittingProof(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Checkout" title="Secure checkout" description={DESCRIPTION} />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <NoticeBlock tone="pending" title="EFT and Yoco test checkout">
          EFT remains available. Yoco card checkout is in test mode: a signed Yoco webhook, never a
          browser redirect, is required before a test payment is considered verified. Test payments
          cannot release fulfilment, digital goods or stock.
        </NoticeBlock>

        {yocoReturnMessage ? (
          <NoticeBlock tone="pending" title="Yoco test checkout">
            {yocoReturnMessage}
          </NoticeBlock>
        ) : null}

        {payment ? (
          <>
            <section className="rounded-lg border border-primary/35 bg-card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Payment instructions
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold">
                    Transfer {formatZar(payment.instructions.exactAmount)} exactly
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {payment.instructions.instruction}
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 rounded-md border border-border bg-background/40 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Bank</dt>
                  <dd className="mt-1 font-medium">{payment.instructions.bankName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account holder</dt>
                  <dd className="mt-1 font-medium">{payment.instructions.accountHolder}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account type</dt>
                  <dd className="mt-1 font-medium">{payment.instructions.accountType}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account number</dt>
                  <dd className="mt-1 break-all font-medium">
                    {payment.instructions.accountNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Branch code</dt>
                  <dd className="mt-1 font-medium">{payment.instructions.branchCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Unique reference</dt>
                  <dd className="mt-1 break-all font-semibold text-primary">
                    {payment.instructions.reference}
                  </dd>
                </div>
              </dl>
            </section>

            {payment.order ? (
              <section className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      Order {payment.order.orderNumber}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Product details, delivery and pricing are fixed before you transfer payment.
                    </p>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatZar(payment.order.total)}
                  </span>
                </div>
                <ul className="mt-4 divide-y divide-border rounded-md border border-border">
                  {payment.order.items.map((item) => (
                    <li
                      key={`${item.sku ?? item.productName}-${item.variantTitle ?? "base"}-${item.quantity}`}
                      className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{item.productName}</span>
                        {item.variantTitle ? (
                          <span className="mt-1 block text-xs font-medium text-primary">
                            {item.variantTitle}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.sku ? `SKU ${item.sku} · ` : ""}Quantity {item.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">{formatZar(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Products</dt>
                    <dd>{formatZar(payment.order.subtotal)}</dd>
                  </div>
                  {payment.order.requiresDelivery ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">
                        Delivery
                        {payment.order.shippingMethod ? ` · ${payment.order.shippingMethod}` : ""}
                      </dt>
                      <dd>{formatZar(payment.order.shippingTotal)}</dd>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Delivery</dt>
                      <dd>Digital delivery</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
                    <dt>Total</dt>
                    <dd>{formatZar(payment.order.total)}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Upload proof of payment</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Upload the unaltered proof from your bank as a PDF, JPG or PNG (up to 10 MB). Cossa
                reviews the proof before dispatching goods, activating subscriptions or releasing
                digital downloads.
              </p>

              {payment.payment.status === "proof_submitted" ? (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-primary/35 bg-primary/5 p-4 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    Proof submitted. Your payment is awaiting Cossa review. We will not release the
                    order before approval.
                  </span>
                </div>
              ) : payment.payment.status === "approved" ? (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-primary/35 bg-primary/5 p-4 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    Payment approved. Digital downloads are available in{" "}
                    <Link
                      to="/account/orders"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      your account
                    </Link>
                    .
                  </span>
                </div>
              ) : payment.payment.status === "expired" ? (
                <NoticeBlock tone="pending" title="This payment request has expired">
                  Return to your cart and create a new EFT payment request before transferring
                  funds.
                </NoticeBlock>
              ) : (
                <form className="mt-5 space-y-4" onSubmit={uploadProof}>
                  <div className="space-y-2">
                    <Label htmlFor="proof">Proof of payment</Label>
                    <Input
                      id="proof"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      required
                      onChange={(event) => setProof(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payer-note">Optional note for the reviewer</Label>
                    <textarea
                      id="payer-note"
                      value={payerNote}
                      onChange={(event) => setPayerNote(event.target.value)}
                      maxLength={1000}
                      className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="For example: payment made from a different account name."
                    />
                  </div>
                  {payment.payment.reviewerNote ? (
                    <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                      {payment.payment.reviewerNote}
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={!proof || submittingProof}
                    className="w-full sm:w-auto"
                  >
                    {submittingProof ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" />
                    )}
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
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Prices, selected product options, delivery and stock eligibility are confirmed
                    on Cossa’s server before the EFT reference is issued. We never ask for a banking
                    password, card PIN or online-banking security code.
                  </p>
                </div>
              </div>
            </section>

            {!authLoading && !session ? (
              <NoticeBlock tone="pending" title="Sign in before creating an EFT order">
                Your order, payment proof and any digital download must stay attached to your
                account.{" "}
                <Link to="/auth" className="font-medium text-primary underline underline-offset-2">
                  Sign in or create an account
                </Link>{" "}
                to continue.
              </NoticeBlock>
            ) : null}

            <section className="rounded-lg border border-primary/30 bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Terms acknowledgement</h2>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedPolicies}
                  onChange={(event) => setAcceptedPolicies(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-current"
                />
                <span className="text-sm leading-relaxed text-muted-foreground">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Terms and Conditions
                  </Link>
                  ,{" "}
                  <Link
                    to="/returns"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Returns & Refunds Policy
                  </Link>
                  ,{" "}
                  <Link
                    to="/delivery"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Shipping & Delivery Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </section>

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Create your order</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This order contains {hydrated ? selectedCartLines.length : "…"} selected product
                {hydrated && selectedCartLines.length === 1 ? "" : "s"}. Products left in your cart
                are not sent to checkout. The exact product and delivery total is confirmed securely
                before you pay.
              </p>

              {session?.user.email ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Your signed-in email, {session.user.email}, will be used for this order.
                </p>
              ) : null}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Full name</Label>
                  <Input
                    id="customer-name"
                    autoComplete="name"
                    required
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value);
                      invalidateQuote();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone number</Label>
                  <Input
                    id="customer-phone"
                    type="tel"
                    autoComplete="tel"
                    value={customerPhone}
                    onChange={(event) => {
                      setCustomerPhone(event.target.value);
                      invalidateQuote();
                    }}
                  />
                </div>
              </div>

              {cartProductsQuery.isError ? (
                <NoticeBlock tone="pending" title="Your cart needs attention">
                  We could not verify the delivery requirements for every cart item. Return to your
                  cart and try again before requesting payment.
                </NoticeBlock>
              ) : null}

              {requiresDelivery ? (
                <div className="mt-6 rounded-md border border-border bg-background/40 p-4">
                  <h3 className="font-semibold">South African delivery address</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This address is required for physical products. Delivery is confirmed securely
                    using your exact cart and address before a payment amount can be issued.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address1">Street address</Label>
                      <Input
                        id="address1"
                        autoComplete="address-line1"
                        required
                        aria-invalid={showAddressErrors && Boolean(addressErrors.address1)}
                        aria-describedby={addressErrors.address1 ? "address1-error" : undefined}
                        value={address1}
                        onChange={(event) => {
                          setAddress1(event.target.value);
                          invalidateQuote();
                        }}
                      />
                      {showAddressErrors && addressErrors.address1 ? (
                        <p id="address1-error" className="text-xs text-destructive">
                          {addressErrors.address1}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address2">
                        Complex, unit or additional address (optional)
                      </Label>
                      <Input
                        id="address2"
                        autoComplete="address-line2"
                        value={address2}
                        onChange={(event) => {
                          setAddress2(event.target.value);
                          invalidateQuote();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suburb">Suburb</Label>
                      <Input
                        id="suburb"
                        autoComplete="address-level3"
                        required
                        aria-invalid={showAddressErrors && Boolean(addressErrors.suburb)}
                        aria-describedby={addressErrors.suburb ? "suburb-error" : undefined}
                        value={suburb}
                        onChange={(event) => {
                          setSuburb(event.target.value);
                          invalidateQuote();
                        }}
                      />
                      {showAddressErrors && addressErrors.suburb ? (
                        <p id="suburb-error" className="text-xs text-destructive">
                          {addressErrors.suburb}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City / town</Label>
                      <Input
                        id="city"
                        autoComplete="address-level2"
                        required
                        aria-invalid={showAddressErrors && Boolean(addressErrors.city)}
                        aria-describedby={addressErrors.city ? "city-error" : undefined}
                        value={city}
                        onChange={(event) => {
                          setCity(event.target.value);
                          invalidateQuote();
                        }}
                      />
                      {showAddressErrors && addressErrors.city ? (
                        <p id="city-error" className="text-xs text-destructive">
                          {addressErrors.city}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Province</Label>
                      <select
                        id="region"
                        autoComplete="address-level1"
                        required
                        aria-invalid={showAddressErrors && Boolean(addressErrors.region)}
                        aria-describedby={addressErrors.region ? "region-error" : undefined}
                        value={region}
                        onChange={(event) => {
                          setRegion(event.target.value);
                          invalidateQuote();
                        }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select province</option>
                        {SOUTH_AFRICAN_PROVINCES.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                      {showAddressErrors && addressErrors.region ? (
                        <p id="region-error" className="text-xs text-destructive">
                          {addressErrors.region}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">Postal code</Label>
                      <Input
                        id="zip"
                        autoComplete="postal-code"
                        inputMode="numeric"
                        required
                        aria-invalid={showAddressErrors && Boolean(addressErrors.zip)}
                        aria-describedby={addressErrors.zip ? "zip-error" : undefined}
                        value={zip}
                        onChange={(event) => {
                          setZip(event.target.value);
                          invalidateQuote();
                        }}
                      />
                      {showAddressErrors && addressErrors.zip ? (
                        <p id="zip-error" className="text-xs text-destructive">
                          {addressErrors.zip}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input value="South Africa" disabled />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="delivery-instructions">
                        Delivery instructions (optional)
                      </Label>
                      <textarea
                        id="delivery-instructions"
                        value={deliveryInstructions}
                        onChange={(event) => {
                          setDeliveryInstructions(event.target.value);
                          invalidateQuote();
                        }}
                        maxLength={500}
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="For example: gate code, unit number or reception instructions."
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <section
                className="mt-6 rounded-md border border-border bg-background/40 p-4"
                aria-live="polite"
              >
                <h3 className="font-semibold">Order summary</h3>
                {activeQuote ? (
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Products</dt>
                      <dd>{formatZar(activeQuote.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">
                        Delivery
                        {activeQuote.shippingMethod ? ` · ${activeQuote.shippingMethod}` : ""}
                      </dt>
                      <dd>
                        {activeQuote.requiresDelivery
                          ? formatZar(activeQuote.shippingTotal)
                          : "Digital delivery"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
                      <dt>Total</dt>
                      <dd>{formatZar(activeQuote.total)}</dd>
                    </div>
                  </dl>
                ) : (
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Products</dt>
                      <dd>Confirmed securely</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Delivery</dt>
                      <dd>{requiresDelivery ? "Needs verified quote" : "Digital delivery"}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
                      <dt>Total</dt>
                      <dd>To be confirmed</dd>
                    </div>
                  </dl>
                )}
                {requiresDelivery && !activeQuote ? (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    A customer-paid delivery fee must be verified before a payment request can be
                    issued. Cossa Store does not assume free delivery.
                  </p>
                ) : null}
                {quoteProblem ? (
                  <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
                    {quoteProblem}
                  </p>
                ) : null}
                {requiresDelivery && !activeQuote && !canTestYoco ? (
                  <section className="mt-4 rounded-md border border-primary/35 bg-primary/5 p-4">
                    <h4 className="font-medium">Request a staff delivery quote</h4>
                    {submittedDeliveryQuote?.status === "requested" ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Your request has been sent to Cossa staff. We will verify the carrier charge
                        for this exact cart and address before payment is enabled.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        A Cossa administrator will check the current carrier or supplier rate,
                        destination eligibility and packed parcel requirements. Payment remains
                        unavailable until that verified amount is attached to this exact cart and
                        address.
                      </p>
                    )}
                    <Button
                      className="mt-3"
                      type="button"
                      variant="outline"
                      disabled={!canRequestStaffDeliveryQuote}
                      onClick={() => void requestStaffDeliveryQuote()}
                    >
                      {requestingDeliveryQuote ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {requestingDeliveryQuote
                        ? "Sending delivery request…"
                        : submittedDeliveryQuote?.status === "requested"
                          ? "Delivery quote requested"
                          : "Request delivery quote"}
                    </Button>
                    {myDeliveryQuotesQuery.data?.requests.some(
                      (request) => request.status === "requested",
                    ) && !submittedDeliveryQuote ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        You also have a delivery quote request awaiting review. If Cossa approves a
                        quote for this exact cart and address, select “Confirm delivery &amp; total”
                        again to load it.
                      </p>
                    ) : null}
                  </section>
                ) : null}
                {canTestYoco && requiresDelivery && !activeQuote ? (
                  <section className="mt-4 rounded-md border border-primary/35 bg-primary/5 p-4">
                    <h4 className="font-medium">Administrator delivery confirmation</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Use this only after you have verified the current supplier or carrier rate,
                      the exact destination, and that the packed parcel meets its delivery rules.
                      Cossa Store still determines the price on the server; this form cannot set or
                      override a delivery fee.
                    </p>
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="delivery-evidence">Verification evidence</Label>
                      <textarea
                        id="delivery-evidence"
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        maxLength={2000}
                        placeholder="For example: Supplier quote reference, carrier eligibility result, and parcel check."
                        value={deliveryEvidence}
                        onChange={(event) => setDeliveryEvidence(event.target.value)}
                      />
                    </div>
                    <Button
                      className="mt-3"
                      type="button"
                      variant="outline"
                      disabled={
                        confirmingDelivery || !canQuote || deliveryEvidence.trim().length < 3
                      }
                      onClick={() => void confirmDeliveryEligibility()}
                    >
                      {confirmingDelivery ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {confirmingDelivery
                        ? "Recording delivery check…"
                        : "Record verified delivery check"}
                    </Button>
                  </section>
                ) : null}
              </section>

              <fieldset className="mt-5 space-y-3 rounded-md border border-border bg-background/40 p-4">
                <legend className="px-1 text-sm font-semibold">Payment method</legend>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="payment-method"
                    checked={paymentMethod === "eft"}
                    onChange={() => setPaymentMethod("eft")}
                    className="mt-1 accent-current"
                  />
                  <span>
                    <span className="font-medium">EFT bank transfer</span>
                    <span className="mt-1 block text-muted-foreground">
                      Receive Cossa banking details and upload proof for review.
                    </span>
                  </span>
                </label>
                {canTestYoco ? (
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={paymentMethod === "yoco"}
                      onChange={() => setPaymentMethod("yoco")}
                      className="mt-1 accent-current"
                    />
                    <span>
                      <span className="font-medium">Yoco card checkout — test mode</span>
                      <span className="mt-1 block text-muted-foreground">
                        Staff-only test path. Yoco hosts the card form; Cossa Store never receives
                        card details.
                      </span>
                    </span>
                  </label>
                ) : null}
              </fieldset>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={!canRequestQuote}
                  onClick={() => void calculateQuote()}
                >
                  {quoting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {quoting ? "Confirming total…" : "Confirm delivery & total"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={!canStartPayment}
                  onClick={() => void createPaymentRequest()}
                >
                  {starting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {starting
                    ? paymentMethod === "yoco"
                      ? "Opening Yoco test checkout…"
                      : "Creating EFT request…"
                    : paymentMethod === "yoco"
                      ? "Continue to Yoco test checkout"
                      : "Create EFT payment request"}
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/cart">Back to cart</Link>
                </Button>
              </div>
              {!hydrated || selectedCartLines.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Select active Cossa Store products in your cart before creating a payment request.
                </p>
              ) : null}
              {activeQuote && !acceptedPolicies ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Accept the Store terms above before creating your EFT payment request.
                </p>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
