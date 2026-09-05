-- Phase 3: least-privilege database boundaries.
-- Internal Store operations are invoked by trusted server-side code only.
-- Public lead intake remains available to anon/authenticated callers because
-- the Store and Growth public forms use this controlled, validated endpoint.

-- Catalogue snapshots and fulfilment funding/actions are privileged Store
-- operations. Their SECURITY DEFINER bodies enforce admin membership, but the
-- Data API must not expose them to browser roles.
revoke execute on function public.create_store_catalogue_snapshot(text)
  from public, anon, authenticated;
grant execute on function public.create_store_catalogue_snapshot(text)
  to service_role;

revoke execute on function public.reconcile_store_fulfilment_funding_account(
  text, text, bigint, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.reconcile_store_fulfilment_funding_account(
  text, text, bigint, bigint, text, text
) to service_role;

revoke execute on function public.record_store_fulfilment_action(
  uuid, text, text, uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.record_store_fulfilment_action(
  uuid, text, text, uuid, jsonb
) to service_role;

-- This trigger function is not a client API. Trigger execution does not depend
-- on EXECUTE grants, so remove the default PUBLIC exposure.
revoke execute on function private.dispatch_cj_automation_owner_alert()
  from public, anon, authenticated;

-- Rate-limit state is written by the SECURITY DEFINER lead-intake function;
-- clients must never query or mutate the state table directly.
revoke all on table public.lead_intake_rate_limits from anon, authenticated;

notify pgrst, 'reload schema';
