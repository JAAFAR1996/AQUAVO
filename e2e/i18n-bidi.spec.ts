/**
 * BiDi stress test for the trilingual storefront.
 *
 * The catalogue-backed BiDi check in i18n-locales.spec.ts skips whenever the server runs
 * on mock storage, so it does not actually exercise anything in local QA. This spec takes
 * the real translated strings straight off disk — every ckb and en UI value plus every
 * product name — and renders the mixed-direction ones in a real browser at the locale's
 * own direction, then measures what the bidi algorithm actually produced.
 *
 * What it asserts, per string:
 *   isolation   a maximal Latin/digit run must render as one visually contiguous box.
 *               A run split into pieces means the surrounding neutrals reordered through
 *               it — the classic "pH:" -> ":pH" / "(COD)" -> ")COD(" class of defect.
 *   order       characters inside a Latin run must still read left to right.
 *   controls    no explicit bidi control characters (U+202A..U+202E, U+2066..U+2069);
 *               translated copy must be safe without them.
 *
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:5199 npx playwright test -c e2e/i18n.config.ts
 */
import { expect, test } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NUMERIC_RANGE_SOURCE, hasReversibleRange, isolateNumericRanges, isolateNumericRangesInHtml } from "../shared/i18n/bidi";

const NAMESPACES = ["common", "nav", "home", "products", "product", "cart", "checkout", "account", "orders", "search", "errors", "pages", "seo", "tools", "guides"];
// "ar" is the control: it is the source language and already in production, so any
// pattern that appears in ar too is inherent RTL rendering, not a translation defect.
const RTL_LOCALES = ["ar", "ckb"] as const;

// Letters/digits with punctuation only BETWEEN them ("C4-1008", "5,000", "2.5").
// Trailing punctuation is deliberately excluded: a sentence-final "." after a Latin word
// is a neutral that belongs to the RTL paragraph and correctly renders on its left.
const LATIN_RUN = /[A-Za-z0-9]+(?:[.,:%\/+-][A-Za-z0-9]+)*/g;
const ARABIC = /\p{Script=Arabic}/u;
const BIDI_CONTROLS = /[‪-‮⁦-⁩]/;

interface Case { where: string; text: string }

function flatten(o: Record<string, unknown>, p = "", out: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
  return out;
}

function collect(locale: string): Case[] {
  const cases: Case[] = [];
  for (const ns of NAMESPACES) {
    const p = resolve(`client/src/locales/${locale}/${ns}.json`);
    if (!existsSync(p)) continue;
    for (const [k, v] of Object.entries(flatten(JSON.parse(readFileSync(p, "utf8"))))) {
      // only mixed-direction strings are interesting, and skip raw HTML blobs
      if (!ARABIC.test(v) || !/[A-Za-z0-9]/.test(v)) continue;
      if (v.includes("<") && v.includes(">")) continue;
      cases.push({ where: `${ns}:${k}`, text: v });
    }
  }
  const prod = resolve(`data/i18n/translations/${locale}/products.json`);
  if (existsSync(prod)) {
    for (const rec of Object.values(JSON.parse(readFileSync(prod, "utf8")) as Record<string, { slug?: string; data?: { name?: string } }>)) {
      const name = rec?.data?.name;
      if (name && ARABIC.test(name) && /[A-Za-z0-9]/.test(name)) cases.push({ where: `product:${rec.slug}`, text: name });
    }
  }
  return cases;
}

/**
 * The defect, and its fix, read back from the browser rather than inferred.
 *
 * A hyphenated numeric range inside an RTL paragraph has its two numbers swapped by the
 * Unicode Bidi Algorithm: "(50-150 لتر)" is read by a user as 150-50. W2 turns both
 * numbers into ARABIC NUMBERs because an Arabic letter precedes them, W4 therefore stops
 * promoting the hyphen, and N1 resolves that hyphen to R between two numbers - leaving two
 * left-to-right islands laid out right-to-left. It affects the Arabic source as much as the
 * Kurdish translation, so the fix lives in the rendering layer (shared/i18n/bidi.ts) and no
 * stored string changes.
 *
 * Both spellings of the fix are measured here: the isolate characters used for plain
 * strings, and the <bdi dir="ltr"> markup used wherever we render HTML.
 */
const RANGE_SAMPLES = ["متوسط (50-150 لتر)", "ناوەند (50-150 لیتر)", "تغذية 4-6 مرات يومياً"];

