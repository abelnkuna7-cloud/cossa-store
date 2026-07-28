/** Human-support requests -> submit_human_support_request RPC (CSH reference). */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  campaignSource,
  currentPage,
  failure,
  rpcArgs,
  type SubmissionResult,
} from "@/services/service-result";

export type SupportChannel = "cossa_ai_chat" | "whatsapp" | "phone" | "callback" | "email";

export interface HumanSupportRequestInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  channel: SupportChannel;
  reason: string;
  conversation_id?: string | null;
}

export async function submitHumanSupportRequest(
  input: HumanSupportRequestInput,
): Promise<SubmissionResult> {
  try {
    const { data, error } = await supabase.rpc("submit_human_support_request", rpcArgs({
      p_name: input.name ?? null,
      p_phone: input.phone ?? null,
      p_email: input.email ?? null,
      p_channel: input.channel,
      p_context: input.reason,
      p_conversation_id: input.conversation_id ?? null,
      p_source_page: currentPage(),
      p_campaign_source: campaignSource(),
    }));
    if (error) return failure(error);
    const row = data?.[0];
    if (!row?.reference) return failure("missing reference");
    trackEvent("human_support_requested", { channel: input.channel });
    return { success: true, id: row.id, referenceNumber: row.reference };
  } catch (error) {
    return failure(error);
  }
}
