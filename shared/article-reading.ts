/**
 * One reading-time number, derived from the article the reader is actually
 * given, and labelled as the estimate it is.
 *
 * There were two sources for this figure and they disagreed. The crawler route
 * computed it from the article body; the React blog pages printed
 * `blog_posts.read_time`, a hand-entered string. Sampled on production, the
 * stored string against the real length of the same post:
 *
 *   algae-war-guide              227 words  ->  stored "11 دقيقة"   (~1 min)
 *   best-aquarium-filters-iraq   196 words  ->  stored "8 دقائق"    (~1 min)
 *   ro-water-vs-tap-water        373 words  ->  stored "9 دقائق"    (~2 min)
 *
 * So a reader saw "11 دقيقة" and a crawler saw "دقيقة واحدة" for one article.
 * Both surfaces now call this, and `blog_posts.read_time` is no longer read by
 * anything that renders. The column is left in place; correcting a display bug
 * is not a reason to migrate a table.
 *
 * The number is an estimate and is written as one. Reading speed varies by
 * reader and by material, so presenting a derived figure as an exact duration
 * would be a small untruth in the same family as the one this replaces.
 */

/**
 * Words per minute used for the estimate.
 *
 * 200 wpm for Arabic prose of this kind. Published silent-reading rates vary
 * with script, material and reader, so this is a documented convention rather
 * than a measured property of AQUAVO's audience — which is exactly why the
 * label says "تقديري" and never states a precise duration.
 */
export const ARABIC_WORDS_PER_MINUTE = 200;

/** Article HTML reduced to its readable text. */
export function articleReadingText(html: string | null | undefined): string {
  if (typeof html !== "string" || !html.trim()) return "";
  return html
    // Script and style bodies are not read by anyone; drop them before tags go,
    // or their contents survive as "words".
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words in the article body — the number the Article schema publishes. */
export function articleWordCount(html: string | null | undefined): number {
  const text = articleReadingText(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/** Estimated whole minutes to read the article, at minimum 1. */
export function articleReadingMinutes(html: string | null | undefined): number | null {
  const words = articleWordCount(html);
  if (words === 0) return null;
  return Math.max(1, Math.round(words / ARABIC_WORDS_PER_MINUTE));
}

/**
 * The duration on its own, in correct Arabic.
 *
 * Arabic counts one, two and many differently, so a single "N دقائق" template
 * is wrong for the two shortest cases — which, at the lengths above, are the
 * common ones.
 */
export function articleReadingDuration(html: string | null | undefined): string | null {
  const minutes = articleReadingMinutes(html);
  if (minutes === null) return null;
  if (minutes === 1) return "دقيقة واحدة";
  if (minutes === 2) return "دقيقتان";
  if (minutes <= 10) return `${minutes} دقائق`;
  return `${minutes} دقيقة`;
}

/** The label a reader sees, which says the figure is an estimate. */
export const READING_TIME_LABEL = "وقت القراءة التقديري";

/** "وقت القراءة التقديري: 8 دقائق" — the full phrase for display. */
export function articleReadingTimeLabel(html: string | null | undefined): string | null {
  const duration = articleReadingDuration(html);
  return duration ? `${READING_TIME_LABEL}: ${duration}` : null;
}
