-- The existing Cossa owner-alert worker intentionally accepts lead events
-- only. Convert supplier exceptions into explicitly labelled internal system
-- alerts so they use the proven CallMeBot route without masquerading as a
-- customer enquiry.
create or replace function private.dispatch_cj_automation_owner_alert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.leads (
    organisation_id,
    full_name,
    name,
    phone,
    email,
    service,
    location,
    source,
    notes,
    source_app,
    source_label,
    lead_type,
    raw_payload,
    suppress_owner_alert
  ) values (
    new.organisation_id,
    'CJ catalogue automation',
    'CJ catalogue automation',
    '0678011907',
    'cossa@cossanexusholdings.co.za',
    'Internal supplier automation alert',
    'Cossa Store',
    'cossa_store',
    new.message,
    'cossa_store',
    'COSSA STORE',
    'system_alert',
    jsonb_build_object(
      'supplier_alert_id', new.id,
      'provider', new.provider,
      'alert_kind', new.alert_kind,
      'severity', new.severity,
      'details', new.details,
      'internal_system_alert', true
    ),
    false
  );
  return new;
end;
$$;

drop trigger if exists cossa_owner_alert_supplier_automation_alerts on public.supplier_automation_alerts;
create trigger cossa_owner_alert_supplier_automation_alerts
after insert on public.supplier_automation_alerts
for each row execute function private.dispatch_cj_automation_owner_alert();
