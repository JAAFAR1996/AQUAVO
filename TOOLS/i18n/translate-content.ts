/**
 * AQUAVO content translation pipeline (Arabic source -> en, ckb).
 *
 * Reads the live Arabic catalogue and blog through the public API (no database
 * credentials needed), translates every language-bearing field with an LLM
 * under a strict glossary, and writes one JSON file per locale and entity to
 * data/i18n/translations/<locale>/<entity>.json. Those files are committed and
 * later loaded into content_translations by TOOLS/i18n/seed-translations.mjs.
 *
 * Idempotent: an entry whose source_hash matches the current Arabic text is
 * skipped, so re-running only translates new or changed content. Future
 * products and articles therefore flow through the same command.
 *
 * Usage:
 *   node --env-file=.env --import tsx TOOLS/i18n/translate-content.ts [--entity=products|blog|categories] [--locale=en|ckb] [--limit=N] [--force]
 *
 * Models: the per-locale chain in TOOLS/i18n/_llm.ts (Gemini + Groq with rate-limit failover).
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  blogPostSourceFields,
  blogCategorySourceFields,
  productSourceFields,
  sourceHash,
  type BlogCategoryTranslationData,
  type BlogPostTranslationData,
  type ProductTranslationData,
} from "../../shared/i18n/content.js";
import { TRANSLATION_TARGET_LOCALES, type Locale } from "../../shared/i18n/locales.js";
import { completeJson, extractJson, loadGlossary, modelChain, normalizeDeep, renderGlossary, type TargetLocale } from "./_llm.js";
import { normalizeUnitsDeep } from "./_units.js";

const BASE = process.env.AQUAVO_SOURCE_BASE || "https://www.aquavoiq.com";
const OUT_DIR = resolve(process.env.AQUAVO_TRANSLATIONS_DIR || "data/i18n/translations");
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const ENTITY = args.entity as string | undefined;
const ONLY_LOCALE = args.locale as Locale | undefined;
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const FORCE = args.force === "true";
const CONCURRENCY = Number(args.concurrency || 3);

// ── Rules (glossary comes from shared/i18n/glossary.json) ─────────────────────
const RULES = `
You are a professional e-commerce translator for AQUAVO, an Iraqi aquarium equipment store.
Translate from Iraqi Arabic into the target language exactly as instructed.
Hard rules:
1. NEVER translate, alter, transliterate or reorder: brand names (YEE, HYGGER, Houyi, AQUAVO, Weifang Yipin, Binzhou Houyi, Seachem, etc.), model numbers, SKUs, codes like "HOB 400", "DW-01", "HG978-18W", units with numbers, measurements, prices, percentages, chemical symbols (pH, NO2), URLs.
2. NEVER change factual content: numbers, capacities, wattages, dimensions, quantities, temperatures, durations. Do not add specifications that are not in the source. Do not remove any.
3. Keep the same structure: same number of list items, same paragraphs, same HTML tags and attributes (if the source is HTML, output HTML with identical tag structure; translate only text nodes and alt/title attributes).
4. Tone: expert, calm, trustworthy, no hype, no emoji, no exclamation marks that are not in the source.
5. English: natural professional ecommerce/aquarium English. Rephrase idiomatic Iraqi Arabic naturally; do not translate word for word. Product names follow the pattern "<Brand> <Model> <Descriptive product type>", e.g. "YEE HOB 400 Hang-On-Back Filter".
6. Central Kurdish (ckb): natural Iraqi Sorani in Arabic script as used in Sulaymaniyah/Erbil. Use Sorani letters (ڕ ڵ ۆ ێ ە ڤ گ چ پ ژ ک ی). NEVER use Kurmanji, NEVER use Persian words where a common Sorani word exists, NEVER transliterate the Arabic sentence. Kurdish product names keep the brand+model in Latin letters and put the Kurdish descriptive words around them.
7. Use the glossary consistently. If a term is missing from the glossary, use the standard term aquarium hobbyists in Iraq use.
8. Output ONLY the JSON object requested, valid JSON, no markdown fences, no commentary.
9. Write all digits as Western digits (0-9), never Arabic-Indic digits.
`;

// ── Provider (shared chain) ───────────────────────────────────────────────────
interface Provider {
  name: string;
  complete(prompt: string, targetLocale: Locale): Promise<string>;
}
let lastModel = "";
function chainProvider(): Provider {
  return {
    name: "chain",
    async complete(prompt, targetLocale) {
      const locale = targetLocale as TargetLocale;
      const { text, model } = await completeJson(locale, RULES + renderGlossary(locale), prompt, { maxTokens: 16000 });
      lastModel = model;
      return text;
    },
  };
}
const usedModel = () => lastModel;

/** Retry structural failures (bad JSON, drift) with a fresh generation; rate limits are handled inside the chain. */
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      console.warn(`  retry ${i}/${attempts} for ${label}: ${(err as Error).message.slice(0, 140)}`);
    }
  }
  throw last as Error;
}
function parseJson(raw: string): Record<string, unknown> {
  return extractJson(raw) as Record<string, unknown>;
}

