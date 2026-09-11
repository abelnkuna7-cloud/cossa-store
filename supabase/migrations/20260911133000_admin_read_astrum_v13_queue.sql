grant select on public.astrum_intake_v13_queue to authenticated;
revoke insert, update, delete on public.astrum_intake_v13_queue from authenticated;

drop policy if exists "cossa_store_admins_read_astrum_v13_queue" on public.astrum_intake_v13_queue;
create policy "cossa_store_admins_read_astrum_v13_queue"
on public.astrum_intake_v13_queue
for select
to authenticated
using (
  exists (
    select 1
    from public.store_inventory_intakes i
    where i.id = astrum_intake_v13_queue.intake_id
      and (select private.has_organisation_role(i.organisation_id, array['owner','admin']))
  )
);
