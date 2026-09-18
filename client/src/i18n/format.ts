/**
 * Locale-aware formatting built on Intl. Business currency stays IQD; only the
 * presentation changes. Digits are Latin in every locale (see LOCALES[].intl).
 */
import { LOCALES, type Locale } from "@shared/i18n/locales";

const CURRENCY_LABEL: Record<Locale, string> = {
  ar: "د.ع",
  en: "IQD",
  ckb: "د.ع",
};

const numberFormatters = new Map<string, Intl.NumberFormat>();
function numberFormatter(locale: Locale, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options ?? {})}`;
  let f = numberFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALES[locale].intl, options);
    numberFormatters.set(key, f);
  }
  return f;
}

export function formatLocalizedNumber(value: number | string, locale: Locale, options?: Intl.NumberFormatOptions): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "0";
  return numberFormatter(locale, options).format(num);
}

/** "12,500 د.ع" / "12,500 IQD". Isolated with bidi marks so the number never flips inside RTL text. */
export function formatLocalizedPrice(value: number | string, locale: Locale): string {
  return `${formatLocalizedNumber(value, locale, { maximumFractionDigits: 0 })} ${CURRENCY_LABEL[locale]}`;
}

export function currencyLabel(locale: Locale): string {
  return CURRENCY_LABEL[locale];
}

export function formatLocalizedDate(
  value: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALES[locale].intl, options).format(date);
}

export function formatLocalizedRelativeTime(value: Date | string | number, locale: Locale, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(LOCALES[locale].intl, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSeconds, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSeconds / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSeconds / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSeconds / (86400 * 365)), "year");
}
