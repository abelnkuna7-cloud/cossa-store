-- Exposed-schema address for the server-only admin session store.
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
