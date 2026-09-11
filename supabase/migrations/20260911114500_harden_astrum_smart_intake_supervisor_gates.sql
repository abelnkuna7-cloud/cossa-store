create or replace function public.invoke_astrum_smart_intake_supervisor(
  p_refs text[] default null,
  p_dry_run boolean default false,
  p_max_items integer default 8
) returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_token text;
  v_refs text[];
  v_market jsonb := '{}'::jsonb;
  v_body jsonb;
  v_request_id bigint;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name='cossa_astrum_smart_intake_token'
  order by created_at desc
  limit 1;

  if coalesce(v_token,'')='' then
    raise exception 'Astrum Smart Intake server credential is not configured';
  end if;

  if p_refs is null then
    select coalesce(array_agg(i.supplier_product_ref order by i.supplier_product_ref),array[]::text[])
    into v_refs
    from public.store_inventory_intakes i
    join public.store_inventory_commercial_health h on h.intake_id=i.id
    where i.organisation_id='00000000-0000-4000-8000-000000000001'::uuid
      and i.supplier_id='3b625ee7-25d4-4604-afd5-2a0909ac04b6'::uuid
      and i.approval_status='approved'
      and i.publication_store_product_id is null
      and coalesce(i.supplier_available_stock,0) > 0
      and h.commercial_status='competitive'
      and coalesce(i.operational_notes,'') not ilike '%Safety hold%';
  else
    v_refs := p_refs;
  end if;

  if coalesce(array_length(v_refs,1),0)=0 then
    return null;
  end if;

  select coalesce(jsonb_object_agg(e.supplier_product_ref,e.items),'{}'::jsonb)
  into v_market
  from (
    select c.supplier_product_ref,
           jsonb_agg(
             jsonb_build_object(
               'retailer',c.retailer,
               'price',c.price_zar,
               'url',c.source_url,
               'observedAt',c.observed_at,
               'exactMatch',c.exact_match
             ) order by c.price_zar asc
           ) as items
    from public.store_competitor_price_evidence c
    where c.organisation_id='00000000-0000-4000-8000-000000000001'::uuid
      and c.exact_match=true
      and c.availability in ('in_stock','unknown')
      and c.observed_at >= now()-interval '30 days'
      and c.supplier_product_ref=any(v_refs)
    group by c.supplier_product_ref
  ) e;

  v_body := jsonb_build_object(
    'dryRun',p_dry_run,
    'requireMarketEvidence',true,
    'maxItems',greatest(1,least(coalesce(p_max_items,8),25)),
    'marketEvidence',v_market,
    'refs',to_jsonb(v_refs)
  );

  select net.http_post(
    url:='https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/astrum-smart-intake-worker',
    headers:=jsonb_build_object('Content-Type','application/json','x-cossa-automation-token',v_token),
    body:=v_body,
    timeout_milliseconds:=120000
  ) into v_request_id;

  return v_request_id;
end $$;

revoke all on function public.invoke_astrum_smart_intake_supervisor(text[],boolean,integer) from public,anon,authenticated;
grant execute on function public.invoke_astrum_smart_intake_supervisor(text[],boolean,integer) to service_role;
