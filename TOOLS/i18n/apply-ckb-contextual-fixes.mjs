#!/usr/bin/env node
// Sentence-level CKB corrections that research and the Arabic source now settle.
//
// Unlike apply-ckb-corrections.mjs (whole-corpus token swaps), every entry here
// is pinned to ONE key path and asserts the exact current string, because each
// replacement is a contextual judgement rather than a word that is wrong
// everywhere. Anything still resting on an unattested Sorani term stays out and
// goes to reports/ckb-native-final-review.md instead.
//
// Dry run by default; --commit writes.
import fs from "node:fs";
import path from "node:path";

const COMMIT = process.argv.includes("--commit");
const ROOT = process.cwd();

/** ns → [{ key, from, to, why, severity }] */
const FIXES = {
  guides: [
    {
      key: "guides-heater-choice.s52",
      severity: "P0-SAFETY",
      // AR: ضعه بالقرب من مصدر تدفق الماء — "place it NEAR the water flow".
      // The Sorani said بەدوور لە — "place it AWAY FROM" — and rendered تدفق
      // (flow) as هەڵگرتن (lifting). A heater placed away from flow develops hot
      // spots and the thermostat reads water that is not circulating.
      from: "بەدوور لە سەرچاوەی هەڵگرتنی ئاو دابنێ — گەرمیدا باشتر دابەش دەکات.",
      to: "لە نزیک سەرچاوەی ڕۆیشتنی ئاو دایبنێ — گەرمی باشتر دابەش دەکات.",
      why: "Reversed instruction: the Arabic says near, the Sorani said away from.",
    },
    {
      key: "guides-heater-choice.s55",
      severity: "P0-SAFETY",
      // AR: ارتفاع درجة الحرارة المفاجئ — a SUDDEN rise. ناچاری means
      // "compulsory", which drains the warning of its meaning.
      from: "ترموستات سەربەخۆ کۆنترۆڵی وردتر دەدات و لە بەرزی ناچاری گەرمیدا پاراستن دەکات.",
      to: "تەرموستاتی سەربەخۆ کۆنترۆڵێکی وردتر دەدات و لە بەرزبوونەوەی لەناکاوی پلەی گەرمی دەپارێزێت.",
      why: '"Sudden" rendered as "compulsory" in a temperature-spike warning.',
    },
    {
      key: "guides-heater-choice.s63",
      severity: "P0-SAFETY",
      // AR: درجة الحرارة ترتفع بسرعة لو الثرموستات فشل. Two defects: پلەپێو is
      // the THERMOMETER (the instrument does not rise, the temperature does),
      // and سەربەخۆ ("independent") is not in the Arabic at all — the warning is
      // about any thermostat failing, not only a separate one.
      from: "پلەپێو خێرایی بەرز دەبێت ئەگەر ترموستات سەربەخۆ شکستی بێت",
      to: "پلەی گەرمی بە خێرایی بەرز دەبێتەوە ئەگەر تەرموستات شکستی هێنا",
      why: "Thermometer/temperature confusion plus an invented 'independent' qualifier.",
    },
  ],
  tools: [
    {
      key: "fish-health-diagnosis.s100",
      severity: "P1-SAFETY",
      // قەفەی سەروو is "the upper cage" — MT nonsense. کەرەنتینە is the verified
      // Sorani for quarantine (ckb.wikipedia) and is already used elsewhere in
      // this corpus, so this also removes an internal inconsistency.
      from: "پروتوکۆلی قەفەی سەروو:",
      to: "پرۆتۆکۆلی کەرەنتینە:",
      why: "Quarantine rendered as 'the upper cage'.",
    },
    {
      key: "water-parameters-calculator.s28",
      severity: "P1",
      // AR: أضف أملاح معدنية — "add MINERAL SALTS". The Sorani said "metal water
      // conditioner", which is a different product class entirely.
      from: "ئامادەکەری ئاوی مێتالی یان بەردی کلسی زیادبکە",
      to: "خوێی کانزایی یان بەردی کلسی زیاد بکە",
      why: "Mineral salts became 'metallic water conditioner'.",
    },
    {
      key: "decoration-setup.s1",
      severity: "P2",
      from: "سەبارە و خاک",
      to: "دیکۆر و خاک",
      why: "سەبارە is not a Sorani word for decor.",
    },
    {
      key: "decoration-setup.s13",
      severity: "P2",
      // AR عناصر = elements, not تایبەتمەندی (properties/features).
      from: "تایبەتمەندی سەبارە (هەڵبژێرە ئەوەی دەتەوێت)",
      to: "توخمەکانی دیکۆر (هەڵبژێرە ئەوەی دەتەوێت)",
      why: "'Decor elements' became 'decor properties', plus سەبارە.",
    },
    {
      key: "tank-size-calculator.s21",
      severity: "P2",
      // سەوزە is "greens/vegetable" for ديكور; شیشە and هەساب are Persian/Arabic
      // spellings where Sorani has شووشە and ژماردن.
      from: "(بێ هەسابکردنی شیشە و سەوزە)",
      to: "(بەبێ ژماردنی شووشە و دیکۆر)",
      why: "Decor became 'greens'; two Persian/Arabic spellings.",
    },
    {
      key: "location-setup.s17",
      severity: "P1",
      // Four defects in one string: سەطح is the Arabic سطح (Sorani ڕوو);
      // حامل (a stand) became هێڵ ("a line"); طاولة (a table) became سەنگ
      // (Persian for stone); and سەبارە again. The weight figures are untouched.
      from: "دڵنیابە لەوەی سەطح باری حەوزی تەواو بگرێ! حەوزی ١٠٠ لیتر نزیکەی ١٢٠ کیلوگرام دەبێت کاتێک پڕ بۆ ئاو، بەردەلانک و سەبارە. بەکاربهێنە هێڵی تایبەتی بۆ حەوز یان سەنگی زۆر بەهێز.",
      to: "دڵنیابە لەوەی ڕووەکە کێشەکە هەڵدەگرێت! حەوزی ١٠٠ لیتر نزیکەی ١٢٠ کیلۆگرام کێشی دەبێت کاتێک پڕ دەبێت لە ئاو و بەردەلانک و دیکۆر. پاڵپشتێکی تایبەت بۆ حەوز یان مێزێکی زۆر بەهێز بەکاربهێنە.",
      why: "Arabic سطح, 'stand'→'line', 'table'→Persian 'stone', سەبارە.",
    },
    {
      key: "ai-chat-bot.s9",
      severity: "P1",
      // ماس is YOGHURT. یارمەتی is "help" (the thing), not "assistant" (the
      // agent) — that is یاریدەدەر. ڕاهێنان is "training/drilling", where the
      // Arabic نصايح is advice. The 🦐 stays: the assistant is named شریمپ.
      from: "سڵاو {{v0}}! 🦐 من شریمپ، یارمەتی تایبەتی تۆ لە AQUAVO. چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟ • پرسیار لەسەر ماسەکان • ڕاهێنانی چاودێری • پێشنیازی بەرهەم",
      to: "سڵاو {{v0}}! 🦐 من شریمپ، یاریدەدەری تایبەتی تۆ لە AQUAVO. چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟ • پرسیار لەسەر ماسییەکان • ئامۆژگاری چاودێری • پێشنیازی بەرهەم",
      why: "ماس = yoghurt; 'help' used for 'assistant'; 'training' for 'advice'.",
    },
    {
      key: "ai-chat-bot.s10",
      severity: "P1",
      from: "سڵاو! 🦐 من شریمپ، یارمەتی زیرەکی AQUAVO. چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟ • پرسیار لەسەر ماسەکان • ڕاهێنانی چاودێری • پێشنیازی بەرهەم",
      to: "سڵاو! 🦐 من شریمپ، یاریدەدەری زیرەکی AQUAVO. چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟ • پرسیار لەسەر ماسییەکان • ئامۆژگاری چاودێری • پێشنیازی بەرهەم",
      why: "Same three defects in the anonymous greeting.",
    },
  ],
};

