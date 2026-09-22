# Blog answer layer — design

Date: 2026-09-22 · Branch: `seo/ai-answer-layer` · Status: approved in chat, implementing

## Goal

Make every published Arabic blog post (117 today) extractable by Google AI
Overviews, ChatGPT, Perplexity and classic search, and connect each post to
the products and guides it is actually about — with no hand-written content
and no claim the article does not already make.

Measured by Search Console: position of the 43 keywords in
`scripts/seo/target-keywords.json`, recorded before (baseline) and after.

## What is verified about the current state

- Crawlers (Googlebot, GPTBot, PerplexityBot) already receive the full article
  body through `api/ssr-preview.ts` → `_ssr-preview-source.ts` →
  `_seo-preview-shell.tsx` (`BlogPostPage`). Browsers render
  `client/src/pages/blog-post.tsx` from `/api/blog/posts/:slug`.
- All 117 posts are 838–2,034 words (median 1,136). Excerpts are 12–30 words.
- Each post links to exactly one other internal page on average; none carries
  FAQPage schema; 35 titles are questions.
- Blog `category` values are editorial (`مشاكل وحلول`, `المعدات`, …), not
  product categories, so product links cannot key on them directly.
- Existing pattern to follow: `shared/guide-links.ts` is one map rendered by
  both the crawler shell and the SPA (`GuideLinksSection`).

## Design

Three additions to every blog post, each computed from the article itself in
one shared module so the crawler shell and the SPA show the same thing.

### 1. Direct answer (`shared/article-answer.ts`)

`directAnswer(post)` returns 40–90 words: the first body paragraph(s) of the
article, cut at a sentence boundary, never mid-sentence, or `null` when the
opening is shorter than 40 words. No generated text. Rendered as a visible
block directly under the H1, headed **"الجواب باختصار"** (`<h2>`), in both
render paths. Also published as the Article `abstract` in JSON-LD (crawler
path, `ssr-meta.getBlogMeta`, and `blog-ssr.ts`).

Why: AI Overview citation studies for 2026 converge on answer-first passages
of 40–90 words directly under a heading. The excerpt is too short to serve.

### 2. Article questions (`shared/article-faq.ts`)

`articleQuestions(post)` scans the sanitized body for `<h2>`/`<h3>` headings
that are questions — ending in `؟`/`?` or starting with an interrogative
(كم، كيف، شلون، ليش، لماذا، متى، هل، شنو، ما هو، ماذا، أي، وين، أين) — and
pairs each with the first paragraph under it, trimmed to ≤ 90 words at a
sentence boundary. Returns `[]` unless at least two pairs exist.

Rendered nowhere new: the heading and paragraph are already visible in the
body, which is what Google's structured-data policy requires. Published as
`FAQPage` JSON-LD on the crawler path and in `ssr-meta.getBlogMeta`.
Honest note: Google no longer shows FAQ rich results for stores; the value
is machine readability for AI engines, not a SERP feature.

### 3. Related products and guides (`shared/article-links.ts`)

`productCategoryForArticle(post)` scores the eleven canonical product
categories by keyword hits in title + excerpt + body (e.g. فلتر/فلترة/ميديا →
`الفلترة والتنقية`; سخان/هيتر/حرارة → `التحكم بالحرارة`; كلور/معالج →
`معالجة المياه`). Returns the top category when its score is ≥ 2 and clearly
ahead, else `null` (no default: a wrong product block is worse than none).

Rendering, both paths:
- **"منتجات مرتبطة"**: up to 3 in-stock products of that category. Crawler
  path loads them in `_ssr-preview-source.ts` (one query, name/slug/thumb/
  price). SPA filters the already-cached `/api/products` list with the same
  function.
- **"أدلة مرتبطة"**: `guidesForCategory(category)` from the existing map,
  rendered through the existing `GuideLinksSection` in the SPA and the
  existing crawler markup in the shell.

Link text is the product's own name and the guide's own H1, following the
rule already documented in `shared/guide-links.ts`.

## Out of scope

Rewriting article text; `llms.txt`; guides (they already carry FAQPage);
English/Sorani translations (they inherit nothing new until the Arabic source
is reviewed); Merchant Center (Iraq unsupported).

## Testing

- Unit: `directAnswer` (boundary cases: short opener, no `<p>`, cut at
  sentence), `articleQuestions` (interrogative detection, min-two rule),
  `productCategoryForArticle` (tie → null, threshold).
- Contract: crawler HTML for a post contains the answer block, the products
  block and FAQPage only when questions exist; the SPA test for `blog-post.tsx`
  renders the same three blocks from the same fixtures.
- Live check after deploy: fetch three posts as Googlebot and as a browser and
  diff the three blocks' text.

## Rollout

One PR, no data migration, no env change. Baseline recorded by
`scripts/seo/gsc-baseline.ts` before merge; re-run 28 days after.
