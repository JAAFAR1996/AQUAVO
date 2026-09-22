import { articleReadingText } from "./article-reading.js";
import { AQUAVO_PRODUCT_CATEGORIES } from "./seo-contract.js";

/**
 * Which product category an article is about, so the post can link to the
 * products and guides that belong to it.
 *
 * Blog categories are editorial ("مشاكل وحلول", "المعدات", …) and say nothing
 * about products, so the mapping scores the eleven canonical product
 * categories by how often their vocabulary appears in the title, excerpt and
 * body. The winner must clear a floor and lead clearly; otherwise the article
 * gets no product block. A post about guppies should not push heaters.
 *
 * Same rule as shared/guide-links.ts: the link text is the product's own
 * name, and nothing here claims a product suits a particular situation.
 */

type ProductCategory = (typeof AQUAVO_PRODUCT_CATEGORIES)[number];

/** Category vocabulary. Title hits count double. Terms are matched as substrings of the normalised text. */
const CATEGORY_TERMS: Readonly<Record<ProductCategory, readonly string[]>> = Object.freeze({
  "الفلترة والتنقية": ["فلتر", "فلاتر", "الفلترة", "ميديا", "وسائط الفلتر", "اسفنج", "إسفنج", "كربون نشط", "سيراميك"],
  "التحكم بالحرارة": ["سخان", "هيتر", "درجة الحرارة", "درجة حرارة", "الحرارة", "ثرموستات", "تدفئة"],
  "معالجة المياه": ["مزيل كلور", "مزيل الكلور", "الكلور", "معالج", "بكتيريا نافعة", "البكتيريا النافعة", "مزيل طحالب", "الميثيلين", "دورة النيتروجين", "الأمونيا", "النتريت"],
  "طعام الأسماك": ["طعام", "الطعام", "علف", "العلف", "تغذية", "التغذية", "أرتيميا", "حبيبات", "رقائق"],
  "التهوية والأكسجين": ["مضخة هواء", "مضخة الهواء", "حجر هواء", "حجر الهواء", "أكسجين", "الأكسجين", "تهوية", "فقاعات", "خرطوم الهواء"],
  "تربة وديكور": ["تربة", "التربة", "رمل", "الرمل", "حصى", "حجر بركاني", "خشب", "الخشب", "ديكور", "أكواسكيب", "اكواسكيب", "الأكواسكيب", "أحجار"],
  "الصيانة والتنظيف": ["تنظيف", "التنظيف", "صيانة", "الصيانة", "سايفون", "شفاط", "مغناطيس", "منشفة", "ترسبات"],
  "الفحص والمراقبة": ["فحص", "الفحص", "اختبار", "ميزان حرارة", "ميزان الحرارة", "pH", "ph ", "قياس", "ترمومتر"],
  "العزل والتفريخ": ["عزل", "العزل", "حاضنة", "تفريخ", "التفريخ", "صغار الأسماك", "حوض العزل", "الحجر الصحي"],
  "الإضاءة": ["إضاءة", "الإضاءة", "اضاءة", "الاضاءة", "ضوء", "الضوء", "LED", "led", "لومن"],
  "أحواض": ["حوض جديد", "حجم الحوض", "حوض 60", "حوض زجاجي", "الترا كلير", "ultra clear", "سيليكون", "غطاء الحوض"],
});

/** Score floor and lead required before a category is declared. */
export const ARTICLE_CATEGORY_MIN_SCORE = 3;
export const ARTICLE_CATEGORY_MIN_LEAD = 1.5;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[ً-ْـ]/g, "").replace(/\s+/g, " ");
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

export type ArticleLike = { title?: string | null; excerpt?: string | null; content?: string | null };

/** Per-category scores, exposed for tests and for tuning the vocabulary. */
export function articleCategoryScores(article: ArticleLike): Record<string, number> {
  const title = normalise(article.title ?? "");
  const body = normalise(`${article.excerpt ?? ""} ${articleReadingText(article.content)}`);
  const scores: Record<string, number> = {};
  for (const category of AQUAVO_PRODUCT_CATEGORIES) {
    let score = 0;
    for (const term of CATEGORY_TERMS[category]) {
      const t = normalise(term);
      score += countOccurrences(title, t) * 2 + countOccurrences(body, t);
    }
    scores[category] = score;
  }
  return scores;
}

/** The product category the article is about, or null when no category clearly leads. */
export function productCategoryForArticle(article: ArticleLike): ProductCategory | null {
  const scores = articleCategoryScores(article);
  const ranked = (Object.entries(scores) as [ProductCategory, number][]).sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  if (!first || first[1] < ARTICLE_CATEGORY_MIN_SCORE) return null;
  if (second && second[1] > 0 && first[1] / second[1] < ARTICLE_CATEGORY_MIN_LEAD) return null;
  return first[0];
}

/** Heading above the product block, wherever it is rendered. */
export const RELATED_PRODUCTS_HEADING = "منتجات مرتبطة";
/** How many products an article shows. Three is a suggestion; more is a catalogue. */
export const RELATED_PRODUCTS_LIMIT = 3;

/**
 * Pick the products to show for an article from a product list: in-stock,
 * priced, same category, first three by the list's own order.
 */
export function relatedProductsForArticle<T extends { category?: string | null; stock?: string | number | null; price?: string | number | null }>(
  article: ArticleLike,
  products: readonly T[],
): T[] {
  const category = productCategoryForArticle(article);
  if (!category) return [];
  return products
    .filter((p) => p.category === category && Number(p.stock ?? 0) > 0 && Number(p.price ?? 0) > 0)
    .slice(0, RELATED_PRODUCTS_LIMIT);
}
