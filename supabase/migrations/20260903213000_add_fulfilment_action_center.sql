-- Audited human action layer for fulfilment exceptions.
-- Routine fulfilment stays autonomous. Humans only record explicit exception decisions.

create table if not exists public.store_fulfilment_actions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  outbox_job_id uuid not null references public.store_fulfilment_outbox(id) on delete cascade,
  store_order_id uuid not null references public.store_orders(id) on delete cascade,
  action text not null check (action in ('hold','release','retry','cancel','investigate','approve_production')),
  reason text not null check (length(btrim(reason)) >= 3),
  actor_user_id uuid not null,
  previous_status text,
  resulting_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists store_fulfilment_actions_job_idx on public.store_fulfilment_actions(outbox_job_id, created_at desc);
create index if not exists store_fulfilment_actions_order_idx on public.store_fulfilment_actions(store_order_id, created_at desc);

alter table public.store_fulfilment_actions enable row level security;

create policy "fulfilment actions admins can read"
on public.store_fulfilment_actions for select to authenticated
using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  or exists (select 1 from public.organisation_members om where om.organisation_id = store_fulfilment_actions.organisation_id and om.user_id = auth.uid() and om.status = 'active' and om.role in ('owner','admin'))
);

-- One controlled mutation surface. SECURITY DEFINER is required because clients have
-- no direct update/insert policy on the operational tables. Caller identity and role
-- are revalidated inside the function and every decision is appended to the audit log.
create or replace function public.execute_store_fulfilment_action(p_job_id uuid, p_action text, p_reason text)
returns public.store_fulfilment_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.store_fulfilment_outbox%rowtype;
  v_actor uuid := auth.uid();
  v_before text;
  v_after text;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_action not in ('hold','release','retry','cancel','investigate','approve_production') then raise exception 'Unsupported action'; end if;
  if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'A reason is required'; end if;

  select * into v_job from public.store_fulfilment_outbox where id = p_job_id for update;
  if not found then raise exception 'Fulfilment job not found'; end if;

  if not (
    exists (select 1 from public.user_roles ur where ur.user_id=v_actor and ur.role='admin')
    or exists (select 1 from public.organisation_members om where om.organisation_id=v_job.organisation_id and om.user_id=v_actor and om.status='active' and om.role in ('owner','admin'))
  ) then raise exception 'Administrator authority required'; end if;

  v_before := v_job.status;

  if p_action = 'retry' then
    if v_job.status not in ('dead_letter','retry') then raise exception 'Only failed/retrying work can be retried manually'; end if;
    update public.store_fulfilment_outbox set status='retry', attempts=0, available_at=now(), locked_at=null, locked_by=null, last_error=null, updated_at=now() where id=p_job_id returning * into v_job;
  elsif p_action = 'hold' then
    if v_job.status in ('completed','cancelled') then raise exception 'Completed/cancelled work cannot be held'; end if;
    update public.store_fulfilment_outbox set status='cancelled', locked_at=null, locked_by=null, result=coalesce(result,'{}'::jsonb)||jsonb_build_object('human_hold',true,'hold_reason',p_reason), updated_at=now() where id=p_job_id returning * into v_job;
  elsif p_action = 'release' then
    if coalesce((v_job.result->>'human_hold')::boolean,false) is not true then raise exception 'Job is not on human hold'; end if;
    update public.store_fulfilment_outbox set status='retry', available_at=now(), locked_at=null, locked_by=null, result=coalesce(result,'{}'::jsonb)-'human_hold'-'hold_reason', updated_at=now() where id=p_job_id returning * into v_job;
  elsif p_action = 'cancel' then
    if v_job.status='completed' then raise exception 'Completed fulfilment cannot be cancelled from the outbox'; end if;
    update public.store_fulfilment_outbox set status='cancelled', locked_at=null, locked_by=null, result=coalesce(result,'{}'::jsonb)||jsonb_build_object('human_cancelled',true,'cancel_reason',p_reason), updated_at=now() where id=p_job_id returning * into v_job;
  elsif p_action = 'investigate' then
    update public.store_fulfilment_outbox set result=coalesce(result,'{}'::jsonb)||jsonb_build_object('investigation_required',true,'investigation_reason',p_reason), updated_at=now() where id=p_job_id returning * into v_job;
  else
    -- Production approval is intentionally only an auditable authorization record here.
    -- It does NOT call Printify. The production engine must independently revalidate
    -- payment, order state, provider state, float and kill switches before spending.
    update public.store_fulfilment_outbox set result=coalesce(result,'{}'::jsonb)||jsonb_build_object('production_approved_by',v_actor,'production_approved_at',now(),'production_approval_reason',p_reason), updated_at=now() where id=p_job_id returning * into v_job;
  end if;

  v_after := v_job.status;
  insert into public.store_fulfilment_actions(organisation_id,outbox_job_id,store_order_id,action,reason,actor_user_id,previous_status,resulting_status)
  values(v_job.organisation_id,v_job.id,v_job.store_order_id,p_action,btrim(p_reason),v_actor,v_before,v_after);
  return v_job;
end;
$$;

revoke all on function public.execute_store_fulfilment_action(uuid,text,text) from public, anon;
grant execute on function public.execute_store_fulfilment_action(uuid,text,text) to authenticated;
