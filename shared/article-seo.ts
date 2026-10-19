import { articleReadingText } from "./article-reading.js";
import { ARTICLE_SEARCH_COPY } from "./article-seo-copy.js";
import { stripBidiControls } from "./i18n/bidi.js";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locales.js";

export interface ArticleSeoInput {
  slug?: string | null;
  title: string;
  excerpt?: string | null;
  content?: string | null;
}

const TEXT_ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">",
};

function plainText(value: string | null | undefined): string {
  return stripBidiControls(articleReadingText(value))
    .replace(/&(?:amp|quot|apos|lt|gt);/g, (entity) => TEXT_ENTITIES[entity] ?? entity)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugKey(value: string | null | undefined): string {
  try { return decodeURIComponent(value ?? ""); } catch { return value ?? ""; }
}

function withoutSiteSuffix(title: string): string {
  const suffix = /\s*\|\s*(?:(?:مدونة|بلۆگی)\s+)?AQUAVO(?:\s+(?:Iraq|IQ|العراق|عێراق|Blog))?\s*$/i;
  let clean = plainText(title);
  while (suffix.test(clean)) clean = clean.replace(suffix, "").trim();
  return clean;
}

function descriptionExcerpt(text: string): string {
  if (text.length <= 160) return text;
  // Prefer a complete, useful sentence. Future uncurated long excerpts keep
  // their source wording and end at a word boundary with a visible ellipsis.
  const sentences = [...text.matchAll(/[.!?؟](?:\s|$)/gu)];
  const end = sentences.map((match) => match.index + 1).filter((index) => index >= 100 && index <= 160).at(-1);
  if (end) return text.slice(0, end);
  const prefix = text.slice(0, 157);
  const boundary = prefix.lastIndexOf(" ");
  return `${(boundary > 0 ? prefix.slice(0, boundary) : prefix).trimEnd()}...`;
}

/** Search and social metadata only; the complete article remains the page/schema identity. */
export function buildArticleSeoMeta(
  article: ArticleSeoInput,
  options: { locale?: Locale } = {},
): { title: string; description: string } {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const sourceTitle = plainText(article.title);
  const sourceExcerpt = plainText(article.excerpt);
  const candidate = locale === DEFAULT_LOCALE ? ARTICLE_SEARCH_COPY[slugKey(article.slug)] : undefined;
  const copy = candidate && plainText(candidate.sourceTitle) === sourceTitle ? candidate : undefined;
  const description = copy?.description && plainText(copy.sourceExcerpt) === sourceExcerpt
    ? copy.description
    : sourceExcerpt || plainText(article.content) || sourceTitle;
  // Existing long titles have concise, source-specific alternatives. Do not
  // silently cut a new or renamed article at an arbitrary character count.
  return {
    title: `${withoutSiteSuffix(copy?.title ?? sourceTitle)} | AQUAVO`,
    description: descriptionExcerpt(description),
  };
}
