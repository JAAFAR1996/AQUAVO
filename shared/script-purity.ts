/**
 * Script purity for generated Arabic articles.
 *
 * The blog generator emitted tokens from other languages mid-sentence and
 * persisted them. A corpus audit on 2026-09-01 found 30 of 80 published
 * articles carrying stray fragments — Chinese (`عملية复杂ة`), Russian
 * (`которые`), Devanagari (`जهما`), Vietnamese (`khảية`, `dịch vụ`), French
 * (`besoinها`) and English spliced into Arabic words (`تutilize`, `حobbyists`).
 *
 * A broken glyph mid-sentence is the clearest machine-generated signal a reader
 * or an AI crawler can see, and the same HTML is served to browsers, Googlebot,
 * GPTBot, ClaudeBot and PerplexityBot alike.
 *
 * The prompt asks for Arabic; this is the constraint. It deliberately does NOT
 * block ordinary English technical vocabulary, which the corpus uses correctly
 * and constantly: pH, CO2, RO, LED, GH/KH/TDS, brand names, scientific
 * binomials, units and model numbers all pass. Only two things fail:
 *
 *   1. scripts that have no business in this corpus at all (Han, Cyrillic,
 *      Devanagari, Kana, Hangul, Thai, Hebrew), and
 *   2. a Latin run fused directly onto an Arabic letter with no separator,
 *      which is always a token-substitution artefact and never real writing.
 *
 * Latin-Extended diacritics are treated as (1) because in this corpus they only
 * ever arrive as Vietnamese. Latin-1 Supplement is NOT blocked, so European
 * brand names such as Söchting remain writable.
 *
 * A second audit on 2026-09-02 found a class all three rules were blind to:
 * a *standalone* foreign word written entirely in Latin/Latin-1, welded to
 * nothing and carrying no extended diacritic — `trung tâm`, `yüksek`, `phân`,
 * `hoàn`, `também`, `votre`, `salud`, `faktor`, plus bare English dropped
 * mid-sentence (`require`, `warranties`). Ten articles carried these.
 *
 * Rule (3), FOREIGN_LEXICAL, closes that. It is deliberately NOT "no Latin
 * words". It asks a narrower question: *is this lowercase Latin word presented
 * as a term, or just sitting in the middle of an Arabic sentence?* Anything
 * carrying a capital, a digit, a parenthetical gloss, an explicit Arabic gloss
 * marker ("بالإنجليزية", "يسمى"), or a position inside a capitalised multi-word
 * name is a term and passes. A bare lowercase word with none of those is the
 * defect. pH, CO2, RO, LED, GH/KH/TDS, Söchting, Echinodorus bleheri,
 * (Quarantine), (basking area) and Catappa leaves all pass unchanged.
 */

export type ScriptViolation = {
  rule: "STRAY_SCRIPT" | "FOREIGN_DIACRITIC" | "SPLICED_LATIN" | "FOREIGN_LEXICAL";
  evidence: string;
};

/** Scripts that never legitimately appear in an AQUAVO Arabic article. */
const STRAY_SCRIPT =
  /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Devanagari}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Hebrew}]+/gu;

/**
 * Latin Extended-A/B and Latin Extended Additional. Vietnamese lands here.
 * Latin-1 Supplement (U+00C0-U+00FF) is intentionally excluded so that ö, é, ñ
 * in European brand names stay legal.
 */
const FOREIGN_DIACRITIC = /[Ā-ɏḀ-ỿ][\p{Script=Latin}Ā-ɏḀ-ỿ]*/gu;

/**
 * Arabic *letters* only. Written as explicit ranges rather than
 * `[\p{Script=Arabic}&&\p{Letter}]` so the pattern needs only the `u` flag and
 * stays valid below an `esnext` target. Deliberately excludes Arabic
 * punctuation (، ؟ ؛), the Arabic-Indic digits and the combining marks.
 */
const ARABIC_LETTER = "\\u0621-\\u063A\\u0641-\\u064A\\u066E-\\u06D3\\u06FA-\\u06FF";

/**
 * A Latin run welded to an Arabic letter. Arabic punctuation is excluded on
 * purpose, so "AQUAVO،" and "LED؟" — which are correct — do not trip this.
 */
const SPLICED_LATIN = new RegExp(
  `[${ARABIC_LETTER}][A-Za-z]{2,}|[A-Za-z]{2,}[${ARABIC_LETTER}]`,
  "gu",
);

/** Words allowed to carry extended diacritics despite rule (1). */
const DIACRITIC_ALLOWLIST = new Set<string>([]);

function evidenceAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + length + 60);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}


/* ------------------------------------------------------------------ *
 * Rule 3 — FOREIGN_LEXICAL
 * ------------------------------------------------------------------ */

/**
 * Latin letters including Latin-1 Supplement, which is where the Turkish and
 * Portuguese fragments live (ü, é). Latin-Extended is already rule (1)'s job.
 */
