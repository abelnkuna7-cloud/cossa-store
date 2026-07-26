import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/common/PolicyPage";

const TITLE = "Returns and refunds | Cossa Store";
const DESCRIPTION =
  "How to return a product to Cossa Store, what qualifies for a refund, and how warranty claims are handled.";

export const Route = createFileRoute("/returns")({
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
      eyebrow="Policies"
      title="Returns and refunds"
      description={DESCRIPTION}
      sections={[
        {
          heading: "Return window",
          body: [
            "Standard stocked products may be returned within 7 days of delivery if unused, in original packaging and in resaleable condition. Return eligibility is shown on each product page.",
          ],
        },
        {
          heading: "Non-returnable items",
          body: [
            "Custom, cut-to-size, special-order and internationally sourced items are generally non-returnable unless faulty. Consumables such as opened chemicals and sealants cannot be returned.",
          ],
        },
        {
          heading: "Faulty or incorrect goods",
          body: [
            "If an item arrives damaged, faulty or incorrect, contact us with your reference and photographs. We will arrange replacement, repair or refund in line with the Consumer Protection Act.",
          ],
        },
        {
          heading: "Warranty claims",
          body: [
            "Manufacturer warranty terms are shown per product where applicable. Warranty claims are handled through us and processed with the manufacturer or supplier.",
          ],
        },
        {
          heading: "Refunds",
          body: [
            "Approved refunds are processed to the original payment method once the returned goods are received and inspected. Delivery charges are refunded only where the return results from our error.",
          ],
        },
      ]}
    />
  ),
});