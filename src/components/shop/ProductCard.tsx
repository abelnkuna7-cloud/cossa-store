export function ProductGrid({ products }: { products: Product[] }) {
  const productionProducts = products.filter((product) => {
    if (product.is_demo) return false;

    if (
      product.publication_state &&
      product.publication_state !== "published"
    ) {
      return false;
    }

    if (
      product.visibility &&
      product.visibility !== "public"
    ) {
      return false;
    }

    if (product.status !== "active") {
      return false;
    }

    return true;
  });

  if (productionProducts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center sm:px-8 sm:py-14">
        <h3 className="text-lg font-semibold text-foreground">
          Products are being added
        </h3>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Our live catalogue is currently being prepared. If you need a
          specific product, business supply or project requirement, Cossa Store
          can help source it for you.
        </p>

        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/request-a-quote">
              Request a quote
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link to="/contact">
              Contact us
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {productionProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}
