#!/usr/bin/env node
// Record the 2026-09-21 researched Sorani terminology in the glossary.
//
// Sources: ckb.wikipedia.org article titles and en↔ckb langlinks, Wikidata ckb
// labels, ckb.wiktionary.org, ferheng.info (Ferhengî Anahîta), and Kurdish media
// (JINHA, knwe.org). No machine translation was used as an authority.
//
// Each entry carries `source` so the next reader can check the claim instead of
// trusting this file, and `avoid` so a wrong form that already shipped is named
// rather than silently replaced. `avoid` is documentation — the validator does
// not read it — which is why the list includes forms an earlier model-only pass
// proposed in good faith and research then disproved (میگۆ is Persian, not the
// Kurdish word for shrimp).
//
// Dry run by default; --commit writes.
import fs from "node:fs";
import path from "node:path";

const COMMIT = process.argv.includes("--commit");
const gPath = path.resolve(process.cwd(), "shared/i18n/glossary.json");
const glossary = JSON.parse(fs.readFileSync(gPath, "utf8"));

const W = (t) => `https://ckb.wikipedia.org/wiki/${encodeURIComponent(t)}`;

/** id → fields to merge. Only high/medium-high confidence findings are here. */
const RESEARCHED = {
  temperature: { ckb: "پلەی گەرمی", ckbAlt: ["پلەی گەرما", "گەرما", "گەرمی"], avoid: ["پلەپێو", "گرما"], source: W("پلەی_گەرمی") },
  thermometer: { ckb: "گەرمیپێو", ckbAlt: ["پلەپێو", "تەرمۆمەتر"], avoid: [], source: W("گەرمیپێو") },
  freshwater: { ckb: "ئاوی شیرین", ckbAlt: [], avoid: ["ئاوی سازگار"], source: W("ئاوی_شیرین") },
  quarantine: { ckb: "کەرەنتینە", ckbAlt: ["هاوێر"], avoid: ["قەفەی سەروو"], source: W("کەرەنتینە") },
  bacteria: { ckb: "بەکتریا", ckbAlt: [], avoid: ["باکتری"], source: W("بەکتریا") },
  algae: { ckb: "قەوزە", ckbAlt: ["کەوزە", "کەوز", "کەڤز"], avoid: [], source: W("قەوزە") },
  shrimp: { ckb: "مەیگوو", ckbAlt: ["ئەنگوش"], avoid: ["جەمبڕی", "جەمبەری", "میگۆ"], source: W("مەیگوو") },
  chlorine: { ckb: "کلۆر", ckbAlt: [], avoid: ["کلر", "کلۆرین"], source: W("کلۆر") },
  ammonia: { ckb: "ئەمۆنیا", ckbAlt: [], avoid: [], source: W("ئەمۆنیا") },
  oxygen: { ckb: "ئۆکسجین", ckbAlt: [], avoid: ["اکسیژن"], source: W("ئۆکسجین") },
  aquarium: { ckbAlt: ["حەوزی ماسی", "ئاوژیدان"], source: W("ئاوژیدان") },

  // Commerce/legal, researched 2026-09-21 against live Sorani storefronts and
  // institutions in Iraqi Kurdistan: kurdphone.com (Erbil), citystarmall.co
  // (Sulaymaniyah), hostkurd.com, samsung.com/iq_ku, fib.iq, epsule.gov.krd,
  // gov.krd. Real shipped UI beats a dictionary for commerce register.
  //
  // Two of these overturn earlier model-only recommendations, which is the
  // whole argument for researching rather than reasoning:
  //   invoice — a previous pass canonicalised on فاکتۆر; in Sorani that word
  //             overwhelmingly means "factor". Kurdish shops and the KRG's own
  //             e-payment portal (ئی-پسوولە) use پسووڵە.
  //   loyalty — a previous pass canonicalised on دڵسۆزی, which is loyalty as a
  //             personal attitude. The programme word is وەفاداری.
  invoice: { ckb: "پسووڵە", ckbAlt: ["پسوڵە", "پسووڵەی فرۆشتن", "پسووڵەی پارەدان"], avoid: ["فاکتۆر", "وەسڵ"], source: "https://epsule.gov.krd/how-to-pay/" },
  loyalty: { ckb: "وەفاداری", ckbAlt: ["وفاداری"], avoid: ["دڵسۆزی"], source: "https://citystarmall.co/ku/" },
  discount: { ckb: "داشکاندن", ckbAlt: ["داشکان"], avoid: ["کەمکردنەوە"], source: "https://kurdphone.com/" },
  point: { ckb: "خاڵ", ckbAlt: ["خاڵەکان"], avoid: ["خال", "نقطە"], source: "https://ku.wiktionary.org/wiki/%D8%AE%D8%A7%DA%B5" },
  "loyalty-point": { ckb: "خاڵ", ckbAlt: ["خاڵی پاداشت", "خاڵەکانی پاداشت"], avoid: ["نقطە"], source: "https://fib.iq/cashback/" },
  warranty: { ckb: "گەرەنتی", ckbAlt: ["زەمان"], avoid: ["گارانتی"], source: "https://www.samsung.com/iq_ku/info/legal" },
  delivery: { ckb: "گەیاندن", ckbAlt: ["پێگەیاندن", "گەیاندرا", "گەیشت"], avoid: [], source: "https://kurdphone.com/shipping/" },
  "out-of-stock": { ckb: "لە کۆگا نەماوە", ckbAlt: ["بەردەست نییە", "تەواو بووە", "نەماوە", "لە کۆگا نییە"], avoid: [], source: "https://kurdphone.com/" },
  "in-stock": { ckb: "لەبەردەستە", ckbAlt: ["بەردەستە لە کۆگا"], avoid: [], source: "https://kurdphone.com/product-category/charger/" },
  account: { ckb: "هەژمار", ckbAlt: ["ئەکاونت"], avoid: [], source: "https://fib.iq/ku/faq/" },
  cart: { ckb: "سەبەتە", ckbAlt: ["سەبەتەی کڕین", "عەرەبانە"], avoid: [], source: "https://www.hostkurd.com/cart.php?a=view" },
  "terms-and-conditions": { ckb: "مەرج و بەندەکان", ckbAlt: ["بەند و مەرجەکان", "مەرج و ڕێساکان", "مەرج و ڕێسایانە"], avoid: ["مەرج و مەبەستەکان", "مەرج و ڕێنوێن"], source: "https://www.rudaw.net/sorani/terms" },
  "track-order": { ckb: "بەدواداچوونی داواکاری", ckbAlt: ["بەدواداچوونی داواکارییەکەت", "شوێنکەوتنی داواکاری"], avoid: ["پێگەی داواکردن"], source: "https://kurdphone.com/track-order/" },
  fee: { ckb: "کرێ", ckbAlt: ["تێچوو"], avoid: ["باج"], source: "https://kurdphone.com/faqs/" },
  subtotal: { ckb: "کۆ", ckbAlt: ["کۆی لاوەکی"], avoid: ["کۆی گشتی"], source: "https://www.hostkurd.com/cart.php?a=view" },
  "grand-total": { ckb: "کۆی گشتی", ckbAlt: [], avoid: [], source: "https://www.hostkurd.com/cart.php?a=view" },
  login: { ckb: "چوونەژوورەوە", ckbAlt: ["بچیتە ژوورەوە", "بچیتە", "بچۆنە ژوورەوە", "بچۆرە ژوورەوە", "بچۆ ژوورەوە"], avoid: [], source: "https://kurdphone.com/" },
  "electronic-payment": { ckb: "پارەدانی ئەلیکترۆنی", ckbAlt: ["پارەدانی ئۆنلاین"], avoid: [], source: "https://epsule.gov.krd/how-to-pay/wallets/" },
};

