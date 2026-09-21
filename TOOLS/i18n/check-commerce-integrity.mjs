#!/usr/bin/env node
// Commerce-truth fingerprint gate.
//
// Translations carry language, never commerce. This asserts that structurally
// rather than trusting it: no translation payload may contain a commerce field,
// and every numeric/technical token in a translated string must also appear in
// its Arabic source — a translator that invents "50 لتر" or changes a model code
// has altered product truth even though it never touched the products table.
//
// Read-only. Exits 1 on any violation.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const cache = rd("reports/i18n/source-cache.json");

/** Keys that carry commerce truth. A translation payload must never define one. */
const COMMERCE_KEYS = new Set([
  "id", "price", "originalPrice", "currency", "stock", "lowStockThreshold", "sku",
  "images", "thumbnail", "imageUrl", "rating", "reviewCount", "categoryId",
  "isNew", "isBestSeller", "isProductOfWeek", "hasVariants", "createdAt", "updatedAt",
]);

const CHEM = /\b(?:pH|GH|KH|TDS|NH3|NH4|NO2|NO3|CO2|O2|PO4|dKH|dGH)\b/g;
const MODEL = /\b[A-Z]{1,6}-?\d{2,5}[A-Z0-9-]*\b/g;
const NUM = /\d+(?:[.,]\d+)?/g;

/**
 * Arabic numeral words, including the dual, mapped to the digit a translator
 * legitimately renders them as. Covers the small counts that appear in product
 * copy; anything larger is written as a digit in the source anyway.
 */
const ARABIC_NUMERALS = {
  1: ["واحد", "واحدة", "أحادي", "أحادية"],
  2: ["اثنان", "اثنين", "ثنائي", "ثنائية", "غرفتان", "قطعتان", "مرتان", "طبقتان", "فتحتان"],
  3: ["ثلاث", "ثلاثة", "ثلاثي", "ثلاثية"],
  4: ["أربع", "أربعة", "رباعي", "رباعية"],
  5: ["خمس", "خمسة", "خماسي"],
  6: ["ست", "ستة", "سداسي"],
  7: ["سبع", "سبعة"],
  8: ["ثمان", "ثمانية", "ثماني"],
  9: ["تسع", "تسعة"],
  10: ["عشر", "عشرة"],
};

const findings = [];
const walk = (v, cb, p = "") => {
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) { cb(k, x, p ? `${p}.${k}` : k); walk(x, cb, p ? `${p}.${k}` : k); }
  }
};

for (const locale of ["en", "ckb"]) {
  const store = rd(`data/i18n/translations/${locale}/products.json`);
  for (const entry of Object.values(store)) {
    const where = `${locale}/${entry.slug ?? entry.entityId}`;
    const src = cache.products.find((p) => p.id === entry.entityId || p.slug === entry.slug);

    // 1. No commerce key may appear anywhere in the translated payload.
    walk(entry.data, (k, _x, p) => {
      // `specifications.labelled.<arabic label>.value` legitimately mirrors a spec
      // label; only reject commerce keys at a payload position that would override.
      if (COMMERCE_KEYS.has(k)) findings.push({ where, kind: "commerce-key", detail: p });
    });

    if (!src) { findings.push({ where, kind: "orphan", detail: "no matching source product" }); continue; }

    // 2. Technical tokens must not be invented. Compare multisets, target ⊆ source.
    const srcBlob = JSON.stringify(src);
    const tgtBlob = JSON.stringify(entry.data ?? {});
    for (const [label, re] of [["chem", CHEM], ["model", MODEL]]) {
      const sTok = new Set(srcBlob.match(re) ?? []);
      for (const t of new Set(tgtBlob.match(re) ?? [])) {
        if (!sTok.has(t)) findings.push({ where, kind: `invented-${label}`, detail: t });
      }
    }
    // 3. Numbers: every number in the target must exist in the source, either as
    //    a digit or as an Arabic numeral WORD. Arabic spells small counts out and
    //    has a dual form, so "معاينة ثلاثية الأبعاد" → "3D preview" and the dual
    //    "غرفتان منفصلتان" → "2 Compartments" are faithful translations, not
    //    invented figures. Without this the gate cries wolf on correct work.
    const sNums = new Set((srcBlob.match(NUM) ?? []).map((n) => n.replace(",", ".")));
    for (const [digit, words] of Object.entries(ARABIC_NUMERALS)) {
      if (words.some((w) => srcBlob.includes(w))) sNums.add(digit);
    }
    for (const n of new Set((tgtBlob.match(NUM) ?? []).map((x) => x.replace(",", ".")))) {
      if (!sNums.has(n)) findings.push({ where, kind: "invented-number", detail: n });
    }
  }
}

const byKind = {};
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
console.log(`commerce-integrity findings: ${findings.length}`, byKind);
for (const f of findings.slice(0, 40)) console.log(`  [${f.kind}] ${f.where} — ${f.detail}`);
if (findings.length > 40) console.log(`  … ${findings.length - 40} more`);
process.exit(findings.length ? 1 : 0);
