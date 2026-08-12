import { createFileRoute } from "@tanstack/react-router";

import { CatalogueShell } from "@/components/admin/CatalogueShell";
import { ProductEditor } from "@/components/admin/ProductEditor";

export const Route = createFileRoute(
  "/_authenticated/admin/catalogue/new",
)({
  head: () => ({
    meta: [
      {
        title: "Add product | Cossa Store Catalogue",
      },
      {
        name: "description",
        content:
          "Add and manage Cossa Store products, supplier products, dropshipping items, print-on-demand products, affiliate offers and digital products.",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),

  component: NewCatalogueProductPage,
});

function NewCatalogueProductPage() {
  return (
    <CatalogueShell
      title="Add a product"
      description="Add products without coding. Choose what you are adding, complete the guided steps, save as a draft and publish only after review."
    >
      <ProductEditor />
    </CatalogueShell>
  );
}
