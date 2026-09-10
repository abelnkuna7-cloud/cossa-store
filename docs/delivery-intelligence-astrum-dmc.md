# Delivery Intelligence implementation notes

Purpose: certify real-store checkout before Astrum Batch 1 publication and remediate DMC delivery blockers without weakening existing safety controls.

Rules:
- Public checkout payment path remains EFT only until gateway commissioning is complete.
- Delivery price is always resolved server-side from supplier configuration; never trust a browser-supplied amount.
- Astrum local rate applies only when verified customer delivery location is within 30 km of one of Astrum's official branch offices.
- Otherwise use Astrum main-centre classification only for the supplier's published city list; all other supported SA destinations use Rest of SA.
- Astrum orders above 15 kg or with volumetric/surcharge uncertainty require an exception/manual quote.
- DMC standard delivery requires verified dimensions and weight before the existing PUDO XL rate may be applied. Missing evidence must be enriched before sale-readiness; oversized/remote exceptions require quote flow.
- Store order must retain supplier ID, supplier product reference, fulfilment profile, delivery classification/rate evidence, shipping total and payment amount.

External routing/geocoding:
- Use HeiGIT/openrouteservice endpoints under api.heigit.org.
- Secret must be server-only, e.g. OPENROUTESERVICE_API_KEY in Supabase Edge Function secrets.
- Cache branch geocodes; do not repeatedly geocode official branch addresses.
- Customer address geocode should be cached by a normalized address fingerprint with a short operational TTL.

Current branch files:
- delivery-intelligence.ts: pure Astrum classification and DMC parcel checks.
- heigit-delivery.ts: server-only Pelias geocoder and driving-distance client.
- delivery-intelligence.test.ts: safety tests for local/main-centre/overweight and DMC parcel handling.

Do not merge/deploy until checkout index integration is complete and CI passes.
