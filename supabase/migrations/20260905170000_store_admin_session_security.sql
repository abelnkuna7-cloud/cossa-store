-- Phase 3: server-side Store administrator session binding.
-- This table is deliberately kept outside the exposed public schema. It stores
-- only a Supabase session id and timestamps; no access or refresh tokens.
create table if not exists private.store_admin_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  issued_at timestamptz not null,
  last_seen_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_admin_sessions_session_id_idx
  on private.store_admin_sessions (session_id);

revoke all on private.store_admin_sessions from anon, authenticated;
grant all on private.store_admin_sessions to service_role;

alter table private.store_admin_sessions enable row level security;

create or replace function private.touch_store_admin_session_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, private
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_store_admin_session_updated_at() from public, anon, authenticated;
grant execute on function private.touch_store_admin_session_updated_at() to service_role;

drop trigger if exists store_admin_sessions_updated_at on private.store_admin_sessions;
create trigger store_admin_sessions_updated_at
before update on private.store_admin_sessions
for each row execute function private.touch_store_admin_session_updated_at();

-- The service-role client needs a Data API address for the server-only table.
-- Public roles remain fully revoked and RLS is enabled, so browsers cannot use it.
create table if not exists public.store_admin_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  issued_at timestamptz not null,
  last_seen_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists store_admin_sessions_public_session_id_idx
  on public.store_admin_sessions (session_id);
revoke all on public.store_admin_sessions from anon, authenticated;
grant all on public.store_admin_sessions to service_role;
alter table public.store_admin_sessions enable row level security;
