import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/common/PolicyPage";

const TITLE = "Delivery information | Cossa Store";
const DESCRIPTION =
  "Delivery timelines, coverage and shipping arrangements for Cossa Store orders across South Africa.";

export const Route = createFileRoute("/delivery")({
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
      title="Delivery information"
      description={DESCRIPTION}
      sections={[
        {
          heading: "Delivery timelines",
          body: [
            "Estimated delivery is shown on every product page and depends on the fulfilment route. Cossa-held stock dispatches fastest, local supplier items follow supplier lead times, and internationally sourced items carry longer transit windows.",
            "Bulk, project and contract orders are scheduled with you directly at quotation stage.",
          ],
        },
        {
          heading: "Delivery areas",
          body: [
            "We deliver nationally within South Africa. Remote and outlying areas may carry additional transit time and delivery cost, which is confirmed before dispatch.",
          ],
        },
        {
          heading: "Delivery cost",
          body: [
            "Delivery is quoted per order based on weight, volume, destination and fulfilment route. Heavy construction materials are quoted separately from standard parcel items.",
          ],
        },
        {
          heading: "Receiving your order",
          body: [
            "Please inspect goods on delivery and report visible damage or shortages immediately so we can resolve it with the carrier.",
          ],
        },
      ]}
    />
  ),
});
