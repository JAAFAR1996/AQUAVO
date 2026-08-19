export const DELIVERY_CARE_OK_PAYLOAD = "aquavo_delivery_ok_v1";
export const DELIVERY_CARE_ISSUE_PAYLOAD = "aquavo_delivery_issue_v1";

export const DELIVERY_CARE_OK_BUTTON_TEXT = "وصلتني وكلشي تمام";
export const DELIVERY_CARE_ISSUE_BUTTON_TEXT = "عندي ملاحظة عالطلب";

export type DeliveryCareReplyChoice = "delivered_ok" | "delivery_issue";

const REPLY_CONFIG: Record<DeliveryCareReplyChoice, {
  payload: string;
  buttonText: string;
  autoReplyText: string;
}> = {
  delivered_ok: {
    payload: DELIVERY_CARE_OK_PAYLOAD,
    buttonText: DELIVERY_CARE_OK_BUTTON_TEXT,
    autoReplyText: "تتهنى بطلبك أستاذ، وإذا احتجت أي مساعدة بأي منتج، دزلنا بأي وقت.",
  },
  delivery_issue: {
    payload: DELIVERY_CARE_ISSUE_PAYLOAD,
    buttonText: DELIVERY_CARE_ISSUE_BUTTON_TEXT,
    autoReplyText: "أكيد أستاذ، كللنا شنو الملاحظة بالطلب حتى نتابعها وياك.",
  },
};

/**
 * Resolve only a real WhatsApp button callback. Payload is authoritative because
 * AQUAVO sets it when the approved template is sent. The text fallback is kept
 * for compatibility with provider callbacks that echo the configured button text.
 */
export function resolveDeliveryCareReplyChoice(
  payload: unknown,
  buttonText: unknown,
): DeliveryCareReplyChoice | null {
  const normalizedPayload = String(payload ?? "").trim();
  const normalizedText = String(buttonText ?? "").normalize("NFKC").trim();

  for (const [choice, config] of Object.entries(REPLY_CONFIG) as Array<[
    DeliveryCareReplyChoice,
    (typeof REPLY_CONFIG)[DeliveryCareReplyChoice],
  ]>) {
    if (normalizedPayload === config.payload) return choice;
  }

  for (const [choice, config] of Object.entries(REPLY_CONFIG) as Array<[
    DeliveryCareReplyChoice,
    (typeof REPLY_CONFIG)[DeliveryCareReplyChoice],
  ]>) {
    if (normalizedText === config.buttonText) return choice;
  }

  return null;
}

export function getDeliveryCareAutoReplyText(choice: DeliveryCareReplyChoice): string {
  return REPLY_CONFIG[choice].autoReplyText;
}
