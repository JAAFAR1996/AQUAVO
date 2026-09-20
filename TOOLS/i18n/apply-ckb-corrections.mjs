#!/usr/bin/env node
// Apply the HIGH-CONFIDENCE subset of the 2026-09-20 Sorani review, plus the
// glossary trigger narrowing for proven validator false positives.
//
// SCOPE DISCIPLINE — read before adding to this file.
// Only edits that are wrong in 100% of contexts and whose replacement was not
// disputed by any reviewer belong here. Anything needing sentence-level
// judgement, and anything a reviewer marked UNCERTAIN, stays OUT and is routed
// to native review via reports/i18n/ckb-final-review-register.md. Applying
// model-authored Sorani prose wholesale would manufacture confidence we do not
// have — the corpus already shows what that produces.
//
// Dry run by default. --commit writes. Repo files only; touches no database.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COMMIT = process.argv.includes("--commit");

/** Token replacements applied across every ckb file. Each must be wrong everywhere. */
const TOKENS = [
  { from: "ئاوی سازگار", to: "ئاوی شیرین", why: "سازگار = compatible/acclimatised, never 'fresh'. Both reviewers independently." },
  { from: "سنگی کەلسی", to: "بەردی کلسی", why: "سنگ is Persian; Sorani for stone is بەرد." },
  { from: "گرما", to: "گەرما", why: "Persian orthography; Sorani writes the ە." },
  { from: "فروشگا", to: "فرۆشگا", why: "Persian orthography; Sorani uses ۆ." },
  { from: "شەبەکە", to: "تۆڕ", why: "Arabic loan شبكة; Sorani for net is تۆڕ." },
  { from: "مەهمیەتی", to: "گرنگی", why: "Arabic loan أهمية; Sorani is گرنگی." },
  { from: "نقطەکانی", to: "خاڵەکانی", why: "Arabic loan نقطة left untranslated; Sorani is خاڵ." },
  { from: "نقطە یان", to: "خاڵ یان", why: "same Arabic loan." },
  // Researched 2026-09-21 against ckb.wikipedia / Wikidata / ferheng.info.
  { from: "باکتری", to: "بەکتریا", why: "باکتری is the Persian form; ckb.wikipedia titles the article بەکتریا (247 already correct in-corpus)." },
  { from: "جەمبڕی", to: "مەیگوو", why: "Arabic جمبري transliteration; ckb.wikipedia en:Shrimp langlink is مەیگوو. NB: میگۆ is Persian and is NOT the fix." },
  { from: "جەمبەری", to: "مەیگوو", why: "same Arabic transliteration." },
];

/**
 * Terms NOT mass-replaced, though research identified a better canonical,
 * because the wrong form is only wrong in SOME contexts and a blanket swap
 * would corrupt the correct uses:
 *   پلەپێو (52) — correct as "thermometer", wrong when used for "temperature".
 *   گەروو  (15) — correct as "throat", wrong when used for fish "gills" (ڕیشوو).
 *   کەوز  (187) — corpus-wide form for algae; ckb.wikipedia prefers قەوزە but
 *                 lists کەوزە as a dialect variant, so this is a house-style
 *                 call for a native reviewer, not a defect.
 * The glossary below records the researched canonical so the validator starts
 * flagging the wrong-context uses for a human to work through.
 */

/**
 * Glossary Arabic-trigger narrowing. Each entry replaces term.ar wholesale.
 * These are demonstrated false positives, not warning suppression: in every
 * case the Arabic word carries a different sense and the Sorani is already right.
 */
