/**
 * BiDi isolation for numeric ranges rendered inside right-to-left copy.
 *
 * THE DEFECT
 * ----------
 * `تغذية 4-6 مرات` is read by a user as `4-6` reversed — `6-4`. It is not a
 * translation bug and not a font bug; it is the Unicode Bidirectional Algorithm
 * working as specified:
 *
 *   W2  an EUROPEAN NUMBER preceded by an ARABIC LETTER becomes an ARABIC NUMBER,
 *       so `4` and `6` are AN, not EN.
 *   W4  only promotes a EUROPEAN SEPARATOR (`-`) that sits between two EUROPEAN
 *       numbers, so after W2 it no longer applies and the hyphen stays a separator.
 *   W6  leaves that separator as a neutral, and
 *   N1  resolves a neutral between two numbers to R, because numbers count as R
 *       when they influence neighbouring neutrals.
 *
 * The two digit groups therefore end up one embedding level above the hyphen:
 * two little left-to-right islands laid out right-to-left relative to each other.
 * Verified in Chromium, both in Arabic and in Sorani — see e2e/i18n-bidi.spec.ts.
 *
 * THE FIX
 * -------
 * Isolate the range so the bidi algorithm resolves it on its own, with no
 * Arabic letter in scope to trigger W2. Two standard spellings of the same idea:
 *
 *   markup      `<bdi dir="ltr">4-6</bdi>`         — used wherever we render HTML
 *   characters  U+2066 LRI … U+2069 PDI            — used for plain strings
 *
 * The character form is the *isolate* pair, not the deprecated embedding or the
 * dangerous override (U+202A..U+202E): it cannot make text outside it change
 * direction, and an unterminated one cannot leak past its paragraph. It is only
 * ever added while rendering. Nothing here writes to a translation file or to the
 * database, and the corpus stays free of bidi controls — `e2e/i18n-bidi.spec.ts`
 * asserts that against the files on disk.
 *
 * Stored text is never rewritten and no digit is ever reordered by hand.
 */

/** U+2066 LEFT-TO-RIGHT ISOLATE. */
export const LRI = "⁦";
/** U+2069 POP DIRECTIONAL ISOLATE. */
export const PDI = "⁩";

/** Every bidi control, including the deprecated embeddings and overrides. */
const BIDI_CONTROLS = /[‪-‮⁦-⁩]/g;

/** Dash characters that appear between two numbers in the corpus. */
const DASHES = "\\u002D\\u2010-\\u2015\\u2212\\uFE58\\uFE63\\uFF0D";

/**
 * A numeric range: two decimal numbers joined by a dash. Spaces around the dash
 * are allowed because the corpus contains both `4-6` and `4 - 6`.
 */
export const NUMERIC_RANGE_SOURCE = `\\d+(?:[.,]\\d+)?[ \\t]*[${DASHES}][ \\t]*\\d+(?:[.,]\\d+)?`;

/** Fresh instance per call: a /g regex carries lastIndex. */
const range = () => new RegExp(NUMERIC_RANGE_SOURCE, "g");

/** Any character that makes the surrounding paragraph right-to-left. */
const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u;

/** Remove every bidi control character. Use before comparing or indexing text. */
export function stripBidiControls(value: string): string {
  return value.replace(BIDI_CONTROLS, "");
}

/** True when `value` contains a numeric range that an RTL paragraph would reverse. */
export function hasReversibleRange(value: string): boolean {
  return RTL_SCRIPT.test(value) && range().test(value);
}

/**
 * Wrap every numeric range in `value` in an LRI…PDI isolate.
 *
 * A no-op for text that has no RTL character (the range renders correctly on its
 * own) and for text that has no range. Idempotent: existing controls are stripped
 * first, so re-running it cannot nest isolates.
 */
export function isolateNumericRanges(value: string): string {
  if (!value) return value;
  const clean = stripBidiControls(value);
  if (!hasReversibleRange(clean)) return clean === value ? value : clean;
  return clean.replace(range(), (m) => `${LRI}${m}${PDI}`);
}

/**
 * Tags whose text is left exactly as authored: `code`/`pre` and friends because
 * their text is literal, and `bdi` because its contents are already isolated —
 * that is what makes this function idempotent.
 */
const VERBATIM = /^<\s*(bdi|code|pre|script|style|textarea)\b/i;
const CLOSING_VERBATIM = /^<\s*\/\s*(bdi|code|pre|script|style|textarea)\b/i;

/**
 * The markup form of {@link isolateNumericRanges}: wraps ranges in
 * `<bdi dir="ltr">` inside HTML text nodes only.
 *
 * Splitting on tags is enough here — the input is sanitized article HTML, so a
 * `<` that is not a tag has already been entity-encoded, and attribute values
 * (hrefs above all) stay inside the tag chunks and are never touched.
 */
export function isolateNumericRangesInHtml(html: string): string {
  if (!html || !RTL_SCRIPT.test(html)) return html;
  let verbatim = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (VERBATIM.test(part) && !part.endsWith("/>")) verbatim += 1;
        else if (CLOSING_VERBATIM.test(part)) verbatim = Math.max(0, verbatim - 1);
        return part;
      }
      // The RTL test is the document's, not the text node's: `<strong>50-150</strong> لتر`
      // splits the Arabic away from the range, but the browser still resolves both inside
      // one RTL paragraph and still reverses it.
      if (verbatim > 0) return part;
      // Strip first so a string that already went through isolateNumericRanges — an
      // i18next value interpolated into markup, say — gets one <bdi> and not a <bdi>
      // wrapped around an isolate pair.
      const text = stripBidiControls(part);
      if (!range().test(text)) return text;
      return text.replace(range(), (m) => `<bdi dir="ltr">${m}</bdi>`);
    })
    .join("");
}