// ── Storage ──────────────────────────────────────────────────────────────────
interface StoredEntry<T> {
  entityId: string;
  slug?: string;
  sourceHash: string;
  translatedBy: string;
  translatedAt: string;
  data: T;
}
type Store<T> = Record<string, StoredEntry<T>>;

function storePath(locale: Locale, entity: string): string {
  return resolve(OUT_DIR, locale, `${entity}.json`);
}
function loadStore<T>(locale: Locale, entity: string): Store<T> {
  const p = storePath(locale, entity);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Store<T>) : {};
}
function saveStore<T>(locale: Locale, entity: string, store: Store<T>): void {
  mkdirSync(resolve(OUT_DIR, locale), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(store).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(storePath(locale, entity), JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

// ── Source fetch ─────────────────────────────────────────────────────────────
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json", "x-locale": "ar" } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  specifications: Record<string, unknown>;
  variants?: Array<{ id: string; label: string }> | null;
}
interface ApiPost { id: string; slug: string; title: string; excerpt: string; category: string }
interface ApiFullPost extends ApiPost { content: string }
interface ApiBlogCategory { id: string; name: string; slug: string; description?: string | null }

const LANGUAGE_NAME: Record<Locale, string> = { ar: "Arabic", en: "English", ckb: "Central Kurdish (Sorani, Arabic script)" };

// ── Translators ──────────────────────────────────────────────────────────────
async function translateProduct(provider: Provider, p: ApiProduct, locale: Locale): Promise<ProductTranslationData> {
  const src = productSourceFields(p);
  const prompt = `Target language: ${LANGUAGE_NAME[locale]}.
Translate this AQUAVO product. Brand: "${p.brand}". Category (Arabic, for context only): "${p.category}".
Return a JSON object with exactly these keys:
{
  "name": string,                       // product name, keep brand + model codes verbatim
  "description": string,                // full description, keep paragraph breaks (\\n\\n)
  "subcategory": string,                // short category label
  "seoTitle": string,                   // <= 60 chars, ends with " | AQUAVO"
  "seoDescription": string,             // 120-155 chars, factual
  "specifications": {
    "benefits": string[],               // same count as source
    "usageInstructions": string[],      // same count as source
    "safetyWarnings": string[],         // same count as source
    "__cardBenefit": string,
    "labelled": { "<arabic key>": { "label": string, "value": string } }  // one entry per key in source.labelled; translate the label; translate the value only if it is words (keep numbers/units)
  },
  "variantLabels": { "<variant id>": string } // one per source variant; translate words, keep sizes/codes
}
Source (Arabic):
${JSON.stringify(src, null, 2)}`;
  return withRetry(async () => {
  const raw = await provider.complete(prompt, locale);
  const out = normalizeUnitsDeep(normalizeDeep(parseJson(raw) as unknown as ProductTranslationData), locale as TargetLocale);
  if (!out.name || !out.description) throw new Error("incomplete product translation");
  const ss = src as Record<string, unknown>; // productSourceFields() lifts the lists to the top level
  out.specifications ??= {};
  const ts = out.specifications;
  // The source defines the structure: a list the Arabic row does not have must not be invented.
  for (const key of ["benefits", "usageInstructions", "safetyWarnings"] as const) if (!Array.isArray(ss[key]) || (ss[key] as unknown[]).length === 0) ts[key] = [];
  // Labelled specs whose value is purely technical (no Arabic letters) are copied, with the label from the glossary dictionary.
  const specLabels = (loadGlossary() as unknown as { specLabels?: Record<string, Record<string, string>> }).specLabels ?? {};
  ts.labelled ??= {};
  // Models sometimes translate the KEY instead of keeping the Arabic key: re-key extra entries onto the missing source keys by position.
  const srcKeys = Object.keys((ss.labelled ?? {}) as Record<string, unknown>);
  const extra = Object.keys(ts.labelled).filter((k) => !srcKeys.includes(k));
  for (const k of srcKeys) {
    if (ts.labelled[k]?.label) continue;
    const next = extra.shift();
    if (!next) break;
    const entry = ts.labelled[next];
    delete ts.labelled[next];
    if (entry && typeof entry === "object" && "label" in entry) ts.labelled[k] = entry;
    else ts.labelled[k] = { label: next, value: String(entry) };
  }
  for (const [k, v] of Object.entries((ss.labelled ?? {}) as Record<string, unknown>)) {
    if (ts.labelled[k]?.label) continue;
    const value = String(v);
    const label = specLabels[k]?.[locale];
    if (label && !/\p{Script=Arabic}/u.test(value)) ts.labelled[k] = { label, value };
  }
  for (const key of ["benefits", "usageInstructions", "safetyWarnings"] as const) {
    const a = Array.isArray(ss[key]) ? (ss[key] as unknown[]).length : 0;
    const b = Array.isArray(ts[key]) ? (ts[key] as unknown[]).length : 0;
    if (a !== b) throw new Error(`${key}: ${a} source items vs ${b} translated`);
  }
  const srcLabelled = (ss.labelled ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(srcLabelled)) if (!ts.labelled?.[k]?.label) throw new Error(`labelled spec "${k}" missing`);
  for (const v of p.variants ?? []) if (!out.variantLabels?.[String(v.id)]) throw new Error(`variant label "${v.id}" missing`);
  return out;
  }, `${locale}:product:${p.slug}`);
}

async function translatePost(provider: Provider, post: ApiFullPost, locale: Locale): Promise<BlogPostTranslationData> {
  const src = blogPostSourceFields(post);
  const prompt = `Target language: ${LANGUAGE_NAME[locale]}.
Translate this AQUAVO blog article. The "content" field is HTML: keep every tag, attribute and structure identical and translate only the visible text, alt and title attributes. Keep internal links (href) unchanged.
Return a JSON object with exactly these keys:
{ "title": string, "excerpt": string, "content": string, "category": string, "seoTitle": string, "seoDescription": string }
Source (Arabic):
${JSON.stringify(src, null, 2)}`;
  return withRetry(async () => {
  const raw = await provider.complete(prompt, locale);
  const out = normalizeUnitsDeep(normalizeDeep(parseJson(raw) as unknown as BlogPostTranslationData), locale as TargetLocale);
  if (!out.title || !out.content || !out.excerpt) throw new Error("incomplete post translation");
  // Body must be translated in full: same headings / list items / tables / images as the source.
  const count = (html: string, re: RegExp) => (html.match(re) || []).length;
  for (const [label, re] of [["headings", /<h[1-6]\b/gi], ["list items", /<li\b/gi], ["tables", /<table\b/gi], ["images", /<img\b/gi]] as const) {
    const a = count(post.content, re), b = count(out.content, re);
    if (a !== b) throw new Error(`${label}: ${a} in source vs ${b} translated`);
  }
  const srcWords = post.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const outWords = out.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (srcWords > 40 && outWords < srcWords * 0.5) throw new Error(`body too short: ${outWords} words vs ${srcWords} source`);
  if (/\p{Script=Arabic}/u.test(out.content.replace(/<[^>]+>/g, "")) && locale === "en") throw new Error("Arabic text left in English body");
  const srcTags = (post.content.match(/<[a-z][a-z0-9]*/gi) || []).length;
  const outTags = (out.content.match(/<[a-z][a-z0-9]*/gi) || []).length;
  if (srcTags && Math.abs(srcTags - outTags) > Math.max(2, srcTags * 0.1)) {
    throw new Error(`HTML structure drift: ${srcTags} source tags vs ${outTags} translated`);
  }
  return out;
  }, `${locale}:post:${post.slug}`);
}

async function translateBlogCategory(provider: Provider, c: ApiBlogCategory, locale: Locale): Promise<BlogCategoryTranslationData> {
  const src = blogCategorySourceFields(c);
  const prompt = `Target language: ${LANGUAGE_NAME[locale]}.
Translate this blog category. Return JSON: { "name": string, "description": string }
Source (Arabic): ${JSON.stringify(src)}`;
  return withRetry(async () => {
  const raw = await provider.complete(prompt, locale);
  const out = normalizeUnitsDeep(normalizeDeep(parseJson(raw) as unknown as BlogCategoryTranslationData), locale as TargetLocale);
  if (!out.name) throw new Error("incomplete blog category translation");
  return out;
  }, `${locale}:blogcat:${c.slug}`);
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await worker(item);
      }
    }),
  );
}

