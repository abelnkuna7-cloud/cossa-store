-- CJ automation exceptions are routed through the existing secured Cossa
-- owner-alert worker, which already delivers WhatsApp via CallMeBot.
create table if not exists public.supplier_automation_alerts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  provider text not null,
  source_app text not null default 'cossa_store',
  source_label text not null default 'COSSA STORE',
  alert_kind text not null,
  severity text not null check (severity in ('warning', 'error')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.supplier_automation_alerts enable row level security;
revoke all on table public.supplier_automation_alerts from anon, authenticated;

drop trigger if exists cossa_owner_alert_supplier_automation_alerts on public.supplier_automation_alerts;
create trigger cossa_owner_alert_supplier_automation_alerts
after insert on public.supplier_automation_alerts
for each row execute function private.dispatch_cossa_owner_alert();