const dig = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const put = (o, p, v) => {
  const parts = p.split(".");
  const last = parts.pop();
  parts.reduce((a, k) => a[k], o)[last] = v;
};

let applied = 0;
let already = 0;
const writes = [];

for (const [ns, list] of Object.entries(FIXES)) {
  const rel = `client/src/locales/ckb/${ns}.json`;
  const abs = path.join(ROOT, rel);
  const json = JSON.parse(fs.readFileSync(abs, "utf8"));
  let touched = false;
  for (const f of list) {
    const cur = dig(json, f.key);
    if (cur === f.to) { console.log(`  · ${ns}:${f.key} (already applied)`); already++; continue; }
    if (cur !== f.from) {
      console.error(`\nDRIFT ${ns}:${f.key}\n  expected: ${JSON.stringify(f.from).slice(0, 120)}\n  found   : ${JSON.stringify(cur).slice(0, 120)}`);
      process.exit(1);
    }
    put(json, f.key, f.to);
    touched = true;
    applied++;
    console.log(`  ✓ [${f.severity}] ${ns}:${f.key} — ${f.why}`);
  }
  if (touched) writes.push({ abs, rel, json });
}

console.log(`\n${applied} fix(es) to apply, ${already} already applied.`);
if (!COMMIT) { console.log("DRY RUN — nothing written."); process.exit(0); }
for (const w of writes) {
  fs.writeFileSync(w.abs, `${JSON.stringify(w.json, null, 2)}\n`);
  console.log(`  wrote ${w.rel}`);
}
console.log("\nNext: re-run TOOLS/i18n/validate-translations.ts --scope=all");
