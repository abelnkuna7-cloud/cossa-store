import { Link, createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/config/seo";
import { PolicyPage } from "@/components/common/PolicyPage";
import { SITE } from "@/config/site";

const TITLE = "Security & Data Protection | Cossa Store";
const DESCRIPTION =
  "How Cossa Store protects customer accounts, orders and personal information through practical security controls.";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/security` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/security` }],
  }),
  component: () => (
    <PolicyPage
      eyebrow="Trust & Safety"
      title="Security & Data Protection"
      description={DESCRIPTION}
      sections={[ 
        { heading: "Last updated", body: ["5 September 2026"] },
        {
          heading: "Our commitment",
          body: [
            "Cossa Store is operated by Cossa Nexus Holdings (Pty) Ltd. We use reasonable technical and organisational safeguards to protect customer accounts, orders, delivery information and other personal information.",
            "Security is an ongoing responsibility. We review access, data handling and operational controls as the Store and its service providers change.",
          ],
        },
        {
          heading: "Accounts and access",
          body: [
            "Customer accounts are protected by password-based authentication and secure session controls. Internal administration is restricted to specifically approved Store administrators and is separated from ordinary customer access.",
            "Use a unique password, keep it private, sign out of shared devices and contact us promptly if you suspect unauthorised access.",
          ],
        },
        {
          heading: "Payments",
          body: [
            "Approved payment providers host or process card and banking transactions. Cossa Store does not ask for or intend to store complete card numbers, CVV codes, card PINs or online-banking passwords.",
            "We receive only the transaction details reasonably needed to confirm, reconcile, support or refund an order.",
          ],
        },
        {
          heading: "Personal information",
          body: [
            "We limit access to personal information to people and service providers who need it to operate the Store, support customers, process payments, arrange delivery, fulfil orders or meet legal obligations.",
            "Our Privacy Policy explains what information we collect, why we use it and the choices available to you.",
          ],
        },
        {
          heading: "Monitoring and response",
          body: [
            "We use authentication, access controls, secure connections, logging and monitoring appropriate to the Store's risks. Where we identify a security concern, we investigate it, contain it where possible and take reasonable follow-up action.",
            "No internet service can promise absolute security. Please report suspected account misuse, misleading Store content or a security weakness as soon as possible.",
          ],
        },
        {
          heading: "Report a security concern",
          body: [
            `Email ${SITE.email} with the affected page or account, what you observed and when it occurred. Do not include passwords, full card numbers, CVV codes, banking passwords or other secrets. We may contact you to verify the report and request safe supporting details.`,
          ],
        },
        {
          heading: "Related information",
          body: [
            "For personal-information rights, retention and sharing details, read the Privacy Policy. Store terms, delivery and returns information are available from the footer and checkout.",
          ],
        },
      ]}
      footer={
        <p className="text-sm text-muted-foreground">
          Read our <Link to="/privacy" className="underline">Privacy Policy</Link> for detailed information about personal data.
        </p>
      }
    />
  ),
});
