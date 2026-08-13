/**
 * Cossa Store quotation submission service.
 *
 * Quote requests are submitted through the protected
 * `submit_quote_request` Supabase RPC.
 *
 * IMPORTANT:
 * - No React or JSX belongs in this file.
 * - Customer PII is sent only to the quotation RPC.
 * - Quote item data can include product, variant and quantity information.
 * - The RPC/database remains the authoritative validation boundary.
 */

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

import type { QuoteLine } from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* QUOTE SCOPE                                                                */
/* -------------------------------------------------------------------------- */

export type QuoteScope =
  | "products_only"
  | "services_only"
  | "products_and_services"
  | "bulk_order"
  | "product_sourcing";

/* -------------------------------------------------------------------------- */
/* QUOTE LINE                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Variant-aware quote line.
 *
 * QuoteLine currently provides product_id + quantity.
 * variant_id is retained here while the wider commerce types
 * are being migrated to variant-aware line identity.
 */
export interface QuoteRequestLine extends QuoteLine {
  variant_id?: string | null;
}

/* -------------------------------------------------------------------------- */
/* INPUT                                                                      */
/* -------------------------------------------------------------------------- */

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

  items?: QuoteRequestLine[];
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanRequiredText(
  value: string,
): string {
  return value.trim();
}

function cleanOptionalText(
  value: string | null | undefined,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned.length > 0
    ? cleaned
    : null;
}

function normaliseQuantity(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(value),
  );
}

function normaliseQuoteItems(
  items: QuoteRequestLine[] | undefined,
): QuoteRequestLine[] {
  if (!items?.length) {
    return [];
  }

  const merged =
    new Map<
      string,
      QuoteRequestLine
    >();

  for (const item of items) {
    const productId =
      String(
        item.product_id ?? "",
      ).trim();

    if (!productId) {
      continue;
    }

    const variantId =
      typeof item.variant_id === "string" &&
      item.variant_id.trim().length > 0
        ? item.variant_id.trim()
        : null;

    const quantity =
      normaliseQuantity(
        item.quantity,
      );

    /**
     * Product + variant forms the commercial line identity.
     */
    const key =
      `${productId}::${variantId ?? "base"}`;

    const existing =
      merged.get(key);

    if (existing) {
      merged.set(key, {
        ...existing,
        quantity:
          existing.quantity +
          quantity,
      });

      continue;
    }

    merged.set(key, {
      product_id:
        productId,

      quantity,

      variant_id:
        variantId,
    });
  }

  return Array.from(
    merged.values(),
  );
}

/* -------------------------------------------------------------------------- */
/* SUBMISSION                                                                 */
/* -------------------------------------------------------------------------- */

export async function submitQuoteRequest(
  input: QuoteRequestInput,
): Promise<SubmissionResult> {
  try {
    const contactName =
      cleanRequiredText(
        input.contact_name,
      );

    const email =
      cleanRequiredText(
        input.email,
      );

    const phone =
      cleanRequiredText(
        input.phone,
      );

    const requirements =
      cleanRequiredText(
        input.requirements,
      );

    /**
     * Client-side/service validation improves UX.
     *
     * The Supabase RPC must still perform authoritative
     * server-side validation.
     */
    if (
      !contactName ||
      !email ||
      !phone ||
      !requirements
    ) {
      return failure(
        "required quotation information is missing",
      );
    }

    const items =
      normaliseQuoteItems(
        input.items,
      );

    const { data, error } =
      await supabase.rpc(
        "submit_quote_request",

        rpcArgs({
          p_contact_name:
            contactName,

          p_company:
            cleanOptionalText(
              input.company,
            ),

          p_email:
            email,

          p_phone:
            phone,

          p_location:
            cleanOptionalText(
              input.location,
            ),

          p_scope:
            input.scope,

          p_requirements:
            requirements,

          p_estimated_quantity:
            cleanOptionalText(
              input.estimated_quantity,
            ),

          p_required_date:
            cleanOptionalText(
              input.required_date,
            ),

          p_budget:
            cleanOptionalText(
              input.budget,
            ),

          p_additional_information:
            cleanOptionalText(
              input.additional_information,
            ),

          /**
           * Supabase expects JSON here.
           *
           * Shape:
           *
           * [
           *   {
           *     product_id: "...",
           *     variant_id: "...",
           *     quantity: 2
           *   }
           * ]
           */
          p_items:
            items as unknown as never,

          p_source_page:
            currentPage(),

          p_campaign_source:
            campaignSource(),
        }),
      );

    if (error) {
      return failure(
        error,
      );
    }

    const row =
      data?.[0];

    if (
      !row?.reference
    ) {
      return failure(
        "missing reference",
      );
    }

    await submitCentralStoreLead({
      sourceRecordId: row.id,
      leadType: "quote_request",
      fullName: contactName,
      email,
      phone,
      service: input.scope,
      location: cleanOptionalText(input.location),
      notes: [
        `Requirements: ${requirements}`,
        input.budget ? `Budget: ${input.budget}` : null,
        input.required_date ? `Required date: ${input.required_date}` : null,
        input.additional_information
          ? `Additional information: ${input.additional_information}`
          : null,
      ].filter(Boolean).join("\n"),
      company: cleanOptionalText(input.company),
      rawPayload: {
        scope: input.scope,
        estimated_quantity: cleanOptionalText(input.estimated_quantity),
        required_date: cleanOptionalText(input.required_date),
        budget: cleanOptionalText(input.budget),
        additional_information: cleanOptionalText(input.additional_information),
        items,
        source_page: currentPage(),
        campaign_source: campaignSource(),
      },
    });

    /**
     * Keep customer PII out of analytics.
     */
    trackEvent(
      "quote_submitted",
    );

    return {
      success: true,

      id:
        row.id,

      referenceNumber:
        row.reference,
    };
  } catch (error) {
    return failure(
      error,
    );
  }
}
