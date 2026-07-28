/** Callback requests -> submit_callback_request RPC (returns a CCB reference). */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  campaignSource,
  currentPage,
  failure,
  type SubmissionResult,
} from "@/services/service-result";

export interface CallbackRequestInput {
  full_name: string;
  phone: string;
  email: string | null;
  preferred_time: string | null;
  reason: string;
  product_category: string | null;
  location: string | null;
  consent: boolean;
}

export async function submitCallbackRequest(
  input: CallbackRequestInput,
): Promise<SubmissionResult> {
  try {
    const { data, error } = await supabase.rpc("submit_callback_request", {
      p_full_name: input.full_name,
      p_phone: input.phone,
      p_email: input.email,
      p_preferred_time: input.preferred_time,
      p_reason: input.reason,
      p_product_category: input.product_category,
      p_location: input.location,
      p_consent: input.consent,
      p_source_page: currentPage(),
      p_campaign_source: campaignSource(),
    });
    if (error) return failure(error);
    const row = data?.[0];
    if (!row?.reference) return failure("missing reference");
    trackEvent("callback_submitted");
    return { success: true, id: row.id, referenceNumber: row.reference };
  } catch (error) {
    return failure(error);
  }
}
