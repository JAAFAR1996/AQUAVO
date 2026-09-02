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
 */

export type ScriptViolation = {
  rule: "STRAY_SCRIPT" | "FOREIGN_DIACRITIC" | "SPLICED_LATIN";
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
  return violations;
}

/** Prompt-side statement of the same rule, so the request matches the constraint. */
export const SCRIPT_PURITY_RULE = [
  "اكتب النص كله بالعربية فقط.",
  "ممنوع تماماً استخدام أي حرف صيني أو روسي أو هندي أو ياباني أو كوري أو تايلندي أو عبري.",
  "ممنوع لصق كلمة إنجليزية داخل كلمة عربية مثل (تutilize) أو (حobbyists).",
  "المسموح: المصطلحات التقنية اللاتينية المستقلة مثل pH و CO2 و RO و LED وأسماء الماركات والأسماء العلمية والوحدات.",
].join(" ");
