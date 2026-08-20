-- Restores the public Store quotation endpoint. The Store client already uses
-- this RPC, but the legacy quote_requests table reached production without it.
-- The function owns the write, preserves RLS on the table, rate-limits through
-- the central lead intake, and grants execution only to customer API roles.

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS requirements text,
  ADD COLUMN IF NOT EXISTS estimated_quantity text,
  ADD COLUMN IF NOT EXISTS required_date text,
  ADD COLUMN IF NOT EXISTS additional_information text,
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_page text;

UPDATE public.quote_requests
SET reference = 'CQT-' || upper(replace(id::text, '-', ''))
WHERE reference IS NULL OR btrim(reference) = '';

ALTER TABLE public.quote_requests
  ALTER COLUMN reference SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_reference_key
  ON public.quote_requests(reference);

CREATE OR REPLACE FUNCTION public.submit_quote_request(
  p_contact_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_location text,
  p_scope text,
  p_requirements text,
  p_estimated_quantity text DEFAULT NULL,
  p_required_date text DEFAULT NULL,
  p_budget text DEFAULT NULL,
  p_additional_information text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_source_page text DEFAULT NULL,
  p_campaign_source text DEFAULT NULL
) RETURNS TABLE (id uuid, reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_quote_id uuid := public.gen_random_uuid();
  v_reference text := 'CQT-' || upper(replace(v_quote_id::text, '-', ''));
  v_lead_id uuid;
  v_contact_name text := left(btrim(coalesce(p_contact_name, '')), 200);
  v_company text := nullif(left(btrim(coalesce(p_company, '')), 200), '');
  v_email text := left(btrim(coalesce(p_email, '')), 255);
  v_phone text := left(btrim(coalesce(p_phone, '')), 40);
  v_location text := nullif(left(btrim(coalesce(p_location, '')), 300), '');
  v_scope text := left(coalesce(nullif(btrim(p_scope), ''), 'products_only'), 80);
  v_requirements text := left(btrim(coalesce(p_requirements, '')), 5000);
  v_estimated_quantity text := nullif(left(btrim(coalesce(p_estimated_quantity, '')), 200), '');
  v_required_date text := nullif(left(btrim(coalesce(p_required_date, '')), 100), '');
  v_budget text := nullif(left(btrim(coalesce(p_budget, '')), 200), '');
  v_additional_information text := nullif(left(btrim(coalesce(p_additional_information, '')), 5000), '');
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
  v_source_page text := nullif(left(btrim(coalesce(p_source_page, '')), 500), '');
  v_notes text;
BEGIN
  IF v_contact_name = '' THEN RAISE EXCEPTION 'Contact name is required' USING ERRCODE = '22023'; END IF;
  IF v_email = '' THEN RAISE EXCEPTION 'Email is required' USING ERRCODE = '22023'; END IF;
  IF v_phone = '' THEN RAISE EXCEPTION 'Phone number is required' USING ERRCODE = '22023'; END IF;
  IF v_requirements = '' THEN RAISE EXCEPTION 'Requirements are required' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(v_items) <> 'array' OR octet_length(v_items::text) > 12000 THEN
    RAISE EXCEPTION 'Quote items must be a valid list smaller than 12KB' USING ERRCODE = '22023';
  END IF;

  v_notes := left(
    'Quote reference: ' || v_reference || E'\nRequirements: ' || v_requirements ||
    CASE WHEN v_additional_information IS NULL THEN '' ELSE E'\nAdditional information: ' || v_additional_information END ||
    CASE WHEN v_budget IS NULL THEN '' ELSE E'\nBudget: ' || v_budget END ||
    CASE WHEN v_required_date IS NULL THEN '' ELSE E'\nRequired date: ' || v_required_date END,
    10000
  );

  SELECT intake.lead_id
    INTO v_lead_id
  FROM public.ingest_cossa_lead(
    'cossa_store',
    v_quote_id::text,
    'quote_request',
    v_contact_name,
    v_email,
    v_phone,
    v_scope,
    v_location,
    v_notes,
    v_company,
    jsonb_build_object(
      'quote_reference', v_reference,
      'scope', v_scope,
      'item_count', jsonb_array_length(v_items),
      'campaign_source', nullif(left(btrim(coalesce(p_campaign_source, '')), 200), '')
    )
  ) AS intake;

  INSERT INTO public.quote_requests (
    id, reference, lead_id,
    full_name, name, contact_name, company, email, phone,
    service, scope, location, project_details, requirements,
    estimated_quantity, required_date, budget, message, additional_information,
    items, source_page, source_app, source_label
  ) VALUES (
    v_quote_id, v_reference, v_lead_id,
    v_contact_name, v_contact_name, v_contact_name, v_company, v_email, v_phone,
    v_scope, v_scope, v_location, v_requirements, v_requirements,
    v_estimated_quantity, v_required_date, v_budget, v_additional_information, v_additional_information,
    v_items, v_source_page, 'cossa_store', 'COSSA STORE'
  );

  RETURN QUERY SELECT v_quote_id, v_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quote_request(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_quote_request(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text
) TO anon, authenticated, service_role;