/**
 * Researched but NOT applied: authoritative sources gave no attestation, so a
 * value here would be a guess wearing a citation. Recorded on the glossary so
 * the open question travels with the file instead of living in a chat log.
 */
const UNRESOLVED = [
  "heater (aquarium)", "thermostat", "aeration", "mechanical filtration",
  "biological filtration", "chloramine", "dechlorinator / water conditioner",
  "beneficial bacteria", "aquarium cycling", "algae control",
  "livebearers vs egg-layers", "dose / dosing",
  // Commerce side: no Sorani legal or retail source attests these.
  "force majeure", "loyalty tier / tier upgrade",
];

let changed = 0;
for (const [id, fields] of Object.entries(RESEARCHED)) {
  const term = glossary.terms.find((t) => t.id === id);
  if (!term) { console.log(`  ?  ${id} — not in glossary, skipped`); continue; }
  const before = JSON.stringify(term);
  if (fields.ckb) term.ckb = fields.ckb;
  if (fields.ckbAlt?.length) term.ckbAlt = [...new Set([...(term.ckbAlt ?? []), ...fields.ckbAlt])];
  if (fields.avoid?.length) term.avoid = [...new Set([...(term.avoid ?? []), ...fields.avoid])];
  term.source = fields.source;
  // Research settles these; they are no longer waiting on a native speaker.
  delete term.needsNativeReview;
  if (JSON.stringify(term) !== before) { changed++; console.log(`  →  ${id}: ckb="${term.ckb}"${term.avoid ? ` avoid=[${term.avoid.join(", ")}]` : ""}`); }
  else console.log(`  =  ${id} unchanged`);
}

glossary.$unresolved = {
  note: "Researched 2026-09-21 with no authoritative attestation found. A native Sorani reviewer from Iraqi Kurdistan is required; do not ship a guessed form.",
  terms: UNRESOLVED,
};

console.log(`\n${changed} term(s) updated, ${UNRESOLVED.length} recorded as unresolved.`);
if (!COMMIT) { console.log("DRY RUN — nothing written."); process.exit(0); }
fs.writeFileSync(gPath, `${JSON.stringify(glossary, null, 2)}\n`);
console.log("wrote shared/i18n/glossary.json");
