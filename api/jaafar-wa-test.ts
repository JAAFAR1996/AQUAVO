import { createHash, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const TEST_TOKEN = "a4_xSWylYKiGYjZogK09oz9K5crRcBbD5tXr-M4rtyA";
const TEST_PHONE_SALT = "fbaf0b5884500f27aadaeb77eb7d3c96";
const TEST_PHONE_HASH = "55929e01578b3dc3667c8a8b50c0a0beaa1419edfd1f3511792f536faea69203";
const CUSTOMER_FIRST_NAME = "جعفر";
const REQUEST_TIMEOUT_MS = 7_000;
const OK_PAYLOAD = "aquavo_delivery_ok_v1";
const ISSUE_PAYLOAD = "aquavo_delivery_issue_v1";

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { code?: number; error_subcode?: number; message?: string };
};

declare global {
  // eslint-disable-next-line no-var
  var __aquavoJaafarWaTestSent: boolean | undefined;
}

function firstQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function safeTokenMatches(provided: string): boolean {
  const expected = Buffer.from(TEST_TOKEN);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function digitsOnly(value: unknown): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabic = "۰۱۲۳۴۵۶۷۸۹";
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (digit) => String(arabicIndic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabic.indexOf(digit)))
    .replace(/\D/g, "");
}

function authorizedTestPhone(rawPhone: string): boolean {
  const digest = createHash("sha256")
    .update(TEST_PHONE_SALT + digitsOnly(rawPhone))
    .digest("hex");
  return digest === TEST_PHONE_HASH;
}

function normalizeIraqiWhatsAppPhone(value: unknown): string | null {
  let digits = digitsOnly(value);
  if (!digits) return null;
  if (digits.startsWith("00964")) digits = digits.slice(2);
  if (digits.startsWith("9640")) digits = `964${digits.slice(4)}`;
  if (digits.startsWith("0") && digits.length === 11) digits = `964${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 10) digits = `964${digits}`;
  return /^9647\d{9}$/.test(digits) ? digits : null;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 6)}***${phone.slice(-4)}`;
}

async function sendTemplate(
  endpoint: string,
  accessToken: string,
  templateName: string,
  languageCode: string,
  recipientPhone: string,
  includeQuickReplyPayloads: boolean,
): Promise<{ response: Response; body: MetaSendResponse }> {
  const components: Array<Record<string, unknown>> = [
    { type: "body", parameters: [{ type: "text", text: CUSTOMER_FIRST_NAME }] },
  ];

  if (includeQuickReplyPayloads) {
    components.push(
      { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: OK_PAYLOAD }] },
      { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: ISSUE_PAYLOAD }] },
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  let body: MetaSendResponse = {};
  try {
    body = await response.json() as MetaSendResponse;
  } catch {
    // Do not echo arbitrary provider bodies.
  }
  return { response, body };
}

export default async function jaafarWhatsAppTest(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, code: "METHOD_NOT_ALLOWED" });
  }

  const token = firstQueryValue(req.query.k);
  const rawPhone = firstQueryValue(req.query.phone);
  if (!safeTokenMatches(token) || !authorizedTestPhone(rawPhone)) {
    return res.status(404).json({ success: false, code: "NOT_FOUND" });
  }

  if (globalThis.__aquavoJaafarWaTestSent) {
    return res.status(409).json({ success: false, code: "ONE_SHOT_ALREADY_USED" });
  }

  if (process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() !== "true") {
    return res.status(503).json({ success: false, code: "WHATSAPP_DISABLED" });
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const templateName = process.env.WHATSAPP_DELIVERY_CARE_TEMPLATE?.trim() ?? "";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "ar";

  if (!/^v\d+\.\d+$/.test(apiVersion) || !/^\d+$/.test(phoneNumberId) || !accessToken || !templateName) {
    return res.status(503).json({ success: false, code: "WHATSAPP_CONFIG_INCOMPLETE" });
  }

  const recipientPhone = normalizeIraqiWhatsAppPhone(rawPhone);
  if (!recipientPhone) {
    return res.status(400).json({ success: false, code: "INVALID_IRAQI_MOBILE" });
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`;

  try {
    let attempt = await sendTemplate(endpoint, accessToken, templateName, languageCode, recipientPhone, true);
    let providerMessageId = String(attempt.body.messages?.[0]?.id ?? "").trim();

    if (!attempt.response.ok && attempt.response.status === 400 && Number(attempt.body.error?.code) === 132018) {
      attempt = await sendTemplate(endpoint, accessToken, templateName, languageCode, recipientPhone, false);
      providerMessageId = String(attempt.body.messages?.[0]?.id ?? "").trim();
    }

    if (!attempt.response.ok || !providerMessageId) {
      return res.status(502).json({
        success: false,
        code: "WHATSAPP_PROVIDER_REJECTED",
        httpStatus: attempt.response.status,
        metaCode: Number(attempt.body.error?.code) || null,
        metaSubcode: Number(attempt.body.error?.error_subcode) || null,
      });
    }

    globalThis.__aquavoJaafarWaTestSent = true;
    return res.status(200).json({
      success: true,
      mode: "isolated_one_shot",
      customerName: CUSTOMER_FIRST_NAME,
      recipient: maskPhone(recipientPhone),
      template: templateName,
      providerMessageId,
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    return res.status(502).json({
      success: false,
      code: errorName === "TimeoutError" || errorName === "AbortError"
        ? "WHATSAPP_TIMEOUT_AMBIGUOUS"
        : "WHATSAPP_NETWORK_AMBIGUOUS",
    });
  }
}