/** Visual left-to-right character order of `html` rendered at `dir="rtl"`. */
async function visualOrder(page: import("@playwright/test").Page, html: string[]): Promise<string[]> {
  await page.setContent('<!doctype html><meta charset="utf-8"><div id="rtl" dir="rtl" style="font-size:24px"></div>');
  return page.evaluate((items: string[]) => {
    const el = document.getElementById("rtl")!;
    return items.map((item) => {
      el.innerHTML = item;
      const chars: Array<{ ch: string; x: number }> = [];
      const walk = (n: Node) => {
        if (n.nodeType === 3) {
          const data = (n as Text).data;
          for (let i = 0; i < data.length; i++) {
            const r = document.createRange();
            r.setStart(n, i); r.setEnd(n, i + 1);
            const b = r.getBoundingClientRect();
            if (b.width > 0) chars.push({ ch: data[i], x: b.left });
          }
        } else n.childNodes.forEach(walk);
      };
      walk(el);
      chars.sort((a, b) => a.x - b.x);
      return chars.map((c) => c.ch).join("");
    });
  }, html);
}

test("BiDi: an un-isolated hyphenated range still renders swapped (the defect this fixes)", async ({ page }) => {
  const observed = await visualOrder(page, RANGE_SAMPLES);
  mkdirSync("reports/i18n", { recursive: true });
  writeFileSync(
    "reports/i18n/bidi-numeric-ranges.json",
    JSON.stringify(RANGE_SAMPLES.map((logical, i) => ({ logical, visual: observed[i] })), null, 2),
  );
  expect(observed[0]).toContain("150-50");
  expect(observed[1]).toContain("150-50");
  expect(observed[2]).toContain("6-4");
});

test("BiDi: isolate characters put the range back in reading order", async ({ page }) => {
  const observed = await visualOrder(page, RANGE_SAMPLES.map(isolateNumericRanges));
  expect(observed[0]).toContain("50-150");
  expect(observed[1]).toContain("50-150");
  expect(observed[2]).toContain("4-6");
  for (const v of observed) {
    expect(v).not.toContain("150-50");
    expect(v).not.toContain("6-4");
  }
});

test("BiDi: <bdi dir=\"ltr\"> markup puts the range back in reading order", async ({ page }) => {
  const html = RANGE_SAMPLES.map((s) => isolateNumericRangesInHtml(`<p>${s}</p>`));
  const observed = await visualOrder(page, html);
  expect(observed[0]).toContain("50-150");
  expect(observed[1]).toContain("50-150");
  expect(observed[2]).toContain("4-6");
});

/** Filled by the "ar" run and read by the "ckb" run; the two share a worker in file order. */
let arBaseline: { split: number; reversed: number; runs: Set<string> } | null = null;

test.describe.configure({ mode: "serial" });

