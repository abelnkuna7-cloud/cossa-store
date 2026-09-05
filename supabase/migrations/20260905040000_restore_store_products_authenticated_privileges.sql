-- The catalogue table is protected by the admin-only RLS policy created in
-- 20260904234200_restrict_store_catalogue_to_admins.sql.  The later blanket
-- revoke removed the table privileges required for that policy to run, which
-- made the admin catalogue fail with 42501.  Restore only table privileges;
-- RLS continues to deny customers and ordinary staff every row.
grant select, insert, update, delete on table public.store_products to authenticated;
