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
  // Two traps sit on this word. خال is "maternal uncle / mole", and — easier to
  // trip — bare خاڵی means "empty" (Samsung renders the empty cart as
  // عەرەبانەکەت خاڵییە). Points must be خاڵ / خاڵەکان / خاڵەکانی پاداشت.
  point: { ckb: "خاڵ", ckbAlt: ["خاڵەکان"], avoid: ["خال", "نقطە", "خاڵی"], source: "https://ku.wiktionary.org/wiki/%D8%AE%D8%A7%DA%B5" },
  "loyalty-point": { ckb: "خاڵ", ckbAlt: ["خاڵی پاداشت", "خاڵەکانی پاداشت", "خاڵەکان"], avoid: ["نقطە", "خاڵی", "پۆینت"], source: "https://fib.iq/cashback/" },
  warranty: { ckb: "گەرەنتی", ckbAlt: ["زەمان"], avoid: ["گارانتی"], source: "https://www.samsung.com/iq_ku/info/legal" },
  delivery: { ckb: "گەیاندن", ckbAlt: ["پێگەیاندن", "گەیاندرا", "گەیشت"], avoid: [], source: "https://kurdphone.com/shipping/" },
  // The badge/label form and the sentence form are separate entries in the
  // WooCommerce ckb (ku_IQ) locale; the label is what a product card shows.
  "out-of-stock": { ckb: "بەردەست نییە لە کۆگا", ckbAlt: ["بەردەست نییە", "لە کۆگا نەماوە", "بەرهەمەکە لە کۆگادا نەماوە", "تەواو بووە", "نەماوە", "لە کۆگا نییە"], avoid: [], source: "https://translate.wordpress.org/projects/wp-plugins/woocommerce/stable/ckb/default/" },
  "delivery-fee": { ckb: "کرێی گەیاندن", ckbAlt: ["نرخی گەیاندن"], avoid: ["تێچووی گەیاندن", "باج"], source: "https://translate.wordpress.org/projects/wp-plugins/woocommerce/stable/ckb/default/" },
  "cash-on-delivery": { ckb: "کاش لە کاتی گەیاندن", ckbAlt: ["پارەی کاش لە کاتی گەیاندن", "پارەدان لە کاتی وەرگرتن"], avoid: [], source: "https://www.samsung.com/iq_ku/shop-faq/payment-and-financing/" },
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

  // Customer credit — the highest-consequence entry here, because the plausible
  // words invert the direction of the money. کرێدیت collocates in Kurdish as a
  // card or an academic credit and glosses to قەرز (lending), so store credit
  // labelled کرێدیت reads as "the customer owes us" — the same inversion that
  // already shipped once as قەرز. باڵانس is settled financial register
  // (ckb.wikipedia باڵانسی پارەدان; WooCommerce ckb "account balance" =
  // باڵانسی هەژمار). پاشماوە means detritus, and WooCommerce's خاڵی فرۆشگا
  // literally reads "store points", i.e. a loyalty scheme.
  "customer-credit": { ckb: "باڵانس", ckbAlt: ["باڵانسی کڕیار", "باڵانسی هەژمار"], avoid: ["قەرز", "کرێدیت", "پاشماوە", "قەرەبوو", "خاڵی فرۆشگا"], source: "https://ckb.wikipedia.org/wiki/%D8%A8%D8%A7%DA%B5%D8%A7%D9%86%D8%B3%DB%8C_%D9%BE%D8%A7%D8%B1%DB%95%D8%AF%D8%A7%D9%86" },
  debt: { ckb: "قەرز", ckbAlt: ["قەرزاری"], avoid: ["باڵانس"], source: "https://ku.wiktionary.org/wiki/%D9%82%DB%95%D8%B1%D8%B2" },

  // Force majeure. هەرەزاڵ is the superlative of زاڵ; plain هێزی زاڵ is attested
  // 138x on ckb.wikipedia but always as "dominant force" in physics/politics.
  // Confidence is medium: the term is a single orphan Wikipedia page and the
  // 603-document KRG legal corpus has zero hits, because KRG statute law carries
  // this concept in Arabic as القوة القاهرة. Gloss it on first use, as the
  // Kurdish source itself does.
  "force-majeure": { ckb: "هێزی هەرەزاڵ", ckbAlt: ["بڕگەی هێزی هەرەزاڵ", "دۆخێک کە لە دەرەوەی توانا و دەسەڵاتی لایەنەکان بێت"], avoid: ["هێزی زاڵ", "هێزی ناچارکەر", "بارودۆخی ناچاری", "هۆکاری دەرەکی"], source: "https://ckb.wikipedia.org/wiki/%D9%87%DB%8C%D9%94%D8%B2%D9%89_%D9%87%DB%95%D8%B1%DB%95%D8%B2%D8%A7%DA%B5" },

  // پرسە is funeral/mourning as a standalone noun, but it is ALSO the definite
  // plural of پرس ("matter, issue") — a 2005 Kurdistan Parliament decision reads
  // «پرسە چارەنووسسازەکانی گەلی کورد». Do not blind-flag the bare string.
  survey: { ckb: "ڕاپرسی", ckbAlt: ["ڕاپرسی کڕیاران", "پرسیارنامە", "پرسنامە", "فۆڕمی سەرنج و پێشنیار"], avoid: ["پرسە", "هەڵسەنگاندن", "ڕاپرسی گشتی"], source: "https://ckb.wikipedia.org/wiki/%DA%95%D8%A7%D9%BE%D8%B1%D8%B3%DB%8C" },
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
  // Commerce side: no Sorani retail or banking source uses a generic word for
  // "tier". Notably NOT پلە — in live Sorani that reads as ranking position.
  "loyalty tier / tier upgrade",
];

/**
 * Resolved by research but worth a native speaker's five minutes, because each
 * rests on inference rather than a shipped Sorani label:
 *   force-majeure     — does هێزی هەرەزاڵ read as legal Kurdish or as a coinage?
 *   customer-credit   — would an Erbil shopkeeper say باڵانس for money the shop
 *                       holds for a customer?
 */
const CONFIRM_WITH_NATIVE = ["force-majeure", "customer-credit"];

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
  confirmWithNative: {
    note: "Resolved by research, but inferred from adjacent usage rather than a shipped Sorani label. Worth a native reviewer's confirmation before these reach customers.",
    terms: CONFIRM_WITH_NATIVE,
  },
};

console.log(`\n${changed} term(s) updated, ${UNRESOLVED.length} recorded as unresolved.`);
if (!COMMIT) { console.log("DRY RUN — nothing written."); process.exit(0); }
fs.writeFileSync(gPath, `${JSON.stringify(glossary, null, 2)}\n`);
console.log("wrote shared/i18n/glossary.json");
