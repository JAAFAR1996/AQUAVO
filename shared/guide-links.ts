import { canonicalProductCategory } from "./seo-contract.js";

/**
 * Product and category listings link into the guides.
 *
 * Before this map existed, a crawler that reached a product page found no way
 * onward except back to the category and the storefront root: the 27 guides
 * were reachable only from /guides, the footer and the guides' own cross-links.
 * The catalogue and the editorial library were two islands.
 *
 * The label of each link is the guide's own <h1>, verbatim. Nothing here
 * describes a product, claims a specification, or asserts that a guide is
 * about a particular item — the mapping is category-level, which is the level
 * at which the relationship is actually true, and the link text is the guide's
 * own words rather than a sales line written around it.
 */
export const GUIDE_LINK_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "/guides/5-mistakes": "أخطاء المبتدئين بأحواض الزينة وكيف تتجنبها",
  "/guides/algae-control": "السيطرة على طحالب الحوض",
  "/guides/aquarium-decor-stones-guide": "دليل ديكور وأحجار أحواض الزينة في العراق",
  "/guides/aquarium-maintenance-checklist": "قائمة صيانة حوض السمك",
  "/guides/aquarium-salt": "ملح الأحواض: الاستخدام الصحيح",
  "/guides/aquarium-water-test-guide": "فحص ماء الحوض: الأمونيا والنتريت والنترات وpH",
  "/guides/aquarium-weekly-maintenance": "جدول صيانة أسبوعي لحوض السمك",
  "/guides/cloudy-water-causes": "ليش ماء الحوض يصير عكر؟",
  "/guides/eco-friendly": "دورة النيتروجين والعناية بالحوض",
  "/guides/essential-tools": "الأدوات الأساسية لكل صاحب حوض",
  "/guides/feeding-table": "جدول تغذية أسماك الحوض",
  "/guides/filter-choice": "كيف تختار فلتر مناسب لحوض السمك",
  "/guides/filter-maintenance": "شلون تنظف فلتر الحوض صح؟",
  "/guides/filter-media": "وسائط الفلتر وترتيبها الصحيح",
  "/guides/fish-gasping-surface": "ليش السمك يصعد للسطح؟",
  "/guides/fish-hiding": "أسباب اختفاء السمك",
  "/guides/happy-fish-signs": "علامات السمك الصحي",
  "/guides/heater-choice": "كيف تختار سخان (هيتر) مناسب لحجم الحوض",
  "/guides/new-aquarium-setup-iraq": "دليل تجهيز حوض سمك جديد في العراق خطوة بخطوة",
  "/guides/quarantine": "حوض العزل",
  "/guides/tank-rescue-plan": "خطة إنقاذ الحوض في ثلاثين يوماً",
  "/guides/temperature-guide": "درجة حرارة حوض السمك",
  "/guides/treatment-basics": "أساسيات العلاج قبل الدواء",
  "/guides/water-change-schedule": "جدول تغيير ماء الحوض",
  "/guides/water-conditioner-guide": "مزيل الكلور لماء الحوض ولماذا هو ضروري",
  "/guides/water-myths": "خرافات عن ماء الحوض",
  "/guides/white-scale": "الترسبات البيضاء على زجاج الحوض",
});

/**
 * Which guides belong on which category, keyed by the canonical category value
 * (the same eleven in AQUAVO_PRODUCT_CATEGORIES).
 *
 * Each list is short on purpose. The point is a reader who is looking at a
 * heater and wants to know what temperature to set it to, not a link farm: a
 * guide appears under a category only when someone shopping that category
 * would plausibly need it before or right after buying.
 */
export const CATEGORY_GUIDE_LINKS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "الفلترة والتنقية": Object.freeze([
    "/guides/filter-choice",
    "/guides/filter-media",
    "/guides/filter-maintenance",
    "/guides/cloudy-water-causes",
    "/guides/eco-friendly",
  ]),
  "التحكم بالحرارة": Object.freeze([
    "/guides/heater-choice",
    "/guides/temperature-guide",
    "/guides/happy-fish-signs",
    "/guides/new-aquarium-setup-iraq",
  ]),
  "الإضاءة": Object.freeze([
    "/guides/algae-control",
    "/guides/aquarium-decor-stones-guide",
    "/guides/new-aquarium-setup-iraq",
  ]),
  "معالجة المياه": Object.freeze([
    "/guides/water-conditioner-guide",
    "/guides/treatment-basics",
    "/guides/aquarium-water-test-guide",
    "/guides/aquarium-salt",
    "/guides/water-myths",
  ]),
  "طعام الأسماك": Object.freeze([
    "/guides/feeding-table",
    "/guides/happy-fish-signs",
    "/guides/5-mistakes",
    "/guides/water-change-schedule",
  ]),
  "تربة وديكور": Object.freeze([
    "/guides/aquarium-decor-stones-guide",
    "/guides/cloudy-water-causes",
    "/guides/new-aquarium-setup-iraq",
    "/guides/algae-control",
  ]),
  "التهوية والأكسجين": Object.freeze([
    "/guides/fish-gasping-surface",
    "/guides/temperature-guide",
    "/guides/happy-fish-signs",
    "/guides/eco-friendly",
  ]),
  "الصيانة والتنظيف": Object.freeze([
    "/guides/aquarium-weekly-maintenance",
    "/guides/aquarium-maintenance-checklist",
    "/guides/water-change-schedule",
    "/guides/white-scale",
    "/guides/algae-control",
  ]),
  "العزل والتفريخ": Object.freeze([
    "/guides/quarantine",
    "/guides/tank-rescue-plan",
    "/guides/fish-hiding",
    "/guides/happy-fish-signs",
  ]),
  "الفحص والمراقبة": Object.freeze([
    "/guides/aquarium-water-test-guide",
    "/guides/water-myths",
    "/guides/treatment-basics",
    "/guides/cloudy-water-causes",
  ]),
  "أحواض": Object.freeze([
    "/guides/new-aquarium-setup-iraq",
    "/guides/essential-tools",
    "/guides/5-mistakes",
    "/guides/aquarium-weekly-maintenance",
  ]),
});

export type GuideLink = { href: string; label: string };

/**
 * The guides for a category, ready to render. Accepts anything
 * canonicalProductCategory accepts, so an English alias resolves the same way
 * the category URL itself does. An unknown category yields nothing rather than
 * a default list — a page that shows guides picked for some other category is
 * worse than a page that shows none.
 */
export function guidesForCategory(category: string | null | undefined): GuideLink[] {
  const canonical = canonicalProductCategory(category);
  if (!canonical) return [];
  const paths = CATEGORY_GUIDE_LINKS[canonical];
  if (!paths) return [];
  return paths.map((href) => ({ href, label: GUIDE_LINK_LABELS[href] ?? href }));
}

/** Heading used above the block, wherever it is rendered. */
export const GUIDE_LINKS_HEADING = "أدلة مرتبطة";
