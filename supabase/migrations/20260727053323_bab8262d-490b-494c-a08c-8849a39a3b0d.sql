CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TYPE public.enquiry_type AS ENUM (
  'callback', 'quick_quote', 'product_sourcing', 'human_support',
  'service_request', 'business_account', 'supplier_application', 'chatbot'
);

CREATE TYPE public.contact_method AS ENUM ('phone', 'whatsapp', 'email');

CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'closed');

CREATE TYPE public.submission_status AS ENUM ('new', 'in_review', 'actioned', 'closed');

CREATE TYPE public.chat_role AS ENUM ('user', 'assistant', 'system');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE SEQUENCE public.reference_seq;

CREATE OR REPLACE FUNCTION public.generate_reference(p_prefix text)
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT p_prefix || '-'
    || to_char(timezone('Africa/Johannesburg', now()), 'YYYYMMDD') || '-'
    || lpad(((nextval('public.reference_seq') % 10000))::text, 4, '0');
$$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  );
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  location text,
  enquiry_type public.enquiry_type NOT NULL,
  interest text,
  preferred_contact_method public.contact_method NOT NULL DEFAULT 'phone',
  source_page text,
  campaign_source text,
  status public.lead_status NOT NULL DEFAULT 'new',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view leads" ON public.leads FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.generate_reference('CCB'),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  preferred_time text,
  reason text NOT NULL,
  product_category text,
  location text,
  consent boolean NOT NULL DEFAULT false,
  source_page text,
  status public.submission_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.callback_requests TO authenticated;
GRANT ALL ON public.callback_requests TO service_role;
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view callback requests" ON public.callback_requests FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can update callback requests" ON public.callback_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER callback_requests_set_updated_at BEFORE UPDATE ON public.callback_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.generate_reference('CQT'),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text NOT NULL,
  location text,
  scope text NOT NULL,
  requirements text NOT NULL,
  estimated_quantity text,
  required_date text,
  budget text,
  additional_information text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_page text,
  status public.submission_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view quote requests" ON public.quote_requests FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can update quote requests" ON public.quote_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER quote_requests_set_updated_at BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.business_account_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.generate_reference('CBA'),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  registered_name text NOT NULL,
  trading_name text,
  registration_number text NOT NULL,
  vat_number text,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text,
  billing_address text,
  delivery_address text,
  industry text,
  estimated_monthly_spend text,
  required_categories text[] NOT NULL DEFAULT '{}',
  bulk_requirements text,
  preferred_payment_method text,
  source_page text,
  status public.submission_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.business_account_applications TO authenticated;
GRANT ALL ON public.business_account_applications TO service_role;
ALTER TABLE public.business_account_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view business applications" ON public.business_account_applications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can update business applications" ON public.business_account_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER business_applications_set_updated_at BEFORE UPDATE ON public.business_account_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.supplier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.generate_reference('CSP'),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  registration_details text,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  product_categories text[] NOT NULL DEFAULT '{}',
  brands_supplied text,
  wholesale_available boolean NOT NULL DEFAULT false,
  dropshipping_available boolean NOT NULL DEFAULT false,
  minimum_order text,
  delivery_areas text,
  lead_times text,
  catalogue_upload_available boolean NOT NULL DEFAULT false,
  feed_capability text,
  source_page text,
  status public.submission_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.supplier_applications TO authenticated;
GRANT ALL ON public.supplier_applications TO service_role;
ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view supplier applications" ON public.supplier_applications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can update supplier applications" ON public.supplier_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER supplier_applications_set_updated_at BEFORE UPDATE ON public.supplier_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.generate_reference('CCH'),
  visitor_token text,
  source_page text,
  handed_off boolean NOT NULL DEFAULT false,
  status public.submission_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.chatbot_conversations TO authenticated;
GRANT ALL ON public.chatbot_conversations TO service_role;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view conversations" ON public.chatbot_conversations FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can update conversations" ON public.chatbot_conversations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.human_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.generate_reference('CSH'),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.chatbot_conversations(id) ON DELETE SET NULL,
  name text,
  phone text,
  email text,
  channel text NOT NULL DEFAULT 'cossa_ai_chat',
  context text,
  source_page text,
  status public.submission_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.human_support_requests TO authenticated;
GRANT ALL ON public.human_support_requests TO service_role;
ALTER TABLE public.human_support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view human support requests" ON public.human_support_requests FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can update human support requests" ON public.human_support_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER human_support_set_updated_at BEFORE UPDATE ON public.human_support_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  role public.chat_role NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chatbot_messages_conversation_idx ON public.chatbot_messages (conversation_id, created_at);

