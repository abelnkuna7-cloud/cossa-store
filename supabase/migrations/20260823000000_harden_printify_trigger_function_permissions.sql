-- Trigger functions are invoked internally by Postgres and must not be callable as public RPC endpoints.
revoke all on function public.enforce_active_printify_product_validity() from anon, authenticated;
revoke all on function public.enforce_active_printify_variant_validity() from anon, authenticated;
