export const WHATSAPP_CONSENT_VERSION = "2026-09-28-v1";

export type WhatsAppLifecycleConsent = {
  care: boolean;
  marketing: boolean;
  version: string;
  capturedAt: string;
};

/**
 * Keep the customer-facing promises narrow and category-specific. Meta's current
 * WhatsApp Business messaging guidance recommends separate opt-ins for distinct
 * message categories and clear opt-out expectations.
 */
export const WHATSAPP_CONSENT_COPY = {
  ar: {
    care: "أوافق على استلام رسائل متابعة تخص طلبي وحوضي من AQUAVO عبر واتساب.",
    marketing: "أوافق على استلام تذكيرات من AQUAVO على واتساب بخصوص المستهلكات والمنتجات المناسبة التي قد يحين وقت تجديدها.",
    optOut: "الاشتراك اختياري، وتكدر توقف أي نوع من الرسائل بأي وقت بالرد: إلغاء.",
  },
  en: {
    care: "I agree to receive AQUAVO WhatsApp follow-ups about my order and aquarium.",
    marketing: "I agree to receive AQUAVO WhatsApp reminders about relevant consumables and products that may be due for replenishment.",
    optOut: "Optional. You can stop these messages at any time by replying: STOP.",
  },
  ckb: {
    care: "ڕازیم پەیامی بەدواداچوون سەبارەت بە داواکاری و ئەکواریۆمەکەم لە AQUAVO لە واتساپ وەربگرم.",
    marketing: "ڕازیم بیرخستنەوەی AQUAVO لە واتساپ وەربگرم سەبارەت بە پێداویستی و بەرهەمە گونجاوەکان کە لەوانەیە کاتی نوێکردنەوەیان هاتبێت.",
    optOut: "بەشداریکردن ئارەزوومەندانەیە؛ هەر کاتێک دەتوانیت بە وەڵامی «STOP» پەیامەکان بوەستێنیت.",
  },
} as const;
