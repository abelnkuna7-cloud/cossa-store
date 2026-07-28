/** Quotation requests -> submit_quote_request RPC (returns a CQT reference). */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  campaignSource,
  currentPage,
  failure,
  type SubmissionResult,
} from "@/services/service-result";
import type { QuoteLine } from "@/types/catalog";

export type QuoteScope =
  | "products_only"
  | "services_only"
  | "products_and_services"
  | "bulk_order"
  | "product_sourcing";

export interface QuoteRequestInput {
  contact_name: string;
  company: string | null;
  email: string;
  phone: string;
  location: string | null;
  scope: QuoteScope;
  requirements: string;
  estimated_quantity?: string | null;
  required_date?: string | null;
  budget?: string | null;
  additional_information?: string | null;
  items?: QuoteLine[];
}

export async function submitQuoteRequest(input: QuoteRequestInput): Promise<SubmissionResult> {
  try {
    const { data, error } = await supabase.rpc("submit_quote_request", {
      p_contact_name: input.contact_name,
      p_company: input.company,
      p_email: input.email,
      p_phone: input.phone,
      p_location: input.location,
      p_scope: input.scope,
      p_requirements: input.requirements,
      p_estimated_quantity: input.estimated_quantity ?? null,
      p_required_date: input.required_date ?? null,
      p_budget: input.budget ?? null,
      p_additional_information: input.additional_information ?? null,
      p_items: (input.items ?? []) as unknown as never,
      p_source_page: currentPage(),
      p_campaign_source: campaignSource(),
    });
    if (error) return failure(error);
    const row = data?.[0];
    if (!row?.reference) return failure("missing reference");
    trackEvent("quote_submitted");
    return { success: true, id: row.id, referenceNumber: row.reference };
  } catch (error) {
    return failure(error);
  }
}
