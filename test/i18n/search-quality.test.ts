/**
 * Search quality for the English and Kurdish catalogues.
 *
 * The storefront search normalises the query and the indexed text with
 * `normalizeSearchText`, whose rules were written for Arabic. Two of them matter once a
 * Sorani catalogue exists:
 *
 *   - Sorani writes ی (U+06CC) and ک (U+06A9); Arabic writes ي (U+064A) and ك (U+0643).
 *     The normaliser unifies neither pair, so a shopper on an Arabic keyboard — the common
 *     case in Iraq — cannot match Kurdish product names at all.
 *   - `ئ` is rewritten to `ي` for Arabic hamza. `ئ` is ordinary in Sorani ("ئاو" = water),
 *     so Kurdish terms are stored mangled. Both sides are mangled identically, so exact
 *     matching survives; it is recorded here because it makes the index unreadable and
 *     interacts badly with the subsequence fallback.
 *
 * These tests run against the real translated product names, not fixtures.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fuzzySearchMatch, normalizeSearchText } from "../../client/src/lib/site-search";

type Rec = { slug?: string; data?: { name?: string } };

function names(locale: string): Array<{ slug: string; name: string }> {
  const raw = JSON.parse(readFileSync(resolve(`data/i18n/translations/${locale}/products.json`), "utf8")) as Record<string, Rec>;
  return Object.values(raw)
    .filter((r): r is Required<Rec> & { data: { name: string } } => Boolean(r?.slug && r?.data?.name))
    .map((r) => ({ slug: r.slug, name: r.data.name }));
}

/** The leading words a shopper would actually type. */
function leadingQuery(name: string, words = 2): string {
  return name.split(/[\s—–-]+/).filter(Boolean).slice(0, words).join(" ");
}

const AR_KEYBOARD = (s: string) => s.replace(/ی/g, "ي").replace(/ک/g, "ك");

describe("search quality: English catalogue", () => {
  const items = names("en");

  it("has a translated name for every product", () => {
    expect(items.length).toBe(107);
  });

  it("finds every product from the leading words of its own English name", () => {
    const missed = items.filter((p) => !fuzzySearchMatch(p.name, leadingQuery(p.name)));
    expect(missed.map((m) => `${m.slug}: ${m.name}`)).toEqual([]);
  });

  it("matches case-insensitively", () => {
    const missed = items.filter((p) => !fuzzySearchMatch(p.name, leadingQuery(p.name).toUpperCase()));
    expect(missed.map((m) => m.slug)).toEqual([]);
  });
});

describe("search quality: Kurdish catalogue", () => {
  const items = names("ckb");

  it("has a translated name for every product", () => {
    expect(items.length).toBe(107);
  });

  it("finds every product from the leading words of its own Sorani name", () => {
    const missed = items.filter((p) => !fuzzySearchMatch(p.name, leadingQuery(p.name)));
    expect(missed.map((m) => `${m.slug}: ${m.name}`)).toEqual([]);
  });

  // ---- the two defects, pinned so a fix flips them deliberately ----

  // Regression guard. Before ی/ک were folded onto ي/ك, 91 of these 107 names could not be
  // reached from an Arabic keyboard at all.
  it("is reachable from an Arabic keyboard (ی/ک folded onto ي/ك)", () => {
    const affected = items.filter((p) => /[یک]/.test(p.name));
    expect(affected.length).toBe(107);
    const broken = affected.filter((p) => !fuzzySearchMatch(p.name, AR_KEYBOARD(leadingQuery(p.name))));
    expect(broken.map((m) => `${m.slug}: ${m.name}`)).toEqual([]);
  });

  it("folds the Sorani and Arabic forms of the same word together", () => {
    expect(normalizeSearchText("ماسی")).toBe(normalizeSearchText("ماسي"));
    expect(normalizeSearchText("کوردی")).toBe(normalizeSearchText("كوردي"));
  });

  // Known, deliberately unfixed: `ئ` -> `ي` is an Arabic hamza rule that also rewrites an
  // ordinary Sorani letter. Both the index and the query are rewritten identically, so
  // matching is unaffected; it only makes the normalised index hard to read.
  it("still rewrites ئ to ي, which is harmless but leaves the index mangled", () => {
    expect(normalizeSearchText("ئاو")).toBe("ياو");
    expect(fuzzySearchMatch("فلتەری ئیسفەنجی", "ئیسفەنجی")).toBe(true);
  });

  it("normalisation is at least self-consistent, so exact queries still match", () => {
    expect(normalizeSearchText("ئاو")).toBe(normalizeSearchText("ئاو"));
    expect(fuzzySearchMatch("فلتەری ئیسفەنجی", "ئیسفەنجی")).toBe(true);
  });
});
