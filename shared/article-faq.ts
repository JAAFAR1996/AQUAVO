import { articleReadingText } from "./article-reading.js";
import { cutAtSentence, DIRECT_ANSWER_MAX_WORDS } from "./article-answer.js";

/**
 * Question-and-answer pairs an article already contains, for FAQPage JSON-LD.
 *
 * A pair is a heading phrased as a question plus the first paragraph under
 * it. Both are visible in the article body, which is what Google's
 * structured-data policy requires of FAQPage: the markup may describe only
 * what a reader can see. Nothing is rendered twice and nothing is invented.
 *
 * Google stopped showing FAQ rich results for stores in 2023; the value of
 * this markup is machine readability for AI engines, not a SERP feature.
 */

export type ArticleQuestion = { question: string; answer: string };

/** A heading is a question when it ends with a question mark or opens with an interrogative. */
const INTERROGATIVE_OPENERS = [
  "كم", "كيف", "شلون", "ليش", "لماذا", "متى", "هل", "شنو", "ما هو", "ما هي", "ماذا", "أي", "اي", "وين", "أين", "شو",
];

export function isQuestionHeading(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[؟?]\s*$/.test(t)) return true;
  const first = t.replace(/^[«"'(\s]+/, "");
  return INTERROGATIVE_OPENERS.some((w) => first.startsWith(`${w} `) || first === w);
}

/** Minimum pairs before FAQPage is published: one question is a heading, two are an FAQ. */
export const ARTICLE_FAQ_MIN_PAIRS = 2;

/**
 * Walk headings (h2–h6) in order; for each question heading take the first
 * <p> that follows before the next heading, trimmed to the answer ceiling.
 */
export function articleQuestions(html: string | null | undefined): ArticleQuestion[] {
  if (typeof html !== "string" || !html.trim()) return [];
  const tokens = html.split(/(<h[2-6]\b[^>]*>[\s\S]*?<\/h[2-6]\s*>)/gi);
  const pairs: ArticleQuestion[] = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const heading = articleReadingText(tokens[i]);
    if (!isQuestionHeading(heading)) continue;
    const after = tokens[i + 1] ?? "";
    const p = /<p\b[^>]*>([\s\S]*?)<\/p\s*>/i.exec(after);
    if (!p) continue;
    const text = articleReadingText(p[1]);
    if (!text) continue;
    const answer = cutAtSentence(text, DIRECT_ANSWER_MAX_WORDS) ?? text.split(/\s+/).slice(0, DIRECT_ANSWER_MAX_WORDS).join(" ");
    pairs.push({ question: heading, answer });
  }
  return pairs.length >= ARTICLE_FAQ_MIN_PAIRS ? pairs : [];
}

/** FAQPage node for the pairs, or null when there are too few to publish. */
export function articleFaqSchema(html: string | null | undefined): object | null {
  const pairs = articleQuestions(html);
  if (pairs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}