GRANT SELECT ON public.chatbot_messages TO authenticated;
GRANT ALL ON public.chatbot_messages TO service_role;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view messages" ON public.chatbot_messages FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.record_lead(
  p_name text,
  p_phone text,
  p_email text,
  p_location text,
  p_enquiry_type public.enquiry_type,
  p_interest text,
  p_preferred_contact_method public.contact_method,
  p_source_page text,
  p_campaign_source text,
  p_details jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.leads (
    name, phone, email, location, enquiry_type, interest,
    preferred_contact_method, source_page, campaign_source, details
  ) VALUES (
    left(coalesce(nullif(trim(p_name), ''), 'Website visitor'), 200),
    left(coalesce(p_phone, ''), 40),
    nullif(left(coalesce(p_email, ''), 255), ''),
    nullif(left(coalesce(p_location, ''), 200), ''),
    p_enquiry_type,
    nullif(left(coalesce(p_interest, ''), 2000), ''),
    coalesce(p_preferred_contact_method, 'phone'),
    nullif(left(coalesce(p_source_page, ''), 500), ''),
    nullif(left(coalesce(p_campaign_source, ''), 200), ''),
    coalesce(p_details, '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_callback_request(
  p_full_name text,
  p_phone text,
  p_email text,
  p_preferred_time text,
  p_reason text,
  p_product_category text,
  p_location text,
  p_consent boolean,
  p_source_page text,
  p_campaign_source text DEFAULT NULL
) RETURNS TABLE (id uuid, reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead uuid;
BEGIN
  IF coalesce(trim(p_full_name), '') = '' THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF coalesce(trim(p_phone), '') = '' THEN RAISE EXCEPTION 'Phone number is required'; END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required'; END IF;
  IF p_consent IS NOT TRUE THEN RAISE EXCEPTION 'Consent is required'; END IF;

  v_lead := public.record_lead(
    p_full_name, p_phone, p_email, p_location, 'callback',
    p_product_category, 'phone', p_source_page, p_campaign_source,
    jsonb_build_object('preferred_time', p_preferred_time, 'reason', p_reason)
  );

  RETURN QUERY
  INSERT INTO public.callback_requests (
    lead_id, full_name, phone, email, preferred_time, reason,
    product_category, location, consent, source_page
  ) VALUES (
    v_lead,
    left(trim(p_full_name), 200),
    left(trim(p_phone), 40),
    nullif(left(coalesce(p_email, ''), 255), ''),
    nullif(left(coalesce(p_preferred_time, ''), 200), ''),
    left(trim(p_reason), 300),
    nullif(left(coalesce(p_product_category, ''), 200), ''),
    nullif(left(coalesce(p_location, ''), 200), ''),
    true,
    nullif(left(coalesce(p_source_page, ''), 500), '')
  )
  RETURNING callback_requests.id, callback_requests.reference;
END;
$$;

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
SET search_path = public
AS $$
DECLARE v_lead uuid;
BEGIN
  IF coalesce(trim(p_contact_name), '') = '' THEN RAISE EXCEPTION 'Contact name is required'; END IF;
  IF coalesce(trim(p_email), '') = '' THEN RAISE EXCEPTION 'Email is required'; END IF;
  IF coalesce(trim(p_phone), '') = '' THEN RAISE EXCEPTION 'Phone number is required'; END IF;
  IF coalesce(trim(p_requirements), '') = '' THEN RAISE EXCEPTION 'Requirements are required'; END IF;

  v_lead := public.record_lead(
    p_contact_name, p_phone, p_email, p_location, 'quick_quote',
    p_requirements, 'email', p_source_page, p_campaign_source,
    jsonb_build_object('company', p_company, 'scope', p_scope, 'items', coalesce(p_items, '[]'::jsonb))
  );

  RETURN QUERY
  INSERT INTO public.quote_requests (
    lead_id, contact_name, company, email, phone, location, scope, requirements,
    estimated_quantity, required_date, budget, additional_information, items, source_page
  ) VALUES (
    v_lead,
    left(trim(p_contact_name), 200),
    nullif(left(coalesce(p_company, ''), 200), ''),
    left(trim(p_email), 255),
    left(trim(p_phone), 40),
    nullif(left(coalesce(p_location, ''), 200), ''),
    left(coalesce(nullif(trim(p_scope), ''), 'products_only'), 60),
    left(trim(p_requirements), 5000),
    nullif(left(coalesce(p_estimated_quantity, ''), 200), ''),
    nullif(left(coalesce(p_required_date, ''), 100), ''),
    nullif(left(coalesce(p_budget, ''), 200), ''),
    nullif(left(coalesce(p_additional_information, ''), 5000), ''),
    coalesce(p_items, '[]'::jsonb),
    nullif(left(coalesce(p_source_page, ''), 500), '')
  )
  RETURNING quote_requests.id, quote_requests.reference;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_business_account_application(
  p_registered_name text,
  p_trading_name text,
  p_registration_number text,
  p_vat_number text,
  p_contact_person text,
  p_email text,
  p_phone text,
  p_billing_address text,
  p_delivery_address text,
  p_industry text,
  p_estimated_monthly_spend text,
  p_required_categories text[],
  p_bulk_requirements text,
  p_preferred_payment_method text,
  p_source_page text DEFAULT NULL,
  p_campaign_source text DEFAULT NULL
) RETURNS TABLE (id uuid, reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead uuid;
BEGIN
  IF coalesce(trim(p_registered_name), '') = '' THEN RAISE EXCEPTION 'Registered name is required'; END IF;
  IF coalesce(trim(p_registration_number), '') = '' THEN RAISE EXCEPTION 'Registration number is required'; END IF;
  IF coalesce(trim(p_email), '') = '' THEN RAISE EXCEPTION 'Email is required'; END IF;

  v_lead := public.record_lead(
    coalesce(nullif(trim(p_contact_person), ''), p_registered_name),
    p_phone, p_email, NULL, 'business_account',
    p_industry, 'email', p_source_page, p_campaign_source,
    jsonb_build_object('company', p_registered_name, 'monthly_spend', p_estimated_monthly_spend)
  );

  RETURN QUERY
  INSERT INTO public.business_account_applications (
    lead_id, registered_name, trading_name, registration_number, vat_number,
    contact_person, email, phone, billing_address, delivery_address, industry,
    estimated_monthly_spend, required_categories, bulk_requirements,
    preferred_payment_method, source_page
  ) VALUES (
    v_lead,
    left(trim(p_registered_name), 250),
    nullif(left(coalesce(p_trading_name, ''), 250), ''),
    left(trim(p_registration_number), 100),
    nullif(left(coalesce(p_vat_number, ''), 100), ''),
    left(coalesce(nullif(trim(p_contact_person), ''), trim(p_registered_name)), 200),
    left(trim(p_email), 255),
    nullif(left(coalesce(p_phone, ''), 40), ''),
    nullif(left(coalesce(p_billing_address, ''), 1000), ''),
    nullif(left(coalesce(p_delivery_address, ''), 1000), ''),
    nullif(left(coalesce(p_industry, ''), 200), ''),
    nullif(left(coalesce(p_estimated_monthly_spend, ''), 100), ''),
    coalesce(p_required_categories, '{}'),
    nullif(left(coalesce(p_bulk_requirements, ''), 5000), ''),
    nullif(left(coalesce(p_preferred_payment_method, ''), 100), ''),
    nullif(left(coalesce(p_source_page, ''), 500), '')
  )
  RETURNING business_account_applications.id, business_account_applications.reference;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_supplier_application(
  p_company_name text,
  p_registration_details text,
  p_contact_person text,
  p_email text,
  p_phone text,
  p_website text,
  p_product_categories text[],
  p_brands_supplied text,
  p_wholesale_available boolean,
  p_dropshipping_available boolean,
  p_minimum_order text,
  p_delivery_areas text,
  p_lead_times text,
  p_catalogue_upload_available boolean,
  p_feed_capability text,
  p_source_page text DEFAULT NULL,
  p_campaign_source text DEFAULT NULL
) RETURNS TABLE (id uuid, reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead uuid;
BEGIN
  IF coalesce(trim(p_company_name), '') = '' THEN RAISE EXCEPTION 'Company name is required'; END IF;
  IF coalesce(trim(p_contact_person), '') = '' THEN RAISE EXCEPTION 'Contact person is required'; END IF;
  IF coalesce(trim(p_email), '') = '' THEN RAISE EXCEPTION 'Email is required'; END IF;

  v_lead := public.record_lead(
    p_contact_person, p_phone, p_email, p_delivery_areas, 'supplier_application',
    p_brands_supplied, 'email', p_source_page, p_campaign_source,
    jsonb_build_object('company', p_company_name, 'categories', coalesce(p_product_categories, '{}'))
  );

  RETURN QUERY
  INSERT INTO public.supplier_applications (
    lead_id, company_name, registration_details, contact_person, email, phone, website,
    product_categories, brands_supplied, wholesale_available, dropshipping_available,
    minimum_order, delivery_areas, lead_times, catalogue_upload_available,
    feed_capability, source_page
  ) VALUES (
    v_lead,
    left(trim(p_company_name), 250),
    nullif(left(coalesce(p_registration_details, ''), 300), ''),
    left(trim(p_contact_person), 200),
    left(trim(p_email), 255),
    nullif(left(coalesce(p_phone, ''), 40), ''),
    nullif(left(coalesce(p_website, ''), 300), ''),
    coalesce(p_product_categories, '{}'),
    nullif(left(coalesce(p_brands_supplied, ''), 2000), ''),
    coalesce(p_wholesale_available, false),
    coalesce(p_dropshipping_available, false),
    nullif(left(coalesce(p_minimum_order, ''), 200), ''),
    nullif(left(coalesce(p_delivery_areas, ''), 500), ''),
    nullif(left(coalesce(p_lead_times, ''), 200), ''),
    coalesce(p_catalogue_upload_available, false),
    nullif(left(coalesce(p_feed_capability, ''), 200), ''),
    nullif(left(coalesce(p_source_page, ''), 500), '')
  )
  RETURNING supplier_applications.id, supplier_applications.reference;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_chatbot_conversation(
  p_visitor_token text DEFAULT NULL,
  p_source_page text DEFAULT NULL
) RETURNS TABLE (id uuid, reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.chatbot_conversations (visitor_token, source_page)
  VALUES (
    nullif(left(coalesce(p_visitor_token, ''), 100), ''),
    nullif(left(coalesce(p_source_page, ''), 500), '')
  )
  RETURNING chatbot_conversations.id, chatbot_conversations.reference;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_chatbot_message(
  p_conversation_id uuid,
  p_role public.chat_role,
  p_content text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(trim(p_content), '') = '' THEN RAISE EXCEPTION 'Message content is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chatbot_conversations WHERE id = p_conversation_id) THEN
    RAISE EXCEPTION 'Unknown conversation';
  END IF;

  INSERT INTO public.chatbot_messages (conversation_id, role, content)
  VALUES (p_conversation_id, p_role, left(trim(p_content), 4000))
  RETURNING id INTO v_id;

  UPDATE public.chatbot_conversations SET updated_at = now() WHERE id = p_conversation_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_human_support_request(
  p_name text,
  p_phone text,
  p_email text,
  p_channel text,
  p_context text,
  p_conversation_id uuid DEFAULT NULL,
  p_source_page text DEFAULT NULL,
  p_campaign_source text DEFAULT NULL
) RETURNS TABLE (id uuid, reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead uuid;
BEGIN
  v_lead := public.record_lead(
    p_name, p_phone, p_email, NULL, 'human_support',
    p_context, 'whatsapp', p_source_page, p_campaign_source,
    jsonb_build_object('channel', coalesce(p_channel, 'cossa_ai_chat'))
  );

  IF p_conversation_id IS NOT NULL THEN
    UPDATE public.chatbot_conversations SET handed_off = true WHERE id = p_conversation_id;
  END IF;

  RETURN QUERY
  INSERT INTO public.human_support_requests (
    lead_id, conversation_id, name, phone, email, channel, context, source_page
  ) VALUES (
    v_lead,
    p_conversation_id,
    nullif(left(coalesce(p_name, ''), 200), ''),
    nullif(left(coalesce(p_phone, ''), 40), ''),
    nullif(left(coalesce(p_email, ''), 255), ''),
    left(coalesce(nullif(trim(p_channel), ''), 'cossa_ai_chat'), 60),
    nullif(left(coalesce(p_context, ''), 2000), ''),
    nullif(left(coalesce(p_source_page, ''), 500), '')
  )
  RETURNING human_support_requests.id, human_support_requests.reference;
END;
$$;

REVOKE ALL ON FUNCTION public.record_lead(text, text, text, text, public.enquiry_type, text, public.contact_method, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_lead(text, text, text, text, public.enquiry_type, text, public.contact_method, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.record_lead(text, text, text, text, public.enquiry_type, text, public.contact_method, text, text, jsonb) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.submit_callback_request(text, text, text, text, text, text, text, boolean, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_request(text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_business_account_application(text, text, text, text, text, text, text, text, text, text, text, text[], text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_supplier_application(text, text, text, text, text, text, text[], text, boolean, boolean, text, text, text, boolean, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_chatbot_conversation(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_chatbot_message(uuid, public.chat_role, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_human_support_request(text, text, text, text, text, uuid, text, text) TO anon, authenticated;