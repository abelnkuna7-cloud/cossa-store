import { Link, createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/config/seo";
import { PolicyPage } from "@/components/common/PolicyPage";
import { SITE } from "@/config/site";

const TITLE = "Privacy Policy | Cossa Store";
const DESCRIPTION =
  "How Cossa Store collects, uses, stores, shares and protects personal information in accordance with South Africa's Protection of Personal Information Act.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/privacy` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),

  component: () => (
    <PolicyPage
      eyebrow="Legal & Privacy"
      title="Privacy Policy"
      description={DESCRIPTION}
      sections={[
        {
          heading: "Last updated",
          body: ["11 August 2026"],
        },

        {
          heading: "1. Who we are",
          body: [
            `Cossa Store is operated by ${SITE.parent}, registration number ${SITE.registrationNumber}, a company registered in the Republic of South Africa.`,
            "Cossa Store is the e-commerce division through which we may offer physical products, print-on-demand products, supplier-fulfilled or dropshipped products, digital products, business purchasing services and links to selected third-party or affiliate products.",
            `For purposes of applicable South African data-protection law, including the Protection of Personal Information Act 4 of 2013 ("POPIA"), ${SITE.parent} is responsible for determining how personal information collected through Cossa Store is processed, except where another party independently determines the purposes and means of processing.`,
            `You may contact us about privacy matters at ${SITE.email}.`,
          ],
        },

        {
          heading: "2. Personal information we may collect",
          body: [
            "Depending on how you interact with Cossa Store, we may collect personal information such as your name, surname, email address, telephone or WhatsApp number, billing address, delivery address and other contact information.",
            "When you place or attempt to place an order, we may collect order information including products purchased, quantities, selected variants, order references, transaction status, delivery preferences, returns, refunds and customer-service history.",
            "For business customers, quotation requests or business-account applications, we may collect company name, registration information, VAT information where applicable, procurement information, authorised-contact details and other information reasonably required to assess or service the business relationship.",
            "When you contact us by website form, email, WhatsApp or another support channel, we may collect the contents of your communication and information reasonably necessary to respond to your enquiry.",
            "We may also collect technical information such as IP address, browser type, device information, referring pages, session information, cookie identifiers and website usage information where these technologies are enabled.",
          ],
        },

        {
          heading: "3. Payment information",
          body: [
            "Payments made directly through Cossa Store may be processed by one or more approved third-party payment service providers.",
            "Where a payment provider hosts or processes the payment transaction, payment credentials such as full card details or banking credentials are handled by that provider according to its own security and privacy requirements.",
            "Cossa Store does not intend to store complete payment-card numbers, CVV security codes, card PINs or online-banking passwords on its own systems.",
            "We may receive transaction-related information from a payment provider, such as payment status, transaction reference, payment method, amount paid, refund status and fraud or verification indicators that are reasonably necessary to fulfil, reconcile or support your order.",
            "The payment methods available at checkout may change from time to time as merchant approvals, integrations and commercial arrangements change.",
          ],
        },

        {
          heading: "4. Why we process your information",
          body: [
            "We may process your personal information to create and manage orders, process transactions, arrange fulfilment and delivery, communicate order updates and provide customer support.",
            "We may use the information to prepare quotations, process business-account requests, manage supplier or procurement enquiries, handle returns, refunds, warranty claims and investigate delivery issues.",
            "We may process personal information to maintain and secure Cossa Store, prevent fraud or misuse, detect suspicious transactions, troubleshoot technical problems and protect our customers, systems and business.",
            "We may also process information for accounting, record keeping, tax, legal, regulatory and compliance purposes.",
            "Where you have consented or where otherwise permitted by law, we may use your contact details to send marketing communications about Cossa Store products, promotions, services or relevant Cossa Nexus Holdings offerings.",
          ],
        },

        {
          heading: "5. Lawful grounds for processing",
          body: [
            "We process personal information only where there is an appropriate lawful basis or justification under applicable law.",
            "Depending on the circumstances, processing may be necessary to enter into or perform a contract with you, comply with a legal obligation, pursue a legitimate business interest permitted by law, protect legitimate interests, or act with your consent.",
            "Where processing relies on consent, you may withdraw that consent subject to applicable law and any processing that remains necessary for another lawful reason.",
          ],
        },

        {
          heading: "6. How we may share personal information",
          body: [
            "We do not sell your personal information.",
            "We may share information with approved payment processors where necessary to process payments, refunds, fraud checks or transaction verification.",
            "We may share delivery information with couriers, logistics providers and delivery partners where necessary to deliver your order.",
            "Where a product is fulfilled by a print-on-demand provider, manufacturer, wholesaler, dropshipping supplier or other fulfilment partner, we may provide the minimum information reasonably required to manufacture, pack, personalise, dispatch or support that order.",
            "We may share information with hosting, database, authentication, email, analytics, security, customer-support and other technology providers that help us operate Cossa Store.",
            "We may disclose personal information where required or permitted by law, legal process, regulatory authority, law-enforcement authority or another competent authority.",
          ],
        },

        {
          heading: "7. Print-on-demand and supplier fulfilment",
          body: [
            "Some products may be produced or fulfilled by third-party print-on-demand, manufacturing, warehousing, supplier or dropshipping partners.",
            "Where this applies, customer information such as your name, delivery address, contact information, ordered product, size, colour, artwork or personalisation details may be shared with the fulfilment partner only to the extent reasonably necessary to produce, pack, dispatch, deliver or support the order.",
            "Different fulfilment partners may operate in South Africa or other countries. Where personal information must be transferred across borders, we will seek to handle such transfers in accordance with applicable data-protection requirements.",
          ],
        },

        {
          heading: "8. Affiliate and third-party purchases",
          body: [
            "Some Cossa Store pages may contain affiliate or partner links that direct you to an independent third-party retailer or marketplace.",
            "If you leave Cossa Store and complete a transaction on a third-party website, that third party will collect and process the personal information you provide to it under its own privacy policy and terms.",
            "Cossa Store does not control the independent privacy practices of third-party retailers or marketplaces and you should review their privacy information before completing a transaction.",
          ],
        },

        {
          heading: "9. Cookies, browser storage and analytics",
          body: [
            "Cossa Store may use cookies, local browser storage and similar technologies to operate functionality such as shopping carts, wishlists, quote baskets, session preferences and security features.",
            "We may also use privacy-conscious analytics or other measurement technologies to understand how customers use the website, measure performance, improve products and pages and detect technical problems.",
            "Some cookies may be strictly necessary for the website to function. Other cookies or tracking technologies may require consent depending on their purpose and applicable law.",
            "You can manage cookies through your browser settings. Disabling certain technologies may affect some website functionality.",
          ],
        },

        {
          heading: "10. Marketing communications",
          body: [
            "Where permitted by law, Cossa Store may send marketing messages by email, SMS, WhatsApp or another communication channel where you have consented or where an existing-customer relationship permits such communication.",
            "You may opt out of direct marketing at any time using an unsubscribe mechanism where provided or by contacting us.",
            "Opting out of marketing does not prevent us from sending transactional or service communications that are necessary to process or support an order.",
          ],
        },

        {
          heading: "11. Data security",
          body: [
            "We take reasonable technical and organisational measures to protect personal information against loss, misuse, unauthorised access, alteration, disclosure or destruction.",
            "These measures may include secure hosting, access controls, authentication, encryption in transit, restricted administrative access, logging, monitoring and the use of reputable payment and technology providers.",
            "No online platform or transmission method can be guaranteed to be completely secure. We therefore continually assess reasonable safeguards appropriate to the information and risks involved.",
          ],
        },

        {
          heading: "12. Data retention",
          body: [
            "We retain personal information only for as long as reasonably necessary for the purpose for which it was collected, to fulfil our contractual obligations, maintain business and transaction records, resolve disputes, prevent fraud, or comply with legal, tax, accounting and regulatory requirements.",
            "Retention periods may differ depending on the type of information and the reason it is being processed.",
            "When personal information is no longer required and there is no lawful reason to retain it, we will take reasonable steps to delete, destroy or de-identify it.",
          ],
        },

        {
          heading: "13. Your rights under POPIA",
          body: [
            "Subject to applicable law, you may request confirmation of whether we hold personal information about you and request access to that information.",
            "You may request correction or updating of personal information that is inaccurate, incomplete, misleading or outdated.",
            "You may request deletion or destruction of personal information where applicable and permitted by law.",
            "You may object to certain processing of your personal information and may object to direct marketing.",
            "Where processing is based on consent, you may withdraw your consent subject to applicable law.",
            `To exercise a privacy right, contact ${SITE.email}. We may need to verify your identity before acting on a request.`,
          ],
        },

        {
          heading: "14. Information relating to children",
          body: [
            "Cossa Store is intended primarily for adults and persons legally capable of entering into transactions.",
            "We do not knowingly seek to collect personal information directly from children without an appropriate lawful basis, consent or authorisation where required.",
            "If you believe that a child has submitted personal information to us inappropriately, contact us so we can investigate and take appropriate action.",
          ],
        },

        {
          heading: "15. International processing and cross-border transfers",
          body: [
            "Some technology, payment, print-on-demand, supplier, hosting or other service providers we use may process information outside South Africa.",
            "Where personal information is transferred outside South Africa, we will seek to ensure that the transfer is handled in accordance with applicable POPIA requirements and appropriate safeguards.",
          ],
        },

        {
          heading: "16. Information Officer and privacy contact",
          body: [
            `${SITE.parent} is responsible for managing its obligations under POPIA. Privacy enquiries, requests or complaints relating to Cossa Store may be submitted to ${SITE.email}.`,
            "Where required by POPIA, the responsible party's Information Officer performs the duties prescribed by law and applicable regulations.",
          ],
        },

        {
          heading: "17. Complaints to the Information Regulator",
          body: [
            "If you believe that your personal information has been processed in a manner that infringes your rights under POPIA, you may first contact us so that we can investigate and attempt to resolve your concern.",
            "You also have the right, where applicable, to lodge a complaint with the Information Regulator of South Africa.",
            "Information Regulator (South Africa): https://inforegulator.org.za/",
            "General enquiries: enquiries@inforegulator.org.za",
            "Telephone: 010 023 5200",
          ],
        },

        {
          heading: "18. Changes to this Privacy Policy",
          body: [
            "We may update this Privacy Policy when our products, fulfilment arrangements, payment methods, technologies, legal obligations or business practices change.",
            "The updated version will be published on this page and the 'Last updated' date will be revised where appropriate.",
            "We encourage customers to review this policy periodically.",
          ],
        },

        {
          heading: "19. Contact us",
          body: [
            `${SITE.parent} — ${SITE.name}`,
            `Registration number: ${SITE.registrationNumber}`,
            `Email: ${SITE.email}`,
            `Phone / WhatsApp: ${SITE.phoneDisplay}`,
            `Location: ${SITE.publicAddress}`,
            `Store: ${SITE.storeWebsite}`,
            `Corporate website: ${SITE.corporateWebsite}`,
          ],
        },
      ]}
      footer={
        <p className="text-sm text-muted-foreground">
          Read our <Link to="/security" className="underline">Security &amp; Data Protection</Link> page for a high-level overview of account and Store safeguards.
        </p>
      }
    />
  ),
});
