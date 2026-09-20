/**
 * Regression cover for the RTL numeric-range defect, at the two layers that fix it.
 *
 * `تغذية 4-6 مرات` renders as `6-4` inside an RTL paragraph — the Unicode bidi algorithm
 * resolving the hyphen to R between two Arabic numbers. The fix isolates the range while
 * rendering (shared/i18n/bidi.ts); nothing in the corpus changes. What is pinned here:
 *
 *   1. every affected string in the shipped ar/ckb bundles round-trips — isolation adds
 *      only invisible controls and removing them gives the stored string back;
 *   2. the isolates cannot reach search, which is what would silently break a catalogue;
 *   3. the corpus on disk still carries no bidi control of its own.
 *
 * The visual proof — that the isolated string really reads left to right in a browser —
 * is e2e/i18n-bidi.spec.ts, which measures character positions in Chromium.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  LRI,
  PDI,
  hasReversibleRange,
  isolateNumericRanges,
  stripBidiControls,
} from "../../shared/i18n/bidi";
import { normalizeSearchText } from "../../client/src/lib/site-search";

const NAMESPACES = [
  "common", "nav", "home", "products", "product", "cart", "checkout",
  "account", "orders", "search", "errors", "pages", "seo", "tools", "guides",
] as const;
const RTL_LOCALES = ["ar", "ckb"] as const;

function flatten(o: Record<string, unknown>, p = "", out: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
  return out;
}

function bundleStrings(locale: string): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [];
  for (const ns of NAMESPACES) {
    const p = resolve(`client/src/locales/${locale}/${ns}.json`);
    if (!existsSync(p)) continue;
    for (const [k, v] of Object.entries(flatten(JSON.parse(readFileSync(p, "utf8"))))) {
      out.push({ where: `${ns}:${k}`, text: v });
    }
  }
  return out;
}

function contentStrings(locale: string): string[] {
  const out: string[] = [];
  for (const file of ["products.json", "blog_posts.json", "blog_categories.json"]) {
    const p = resolve(`data/i18n/translations/${locale}/${file}`);
    if (!existsSync(p)) continue;
    const collect = (v: unknown): void => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") Object.values(v).forEach(collect);
    };
    collect(JSON.parse(readFileSync(p, "utf8")));
  }
  return out;
}

describe.each(RTL_LOCALES)("bidi isolation over the shipped %s bundles", (locale) => {
  const strings = bundleStrings(locale);

  it("finds the strings the defect applies to", () => {
    expect(strings.length).toBeGreaterThan(0);
    // ar had 54 reversed runs and ckb 49 when the defect was measured in Chromium; the
    // number of affected strings only has to stay non-trivial, not stay exact.
    expect(strings.filter((s) => hasReversibleRange(s.text)).length).toBeGreaterThan(20);
  });

  it("isolation is lossless — the stored text survives byte for byte", () => {
    const broken = strings.filter((s) => stripBidiControls(isolateNumericRanges(s.text)) !== s.text);
    expect(broken.map((b) => b.where)).toEqual([]);
  });

  it("isolation adds balanced isolates and nothing else", () => {
    for (const s of strings.filter((x) => hasReversibleRange(x.text))) {
      const out = isolateNumericRanges(s.text);
      expect(out, s.where).not.toMatch(/[‪-‮]/);
      expect(out.split(LRI).length, s.where).toBe(out.split(PDI).length);
    }
  });

  it("the corpus on disk still carries no bidi control of its own", () => {
    const dirty = strings.filter((s) => /[‪-‮⁦-⁩]/.test(s.text));
    expect(dirty.map((d) => d.where)).toEqual([]);
  });

  it("translated product and article content round-trips too", () => {
    if (locale === "ar") return; // the Arabic source lives in the database, not on disk
    const content = contentStrings(locale);
    expect(content.length).toBeGreaterThan(0);
    for (const text of content) {
      expect(stripBidiControls(isolateNumericRanges(text))).toBe(text);
    }
  });
});

describe("isolation cannot reach search", () => {
  it("an isolated name normalises exactly like the stored one", () => {
    for (const name of ["فلتر داخلي 50-150 لتر", "سەرچاوەی گەرمی 18-30 پلە"]) {
      expect(normalizeSearchText(isolateNumericRanges(name))).toBe(normalizeSearchText(name));
    }
  });

  it("a query typed with the range still matches the isolated name", () => {
    const stored = isolateNumericRanges("فلتر داخلي 50-150 لتر");
    expect(normalizeSearchText(stored)).toContain("50 150");
  });
});
