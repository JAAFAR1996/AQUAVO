/**
 * Localized names for the eleven canonical product categories.
 *
 * The Arabic string is the category's identity everywhere (database column,
 * `/products?category=` URLs, sitemaps, structured data), so it is never
 * translated in data. Only its *display* changes with the locale. Keeping the
 * table in code next to AQUAVO_PRODUCT_CATEGORIES means a new category is a
 * compile error until it has all three names.
 */
import { AQUAVO_PRODUCT_CATEGORIES, canonicalProductCategory } from "../seo-contract.js";
import { DEFAULT_LOCALE, type Locale } from "./locales.js";

type CanonicalCategory = (typeof AQUAVO_PRODUCT_CATEGORIES)[number];

type TargetLocale = Exclude<Locale, typeof DEFAULT_LOCALE>;
const CATEGORY_NAMES: Record<CanonicalCategory, Record<TargetLocale, string>> = {
  "تربة وديكور": { en: "Substrate & Decor", ckb: "خاک و ڕازاندنەوە" },
  "الفلترة والتنقية": { en: "Filtration", ckb: "فلتەرکردن و پاککردنەوە" },
  "التهوية والأكسجين": { en: "Aeration & Oxygen", ckb: "هەواگۆڕکێ و ئۆکسجین" },
  "طعام الأسماك": { en: "Fish Food", ckb: "خۆراکی ماسی" },
  "معالجة المياه": { en: "Water Treatment", ckb: "چارەسەری ئاو" },
  "الصيانة والتنظيف": { en: "Maintenance & Cleaning", ckb: "چاودێری و پاککردنەوە" },
  "العزل والتفريخ": { en: "Quarantine & Breeding", ckb: "جیاکردنەوە و زاوزێ" },
  "الفحص والمراقبة": { en: "Testing & Monitoring", ckb: "پشکنین و چاودێری" },
  "التحكم بالحرارة": { en: "Heating & Temperature", ckb: "کۆنترۆڵی گەرمی" },
  "أحواض": { en: "Aquariums", ckb: "حەوزەکان" },
  "الإضاءة": { en: "Lighting", ckb: "ڕووناکی" },
};

/** Display name of a category for a locale. Unknown values are returned unchanged. */
export function localizeCategoryName(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  const canonical = canonicalProductCategory(value) ?? value;
  if (locale === DEFAULT_LOCALE) return canonical;
  const entry = CATEGORY_NAMES[canonical as CanonicalCategory];
  return entry?.[locale] ?? canonical;
}

/** Every canonical category with its display name in a locale, in catalogue order. */
export function localizedCategoryList(locale: Locale): Array<{ value: string; label: string }> {
  return AQUAVO_PRODUCT_CATEGORIES.map((value) => ({ value, label: localizeCategoryName(value, locale) }));
}

/** Localized short description shown on category listing headers. */
const CATEGORY_DESCRIPTIONS: Record<TargetLocale, Partial<Record<CanonicalCategory, string>>> = {
  en: {
    "تربة وديكور": "Substrates, driftwood and stones that shape a natural aquascape.",
    "الفلترة والتنقية": "Filters and media that keep water clear and biologically stable.",
    "التهوية والأكسجين": "Air pumps, stones and tubing for oxygen and water movement.",
    "طعام الأسماك": "Staple and specialty foods matched to the fish you keep.",
    "معالجة المياه": "Conditioners and treatments for safe, stable water.",
    "الصيانة والتنظيف": "Tools for water changes, glass and substrate cleaning.",
    "العزل والتفريخ": "Isolation boxes and breeding equipment.",
    "الفحص والمراقبة": "Test kits and thermometers to know what your water is doing.",
    "التحكم بالحرارة": "Heaters and controllers for a steady temperature.",
    "أحواض": "Tanks and complete aquarium sets.",
    "الإضاءة": "LED lighting for plants, colour and daily rhythm.",
  },
  ckb: {
    "تربة وديكور": "خاک، داری ئاوی و بەرد بۆ دروستکردنی دیمەنێکی سروشتی لە حەوز.",
    "الفلترة والتنقية": "فلتەر و ماددەی فلتەر کە ئاو ڕوون و بایۆلۆژی جێگیر دەهێڵنەوە.",
    "التهوية والأكسجين": "پەمپی هەوا، بەردی هەوا و بۆری بۆ ئۆکسجین و جوڵەی ئاو.",
    "طعام الأسماك": "خۆراکی سەرەکی و تایبەت گونجاو لەگەڵ ماسییەکانت.",
    "معالجة المياه": "چارەسەر و ئامادەکەرەکانی ئاو بۆ ئاوێکی سەلامەت و جێگیر.",
    "الصيانة والتنظيف": "ئامرازەکانی گۆڕینی ئاو و پاککردنەوەی شووشە و خاک.",
    "العزل والتفريخ": "سندوقی جیاکردنەوە و کەرەستەی زاوزێ.",
    "الفحص والمراقبة": "کیتی پشکنین و پلەپێو بۆ زانینی باری ئاوەکەت.",
    "التحكم بالحرارة": "گەرمکەر و کۆنترۆڵەر بۆ پلەی گەرمی جێگیر.",
    "أحواض": "حەوز و سێتی تەواوی حەوزی ماسی.",
    "الإضاءة": "ڕووناکی LED بۆ ڕووەک، ڕەنگ و ڕیتمی ڕۆژانە.",
  },
};

export function localizedCategoryDescription(value: string, locale: Locale): string | undefined {
  if (locale === DEFAULT_LOCALE) return undefined;
  const canonical = canonicalProductCategory(value) ?? value;
  return CATEGORY_DESCRIPTIONS[locale][canonical as CanonicalCategory];
}
