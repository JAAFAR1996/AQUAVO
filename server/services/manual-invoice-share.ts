import { LOCALES } from "../../shared/i18n/locales.js";
import { manualInvoicePath } from "../../shared/manual-invoice-locale.js";
import type { ManualInvoice } from "../../shared/schema.js";
import { normalizeIraqiWhatsAppPhone } from "./customer-messaging.js";

type ShareableInvoice = Pick<ManualInvoice, "token" | "invoiceNo" | "invoiceLocale" | "customerName" | "customerPhone" | "total" | "expiresAt">;

export function manualInvoiceShare(invoice: ShareableInvoice, origin: string) {
  const locale = invoice.invoiceLocale;
  const customerLink = new URL(manualInvoicePath(invoice.token, locale), origin).href;
  const intl = LOCALES[locale].intl;
  const total = Number(invoice.total).toLocaleString(intl);
  const expiry = invoice.expiresAt?.toLocaleString(intl, { timeZone: "Asia/Baghdad", dateStyle: "short", timeStyle: "short" });
  const lines = locale === "ckb" ? [
    `سڵاو ${invoice.customerName}`,
    `ئەمە پسووڵەکەتە لە AQUAVO. ژمارەی پسووڵە ${invoice.invoiceNo}`,
    `کۆی گشتی ${total} د.ع`,
    `بۆ بینینی پسووڵەکە و پشتڕاستکردنەوەی داواکارییەکەت\n${customerLink}`,
    expiry && `بەستەرەکە تا ${expiry} بە کاتی بەغدا کار دەکات.`,
  ] : [
    `مرحبا ${invoice.customerName}`,
    `هاي فاتورتك من AQUAVO. رقم الفاتورة ${invoice.invoiceNo}`,
    `المجموع ${total} د.ع`,
    `حتى تشوف الفاتورة وتأكد طلبك افتح الرابط\n${customerLink}`,
    expiry && `الرابط صالح لغاية ${expiry} بتوقيت بغداد.`,
  ];
  // WhatsApp can show its contact picker when an older invoice has no valid mobile.
  const phone = normalizeIraqiWhatsAppPhone(invoice.customerPhone) ?? "";
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(lines.filter(Boolean).join("\n\n"))}`;
  return { customerLink, whatsappUrl };
}
