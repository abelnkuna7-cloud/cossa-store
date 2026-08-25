-- Compact production setup for the disabled-by-default Email Operations foundation.
-- Private tables: only service_role Edge Functions may read/write them.

CREATE TABLE IF NOT EXISTS public.email_operations_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  operational_area text NOT NULL CHECK (operational_area IN ('store', 'nexdocs', 'growth', 'shared')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'needs_approval', 'approved', 'sent', 'closed', 'failed')),
  classification text NOT NULL DEFAULT 'unclassified',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  sender_name text,
  sender_email text,
  recipient_email text,
  subject text,
  message_summary text,
  response_draft text,
  source_message_id text,
  requires_human_approval boolean NOT NULL DEFAULT true,
  due_at timestamptz,
  last_action_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_operations_source_message_unique_idx
  ON public.email_operations_items (organisation_id, source_message_id)
  WHERE source_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_operations_items_admin_queue_idx
  ON public.email_operations_items (organisation_id, status, priority, due_at, created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_marketing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  email text NOT NULL,
  display_name text,
  consent_status text NOT NULL DEFAULT 'pending'
    CHECK (consent_status IN ('pending', 'opted_in', 'unsubscribed')),
  consent_source text,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_marketing_contacts_unique UNIQUE (organisation_id, email)
);

CREATE TABLE IF NOT EXISTS public.email_operations_settings (
  organisation_id uuid PRIMARY KEY,
  inbox_connection_status text NOT NULL DEFAULT 'not_configured'
    CHECK (inbox_connection_status IN ('not_configured', 'configured', 'paused', 'error')),
  outbound_mode text NOT NULL DEFAULT 'disabled'
    CHECK (outbound_mode IN ('disabled', 'approval_only', 'enabled')),
  marketing_enabled boolean NOT NULL DEFAULT false,
  daily_send_limit integer NOT NULL DEFAULT 0 CHECK (daily_send_limit >= 0),
  monthly_send_limit integer NOT NULL DEFAULT 0 CHECK (monthly_send_limit >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.email_operations_settings (
  organisation_id, inbox_connection_status, outbound_mode, marketing_enabled,
  daily_send_limit, monthly_send_limit
) VALUES (
  '00000000-0000-4000-8000-000000000001', 'not_configured', 'disabled', false, 0, 0
) ON CONFLICT (organisation_id) DO NOTHING;

DROP TRIGGER IF EXISTS email_operations_items_set_updated_at ON public.email_operations_items;
CREATE TRIGGER email_operations_items_set_updated_at
  BEFORE UPDATE ON public.email_operations_items FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS email_marketing_contacts_set_updated_at ON public.email_marketing_contacts;
CREATE TRIGGER email_marketing_contacts_set_updated_at
  BEFORE UPDATE ON public.email_marketing_contacts FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS email_operations_settings_set_updated_at ON public.email_operations_settings;
CREATE TRIGGER email_operations_settings_set_updated_at
  BEFORE UPDATE ON public.email_operations_settings FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_operations_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_operations_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_operations_items FROM anon, authenticated;
REVOKE ALL ON public.email_marketing_contacts FROM anon, authenticated;
REVOKE ALL ON public.email_operations_settings FROM anon, authenticated;
GRANT ALL ON public.email_operations_items TO service_role;
GRANT ALL ON public.email_marketing_contacts TO service_role;
GRANT ALL ON public.email_operations_settings TO service_role;
