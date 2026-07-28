/** Business accounts -> submit_business_account_application (CBA reference). */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  campaignSource,
  currentPage,
  failure,
  type SubmissionResult,
} from "@/services/service-result";

export interface BusinessAccountApplicationInput {
  registered_name: string;
  trading_name: string | null;
  registration_number: string;
  vat_number: string | null;
  contact_person: string;
  email: string;
  phone: string | null;
  billing_address: string | null;
  delivery_address: string | null;
  industry: string | null;
  estimated_monthly_spend: string | null;
  required_categories: string[];
  bulk_requirements: string | null;
  preferred_payment_method: string | null;
}

export async function submitBusinessAccountApplication(
  input: BusinessAccountApplicationInput,
): Promise<SubmissionResult> {
  try {
    const { data, error } = await supabase.rpc("submit_business_account_application", {
      p_registered_name: input.registered_name,
      p_trading_name: input.trading_name,
      p_registration_number: input.registration_number,
      p_vat_number: input.vat_number,
      p_contact_person: input.contact_person,
      p_email: input.email,
      p_phone: input.phone,
      p_billing_address: input.billing_address,
      p_delivery_address: input.delivery_address,
      p_industry: input.industry,
      p_estimated_monthly_spend: input.estimated_monthly_spend,
      p_required_categories: input.required_categories,
      p_bulk_requirements: input.bulk_requirements,
      p_preferred_payment_method: input.preferred_payment_method,
      p_source_page: currentPage(),
      p_campaign_source: campaignSource(),
    });
    if (error) return failure(error);
    const row = data?.[0];
    if (!row?.reference) return failure("missing reference");
    trackEvent("business_account_submitted");
    return { success: true, id: row.id, referenceNumber: row.reference };
  } catch (error) {
    return failure(error);
  }
}
