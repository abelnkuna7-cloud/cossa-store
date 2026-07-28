/** Supplier applications -> submit_supplier_application RPC (CSP reference). */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  campaignSource,
  currentPage,
  failure,
  type SubmissionResult,
} from "@/services/service-result";

export interface SupplierApplicationInput {
  company_name: string;
  registration_details: string | null;
  contact_person: string;
  email: string;
  phone: string | null;
  website: string | null;
  product_categories: string[];
  brands_supplied: string | null;
  wholesale_available: boolean;
  dropshipping_available: boolean;
  minimum_order: string | null;
  delivery_areas: string | null;
  lead_times: string | null;
  catalogue_upload_available: boolean;
  feed_capability: string | null;
}

export async function submitSupplierApplication(
  input: SupplierApplicationInput,
): Promise<SubmissionResult> {
  try {
    const { data, error } = await supabase.rpc("submit_supplier_application", {
      p_company_name: input.company_name,
      p_registration_details: input.registration_details,
      p_contact_person: input.contact_person,
      p_email: input.email,
      p_phone: input.phone,
      p_website: input.website,
      p_product_categories: input.product_categories,
      p_brands_supplied: input.brands_supplied,
      p_wholesale_available: input.wholesale_available,
      p_dropshipping_available: input.dropshipping_available,
      p_minimum_order: input.minimum_order,
      p_delivery_areas: input.delivery_areas,
      p_lead_times: input.lead_times,
      p_catalogue_upload_available: input.catalogue_upload_available,
      p_feed_capability: input.feed_capability,
      p_source_page: currentPage(),
      p_campaign_source: campaignSource(),
    });
    if (error) return failure(error);
    const row = data?.[0];
    if (!row?.reference) return failure("missing reference");
    trackEvent("supplier_application_submitted");
    return { success: true, id: row.id, referenceNumber: row.reference };
  } catch (error) {
    return failure(error);
  }
}
