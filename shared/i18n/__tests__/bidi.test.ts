import { describe, it, expect } from "vitest";
import {
  LRI,
  PDI,
  hasReversibleRange,
  isolateNumericRanges,
  isolateNumericRangesInHtml,
  stripBidiControls,
} from "../bidi";

/**
 * The visual assertion — that an isolated range actually reads left to right —
 * lives in e2e/i18n-bidi.spec.ts, which measures character positions in a real
 * browser. These are the contract tests for the transform itself: what it wraps,
 * what it must never touch, and that it can be applied twice.
 */
describe("isolateNumericRanges", () => {
  it("isolates a hyphenated range inside Arabic copy", () => {
    expect(isolateNumericRanges("تغذية 4-6 مرات")).toBe(`تغذية ${LRI}4-6${PDI} مرات`);
  });

  it("isolates a range inside Sorani copy", () => {
    expect(isolateNumericRanges("ناوەند (50-150 لیتر)")).toBe(`ناوەند (${LRI}50-150${PDI} لیتر)`);
  });

  it("isolates every range in a string", () => {
    expect(isolateNumericRanges("درجة 18-30 ورقم هيدروجيني 6.5-7.5")).toBe(
      `درجة ${LRI}18-30${PDI} ورقم هيدروجيني ${LRI}6.5-7.5${PDI}`,
    );
  });

  it("handles the dashes the corpus actually uses", () => {
    for (const dash of ["-", "‐", "‑", "–", "—", "−"]) {
      expect(isolateNumericRanges(`لتر 50${dash}150`)).toBe(`لتر ${LRI}50${dash}150${PDI}`);
    }
  });

  it("leaves left-to-right text alone: the algorithm gets it right there", () => {
    const ltr = "Feed 4-6 times daily";
    expect(isolateNumericRanges(ltr)).toBe(ltr);
  });

  it("leaves RTL text with no range alone", () => {
    const text = "فلتر داخلي للأحواض الصغيرة";
    expect(isolateNumericRanges(text)).toBe(text);
  });

  it("leaves a lone number, a date and a phone number alone", () => {
    for (const text of ["السعة 150 لتر", "الطلب رقم 260816", "اتصل على 0770 123 4567"]) {
      expect(isolateNumericRanges(text)).toBe(text);
    }
  });

  it("is idempotent", () => {
    const once = isolateNumericRanges("تغذية 4-6 مرات");
    expect(isolateNumericRanges(once)).toBe(once);
    expect(isolateNumericRanges(isolateNumericRanges(once))).toBe(once);
  });

  it("adds isolates only — never an embedding or an override", () => {
    const out = isolateNumericRanges("تغذية 4-6 مرات");
    expect(out).not.toMatch(/[‪-‮]/);
    expect(stripBidiControls(out)).toBe("تغذية 4-6 مرات");
  });

  it("never changes the characters a reader or a search index sees", () => {
    const source = "متوسط (50-150 لتر) و 18-30 درجة";
    expect(stripBidiControls(isolateNumericRanges(source))).toBe(source);
  });

  it("handles empty input", () => {
    expect(isolateNumericRanges("")).toBe("");
  });
});

describe("hasReversibleRange", () => {
  it("is true only for an RTL string that carries a range", () => {
    expect(hasReversibleRange("تغذية 4-6 مرات")).toBe(true);
    expect(hasReversibleRange("Feed 4-6 times")).toBe(false);
    expect(hasReversibleRange("تغذية مرتين")).toBe(false);
  });

  it("does not depend on a previous call (no leaked regex lastIndex)", () => {
    expect(hasReversibleRange("تغذية 4-6 مرات")).toBe(true);
    expect(hasReversibleRange("تغذية 4-6 مرات")).toBe(true);
  });
});

describe("isolateNumericRangesInHtml", () => {
  it("wraps ranges in the article body", () => {
    expect(isolateNumericRangesInHtml("<p>بدّل 20-30 بالمئة من الماء</p>")).toBe(
      '<p>بدّل <bdi dir="ltr">20-30</bdi> بالمئة من الماء</p>',
    );
  });

  it("isolates a range that sits in its own inline element", () => {
    // The Arabic is in a sibling node, but the browser still resolves one RTL paragraph.
    expect(isolateNumericRangesInHtml("<p><strong>50-150</strong> لتر</p>")).toBe(
      '<p><strong><bdi dir="ltr">50-150</bdi></strong> لتر</p>',
    );
  });

  it("never touches an attribute — hrefs must stay byte-identical", () => {
    const html = '<p>شوف <a href="/blog/filter-50-150" title="50-150">الدليل</a> للحجم 50-150</p>';
    const out = isolateNumericRangesInHtml(html);
    expect(out).toContain('href="/blog/filter-50-150"');
    expect(out).toContain('title="50-150"');
    expect(out).toContain('للحجم <bdi dir="ltr">50-150</bdi>');
  });

  it("leaves verbatim elements alone", () => {
    const html = "<p>مثال</p><pre><code>range = 50-150</code></pre><p>سعة 50-150 لتر</p>";
    const out = isolateNumericRangesInHtml(html);
    expect(out).toContain("<code>range = 50-150</code>");
    expect(out).toContain('سعة <bdi dir="ltr">50-150</bdi> لتر');
  });

  it("leaves an English article untouched", () => {
    const html = "<p>Change 20-30 percent of the water</p>";
    expect(isolateNumericRangesInHtml(html)).toBe(html);
  });

  it("does not double-wrap text that already carries isolates", () => {
    const once = isolateNumericRangesInHtml(`<p>سعة ${LRI}50-150${PDI} لتر</p>`);
    expect(once).toBe('<p>سعة <bdi dir="ltr">50-150</bdi> لتر</p>');
    expect(isolateNumericRangesInHtml(once)).toBe(once);
  });
});
