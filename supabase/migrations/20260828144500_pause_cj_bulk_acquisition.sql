-- Cossa Store inventory-control safeguard.
--
-- The previous catalogue-fill mode could keep importing CJ candidates every two
-- hours until every supported department reached its active target. That
-- created an avoidable draft/rejection backlog because acquisition happened
-- before full commercial qualification.
--
-- Pause only automatic bulk acquisition while the qualification-first engine is
-- being introduced. Existing daily availability and commercial-maintenance jobs
-- remain untouched.

select cron.unschedule(jobid)
from cron.job
where jobname in (
  'cossa-cj-catalogue-fill-availability',
  'cossa-cj-catalogue-fill-import',
  'cossa-cj-catalogue-fill-pricing'
);

-- Preserve the helper for audit/history, but make the current fill requirement
-- explicitly false so no older caller can accidentally restart bulk acquisition.
create or replace function public.cj_catalogue_fill_required()
returns boolean
language sql
stable
set search_path = public
as $$
  select false;
$$;

revoke all on function public.cj_catalogue_fill_required() from public, anon, authenticated;
