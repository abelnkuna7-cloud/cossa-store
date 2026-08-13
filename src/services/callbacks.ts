/** Callback requests -> submit_callback_request RPC (returns a CCB reference). */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { submitCentralStoreLead } from "@/services/centralLeadIntake";
import {
  campaignSource,
  currentPage,
  failure,
  rpcArgs,
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
    const { data, error } = await supabase.rpc("submit_callback_request", rpcArgs({
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
    }));
    if (error) return failure(error);
    const row = data?.[0];
    if (!row?.reference) return failure("missing reference");

    await submitCentralStoreLead({
      sourceRecordId: row.id,
      leadType: "callback_request",
      fullName: input.full_name,
      email: input.email,
      phone: input.phone,
      service: input.product_category ?? input.reason,
      location: input.location,
      notes: [
        input.reason ? `Reason: ${input.reason}` : null,
        input.preferred_time ? `Preferred time: ${input.preferred_time}` : null,
      ].filter(Boolean).join("\n"),
      rawPayload: {
        preferred_time: input.preferred_time,
        reason: input.reason,
        product_category: input.product_category,
        source_page: currentPage(),
        campaign_source: campaignSource(),
      },
    });

    trackEvent("callback_submitted");
    return { success: true, id: row.id, referenceNumber: row.reference };
  } catch (error) {
    return failure(error);
  }
}