const LATIN_WORD = /[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9'’-]*/g;

/**
 * Arabic phrases that explicitly introduce a foreign term. Text after one of
 * these is a gloss, which is exactly how the corpus is supposed to name things
 * the reader will meet in English: "ولهذا يسمونه بالإنجليزية brown blood disease".
 */
const GLOSS_MARKER =
  /(?:بالإنجليزية|بالانكليزية|بالإنكليزية|بالاتينية|باللاتينية|يسمى|تسمى|يسمونه|تسمونها|يسمونها|اسمه|اسمها|المعروف باسم|المعروفة باسم|تُعرف بـ|يُعرف بـ|تعرف باسم|يعرف باسم|أو ما يسمى|تباع باسم)\s*$/u;

/**
 * Lowercase Latin terms that are genuinely established and are not always
 * written with a capital or inside parentheses. Kept deliberately short: every
 * entry has to earn its place, because each one is a hole in the rule.
 */
const LEXICAL_ALLOWLIST = new Set<string>([
  // Accepted lowercase scientific shorthand for complete ammonia oxidisers.
  // Published lowercase in the literature, and the hub uses it that way.
  "comammox",
  // Unit and measure words the corpus writes bare.
  "ppm", "mg", "ml", "cm", "mm", "km", "kg", "watt", "dkh", "dgh",
  // Technical vocabulary that is conventionally lowercase.
  "ph", "co", "ro", "led", "gh", "kh", "tds", "uv", "uvb", "par", "diy",
]);

/** Strip markup, entities and URLs: none of them are prose. */
function proseOnly(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-zA-Z#0-9]+;/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
}

/** Character offsets that sit inside (), [], {} or a quoted run. */
function glossedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const pairs: Array<[string, string]> = [["(", ")"], ["[", "]"], ["{", "}"], ["«", "»"]];
  for (const [open, close] of pairs) {
    let from = 0;
    for (;;) {
      const a = text.indexOf(open, from);
      if (a < 0) break;
      const b = text.indexOf(close, a + 1);
      if (b < 0) break;
      ranges.push([a, b]);
      from = b + 1;
    }
  }
  // Straight and typographic double quotes, treated as a paired gloss too.
  for (const quote of ['"', "“", "”"]) {
    const positions: number[] = [];
    for (let i = text.indexOf(quote); i >= 0; i = text.indexOf(quote, i + 1)) positions.push(i);
    for (let i = 0; i + 1 < positions.length; i += 2) ranges.push([positions[i], positions[i + 1]]);
  }
  return ranges;
}

/**
 * A bare lowercase Latin word sitting in an Arabic sentence. See the header:
 * this is the class that has no capital, no digit, no gloss and no name to
 * belong to, which in this corpus has only ever been a substitution artefact.
 */
function findLexicalViolations(html: string): ScriptViolation[] {
  const text = proseOnly(html);
  const ranges = glossedRanges(text);
  const inGloss = (i: number) => ranges.some(([a, b]) => i > a && i < b);

  const out: ScriptViolation[] = [];
  // True when the previous Latin word was accepted as a term. A term opens a
  // phrase: 'Catappa leaves' and 'بالإنجليزية brown blood disease' are each one
  // name, so the words after the first inherit its standing.
  let previousWasTerm = false;
  let previousEnd = -1;

  for (let m = LATIN_WORD.exec(text); m; m = LATIN_WORD.exec(text)) {
    const word = m[0];
    const start = m.index;

    // Only the gap between this word and the last one; a Latin phrase is a run
    // of Latin words separated by spaces or hyphens and nothing else.
    const gap = previousEnd >= 0 ? text.slice(previousEnd, start) : "";
    const continuesPhrase: boolean = previousWasTerm && /^[\s-]{1,3}$/.test(gap);

    const hasCapital = /[A-ZÀ-ÖØ-Þ]/.test(word);
    const hasDigit = /[0-9]/.test(word);
    const allowed: boolean =
      hasCapital ||
      hasDigit ||
      word.length < 3 ||
      LEXICAL_ALLOWLIST.has(word.toLowerCase()) ||
      inGloss(start) ||
      continuesPhrase ||
      GLOSS_MARKER.test(text.slice(Math.max(0, start - 40), start));

    if (!allowed) {
      out.push({ rule: "FOREIGN_LEXICAL", evidence: evidenceAround(text, start, word.length) });
    }

    previousWasTerm = allowed;
    previousEnd = start + word.length;
  }
  return out;
}

/**
 * Returns every script-purity violation in `text`. Empty array means clean.
 * Safe to call on null/undefined so it can be pointed at optional fields.
 */
export function findScriptViolations(text: string | null | undefined): ScriptViolation[] {
  if (typeof text !== "string" || text.length === 0) return [];
  const violations: ScriptViolation[] = [];

  for (const match of text.matchAll(STRAY_SCRIPT)) {
    violations.push({ rule: "STRAY_SCRIPT", evidence: evidenceAround(text, match.index, match[0].length) });
  }
  for (const match of text.matchAll(FOREIGN_DIACRITIC)) {
    if (DIACRITIC_ALLOWLIST.has(match[0])) continue;
    violations.push({ rule: "FOREIGN_DIACRITIC", evidence: evidenceAround(text, match.index, match[0].length) });
  }
  for (const match of text.matchAll(SPLICED_LATIN)) {
    violations.push({ rule: "SPLICED_LATIN", evidence: evidenceAround(text, match.index, match[0].length) });
  }
  violations.push(...findLexicalViolations(text));
  return violations;
}

/** Prompt-side statement of the same rule, so the request matches the constraint. */
export const SCRIPT_PURITY_RULE = [
  "اكتب النص كله بالعربية فقط.",
  "ممنوع تماماً استخدام أي حرف صيني أو روسي أو هندي أو ياباني أو كوري أو تايلندي أو عبري.",
  "ممنوع لصق كلمة إنجليزية داخل كلمة عربية مثل (تutilize) أو (حobbyists).",
  "المسموح: المصطلحات التقنية اللاتينية المستقلة مثل pH و CO2 و RO و LED وأسماء الماركات والأسماء العلمية والوحدات.",
  "أي كلمة لاتينية صغيرة الحروف داخل جملة عربية ممنوعة إلا إذا كانت مصطلحاً معرّفاً: ضعها بين قوسين أو بعد (بالإنجليزية) أو اكتبها باسم علم بحرف كبير.",
].join(" ");
