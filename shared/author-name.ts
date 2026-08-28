/**
 * Normalise a blog author name for anything a crawler or reader sees.
 *
 * `blog_posts.author` is free text, and 11 of the 81 published posts carry
 * "شريمب 🦐". That emoji reaches Google inside schema.org Person.name and the
 * visible byline, which is both poor structured data — an emoji is not part of
 * anyone's name — and a direct breach of the project's zero-emoji content rule.
 *
 * The database is left alone; this runs at the render boundary so every surface
 * (blog-ssr schema, ssr-meta schema, the semantic crawler route, the visible
 * byline and the markdown view) agrees on one spelling.
 *
 * It only strips decoration. It never invents or replaces a name: whatever
 * letters the author field holds are preserved.
 */

// Pictographs, variation selectors, zero-width joiners and regional indicators.
// Built with `new RegExp` rather than a literal: the root tsconfig sets no
// `target`, so it defaults low enough that tsc rejects a literal /u flag
// (TS1501). Pattern and flags are identical at runtime.
const DECORATION = new RegExp(
  "[\\p{Extended_Pictographic}\\u{FE00}-\\u{FE0F}\\u{200D}\\u{1F1E6}-\\u{1F1FF}]",
  "gu",
);

export const FALLBACK_AUTHOR_NAME = "AQUAVO";

export function displayAuthorName(raw: string | null | undefined): string {
  if (!raw) return FALLBACK_AUTHOR_NAME;
  const cleaned = raw.replace(DECORATION, "").replace(/\s+/g, " ").trim();
  return cleaned || FALLBACK_AUTHOR_NAME;
}
