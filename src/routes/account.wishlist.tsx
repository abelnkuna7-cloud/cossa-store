import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EmptyBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/lib/commerce-store";
import { productsByIdsQuery } from "@/lib/queries";

export const Route = createFileRoute("/account/wishlist")({
  component: AccountWishlist,
});

function AccountWishlist() {
  const { wishlist, hydrated } = useCommerce();
  const query = useQuery({
    ...productsByIdsQuery(wishlist),
    enabled: hydrated && wishlist.length > 0,
  });

  if (!hydrated) return <LoadingBlock label="Loading your wishlist…" />;

  if (wishlist.length === 0) {
    return (
      <EmptyBlock
        title="Your wishlist is empty"
        description="Save products while browsing to compare them later."
        action={
          <Button asChild>
            <Link to="/shop">Browse products</Link>
          </Button>
        }
      />
    );
  }

  if (query.isPending) return <LoadingBlock />;

  return <ProductGrid products={query.data ?? []} />;
}