create or replace function public.create_store_eft_payment_request_with_shipping(
  p_payer_user_id uuid,
  p_payer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_client_request_id uuid,
  p_shipping_total numeric,
  p_shipping_address jsonb,
  p_shipping_method text default 'standard'
)
returns public.eft_payment_requests
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_payment public.eft_payment_requests%rowtype;
  v_order public.store_orders%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Store shipping can only be applied by the trusted checkout service.' using errcode = '42501';
  end if;

  if p_shipping_total is null or p_shipping_total < 0 or p_shipping_total > 100000 then
    raise exception 'The shipping total is invalid.' using errcode = '22023';
  end if;

  if p_shipping_total > 0 and (p_shipping_address is null or jsonb_typeof(p_shipping_address) is distinct from 'object') then
    raise exception 'A delivery address is required for shipped products.' using errcode = '22023';
  end if;

  v_payment := public.create_store_eft_payment_request(
    p_payer_user_id,
    p_payer_email,
    p_customer_name,
    p_customer_phone,
    p_items,
    p_client_request_id
  );

  update public.store_orders
  set shipping_total = p_shipping_total,
      total = subtotal - discount_total + p_shipping_total + tax_total,
      metadata = metadata || jsonb_build_object(
        'shipping_address', coalesce(p_shipping_address, '{}'::jsonb),
        'shipping_provider', case when p_shipping_total > 0 then 'Printify' else null end,
        'shipping_method', case when p_shipping_total > 0 then coalesce(nullif(trim(p_shipping_method), ''), 'standard') else null end
      ),
      updated_at = now()
  where id = v_payment.store_order_id
    and status = 'pending'
  returning * into v_order;

  if not found then
    raise exception 'The pending Store order could not be updated with shipping.' using errcode = '55000';
  end if;

  update public.eft_payment_requests
  set amount = v_order.total,
      updated_at = now()
  where id = v_payment.id
  returning * into v_payment;

  return v_payment;
end;
$function$;

revoke all on function public.create_store_eft_payment_request_with_shipping(uuid,text,text,text,jsonb,uuid,numeric,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_store_eft_payment_request_with_shipping(uuid,text,text,text,jsonb,uuid,numeric,jsonb,text) to service_role;
