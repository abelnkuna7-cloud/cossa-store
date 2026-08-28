-- Cossa Store CJ catalogue quality safeguard.
--
-- Automated acquisition is paused while the supplier discovery pipeline is being
-- upgraded to qualification-first merchandising. Availability refresh remains
-- separate and may continue for already approved products.

DO $$
DECLARE
  cj_job record;
BEGIN
  FOR cj_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'cossa-cj-daily-import'
  LOOP
    PERFORM cron.unschedule(cj_job.jobid);
  END LOOP;
END
$$;

-- Remove objectively weak supplier rows from the customer-facing catalogue.
-- Archived rows remain available for audit/duplicate protection and are not
-- deleted. This rule intentionally avoids inventing demand or popularity data.
UPDATE public.store_products
SET status = 'archived',
    updated_at = now()
WHERE supplier_name = 'CJ Dropshipping'
  AND status = 'active'
  AND (
    stock_quantity <= 1
    OR length(name) > 118
    OR lower(name) ~ '(best[- ]selling|factory stock|intimate area|whitening cream|anti-aging essence|fine lines|hair removal cream|cervical spine|conductive gel|hotel camera detection|laser lights|eternal rose|rose flowers|equation watch|jumping cat toy|simulation fish|bird-repelling|magic shadow|phone lock box|toilet cleaning powder)'
  );
