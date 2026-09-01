/**
 * Customer-safe copy for commerce models where Cossa does not fulfil the
 * purchase itself. Partner attribution remains in Growth; this module keeps
 * that operational information out of the public catalogue object and UI.
 */
export const PARTNER_RETAILER_LABEL = "Partner retailer";

export const PARTNER_OFFER_DISCLOSURE =
  "This is a partner offer. Payment, delivery and returns are handled by the retailer. Cossa Store may earn a commission.";

export function customerAffiliateOffer(trackingUrl: string | null) {
  if (!trackingUrl) return null;

  return {
    partner_name: PARTNER_RETAILER_LABEL,
    tracking_url: trackingUrl,
    disclosure_text: PARTNER_OFFER_DISCLOSURE,
  };
}
