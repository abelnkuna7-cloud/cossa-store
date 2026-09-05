-- Server-side customer session registry. It stores only the Supabase session
-- identifier and lifecycle timestamps; access/refresh tokens never enter the
-- database. Public roles are denied so this boundary is server-only.
create table if not exists public.store_customer_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  issued_at timestamptz not null,
  last_seen_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_customer_sessions_session_id_idx
  on public.store_customer_sessions (session_id);

revoke all on public.store_customer_sessions from public, anon, authenticated;
grant all on public.store_customer_sessions to service_role;
alter table public.store_customer_sessions enable row level security;
