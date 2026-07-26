import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/common/PolicyPage";
import { SITE } from "@/config/site";

const TITLE = "Privacy policy | Cossa Store";
const DESCRIPTION =
  "How Cossa Store collects, uses and protects your personal information under POPIA.";

export const Route = createFileRoute("/privacy")({
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
      title="Privacy policy"
      description={DESCRIPTION}
      sections={[
        {
          heading: "Who processes your information",
          body: [
            `Cossa Store is operated by ${SITE.parent}. This page is maintained by the Cossa Store team and explains how we handle personal information submitted through this website.`,
          ],
        },
        {
          heading: "Information we collect",
          body: [
            "We collect the information you enter into our forms: contact details, company details, delivery information and the description of your requirement. We collect this so we can respond to quote requests, applications and support enquiries.",
          ],
        },
        {
          heading: "Where your information is stored today",
          body: [
            "This platform is in its first phase. Form submissions are currently stored in your own browser on this device and are not transmitted to a Cossa Store server until our backend is connected. Anything you send us by email or WhatsApp is held in those systems.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "We use your information to prepare quotations, assess business and supplier applications, fulfil orders and respond to enquiries. We do not sell your personal information.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            `Under POPIA you may request access to, correction of, or deletion of your personal information. Contact ${SITE.email} to make a request.`,
          ],
        },
        {
          heading: "Cookies and analytics",
          body: [
            "This site uses browser storage to remember your cart, wishlist and quote basket. No third-party advertising or analytics trackers are installed at this stage.",
          ],
        },
      ]}
    />
  ),
});