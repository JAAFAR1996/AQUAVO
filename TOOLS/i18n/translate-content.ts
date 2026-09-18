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
 * Provider: ANTHROPIC_API_KEY if present (Claude), else GROQ_API_KEY (OpenAI-compatible), else GEMINI_API_KEY.
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

const BASE = process.env.AQUAVO_SOURCE_BASE || "https://www.aquavoiq.com";
const OUT_DIR = resolve("data/i18n/translations");
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const ENTITY = args.entity as string | undefined;
const ONLY_LOCALE = args.locale as Locale | undefined;
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const FORCE = args.force === "true";
const CONCURRENCY = Number(args.concurrency || 3);

// ── Glossary & rules ──────────────────────────────────────────────────────────
const GLOSSARY = `
Aquarium terminology (Arabic -> English -> Central Kurdish/Sorani):
- حوض / حوض السمك -> aquarium / tank -> حەوزی ماسی / حەوز
- فلتر -> filter -> فلتەر
- فلتر معلق (HOB) -> hang-on-back filter -> فلتەری هەڵواسراو
- فلتر إسفنجي -> sponge filter -> فلتەری ئیسفەنجی
- فلتر خارجي / داخلي -> external (canister) / internal filter -> فلتەری دەرەکی / ناوەکی
- وسائط الفلتر -> filter media -> ماددەی فلتەر
- سخان / هيتر -> heater -> گەرمکەر
- مضخة هواء -> air pump -> پەمپی هەوا
- حجر هواء -> air stone -> بەردی هەوا
- خرطوم هواء -> air tubing -> بۆری هەوا
- صمام -> valve -> ڤاڵڤ
- إضاءة LED -> LED light -> ڕووناکی LED
- ركيزة / تربة -> substrate -> خاک / بنکە
- رمل / حصى -> sand / gravel -> لم / بەردەلانک
- خشب طبيعي / جذوع -> driftwood -> داری ئاوی
- أحجار الزينة -> decorative stones -> بەردی ڕازاندنەوە
- أكواسكيب -> aquascape -> ئەکواسکەیپ
- معالج مياه / مكيف مياه -> water conditioner -> ئامادەکەری ئاو
- كلور / كلورامين -> chlorine / chloramine -> کلۆر / کلۆرامین
- أمونيا / نتريت / نترات -> ammonia / nitrite / nitrate -> ئەمۆنیا / نایترایت / نایترات
- دورة النيتروجين -> nitrogen cycle -> سووڕی نایترۆجین
- بكتيريا نافعة -> beneficial bacteria -> بەکتریای بەسوود
- تغيير الماء -> water change -> گۆڕینی ئاو
- شفاط / سيفون -> siphon / gravel vacuum -> سایفۆن
- مقياس حرارة / ثرمومتر -> thermometer -> پلەپێو
- فحص الماء / عدة فحص -> water test / test kit -> پشکنینی ئاو / کیتی پشکنین
- pH -> pH -> pH
- ملح الأحواض -> aquarium salt -> خوێی حەوز
- طعام رقائق / حبيبات -> flake / pellet food -> خۆراکی پەڕە / دەنکە
- طعام غاطس / طافي -> sinking / floating food -> خۆراکی نقووم / سەرئاو
- أسماك الزينة -> ornamental fish -> ماسی ڕازاندنەوە
- سمك ذهبي -> goldfish -> ماسی زێڕین
- بيتا -> betta -> بێتا
- جوبي -> guppy -> گۆپی
- سيكلد -> cichlid -> سیکلید
- تفريخ -> breeding -> زاوزێ
- حجر / صندوق عزل -> isolation box / breeder box -> سندوقی جیاکردنەوە
- طحالب -> algae -> کەوز
- النقطة البيضاء -> white spot (ich) -> خاڵی سپی
- لتر -> litre (L) -> لیتر
- سم -> cm -> سم
- واط -> W (watt) -> وات
- لتر/ساعة -> L/h -> لیتر/کاتژمێر
- الدفع عند الاستلام -> cash on delivery -> پارەدان لە کاتی وەرگرتن
- توصيل -> delivery -> گەیاندن
- د.ع / دينار عراقي -> IQD -> د.ع
General commerce words:
- قطعة -> piece / item -> پارچە
- طبيعي -> natural -> سروشتی
- تصميم -> design / layout -> دیزاین
- مناسب -> suitable -> گونجاو
- حجم -> size -> قەبارە
- كبير / صغير / متوسط -> large / small / medium -> گەورە / بچووک / مامناوەند
- الاستخدام -> use / usage -> بەکارهێنان
- تركيب -> installation -> دامەزراندن
- تنظيف -> cleaning -> پاککردنەوە
- صيانة -> maintenance -> چاودێری
- ضمان -> warranty -> گەرەنتی
- متوفر -> available / in stock -> بەردەستە
- الطلب -> order -> داواکاری
- الزبون / العميل -> customer -> کڕیار
- الشكل -> shape -> شێوە
- الصورة -> photo / image -> وێنە
- معاينة ثلاثية الأبعاد -> 3D preview -> پێشبینینی سێ ڕەهەندی
- تانينات -> tannins -> تانین
- بيوفيلم -> biofilm -> بایۆفیلم

Sorani style example (do this, not a literal calque):
Arabic: "اغسل الخشب وانقعه قبل الاستخدام، وقد يحتاج إلى تثبيت مؤقت حتى يتشبع بالماء."
Sorani: "پێش بەکارهێنان دارەکە بشۆ و لە ئاودا بیخوسێنە؛ لەوانەیە بۆ ماوەیەک پێویستی بە جێگیرکردنی کاتی بێت تا بە تەواوی ئاو هەڵمژێت."
English: "Wash and soak the wood before use; it may need to be weighted down temporarily until it becomes waterlogged."
`;

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
`;

// ── Providers ────────────────────────────────────────────────────────────────
interface Provider {
  name: string;
  complete(prompt: string, targetLocale: Locale): Promise<string>;
}

async function anthropicProvider(): Promise<Provider | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const model = process.env.AQUAVO_TRANSLATE_MODEL || "claude-opus-5";
  return {
    name: `claude:${model}`,
    async complete(prompt) {
      const res = await client.messages.create({
        model,
        max_tokens: 8000,
        temperature: 0.2,
        system: RULES + GLOSSARY,
        messages: [{ role: "user", content: prompt }],
      });
      return res.content.map((c) => ("text" in c ? c.text : "")).join("");
    },
  };
}

async function geminiProvider(): Promise<Provider | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = process.env.AQUAVO_TRANSLATE_MODEL || "gemini-2.5-pro";
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: RULES + GLOSSARY,
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
  });
  return {
    name: `gemini:${modelName}`,
    async complete(prompt) {
      const res = await model.generateContent(prompt);
      return res.response.text();
    },
  };
}

async function groqProvider(): Promise<Provider | null> {
  if (!process.env.GROQ_API_KEY) return null;
  const model = process.env.AQUAVO_TRANSLATE_MODEL || "openai/gpt-oss-120b";
  return {
    name: `groq:${model}`,
    async complete(prompt) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: RULES + GLOSSARY },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      return json.choices[0]?.message?.content ?? "";
    },
  };
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const PACE_MS = Number(process.env.AQUAVO_TRANSLATE_PACE_MS || 2500);
let lastCallAt = 0;
async function pace(): Promise<void> {
  const wait = lastCallAt + PACE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 8): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      await pace();
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String((err as Error).message || "");
      // Groq reports the cooldown in the body ("try again in 12.3s"); honour it.
      const hinted = /try again in ([0-9.]+)s/i.exec(msg);
      const wait = hinted ? Math.ceil(parseFloat(hinted[1]) * 1000) + 1000 : Math.min(60000, 3000 * 2 ** (i - 1));
      console.warn(`  retry ${i}/${attempts} for ${label} in ${wait}ms: ${(err as Error).message?.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
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
  const raw = await withRetry(() => provider.complete(prompt, locale), `${locale}:product:${p.slug}`);
  const out = parseJson(raw) as unknown as ProductTranslationData;
  if (!out.name || !out.description) throw new Error("incomplete product translation");
  return out;
}

