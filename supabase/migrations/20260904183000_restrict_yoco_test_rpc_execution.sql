-- Supabase's default function privileges include anon and authenticated.
-- These two security-definer routines are internal-only and may be called
-- solely by an Edge Function authenticated with the service role.
revoke all on function public.create_store_yoco_test_payment_attempt_with_delivery(
  uuid, text, text, text, jsonb, uuid, numeric, jsonb, text, text, jsonb
) from anon, authenticated;
grant execute on function public.create_store_yoco_test_payment_attempt_with_delivery(
  uuid, text, text, text, jsonb, uuid, numeric, jsonb, text, text, jsonb
) to service_role;

revoke all on function public.record_store_yoco_test_payment_event(
  text, text, text, bigint, text, text, text, text, jsonb
) from anon, authenticated;
grant execute on function public.record_store_yoco_test_payment_event(
  text, text, text, bigint, text, text, text, text, jsonb
) to service_role;
