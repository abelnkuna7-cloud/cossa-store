import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock, LoadingBlock, NoticeBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/lib/commerce-store";
import { formatZar, vatPortion } from "@/lib/format";
import { productsByIdsQuery } from "@/lib/queries";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Shopping cart | Cossa Store" },
      { name: "description", content: "Review the products in your Cossa Store cart." },
      { property: "og:title", content: "Shopping cart | Cossa Store" },
      { property: "og:description", content: "Review the products in your Cossa Store cart." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, hydrated, setCartQuantity, removeFromCart, clearCart } = useCommerce();
  const ids = cart.map((l) => l.product_id);
  const query = useQuery({ ...productsByIdsQuery(ids), enabled: hydrated && ids.length > 0 });

  const products = query.data ?? [];
  const lines = cart
    .map((line) => {
      const product = products.find((p) => p.id === line.product_id);
      return product ? { line, product } : null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const total = lines.reduce((sum, l) => sum + l.product.selling_price * l.line.quantity, 0);

  return (
    <div>
      <PageHeader eyebrow="Cart" title="Shopping cart" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {!hydrated ? <LoadingBlock label="Loading your cart…" /> : null}

        {hydrated && cart.length === 0 ? (
          <EmptyBlock
            title="Your cart is empty"
            description="Browse the catalogue or request a quote for larger requirements."
            action={
              <Button asChild>
                <Link to="/shop">Shop products</Link>
              </Button>
            }
          />
        ) : null}

        {hydrated && cart.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {query.isPending ? <LoadingBlock /> : null}
              {lines.map(({ line, product }) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <Link
                      to="/product/$slug"
                      params={{ slug: product.slug }}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">SKU {product.sku}</p>
                    <p className="mt-1 text-sm">{formatZar(product.selling_price)} incl. VAT</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="sr-only" htmlFor={`qty-${product.id}`}>
                      Quantity for {product.name}
                    </label>
                    <input
                      id={`qty-${product.id}`}
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => setCartQuantity(product.id, Number(e.target.value))}
                      className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <span className="w-28 text-right font-medium">
                      {formatZar(product.selling_price * line.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${product.name}`}
                      onClick={() => removeFromCart(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={clearCart}>
                Clear cart
              </Button>
            </div>

            <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Order summary</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal (incl. VAT)</dt>
                  <dd>{formatZar(total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">VAT portion (15%)</dt>
                  <dd>{formatZar(vatPortion(total))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd>Quoted at checkout</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatZar(total)}</dd>
                </div>
              </dl>
              <Button asChild className="w-full" size="lg">
                <Link to="/checkout">Continue to checkout</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/request-a-quote">Request a quote instead</Link>
              </Button>
              <NoticeBlock tone="pending" title="Payments are not live yet">
                Online payment processing has not been connected. Checkout captures your order
                details only.
              </NoticeBlock>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
