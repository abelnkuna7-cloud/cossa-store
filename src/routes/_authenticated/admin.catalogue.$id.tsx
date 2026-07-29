import { createFileRoute } from "@tanstack/react-router";

import { CatalogueShell } from "@/components/admin/CatalogueShell";
import { ProductEditor } from "@/components/admin/ProductEditor";

export const Route = createFileRoute("/_authenticated/admin/catalogue/$id")({
  head: () => ({
    meta: [
      { title: "Edit product | Cossa internal" },
      { name: "description", content: "Edit a Cossa Store catalogue product." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  return (
    <CatalogueShell title="Edit product" description="Update details, media, variants, pricing and publication status.">
      <ProductEditor productId={id} />
    </CatalogueShell>
  );
}
