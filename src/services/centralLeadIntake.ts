/**
 * Central Cossa Growth lead intake for Store-originated enquiries.
 *
 * The Supabase publishable key is intentionally public: it can call only the
 * rate-limited `ingest_cossa_lead` function and cannot read central leads.
 * Source-specific operational records remain in the Store database.
 */

const COSSA_GROWTH_URL = "https://nptyyzyokzgnwnyteeyi.supabase.co";
const COSSA_GROWTH_PUBLISHABLE_KEY =
  "sb_publishable_yKrtvn-qdmV0FwI9kxN2xw_2KhT_1vC";

export interface CentralStoreLeadInput {
  sourceRecordId: string;
  leadType: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;
  notes?: string | null;
  company?: string | null;
  rawPayload?: Record<string, unknown>;
}

export async function submitCentralStoreLead(
  input: CentralStoreLeadInput,
): Promise<void> {
  const response = await fetch(
    `${COSSA_GROWTH_URL}/rest/v1/rpc/ingest_cossa_lead`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: COSSA_GROWTH_PUBLISHABLE_KEY,
        Authorization: `Bearer ${COSSA_GROWTH_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        p_source_app: "cossa_store",
        p_source_record_id: input.sourceRecordId,
        p_lead_type: input.leadType,
        p_full_name: input.fullName,
        p_email: input.email ?? null,
        p_phone: input.phone ?? null,
        p_service: input.service ?? null,
        p_location: input.location ?? null,
        p_notes: input.notes ?? null,
        p_company: input.company ?? null,
        p_raw_payload: input.rawPayload ?? {},
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Central lead intake could not record this Store enquiry.");
  }
}