async function main(): Promise<void> {
  const provider = chainProvider();
  console.log(`models: en=${modelChain("en").map((m) => m.id).join(">")} ckb=${modelChain("ckb").map((m) => m.id).join(">")}; source: ${BASE}; out: ${OUT_DIR}`);
  const locales = (ONLY_LOCALE ? [ONLY_LOCALE] : TRANSLATION_TARGET_LOCALES) as Locale[];
  const summary: Record<string, { translated: number; skipped: number; failed: number }> = {};
  const bump = (k: string, f: "translated" | "skipped" | "failed") => {
    summary[k] ??= { translated: 0, skipped: 0, failed: 0 };
    summary[k][f]++;
  };

  if (!ENTITY || ENTITY === "products") {
    const { products } = await getJson<{ products: ApiProduct[] }>("/api/products?limit=500");
    console.log(`products: ${products.length}`);
    for (const locale of locales) {
      const store = loadStore<ProductTranslationData>(locale, "products");
      const todo = products.filter((p) => FORCE || store[p.id]?.sourceHash !== sourceHash(productSourceFields(p))).slice(0, LIMIT);
      console.log(`  ${locale}: ${todo.length} to translate, ${products.length - todo.length} up to date`);
      await runPool(todo, async (p) => {
        try {
          const data = await translateProduct(provider, p, locale);
          store[p.id] = { entityId: p.id, slug: p.slug, sourceHash: sourceHash(productSourceFields(p)), translatedBy: usedModel(), translatedAt: new Date().toISOString(), data };
          saveStore(locale, "products", store);
          bump(`${locale}/products`, "translated");
          console.log(`  ✓ ${locale} ${p.slug} -> ${data.name}`);
        } catch (err) {
          bump(`${locale}/products`, "failed");
          console.error(`  ✗ ${locale} ${p.slug}: ${(err as Error).message}`);
        }
      });
      summary[`${locale}/products`] ??= { translated: 0, skipped: 0, failed: 0 };
      summary[`${locale}/products`].skipped = products.length - todo.length;
    }
  }

  if (!ENTITY || ENTITY === "categories") {
    const cats = await getJson<ApiBlogCategory[]>("/api/blog/categories");
    for (const locale of locales) {
      const store = loadStore<BlogCategoryTranslationData>(locale, "blog_categories");
      const todo = cats.filter((c) => FORCE || store[c.id]?.sourceHash !== sourceHash(blogCategorySourceFields(c)));
      await runPool(todo, async (c) => {
        try {
          const data = await translateBlogCategory(provider, c, locale);
          store[c.id] = { entityId: c.id, slug: c.slug, sourceHash: sourceHash(blogCategorySourceFields(c)), translatedBy: usedModel(), translatedAt: new Date().toISOString(), data };
          saveStore(locale, "blog_categories", store);
          bump(`${locale}/blog_categories`, "translated");
        } catch (err) {
          bump(`${locale}/blog_categories`, "failed");
          console.error(`  ✗ ${locale} blog category ${c.slug}: ${(err as Error).message}`);
        }
      });
    }
  }

  if (!ENTITY || ENTITY === "blog") {
    const list = await getJson<ApiPost[]>("/api/blog/posts?limit=1000");
    console.log(`blog posts: ${list.length}`);
    for (const locale of locales) {
      const store = loadStore<BlogPostTranslationData>(locale, "blog_posts");
      let count = 0;
      const todo: ApiPost[] = [];
      for (const p of list) {
        if (count >= LIMIT) break;
        todo.push(p);
        count++;
      }
      await runPool(todo, async (p) => {
        try {
          const full = await getJson<ApiFullPost>(`/api/blog/posts/${encodeURIComponent(p.slug)}`);
          const hash = sourceHash(blogPostSourceFields(full));
          if (!FORCE && store[full.id]?.sourceHash === hash) {
            bump(`${locale}/blog_posts`, "skipped");
            return;
          }
          const data = await translatePost(provider, full, locale);
          store[full.id] = { entityId: full.id, slug: full.slug, sourceHash: hash, translatedBy: usedModel(), translatedAt: new Date().toISOString(), data };
          saveStore(locale, "blog_posts", store);
          bump(`${locale}/blog_posts`, "translated");
          console.log(`  ✓ ${locale} ${p.slug} -> ${data.title}`);
        } catch (err) {
          bump(`${locale}/blog_posts`, "failed");
          console.error(`  ✗ ${locale} ${p.slug}: ${(err as Error).message}`);
        }
      });
    }
  }

  console.log("\nsummary:");
  console.table(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
