import { articleReadingText } from "./article-reading.js";

/**
 * The 40–90 word passage that opens an article, for the "الجواب باختصار" block
 * and the Article `abstract`.
 *
 * Why it exists: AI search engines (Google AI Overviews, ChatGPT, Perplexity)
 * cite self-contained passages that answer the query in roughly 40–90 words
 * directly under a heading. AQUAVO's excerpts are 12–30 words, too short to
 * be that passage, and the articles open with a proper paragraph anyway.
 *
 * Nothing here is written by a machine: the text is the article's own opening,
 * cut at a sentence boundary. An article whose opening is shorter than the
 * floor gets no block at all rather than a padded one.
 */

export const DIRECT_ANSWER_MIN_WORDS = 40;
export const DIRECT_ANSWER_MAX_WORDS = 90;
export const DIRECT_ANSWER_HEADING = "الجواب باختصار";

/** Sentence terminators used in the corpus: Arabic and Latin full stops, question and exclamation marks. */
const SENTENCE_END = /[.!?؟…]["'»)]?\s+/g;

function wordCount(text: string): number {
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/** Paragraph texts in document order, headings and lists excluded. */
export function articleParagraphs(html: string | null | undefined): string[] {
  if (typeof html !== "string" || !html.trim()) return [];
  const out: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = articleReadingText(m[1]);
    if (text) out.push(text);
  }
  return out;
}

/**
 * Cut `text` to at most `max` words at the last sentence boundary inside the
 * limit. Returns null when no complete sentence fits.
 */
export function cutAtSentence(text: string, max: number): string | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= max) return text.trim();
  const window = words.slice(0, max).join(" ") + " ";
  let lastEnd = -1;
  let m: RegExpExecArray | null;
  SENTENCE_END.lastIndex = 0;
  while ((m = SENTENCE_END.exec(window)) !== null) lastEnd = m.index + m[0].length;
  if (lastEnd < 0) return null;
  return window.slice(0, lastEnd).trim();
}

/**
 * The opening passage: consecutive paragraphs are joined until the floor is
 * reached, then the result is trimmed to the ceiling at a sentence boundary.
 */
export function directAnswer(html: string | null | undefined): string | null {
  const paragraphs = articleParagraphs(html);
  if (paragraphs.length === 0) return null;
  let text = "";
  for (const p of paragraphs) {
    text = text ? `${text} ${p}` : p;
    if (wordCount(text) >= DIRECT_ANSWER_MIN_WORDS) break;
  }
  if (wordCount(text) < DIRECT_ANSWER_MIN_WORDS) return null;
  const cut = cutAtSentence(text, DIRECT_ANSWER_MAX_WORDS);
  if (!cut || wordCount(cut) < DIRECT_ANSWER_MIN_WORDS) return null;
  return cut;
}
