-- Yoco only returns a webhook signing secret once. Store it encrypted in
-- Supabase Vault and expose it solely to service-role Edge Functions.
create function public.store_yoco_test_webhook_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path to 'vault', 'public', 'pg_temp'
as $$
declare
  v_secret_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the trusted payment service may store the Yoco webhook secret.' using errcode = '42501';
  end if;
  if coalesce(nullif(trim(p_secret), ''), '') !~ '^whsec_' then
    raise exception 'The Yoco webhook secret is invalid.' using errcode = '22023';
  end if;

  select id into v_secret_id
  from vault.secrets
  where name = 'yoco_test_webhook_secret'
  order by created_at desc
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      trim(p_secret),
      'yoco_test_webhook_secret',
      'Yoco Checkout API test webhook signing secret',
      null
    );
  else
    perform vault.update_secret(
      v_secret_id,
      trim(p_secret),
      'yoco_test_webhook_secret',
      'Yoco Checkout API test webhook signing secret',
      null
    );
  end if;
end;
$$;

create function public.get_yoco_test_webhook_secret()
returns text
language plpgsql
security definer
set search_path to 'vault', 'public', 'pg_temp'
as $$
declare
  v_secret text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the trusted payment service may read the Yoco webhook secret.' using errcode = '42501';
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'yoco_test_webhook_secret'
  order by created_at desc
  limit 1;

  return nullif(trim(coalesce(v_secret, '')), '');
end;
$$;

revoke all on function public.store_yoco_test_webhook_secret(text) from public, anon, authenticated;
grant execute on function public.store_yoco_test_webhook_secret(text) to service_role;
revoke all on function public.get_yoco_test_webhook_secret() from public, anon, authenticated;
grant execute on function public.get_yoco_test_webhook_secret() to service_role;