async function translatePost(provider: Provider, post: ApiFullPost, locale: Locale): Promise<BlogPostTranslationData> {
  const src = blogPostSourceFields(post);
  const prompt = `Target language: ${LANGUAGE_NAME[locale]}.
Translate this AQUAVO blog article. The "content" field is HTML: keep every tag, attribute and structure identical and translate only the visible text, alt and title attributes. Keep internal links (href) unchanged.
Return a JSON object with exactly these keys:
{ "title": string, "excerpt": string, "content": string, "category": string, "seoTitle": string, "seoDescription": string }
Source (Arabic):
${JSON.stringify(src, null, 2)}`;
  const raw = await withRetry(() => provider.complete(prompt, locale), `${locale}:post:${post.slug}`);
  const out = parseJson(raw) as unknown as BlogPostTranslationData;
  if (!out.title || !out.content) throw new Error("incomplete post translation");
  const srcTags = (post.content.match(/<[a-z][a-z0-9]*/gi) || []).length;
  const outTags = (out.content.match(/<[a-z][a-z0-9]*/gi) || []).length;
  if (srcTags && Math.abs(srcTags - outTags) > Math.max(2, srcTags * 0.1)) {
    throw new Error(`HTML structure drift: ${srcTags} source tags vs ${outTags} translated`);
  }
  return out;
}

async function translateBlogCategory(provider: Provider, c: ApiBlogCategory, locale: Locale): Promise<BlogCategoryTranslationData> {
  const src = blogCategorySourceFields(c);
  const prompt = `Target language: ${LANGUAGE_NAME[locale]}.
Translate this blog category. Return JSON: { "name": string, "description": string }
Source (Arabic): ${JSON.stringify(src)}`;
  const raw = await withRetry(() => provider.complete(prompt, locale), `${locale}:blogcat:${c.slug}`);
  return parseJson(raw) as unknown as BlogCategoryTranslationData;
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
  const provider = (await anthropicProvider()) ?? (await groqProvider()) ?? (await geminiProvider());
  if (!provider) throw new Error("Set ANTHROPIC_API_KEY or GEMINI_API_KEY");
  console.log(`provider: ${provider.name}; source: ${BASE}; out: ${OUT_DIR}`);
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
          store[p.id] = { entityId: p.id, slug: p.slug, sourceHash: sourceHash(productSourceFields(p)), translatedBy: provider.name, translatedAt: new Date().toISOString(), data };
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
          store[c.id] = { entityId: c.id, slug: c.slug, sourceHash: sourceHash(blogCategorySourceFields(c)), translatedBy: provider.name, translatedAt: new Date().toISOString(), data };
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
          store[full.id] = { entityId: full.id, slug: full.slug, sourceHash: hash, translatedBy: provider.name, translatedAt: new Date().toISOString(), data };
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
