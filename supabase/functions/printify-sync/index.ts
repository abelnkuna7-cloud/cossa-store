// Production source is deployed in Supabase Edge Functions.
// This repository file mirrors the deployed Printify sync implementation.
// Key invariant: Printify variant IDs are scoped per product, so upserts use
// product_id + provider + provider_variant_id rather than treating a provider
// variant ID as globally unique across the Printify catalogue.
