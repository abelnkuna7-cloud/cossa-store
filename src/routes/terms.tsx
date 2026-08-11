import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/config/seo";
import { PolicyPage } from "@/components/common/PolicyPage";
import { SITE } from "@/config/site";

const TITLE = "Terms and Conditions | Cossa Store";
const DESCRIPTION =
  "Terms governing browsing, quotations, purchases, payments, fulfilment and use of Cossa Store.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/terms` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/terms` }],
  }),

  component: () => (
    <PolicyPage
      eyebrow="Legal"
      title="Terms and Conditions"
      description={DESCRIPTION}
      sections={[
        {
          heading: "Last updated",
          body: ["11 August 2026"],
        },

        {
          heading: "1. About Cossa Store",
          body: [
            `Cossa Store is operated by ${SITE.parent}. These Terms and Conditions govern your use of the Cossa Store website, your requests for quotations and your purchase of products or services offered directly through Cossa Store.`,
            "Cossa Store may offer physical stocked goods, print-on-demand products, personalised products, supplier-fulfilled or dropshipped products, special-order products, imported products, digital products, business procurement options and links to selected third-party or affiliate products.",
            "The fulfilment method used for a product does not remove any statutory consumer rights that apply to a purchase made directly from Cossa Store.",
          ],
        },

        {
          heading: "2. Acceptance of these terms",
          body: [
            "By browsing this website, creating or submitting a quotation request, creating an account where available, placing an order or completing a purchase directly through Cossa Store, you agree to these Terms and Conditions together with any policies incorporated into them.",
            "Where checkout functionality is enabled, you may be required to affirmatively acknowledge these Terms and Conditions and our Returns & Refunds Policy before completing payment.",
            "If you do not agree with these Terms and Conditions, you should not complete a purchase through Cossa Store.",
          ],
        },

        {
          heading: "3. Eligibility",
          body: [
            "You must have the legal capacity to enter into a binding transaction when purchasing from Cossa Store.",
            "If you are under the age of 18, you should use Cossa Store only with the involvement and appropriate consent of a parent or legal guardian.",
            "When purchasing on behalf of a business or other organisation, you confirm that you are authorised to act on its behalf.",
          ],
        },

        {
          heading: "4. Product categories and fulfilment",
          body: [
            "Products sold through Cossa Store may be held in local stock, produced through a print-on-demand partner, manufactured or personalised after an order is placed, supplied by an approved third-party supplier, or dispatched directly by a fulfilment or dropshipping partner.",
            "The relevant product page may identify important fulfilment information including production times, expected dispatch times, delivery estimates, available variants, special-order status or other material conditions.",
            "Orders containing products with different fulfilment methods may arrive in separate parcels or at different times.",
          ],
        },

        {
          heading: "5. Product information",
          body: [
            "We make reasonable efforts to ensure that product titles, descriptions, specifications, images, measurements, colours, compatibility information and other product details are accurate.",
            "Images may be illustrative and colours or appearance may vary depending on screen settings, production batches, suppliers or manufacturing processes.",
            "Where exact measurements, specifications, compatibility or other technical characteristics are essential to your purchase, you should review the product information carefully and contact us before ordering if clarification is required.",
            "We reserve the right to correct genuine typographical, pricing, technical or listing errors.",
          ],
        },

        {
          heading: "6. Prices and currency",
          body: [
            "Unless another currency is clearly displayed for a specific transaction, prices on Cossa Store are shown in South African Rand (ZAR).",
            "Applicable taxes will be handled in accordance with South African law and Cossa Nexus Holdings' applicable tax-registration status.",
            "Where Cossa Nexus Holdings is required or entitled to charge VAT, VAT will be dealt with in accordance with the Value-Added Tax Act and applicable SARS requirements.",
            "We will not represent an amount as VAT, issue a VAT tax invoice, or describe a price as VAT-inclusive unless legally appropriate.",
            "Shipping, delivery, customs, duties, import charges or other applicable transaction costs may be shown separately where relevant.",
          ],
        },

        {
          heading: "7. Pricing and listing errors",
          body: [
            "Despite reasonable efforts to maintain accurate pricing, an obvious pricing or listing error may occasionally occur.",
            "If we identify a material error before an order has been fulfilled, we may contact you to confirm whether you wish to proceed at the correct price or cancel the affected order.",
            "Where payment has already been received and an order is cancelled because of our pricing or listing error, the amount paid for the cancelled item will be refunded through the appropriate original payment channel.",
          ],
        },

        {
          heading: "8. Product availability",
          body: [
            "Product availability may change without notice, particularly where stock, supplier inventory, print-on-demand availability or imported goods are involved.",
            "Adding an item to a basket or submitting a quotation request does not reserve inventory unless we expressly confirm otherwise.",
            "If an item becomes unavailable after you have placed and paid for an order, we may offer an appropriate alternative, provide an updated fulfilment estimate or refund the affected item, subject to your rights under applicable law.",
          ],
        },

        {
          heading: "9. Orders",
          body: [
            "Submitting an order is an offer to purchase the selected products subject to these Terms and Conditions.",
            "An order is not considered finally accepted merely because it has been submitted through the website.",
            "We may require successful payment, payment verification, stock confirmation, fraud screening or other reasonable checks before accepting or fulfilling an order.",
            "We may decline or cancel an order where reasonably necessary, including in cases of suspected fraud, payment failure, stock unavailability, obvious pricing error, prohibited transactions or circumstances that make lawful fulfilment impossible.",
            "Where an order is cancelled after valid payment has been received, any refund due will be handled in accordance with our Returns & Refunds Policy and applicable law.",
          ],
        },

        {
          heading: "10. Payment methods",
          body: [
            "Cossa Store may support one or more approved payment service providers from time to time.",
            "Available payment methods will be displayed at checkout when those payment methods are operational and available for the particular transaction.",
            "Cossa Store is not limited to one payment provider and may add, remove, suspend or replace payment methods as merchant approvals, technical integrations, commercial arrangements or regulatory requirements change.",
            "We will not represent a payment provider as available for customer checkout until the relevant integration and merchant approval are operational.",
          ],
        },

        {
          heading: "11. Payment processing",
          body: [
            "Payment transactions may be processed by independent third-party payment service providers.",
            "You may be required to comply with the payment provider's applicable terms, authentication requirements or security procedures when completing a transaction.",
            "An order must not be treated as successfully paid solely because a payment attempt was initiated. Cossa Store may rely on confirmed transaction status from the relevant payment provider before releasing or fulfilling an order.",
            "Cossa Store does not request or store your online-banking password, card PIN or full payment-card security code on its own systems.",
          ],
        },

        {
          heading: "12. Failed, reversed or disputed payments",
          body: [
            "A transaction may fail, be declined, reversed, refunded or become subject to a payment dispute or chargeback.",
            "If payment is unsuccessful, we are not obliged to dispatch goods until successful payment has been confirmed.",
            "Where a chargeback, reversal or payment dispute is raised, we may provide the relevant payment service provider with lawful transaction, order, delivery and customer-service records reasonably necessary to investigate the dispute.",
            "Nothing in this section limits any payment or consumer right that cannot legally be excluded.",
          ],
        },

        {
          heading: "13. Shipping and delivery",
          body: [
            "Processing periods, delivery areas, estimated delivery times, shipping costs and other fulfilment information are governed by our Shipping Policy and the relevant product information.",
            "Processing time and delivery time are not always the same. Print-on-demand, personalised, supplier-fulfilled, special-order and imported goods may require additional time before dispatch.",
            "Delivery estimates are estimates rather than guaranteed dates unless we expressly agree otherwise.",
            "You are responsible for providing an accurate and complete delivery address and suitable contact details.",
          ],
        },

        {
          heading: "14. Print-on-demand and personalised products",
          body: [
            "Print-on-demand and personalised products are produced after an order is submitted and may be manufactured specifically for you.",
            "You are responsible for checking the size, colour, artwork, spelling, personalisation and other options you select before submitting your order.",
            "Change-of-mind rights may be restricted for products made to your specification where an exclusion is permitted by applicable law.",
            "This does not remove rights relating to defective, damaged, incorrectly manufactured or incorrectly supplied goods.",
          ],
        },

        {
          heading: "15. Dropshipped and supplier-fulfilled products",
          body: [
            "Certain products sold directly by Cossa Store may be packed or dispatched by approved suppliers or fulfilment partners.",
            "Where Cossa Store is the seller, the involvement of a fulfilment partner does not by itself transfer the customer relationship to that partner.",
            "Customers should contact Cossa Store regarding order support, delivery problems, returns or refunds relating to products sold directly by Cossa Store unless we specifically provide another authorised process.",
            "Supplier and fulfilment arrangements may affect processing and delivery times, which will be communicated where reasonably possible.",
          ],
        },

        {
          heading: "16. Digital products",
          body: [
            "Cossa Store may offer downloadable files, templates, digital resources, licence-based products or other digital goods.",
            "Digital-product access, licence terms, permitted use and refund eligibility may differ from those applying to physical goods.",
            "Where a separate licence or usage condition is supplied with a digital product, that licence forms part of the terms governing use of that product.",
            "Digital products may not be copied, resold, distributed, sublicensed or commercially exploited except where the applicable licence expressly permits it.",
          ],
        },

        {
          heading: "17. Affiliate and third-party products",
          body: [
            "Some Cossa Store pages may contain affiliate links or links to independent third-party retailers or marketplaces.",
            "Where you leave Cossa Store and complete checkout and payment on a third-party website, the transaction is between you and that third-party seller unless expressly stated otherwise.",
            "The third-party seller's own prices, terms, delivery arrangements, refund policies, warranties and privacy policy apply to that third-party transaction.",
            "Cossa Store may receive a commission or other benefit from qualifying affiliate purchases without necessarily increasing the price paid by you.",
            "We will seek to make affiliate or external-purchase links reasonably identifiable.",
          ],
        },

        {
          heading: "18. Quotations",
          body: [
            "Cossa Store may allow customers or business buyers to request formal quotations.",
            "A quotation is valid for the period stated in that quotation and may be subject to stock availability, supplier pricing, exchange rates, delivery costs or other stated conditions.",
            "A quotation does not constitute a completed online order merely because it has been issued.",
            "Orders placed through formal quotations may be subject to additional payment, procurement, fulfilment or commercial terms stated in the quotation.",
          ],
        },

        {
          heading: "19. Business and bulk purchasing",
          body: [
            "Business-account applications, procurement arrangements and credit facilities are subject to verification and approval.",
            "We are not obliged to grant credit or business-account facilities.",
            "Where credit terms, bulk pricing or negotiated commercial terms are approved, they will be confirmed separately in writing.",
            "Formal business transactions may also be governed by quotation, purchase-order, supply or account terms agreed between the parties.",
          ],
        },

        {
          heading: "20. Returns, refunds and cancellations",
          body: [
            "Returns, refunds and cancellations for purchases made directly from Cossa Store are governed by our Returns & Refunds Policy together with applicable South African consumer law.",
            "Different rules may apply depending on whether the product is stocked, print-on-demand, personalised, supplier-fulfilled, special-order, imported or digital.",
            "Nothing in these Terms and Conditions is intended to remove a consumer right that cannot lawfully be excluded.",
          ],
        },

        {
          heading: "21. Defective goods and statutory rights",
          body: [
            "Goods sold directly by Cossa Store are subject to applicable statutory consumer protections.",
            "Where the Consumer Protection Act applies, qualifying defective goods may carry statutory remedies including repair, replacement or refund rights within the applicable statutory period.",
            "Any manufacturer's, supplier's or extended warranty is additional to statutory rights and does not replace rights that cannot lawfully be excluded.",
          ],
        },

        {
          heading: "22. Intellectual property",
          body: [
            "Unless otherwise indicated, Cossa Store branding, logos, website text, original graphics, product designs, software, layout and other proprietary content are owned by or licensed to Cossa Nexus Holdings.",
            "You may use the website for lawful personal or business purchasing purposes.",
            "You may not reproduce, republish, scrape, distribute, modify, sell, commercially exploit or create derivative works from protected Cossa Store content without permission except where permitted by law.",
            "Third-party trademarks, product names and intellectual property remain the property of their respective owners.",
          ],
        },

        {
          heading: "23. User conduct",
          body: [
            "You must not use Cossa Store for fraudulent, unlawful, abusive or malicious purposes.",
            "You must not attempt to interfere with website security, gain unauthorised access to systems or accounts, introduce malicious code, manipulate prices or transactions, impersonate another person, submit knowingly false information or misuse payment mechanisms.",
            "We may suspend or restrict access where reasonably necessary to protect customers, payment systems, suppliers, the website or our legal rights.",
          ],
        },

        {
          heading: "24. Reviews, submissions and customer content",
          body: [
            "If Cossa Store allows reviews, product feedback, artwork uploads, customisation content or other customer submissions, you remain responsible for material you submit.",
            "You must not submit content that is unlawful, fraudulent, defamatory, infringing, malicious or that violates another person's intellectual-property or privacy rights.",
            "Where you submit artwork or content for personalised production, you confirm that you have the necessary rights or permission to use that content.",
          ],
        },

        {
          heading: "25. Privacy and personal information",
          body: [
            "Personal information submitted through Cossa Store is handled in accordance with our Privacy Policy and applicable South African data-protection law, including POPIA.",
            "Payment providers, couriers, print-on-demand providers, suppliers and technology providers may receive limited personal information where reasonably necessary to process payment, fulfil orders, deliver goods, prevent fraud or operate the website.",
          ],
        },

        {
          heading: "26. Website availability",
          body: [
            "We aim to keep Cossa Store available and accurate but cannot guarantee uninterrupted or error-free access at all times.",
            "The website may occasionally be unavailable because of maintenance, hosting failures, internet disruptions, supplier integrations, payment-provider outages, security events or circumstances beyond our reasonable control.",
            "We may update, modify or improve website functionality without prior notice where appropriate.",
          ],
        },

        {
          heading: "27. Third-party services and links",
          body: [
            "Cossa Store may integrate with or link to third-party payment processors, couriers, fulfilment providers, marketplaces, social platforms, analytics tools or other services.",
            "We are not responsible for the independent operation, security or content of third-party websites that you access outside Cossa Store.",
            "The use of third-party services may also be governed by the relevant third party's own terms and policies.",
          ],
        },

        {
          heading: "28. Limitation of liability",
          body: [
            "Nothing in these Terms and Conditions excludes or limits liability or consumer rights where such exclusion or limitation is prohibited by South African law.",
            "To the extent permitted by law, Cossa Nexus Holdings will not be responsible for indirect or consequential losses that were not reasonably foreseeable as a result of a breach or event for which we are legally responsible.",
            "Any limitation of liability in these Terms must be interpreted subject to the Consumer Protection Act and other applicable law.",
          ],
        },

        {
          heading: "29. Events beyond reasonable control",
          body: [
            "We will not be responsible for delay or failure caused by circumstances beyond our reasonable control to the extent permitted by law.",
            "Such circumstances may include courier disruptions, severe weather, infrastructure failures, supplier interruptions, customs delays, industrial action, network outages, government restrictions or other extraordinary events.",
            "Where such an event materially affects your order, we will take reasonable steps to communicate with you and determine an appropriate resolution.",
          ],
        },

        {
          heading: "30. Fraud prevention",
          body: [
            "We may use reasonable fraud-prevention and transaction-verification controls to protect customers, Cossa Store and payment providers.",
            "We may hold, delay, decline or request additional verification for an order where fraud or unauthorised use is reasonably suspected, subject to applicable law and payment-provider requirements.",
          ],
        },

        {
          heading: "31. Changes to these Terms",
          body: [
            "We may update these Terms and Conditions when our products, fulfilment methods, payment arrangements, technology, business model or legal obligations change.",
            "The current version will be published on this page with an updated revision date where appropriate.",
            "Changes will apply prospectively as required by law and will not unlawfully remove rights already arising from completed transactions.",
          ],
        },

        {
          heading: "32. Governing law",
          body: [
            "These Terms and Conditions are governed by the laws of the Republic of South Africa.",
            "Any dispute will be dealt with through the courts, tribunals, regulators or consumer-protection mechanisms having lawful jurisdiction.",
          ],
        },

        {
          heading: "33. Entire terms",
          body: [
            "These Terms and Conditions should be read together with our Returns & Refunds Policy, Shipping Policy and Privacy Policy, as well as any product-specific, quotation, business-account or licence terms that expressly apply to a particular transaction.",
            "If a provision of these Terms is found to be unlawful or unenforceable, the remaining provisions will continue to operate to the extent permitted by law.",
          ],
        },

        {
          heading: "34. Contact details",
          body: [
            `${SITE.parent} — Cossa Store`,
            `Email: ${SITE.email}`,
            `Phone / WhatsApp: ${SITE.phoneDisplay}`,
            "Registered address: Ext 27 Olivenoutbouch 163, 163 Centurion Olivenoutbousch, Centurion, Gauteng, 0187",
            "Website: www.cossanexusholdings.co.za",
          ],
        },
      ]}
    />
  ),
});