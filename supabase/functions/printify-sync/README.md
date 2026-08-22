Printify product sync is deployed as a protected Supabase Edge Function. Variant identity is scoped by Cossa product + provider + provider variant ID. Source prices remain in USD; Cossa customer-facing prices are stored in ZAR per variant.

The protected `printify-sync` function supplies administrator preview, reconciliation and webhook-setup actions. The public `printify-webhook` receiver accepts only HMAC-SHA256-signed `product:created`, `product:updated` and `product:deleted` events for Printify shop `28233755`. It uses no client-side credentials.

Required Supabase Edge Function secrets are `PRINTIFY_API_TOKEN` and `PRINTIFY_WEBHOOK_SECRET`; never commit either value. New and invalid products remain Draft. Deleted products are archived, and unavailable or removed variants cannot be selected at checkout.
