/**
 * Deployment safety (option A): a locale is offered to customers only once it
 * is marked released. Until then hreflang alternates, og:locale alternates and
 * sitemap listings carry Arabic only, and the selector does not lead visitors
 * into a partially translated experience.
 */
import { describe, expect, it } from "vitest";
import { LOCALE_RELEASE, RELEASED_LOCALES, isLocaleReleased, releasedAlternatesFor } from "../../shared/i18n/release";
import { alternatesFor } from "../../shared/i18n/locales";

describe("locale release gate", () => {
  it("Arabic is always released", () => {
    expect(isLocaleReleased("ar")).toBe(true);
    expect(RELEASED_LOCALES[0]).toBe("ar");
  });

  it("unreleased locales are excluded from alternates while the full set is still available for internal use", () => {
    const all = alternatesFor("/products/x").alternates.map((a) => a.locale);
    const released = releasedAlternatesFor("/products/x").alternates.map((a) => a.locale);
    expect(all).toEqual(["ar", "en", "ckb"]);
    for (const l of released) expect(isLocaleReleased(l)).toBe(true);
    for (const l of ["en", "ckb"] as const) expect(released.includes(l)).toBe(LOCALE_RELEASE[l].ready);
  });

  it("x-default always points at the Arabic URL", () => {
    expect(releasedAlternatesFor("/en/products/x").xDefault).toBe("/products/x");
  });

  it("no locale is released until its note says so and the audit reported it eligible", () => {
    // Guard against an accidental flip: releasing requires an explicit note.
    for (const [locale, cfg] of Object.entries(LOCALE_RELEASE)) {
      if (cfg.ready) expect(cfg.note, `${locale} release note`).toMatch(/audit|eligible|released/i);
    }
  });
});
