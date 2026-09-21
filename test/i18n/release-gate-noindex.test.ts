/**
 * The release gate's contract, pinned.
 *
 * shared/i18n/release.ts promises that an unreleased locale stays reachable by
 * direct URL for QA, stays noindex, and stays out of the selector, the sitemap
 * and hreflang. The first and third were enforced; "stays noindex" was not — it
 * was implied by translation status (missing / unreviewed / untranslated), which
 * is a different question. A locale whose translations became reviewed and
 * current would have started emitting index while ready=false still hid it
 * everywhere a human could find it.
 *
 * These tests fail if that hole reopens, and equally if someone hard-codes
 * noindex in a way that would survive the ready flip.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LOCALE_RELEASE,
  RELEASED_LOCALES,
  isLocaleReleased,
  releasedAlternatesFor,
} from "../../shared/i18n/release.js";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "../../shared/i18n/locales.js";

const unreleased = SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE && !isLocaleReleased(l));

describe("release gate", () => {
  it("always treats the default locale as released", () => {
    expect(isLocaleReleased(DEFAULT_LOCALE)).toBe(true);
    expect(RELEASED_LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("keeps unreleased locales out of hreflang alternates", () => {
    const { alternates } = releasedAlternatesFor("/products");
    const offered = alternates.map((a) => a.locale);
    for (const l of unreleased) {
      expect(offered, `${l} is ready=false and must not be offered as an alternate`).not.toContain(l);
    }
    // Arabic is always offered, so the set is never empty.
    expect(offered).toContain(DEFAULT_LOCALE);
  });

  it("keeps unreleased locales out of RELEASED_LOCALES", () => {
    for (const l of unreleased) expect(RELEASED_LOCALES).not.toContain(l);
  });

  it("gives every non-default locale an explicit ready flag and a note", () => {
    for (const l of SUPPORTED_LOCALES.filter((x) => x !== DEFAULT_LOCALE)) {
      const entry = LOCALE_RELEASE[l as Exclude<Locale, typeof DEFAULT_LOCALE>];
      expect(entry, `${l} has no release entry`).toBeDefined();
      expect(typeof entry.ready).toBe("boolean");
      expect(entry.note.length, `${l} needs a note explaining its state`).toBeGreaterThan(0);
    }
  });
});

describe("ssr-meta noindex wiring", () => {
  const src = readFileSync(resolve("api/ssr-meta.ts"), "utf8");

  it("imports the release gate", () => {
    expect(src).toMatch(/import \{ isLocaleReleased \} from "\.\.\/shared\/i18n\/release\.js"/);
  });

  it("forces noIndex for an unreleased locale", () => {
    // The guard must be unconditional on translation status: an unreleased
    // locale is noindex even when its translations are reviewed and current.
    expect(src).toMatch(/if \(!isLocaleReleased\(locale\)\) meta\.noIndex = true;/);
  });

  it("does not hard-code noindex for every non-default locale", () => {
    // Guards against over-correcting: once a locale is released its pages must
    // become indexable, so the noindex must be conditional on the gate.
    expect(src).not.toMatch(/if \(locale !== DEFAULT_LOCALE\) meta\.noIndex = true;/);
  });
});
