import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/common/PolicyPage";
import { SITE } from "@/config/site";

const TITLE = "About Cossa Store | Cossa Nexus Holdings";
const DESCRIPTION =
  "Cossa Store is the retail division of Cossa Nexus Holdings, supplying construction, cleaning and technology products to homes and businesses in South Africa.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => (
    <PolicyPage
      eyebrow="About"
      title="About Cossa Store"
      description={SITE.positioning}
      sections={[
        {
          heading: "Who we are",
          body: [
            "Cossa Store is the product retail division of Cossa Nexus Holdings. We supply construction and DIY materials, cleaning and facility supplies, and technology and smart solutions to homeowners, contractors, facility teams and businesses.",
            "Our focus is practical supply: the right product, correctly specified, delivered when the job needs it.",
          ],
        },
        {
          heading: "How we supply",
          body: [
            "Products are supplied from Cossa-held stock, vetted local suppliers, and international sourcing partners depending on the item. Every product page shows its fulfilment route and estimated delivery so you know what to expect before ordering.",
            "For larger requirements we quote directly. Project and contract volumes are priced by our team rather than through standard retail pricing.",
          ],
        },
        {
          heading: "Part of a wider group",
          body: [
            "Cossa Nexus Holdings operates across products, services and intelligent solutions. Where a requirement extends beyond supply into installation, maintenance or systems work, we can route it to the relevant division.",
          ],
        },
        {
          heading: "Current status",
          body: [
            "This platform is in its first production phase. Catalogue, quoting and application workflows are live as capture flows; online payments, customer accounts and automated notifications are being connected next.",
          ],
        },
      ]}
    />
  ),
});
