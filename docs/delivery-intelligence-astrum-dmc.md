# Cossa Store Delivery Intelligence — Astrum + DMC

Production goal: every physical order must resolve supplier identity, stock, delivery eligibility, exact customer-paid delivery charge and final EFT total before payment instructions are issued.

## Astrum

- Supplier: Astrum South Africa.
- Local delivery is determined by server-side driving distance to the nearest verified Astrum branch.
- Local: <= 30 km from Midrand, Durban or Cape Town branch.
- Main-centre and Rest-of-SA bands use the verified Astrum delivery-rate configuration already stored in production.
- Astrum delivery rates remain server-owned. The browser never supplies a trusted delivery price, supplier ID, profile ID or rate ID.
- >15 kg / volumetric exception remains a manual-quote path when verified order weight is above the supplier threshold.
- `OPENROUTESERVICE_API_KEY` is stored as a Supabase Edge Function secret and is read only through `Deno.env`; it must never be returned to the browser, committed to GitHub or written to order metadata.
- Routing/geocoding uses the current HeiGIT endpoints under `api.heigit.org`.
- `store-eft-checkout` is now integrated with the Astrum resolver and production Edge Function version 23 has been deployed for checkout certification.

## DMC

- Existing PUDO XL rule remains: dimensions must fit 69 x 60 x 41 cm and weight must be under 20 kg for the configured standard rate.
- Missing weight/dimensions are not guessed. They must be enriched from supplier/manufacturer evidence before automatic standard-rate checkout.
- Oversized/missing-evidence products use a controlled manual delivery quote rather than an invented charge.
- Existing published DMC products missing delivery measurements must be remediated without deleting legitimate catalogue data.

## Publication / checkout gate

No new physical SKU is sale-ready until all of these pass:

1. supplier identity and active supplier record;
2. sellable supplier stock;
3. approved customer selling price;
4. active fulfilment profile;
5. customer/supplier delivery payer rule;
6. verified delivery-rate evidence;
7. required distance / dimensions / weight inputs;
8. server-calculated delivery amount;
9. final Store order total including delivery;
10. EFT payment request equals that exact final order total.

Astrum Batch 1 remains unpublished until live checkout certification passes for Local, Main Centre, Rest-of-SA and heavy/exception scenarios. DMC remediation remains a separate controlled follow-up so the existing published DMC catalogue is not disrupted blindly.