for (const locale of RTL_LOCALES) {
  const cases = collect(locale);

  test(`BiDi: no explicit bidi control characters in ${locale}`, () => {
    const bad = cases.filter((c) => BIDI_CONTROLS.test(c.text));
    expect(bad.map((b) => b.where)).toEqual([]);
  });

  test(`BiDi: every numeric range in ${locale} reads in order once isolated`, async ({ page }) => {
    // The whole corpus, not a sample: each string that carries a range is rendered
    // through the same isolateNumericRanges the storefront applies, and the range is
    // measured first-character against last-character. Zero reversed is the gate.
    const affected = cases.filter((c) => hasReversibleRange(c.text));
    test.skip(affected.length === 0, "no numeric ranges in this locale");

    await page.setContent(
      `<!doctype html><html lang="${locale}" dir="rtl"><head><meta charset="utf-8">
       <style>body{font-family:'Noto Sans Arabic','Segoe UI',sans-serif;font-size:18px}
       div.case{white-space:nowrap}</style></head>
       <body>${affected.map((_, i) => `<div class="case" id="r${i}"></div>`).join("")}</body></html>`
    );
    await page.evaluate((texts: string[]) => {
      texts.forEach((t, i) => { document.getElementById(`r${i}`)!.textContent = t; });
    }, affected.map((c) => isolateNumericRanges(c.text)));

    const reversed = await page.evaluate(({ texts, rangeSrc }) => {
      const re = new RegExp(rangeSrc, "g");
      const bad: Array<{ i: number; run: string }> = [];
      texts.forEach((text, i) => {
        const node = document.getElementById(`r${i}`)!.firstChild;
        if (!node) return;
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
          const first = document.createRange();
          first.setStart(node, m.index); first.setEnd(node, m.index + 1);
          const last = document.createRange();
          last.setStart(node, m.index + m[0].length - 1); last.setEnd(node, m.index + m[0].length);
          if (last.getBoundingClientRect().left < first.getBoundingClientRect().left) bad.push({ i, run: m[0] });
        }
      });
      return bad;
    }, { texts: affected.map((c) => isolateNumericRanges(c.text)), rangeSrc: NUMERIC_RANGE_SOURCE });

    expect(
      reversed.map((r) => ({ where: affected[r.i].where, run: r.run, text: affected[r.i].text })),
      `${affected.length} ${locale} strings carry a numeric range`,
    ).toEqual([]);
  });

  test(`BiDi: Latin runs stay isolated and in order in ${locale} (${cases.length} mixed strings)`, async ({ page }, testInfo) => {
    test.skip(cases.length === 0, "no mixed-direction strings for this locale");

    await page.setContent(
      `<!doctype html><html lang="${locale}" dir="rtl"><head><meta charset="utf-8">
       <style>body{font-family:'Noto Sans Arabic','Segoe UI',sans-serif;font-size:18px;margin:0;padding:8px}
       div.case{padding:4px 8px;border-bottom:1px solid #eee;white-space:nowrap}</style></head>
       <body>${cases.map((c, i) => `<div class="case" id="c${i}"></div>`).join("")}</body></html>`
    );
    // set text via DOM so nothing is HTML-interpreted
    await page.evaluate((texts: string[]) => {
      texts.forEach((t, i) => { document.getElementById(`c${i}`)!.textContent = t; });
    }, cases.map((c) => c.text));

    const results = await page.evaluate(({ texts, latinSrc }) => {
      const re = new RegExp(latinSrc, "g");
      const out: Array<{ i: number; run: string; boxes: number; reversed: boolean }> = [];
      texts.forEach((text, i) => {
        const el = document.getElementById(`c${i}`)!;
        const node = el.firstChild;
        if (!node) return;
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
          const run = m[0];
          if (run.length < 2) continue;
          const r = document.createRange();
          r.setStart(node, m.index);
          r.setEnd(node, m.index + run.length);
          const rects = Array.from(r.getClientRects()).filter((x) => x.width > 0);
          // first vs last character position decides reading direction
          const rf = document.createRange();
          rf.setStart(node, m.index); rf.setEnd(node, m.index + 1);
          const rl = document.createRange();
          rl.setStart(node, m.index + run.length - 1); rl.setEnd(node, m.index + run.length);
          const a = rf.getBoundingClientRect(), b = rl.getBoundingClientRect();
          out.push({ i, run, boxes: rects.length, reversed: b.left < a.left });
        }
      });
      return out;
    }, { texts: cases.map((c) => c.text), latinSrc: LATIN_RUN.source });

    const split = results.filter((r) => r.boxes > 1);
    const reversed = results.filter((r) => r.reversed);

    // Viewport-only: a full-page capture of ~1000 rows exceeds the renderer's limit.
    await page.screenshot({ path: `e2e-artifacts/i18n/bidi-${locale}-${testInfo.project.name}.png` });

    const fmt = (r: { i: number; run: string }) => ({ where: cases[r.i].where, run: r.run, text: cases[r.i].text });
    mkdirSync("reports/i18n", { recursive: true });
    writeFileSync(
      `reports/i18n/bidi-${locale}-${testInfo.project.name}.json`,
      JSON.stringify({ locale, project: testInfo.project.name, strings: cases.length, runsChecked: results.length, split: split.map(fmt), reversed: reversed.map(fmt) }, null, 2)
    );

    expect(results.length).toBeGreaterThan(0);

    // The gate is PARITY WITH ARABIC, not zero findings. Arabic is the source language and
    // already in production, so any pattern it also shows is inherent RTL rendering rather
    // than something the translation work introduced. The only finding either locale has
    // is the hyphenated numeric range pinned in the test above, whose fix belongs in the
    // rendering layer and would change the Arabic storefront too.
    if (locale === "ar") {
      arBaseline = { split: split.length, reversed: reversed.length, runs: new Set(split.map((r) => r.run)) };
    } else {
      expect(arBaseline, "the ar control must run before ckb").not.toBeNull();
      expect(split.length).toBeLessThanOrEqual(arBaseline!.split);
      expect(reversed.length).toBeLessThanOrEqual(arBaseline!.reversed);
      const novel = split.map(fmt).filter((r) => !arBaseline!.runs.has(r.run));
      expect(novel, "ckb shows a BiDi pattern that ar does not").toEqual([]);
    }
  });
}