const TRIGGERS = {
  // ضمان as a masdar ("ensuring quality") is not a commercial warranty. Forcing
  // گەرەنتی here would manufacture a legal warranty claim in editorial prose.
  warranty: ["فترة الضمان", "ضمان المنتج", "الضمان"],
  // الحجر الصحي = quarantine, unrelated to stone.
  stone: ["أحجار", "صخور", "حجر هواء", "حجر زينة"],
  // دخول also means physical inlet ("أنابيب دخول وخروج الفلتر").
  login: ["تسجيل الدخول", "تسجيل دخول", "سجّل دخولك"],
  // متوفر fired on the negative "غير متوفر".
  "in-stock": ["متوفر في المخزن", "متوفر الآن"],
  // بيتا substring-matched بيتاً ("a house").
  betta: ["سمكة بيتا", "أسماك بيتا", "البيتا"],
  // سلة matched كرة سلة (basketball).
  cart: ["السلة", "سلة المشتريات", "سلة التسوق"],
  // تركيب also means composition / anatomical structure.
  installation: ["التركيب والتشغيل", "طريقة التركيب", "تركيب الجهاز"],
  // زينة inside أحواض الزينة means ornamental aquarium, not decor goods.
  decor: ["ديكور", "الديكور"],
};

const ckbFiles = [
  ...fs.readdirSync(path.join(ROOT, "client/src/locales/ckb")).map((f) => `client/src/locales/ckb/${f}`),
  ...fs.readdirSync(path.join(ROOT, "data/i18n/translations/ckb")).map((f) => `data/i18n/translations/ckb/${f}`),
];

let totalTokens = 0;
const perToken = new Map(TOKENS.map((t) => [t.from, 0]));
const edits = [];

for (const rel of ckbFiles) {
  const abs = path.join(ROOT, rel);
  const before = fs.readFileSync(abs, "utf8");
  let after = before;
  for (const t of TOKENS) {
    const n = after.split(t.from).length - 1;
    if (!n) continue;
    perToken.set(t.from, perToken.get(t.from) + n);
    totalTokens += n;
    after = after.split(t.from).join(t.to);
  }
  if (after !== before) edits.push({ rel, abs, after, bytes: after.length - before.length });
}

console.log("── token replacements ──");
for (const t of TOKENS) console.log(`  ${String(perToken.get(t.from)).padStart(3)}  ${t.from} → ${t.to}`);
console.log(`  total ${totalTokens} across ${edits.length} file(s)\n`);

// ── glossary triggers ────────────────────────────────────────────────────────
const gPath = path.join(ROOT, "shared/i18n/glossary.json");
const glossary = JSON.parse(fs.readFileSync(gPath, "utf8"));
console.log("── glossary trigger narrowing ──");
let gChanged = 0;
for (const [id, ar] of Object.entries(TRIGGERS)) {
  const term = glossary.terms.find((t) => t.id === id);
  if (!term) { console.log(`  !! term ${id} not found — skipped`); continue; }
  if (JSON.stringify(term.ar) === JSON.stringify(ar)) { console.log(`  =  ${id} already narrowed`); continue; }
  console.log(`  →  ${id}: [${term.ar.join(", ")}] → [${ar.join(", ")}]`);
  term.ar = ar;
  gChanged++;
}
console.log(`  ${gChanged} term(s) narrowed\n`);

if (!COMMIT) {
  console.log("DRY RUN — nothing written. Re-run with --commit to apply.");
  process.exit(0);
}

for (const e of edits) {
  // Every target is JSON; parse the result before writing so a bad replacement
  // cannot land a corrupt bundle.
  try { JSON.parse(e.after); } catch (err) {
    console.error(`REFUSING to write ${e.rel}: result is not valid JSON (${err.message})`);
    process.exit(1);
  }
  fs.writeFileSync(e.abs, e.after);
  console.log(`  wrote ${e.rel} (${e.bytes >= 0 ? "+" : ""}${e.bytes} bytes)`);
}
if (gChanged) {
  fs.writeFileSync(gPath, `${JSON.stringify(glossary, null, 2)}\n`);
  console.log(`  wrote shared/i18n/glossary.json`);
}
console.log(`\nApplied ${totalTokens} token replacement(s) and ${gChanged} trigger narrowing(s).`);
console.log("Next: re-run TOOLS/i18n/validate-translations.ts --scope=all");
