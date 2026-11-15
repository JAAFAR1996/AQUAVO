import { DEFAULT_LOCALE, localizePath } from "./i18n/locales.js";

export type ManualInvoiceLocale = "ar" | "ckb";

export function manualInvoicePath(token: string, locale: ManualInvoiceLocale = DEFAULT_LOCALE): string {
  return localizePath(`/invoice/${encodeURIComponent(token)}`, locale);
}
