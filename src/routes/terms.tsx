import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/common/PolicyPage";
import { SITE } from "@/config/site";

const TITLE = "Terms and conditions | Cossa Store";
const DESCRIPTION =
  "The terms that apply when you browse, request a quote from, or buy through Cossa Store.";

export const Route = createFileRoute("/terms")({
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
      eyebrow="Legal"
      title="Terms and conditions"
      description={DESCRIPTION}
      sections={[
        {
          heading: "Agreement",
          body: [
            `By using this website you agree to these terms. Cossa Store is operated by ${SITE.parent}.`,
          ],
        },
        {
          heading: "Products and pricing",
          body: [
            "Prices are shown in South African Rand and include VAT at 15% unless stated otherwise. We take care to keep pricing, specifications and availability accurate, but errors can occur; we may correct a price or decline an order before it is confirmed.",
            "Product images and descriptions are indicative. Where exact specification matters, confirm with our team before ordering.",
          ],
        },
        {
          heading: "Quotations",
          body: [
            "Quotations are prepared by our team and are valid for the period stated on the quotation. A quotation is not an order until confirmed in writing by both parties.",
          ],
        },
        {
          heading: "Orders and payment",
          body: [
            "Online payment processing is not yet enabled on this platform. Orders are confirmed and payment arrangements agreed directly with our team.",
          ],
        },
        {
          heading: "Business accounts",
          body: [
            "Business account applications are subject to verification and approval. Credit terms, where offered, are granted at our discretion and confirmed in writing.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "Our liability is limited to the value of the goods supplied. Nothing in these terms limits your rights under the Consumer Protection Act.",
          ],
        },
        {
          heading: "Governing law",
          body: ["These terms are governed by the laws of the Republic of South Africa."],
        },
      ]}
    />
  ),
});