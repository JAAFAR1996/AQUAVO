/**
 * Shared blog-article helpers for the prerendered (crawler-visible) blog route.
 *
 * The article body in `blog_posts.content` is first-party HTML authored through
 * the admin panel. It is rendered into the semantic SSR shell so crawlers see
 * the same article a hydrated visitor reads. Two rules keep that safe and
 * correct, and both are enforced here rather than at each call site:
 *
 *  1. The stored HTML is sanitized before it is injected. It is trusted content,
 *     but it reaches the response without React escaping it, so scripts, frames
 *     and inline event handlers are stripped rather than assumed absent.
 *  2. Headings are demoted so the post title stays the page's only <h1>.
 *
 * Regex sources below are written with String.raw. A plain template literal
 * would turn `\b` into a backspace character and `\s` into a bare "s", which is
 * how a previous SEO regex in this repo silently matched nothing (aa6a0118).
 */

const BLOCKED_ELEMENTS = ["script", "style", "iframe", "object", "embed", "form", "link", "meta"];

/** Strip executable and embedding constructs from first-party article HTML. */
export function sanitizeArticleHtml(raw: string | null | undefined): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  let html = raw;
  for (const tag of BLOCKED_ELEMENTS) {
    // Paired form, including anything nested inside it.
    html = html.replace(new RegExp(String.raw`<${tag}\b[\s\S]*?<\/${tag}\s*>`, "gi"), "");
    // Any leftover opening/void/closing tag.
    html = html.replace(new RegExp(String.raw`<\/?${tag}\b[^>]*>`, "gi"), "");
  }
  // Inline event handlers: onclick="…", onload='…', onerror=…
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  // javascript: targets, quoted or bare.
  html = html.replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  html = html.replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, '$1="#"');
  return html.trim();
}

/**
 * Demote in-body headings by one level so the rendered article keeps exactly one
 * <h1> (the post title). h1→h2, h2→h3 … h5→h6; h6 is already the floor.
 */
export function demoteArticleHeadings(html: string): string {
  return html.replace(
    /<(\/?)h([1-5])\b/gi,
    (_match, slash: string, level: string) => `<${slash}h${Number(level) + 1}`,
  );
}

/** Article body as it is served to crawlers: sanitized, with headings demoted. */
export function renderArticleBodyHtml(raw: string | null | undefined): string {
  return demoteArticleHeadings(sanitizeArticleHtml(raw));
}

/**
 * Ask Cloudinary for a right-sized, modern-format copy of an already-uploaded
 * image. Non-Cloudinary URLs and URLs that already carry a transformation are
 * returned untouched, so this never re-encodes an image twice or degrades one
 * that was tuned by hand.
 */
export function cloudinaryHeroUrl(url: string, width = 1200): string {
  if (!/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return url;
  if (/\/image\/upload\/[^/]*[wqf]_[^/]*\//.test(url)) return url;
  return url.replace(/\/image\/upload\//, `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

/**
 * Reading time and word count live in shared/article-reading.ts.
 *
 * They were computed here, and the React blog pages printed the stored
 * `blog_posts.read_time` string instead — so one article had two lengths, and
 * on algae-war-guide they differed by eleven times. Moving the calculation to
 * `shared/` is what lets the browser and the crawler call the same function.
 */
export {
  ARABIC_WORDS_PER_MINUTE,
  articleWordCount,
  articleReadingDuration,
  articleReadingTimeLabel,
} from "../shared/article-reading.js";

/** Plain-text preview of an article, for meta descriptions and markdown output. */
export function articlePlainText(html: string | null | undefined): string {
  return sanitizeArticleHtml(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
