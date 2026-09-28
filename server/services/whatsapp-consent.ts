import { sql } from "drizzle-orm";

export type PersistedWhatsAppConsent = {
  care: boolean;
  marketing: boolean;
  version: string;
  capturedAt: string;
};

type TxLike = {
  execute: (query: unknown) => Promise<unknown>;
};

/**
 * Persist positive WhatsApp consent inside the SAME transaction as order
 * creation. Unchecked categories are intentionally a no-op: absence of fresh
 * consent must never revoke an older permission or manufacture an opt-out.
 */
export async function persistWhatsAppConsentInTransaction(
  tx: TxLike,
  input: {
    orderId: string;
    customerPhone: string;
    consent?: PersistedWhatsAppConsent;
    source: "checkout" | "wayl_checkout";
  },
): Promise<void> {
  const consent = input.consent;
  if (!consent || (!consent.care && !consent.marketing)) return;

  const capturedAt = new Date(consent.capturedAt);
  if (!Number.isFinite(capturedAt.getTime())) {
    throw new Error("WHATSAPP_CONSENT_CAPTURED_AT_INVALID");
  }

  const normalizedResult = await tx.execute(sql`
    SELECT public.aquavo_normalize_iraqi_phone(${input.customerPhone}) AS phone
  `);
  const rows = Array.isArray(normalizedResult)
    ? normalizedResult as Array<Record<string, unknown>>
    : ((normalizedResult as { rows?: Array<Record<string, unknown>> } | null)?.rows ?? []);
  const phone = String(rows[0]?.phone ?? "").trim();
  if (!/^9647\d{9}$/.test(phone)) {
    // The order itself can still be valid even when a phone cannot be normalized
    // for WhatsApp. Do not create unverifiable consent against the wrong identity.
    return;
  }

  await tx.execute(sql`
    INSERT INTO public.customer_whatsapp_preferences(
      phone,care_opt_in,marketing_opt_in,care_opt_in_at,marketing_opt_in_at,
      care_opt_out_at,marketing_opt_out_at,all_opt_out_at,consent_version,
      consent_source,last_order_id,created_at,updated_at
    ) VALUES(
      ${phone},
      ${consent.care},
      ${consent.marketing},
      CASE WHEN ${consent.care} THEN ${capturedAt} ELSE NULL END,
      CASE WHEN ${consent.marketing} THEN ${capturedAt} ELSE NULL END,
      NULL,NULL,NULL,${consent.version},${input.source},${input.orderId},
      clock_timestamp(),clock_timestamp()
    )
    ON CONFLICT(phone) DO UPDATE SET
      care_opt_in=public.customer_whatsapp_preferences.care_opt_in OR EXCLUDED.care_opt_in,
      marketing_opt_in=public.customer_whatsapp_preferences.marketing_opt_in OR EXCLUDED.marketing_opt_in,
      care_opt_in_at=CASE
        WHEN EXCLUDED.care_opt_in THEN EXCLUDED.care_opt_in_at
        ELSE public.customer_whatsapp_preferences.care_opt_in_at
      END,
      marketing_opt_in_at=CASE
        WHEN EXCLUDED.marketing_opt_in THEN EXCLUDED.marketing_opt_in_at
        ELSE public.customer_whatsapp_preferences.marketing_opt_in_at
      END,
      care_opt_out_at=CASE
        WHEN EXCLUDED.care_opt_in THEN NULL
        ELSE public.customer_whatsapp_preferences.care_opt_out_at
      END,
      marketing_opt_out_at=CASE
        WHEN EXCLUDED.marketing_opt_in THEN NULL
        ELSE public.customer_whatsapp_preferences.marketing_opt_out_at
      END,
      all_opt_out_at=CASE
        WHEN EXCLUDED.care_opt_in OR EXCLUDED.marketing_opt_in THEN NULL
        ELSE public.customer_whatsapp_preferences.all_opt_out_at
      END,
      consent_version=COALESCE(EXCLUDED.consent_version,public.customer_whatsapp_preferences.consent_version),
      consent_source=EXCLUDED.consent_source,
      last_order_id=EXCLUDED.last_order_id,
      updated_at=clock_timestamp()
  `);

  if (consent.care) {
    await tx.execute(sql`
      INSERT INTO public.customer_whatsapp_consent_events(
        phone,category,action,source,order_id,consent_version,metadata,created_at
      ) VALUES(
        ${phone},'care','opt_in',${input.source},${input.orderId},${consent.version},
        jsonb_build_object('capturedAt',${capturedAt}),clock_timestamp()
      )
      ON CONFLICT DO NOTHING
    `);
  }

  if (consent.marketing) {
    await tx.execute(sql`
      INSERT INTO public.customer_whatsapp_consent_events(
        phone,category,action,source,order_id,consent_version,metadata,created_at
      ) VALUES(
        ${phone},'marketing','opt_in',${input.source},${input.orderId},${consent.version},
        jsonb_build_object('capturedAt',${capturedAt}),clock_timestamp()
      )
      ON CONFLICT DO NOTHING
    `);
  }
}
