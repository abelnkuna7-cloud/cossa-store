import { createFileRoute } from "@tanstack/react-router";

import { CatalogueShell } from "@/components/admin/CatalogueShell";
import { ProductEditor } from "@/components/admin/ProductEditor";

export const Route = createFileRoute("/_authenticated/admin/catalogue/new")({
  head: () => ({
    meta: [
      { title: "New product | Cossa internal" },
      { name: "description", content: "Capture a new Cossa Store product." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <CatalogueShell
      title="New product"
      description="Capture real product details manually. Drafts are never visible on the storefront."
    >
      <ProductEditor />
    </CatalogueShell>
  ),
});
