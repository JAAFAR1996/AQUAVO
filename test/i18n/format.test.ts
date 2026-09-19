import { describe, expect, it } from "vitest";
import { currencyLabel, formatLocalizedDate, formatLocalizedNumber, formatLocalizedPrice, formatLocalizedRelativeTime } from "../../client/src/i18n/format";
import { SUPPORTED_LOCALES } from "../../shared/i18n/locales";

describe("locale-aware formatting", () => {
  it("keeps the business value and Latin digits in every locale, only the currency word changes", () => {
    expect(formatLocalizedPrice(12500, "ar")).toBe("12,500 د.ع");
    expect(formatLocalizedPrice(12500, "en")).toBe("12,500 IQD");
    expect(formatLocalizedPrice(12500, "ckb")).toBe("12,500 د.ع");
    expect(formatLocalizedPrice("1234567", "ckb")).toMatch(/^1,234,567 /);
    for (const l of SUPPORTED_LOCALES) expect(formatLocalizedNumber(1234567, l)).toMatch(/^1[,.٬]234[,.٬]567$/);
  });

  it("formats dates in each language", () => {
    const d = new Date("2026-09-19T12:00:00Z");
    expect(formatLocalizedDate(d, "en")).toBe("September 19, 2026");
    expect(formatLocalizedDate(d, "ar")).toContain("2026");
    expect(formatLocalizedDate(d, "ar")).toMatch(/أيلول|سبتمبر/);
    expect(formatLocalizedDate(d, "ckb")).toMatch(/ئەیلوول/);
  });

  it("formats relative time with Intl.RelativeTimeFormat", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    expect(formatLocalizedRelativeTime(new Date("2026-09-17T12:00:00Z"), "en", now)).toBe("2 days ago");
    expect(formatLocalizedRelativeTime(new Date("2026-09-17T12:00:00Z"), "ar", now)).toMatch(/يوم|أمس/);
    expect(formatLocalizedRelativeTime(new Date("2026-09-17T12:00:00Z"), "ckb", now)).toMatch(/ڕۆژ/);
  });

  it("exposes the currency label per locale", () => {
    expect(currencyLabel("en")).toBe("IQD");
    expect(currencyLabel("ar")).toBe("د.ع");
  });
});
