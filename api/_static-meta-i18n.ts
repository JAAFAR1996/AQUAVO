/**
 * English and Central Kurdish <title>/<meta description> for the static,
 * indexable pages. Arabic stays in api/ssr-meta.ts (STATIC_PAGES) and
 * api/_seo-content.ts, which remain the source of truth for that locale.
 *
 * A path missing here for a locale falls back to the site default title for
 * that locale and is reported by TOOLS/i18n/audit.ts as missing metadata.
 */
import type { Locale } from "../shared/i18n/locales.js";

export interface LocalizedStaticMeta {
  title: string;
  description: string;
  keywords?: string;
}

const EN: Record<string, LocalizedStaticMeta> = {
  "/": {
    title: "AQUAVO — Aquarium Equipment & Supplies in Iraq | Filters, Heaters, Food",
    description:
      "AQUAVO is an Iraqi online store for aquarium equipment and supplies: filters, heaters, food, glass tanks, LED lighting, decor and water treatments. Delivery to every governorate, cash on delivery or online payment.",
    keywords: "aquarium supplies Iraq, aquarium filters Baghdad, aquarium heaters, YEE aquarium equipment Iraq, glass tanks Iraq, aquarium water treatment, fish food Iraq",
  },
  "/products": {
    title: "Aquarium Supplies in Iraq — Filters, Heaters, Food | AQUAVO",
    description: "Shop every aquarium supply in Iraq: filters, heaters, food, treatments, LED lighting, decor and more. YEE and other brands, clear prices and delivery to every governorate.",
  },
  "/deals": {
    title: "Aquarium Equipment Deals and Discounts in Iraq | AQUAVO",
    description: "Follow AQUAVO deals on aquarium equipment and supplies as stock allows, with clear prices and delivery across Iraq.",
  },
  "/blog": {
    title: "Aquarium Blog — Care and Equipment Tips for Iraq | AQUAVO",
    description: "Articles and specialist tips on aquariums in Iraq: equipment care, water treatment, filters and heaters, and practical routines for beginners and experienced keepers.",
  },
  "/guides": {
    title: "AQUAVO Aquarium Guides — Practical Care in Iraq | AQUAVO",
    description: "Step-by-step guides on setting up and maintaining an aquarium in Iraq: filters, heaters, water changes, feeding, algae and common mistakes.",
  },
  "/fish-encyclopedia": {
    title: "Ornamental Fish Encyclopedia — Species Kept in Iraq | AQUAVO",
    description: "An educational encyclopedia of ornamental fish species kept in Iraq with feeding, temperature, compatibility and care notes for each one.",
  },
  "/journey": {
    title: "Your Aquarium Journey — A Complete Plan for an Aquarium in Iraq | AQUAVO",
    description: "Start your aquarium journey with AQUAVO. Personalised step-by-step plans to build the right aquarium from scratch. A complete Iraqi guide for beginners.",
  },
  "/calculators": {
    title: "Aquarium Calculators — Tank Volume, Filter and Heater Sizing | AQUAVO",
    description: "Free calculators for aquarium keepers in Iraq: tank volume, required filter flow, heater wattage, water volume and how many fish fit your tank.",
  },
  "/fish-finder": {
    title: "Find Ornamental Fish That Suit Your Tank in Iraq | AQUAVO",
    description: "A smart tool to find ornamental fish that suit your tank by size, temperature and compatibility. Find the right fish with AQUAVO Iraq.",
  },
  "/fish-health": {
    title: "Diagnosing and Treating Ornamental Fish Diseases in Iraq | AQUAVO",
    description: "Identify ornamental fish diseases and get a suitable treatment plan. A complete guide to common fish diseases in Iraq: white spot, fungus, fin rot and more.",
  },
  "/fish-health-diagnosis": {
    title: "Fish Symptom Organiser | AQUAVO",
    description: "A guidance tool to organise symptoms and information before acting or consulting a specialist.",
  },
  "/beginner-guide": {
    title: "Beginner's Guide to Keeping Ornamental Fish in Iraq | AQUAVO",
    description: "A complete beginner's guide to keeping ornamental fish in Iraq. From choosing the tank and filter to adding fish and daily care. Everything you need to start the hobby in Baghdad.",
  },
  "/fish-compatibility": {
    title: "Ornamental Fish Compatibility — Which Fish Live Together | AQUAVO",
    description: "Learn which ornamental fish live together peacefully in Iraq and which must be kept apart. Guppy, betta, cichlids, neon tetra and more.",
  },
  "/tank-builder": {
    title: "Aquarium Builder — Design Your Ideal Tank Online | AQUAVO",
    description: "Design your ideal aquarium step by step online. Choose the size, filter, heater and decor with AQUAVO Iraq's smart tank builder.",
  },
  "/aquarium-wizard": {
    title: "Aquarium Wizard — Plan Your Tank Step by Step | AQUAVO",
    description: "Answer a few questions about your space and goals and get a matching aquarium plan with the equipment it needs.",
  },
  "/community-gallery": {
    title: "Aquarium Gallery — AQUAVO Customer Tanks in Iraq",
    description: "See the most beautiful aquariums from AQUAVO customers in Iraq. Share a photo of your tank and inspire other keepers in Baghdad and across Iraq.",
  },
  "/faq": {
    title: "Frequently Asked Questions About Aquariums in Iraq | AQUAVO",
    description: "Answers to the most common questions about keeping ornamental fish in Iraq, aquarium care, delivery and ordering from AQUAVO.",
  },
  "/shipping": {
    title: "Aquarium Supply Delivery Across Iraq | AQUAVO",
    description: "Delivery of aquarium supplies to every governorate in Iraq for a flat 5,000 IQD fee, within 24 hours.",
  },
  "/terms": {
    title: "Terms and Conditions — AQUAVO Aquarium Supplies",
    description: "Terms and conditions for using and buying from the AQUAVO aquarium supplies store in Iraq.",
  },
  "/privacy-policy": {
    title: "Privacy Policy — AQUAVO Aquarium Supplies",
    description: "Privacy policy and customer data protection at the AQUAVO aquarium supplies store.",
  },
  "/return-policy": {
    title: "Returns and Exchange Policy — AQUAVO Iraq",
    description: "Product return and exchange policy at the AQUAVO store. Customer satisfaction and consumer rights in Iraq.",
  },
  "/about": {
    title: "About Us — AQUAVO Aquarium Supplies Store in Iraq",
    description: "AQUAVO is an Iraqi brand and store specialising in premium aquarium equipment and supplies, with delivery across Iraq and cash on delivery.",
  },
  "/about-aquavo": {
    title: "About Us — AQUAVO Aquarium Supplies Store in Iraq",
    description: "AQUAVO is an Iraqi brand and store specialising in premium aquarium equipment and supplies, with delivery across Iraq and cash on delivery.",
  },
  "/why-aquavo": {
    title: "Why AQUAVO — A Premium Aquarium Supplies Store in Iraq",
    description: "Why do aquarium keepers in Iraq choose AQUAVO? Genuine products as available, delivery to every governorate, technical support and clear prices.",
  },
  "/contact": {
    title: "Contact AQUAVO | AQUAVO",
    description: "Get in touch about orders or choosing equipment that matches your tank size.",
  },
  "/fish-breeding-calculator": {
    title: "Ornamental Fish Breeding Calculator | AQUAVO",
    description: "An educational tool to organise breeding data and follow-up by species and recorded conditions.",
  },
  "/sustainability": {
    title: "Sustainability at AQUAVO — Responsible Aquarium Keeping in Iraq",
    description: "How AQUAVO approaches responsible aquarium keeping: efficient equipment, less waste and honest guidance.",
  },
  "/ai-tools": {
    title: "AI Aquarium Tools | AQUAVO",
    description: "Assistant tools to plan, diagnose and maintain your aquarium.",
  },
  "/invest": {
    title: "Invest in AQUAVO | AQUAVO",
    description: "Information for partners and investors interested in AQUAVO.",
  },
};

const CKB: Record<string, LocalizedStaticMeta> = {
  "/": {
    title: "AQUAVO — کەرەستە و پێداویستییەکانی حەوزی ماسی لە عێراق | فلتەر، گەرمکەر، خۆراک",
    description:
      "AQUAVO فرۆشگایەکی ئۆنلاینی عێراقییە بۆ کەرەستە و پێداویستییەکانی حەوزی ماسی: فلتەر، گەرمکەر، خۆراک، حەوزی شووشەیی، ڕووناکی LED، ڕازاندنەوە و چارەسەری ئاو. گەیاندن بۆ هەموو پارێزگاکان، پارەدان لە کاتی وەرگرتن یان ئەلیکترۆنی.",
    keywords: "پێداویستی حەوزی ماسی عێراق، فلتەری حەوز بەغدا، گەرمکەری حەوز، کەرەستەی YEE عێراق، حەوزی شووشەیی، چارەسەری ئاوی حەوز، خۆراکی ماسی",
  },
  "/products": {
    title: "پێداویستییەکانی حەوزی ماسی لە عێراق — فلتەر، گەرمکەر، خۆراک | AQUAVO",
    description: "هەموو پێداویستییەکانی حەوزی ماسی لە عێراق بکڕە: فلتەر، گەرمکەر، خۆراک، چارەسەر، ڕووناکی LED، ڕازاندنەوە و زیاتر. براندی YEE و براندەکانی تر، نرخی ڕوون و گەیاندن بۆ هەموو پارێزگاکان.",
  },
  "/deals": {
    title: "ئۆفەر و داشکاندنی کەرەستەی حەوزی ماسی لە عێراق | AQUAVO",
    description: "ئۆفەرەکانی AQUAVO لەسەر کەرەستە و پێداویستییەکانی حەوزی ماسی بەپێی بەردەستی، لەگەڵ نرخی ڕوون و گەیاندن بۆ هەموو عێراق.",
  },
  "/blog": {
    title: "بلۆگی حەوزی ماسی — ڕێنمایی چاودێری و کەرەستە لە عێراق | AQUAVO",
    description: "وتار و ڕێنمایی پسپۆڕانە دەربارەی حەوزی ماسی لە عێراق: چاودێری کەرەستە، چارەسەری ئاو، فلتەر و گەرمکەر، و ڕێوشوێنی کرداری بۆ سەرەتایی و شارەزا.",
  },
  "/guides": {
    title: "ڕێنماییەکانی AQUAVO بۆ حەوزی ماسی — چاودێری کرداری لە عێراق | AQUAVO",
    description: "ڕێنمایی هەنگاو بە هەنگاو بۆ ئامادەکردن و چاودێری حەوزی ماسی لە عێراق: فلتەر، گەرمکەر، گۆڕینی ئاو، خۆراکدان، کەوز و هەڵە باوەکان.",
  },
  "/fish-encyclopedia": {
    title: "ئینسایکلۆپیدیای ماسی ڕازاندنەوە — جۆرەکانی بەردەست لە عێراق | AQUAVO",
    description: "ئینسایکلۆپیدیایەکی فێرکاری بۆ جۆرەکانی ماسی ڕازاندنەوە لە عێراق لەگەڵ زانیاری خۆراکدان، پلەی گەرمی، گونجان و چاودێری بۆ هەر جۆرێک.",
  },
  "/journey": {
    title: "گەشتی حەوزەکەت — پلانێکی تەواو بۆ حەوزی ماسی لە عێراق | AQUAVO",
    description: "گەشتی حەوزەکەت لەگەڵ AQUAVO دەست پێ بکە. پلانی تایبەت هەنگاو بە هەنگاو بۆ دروستکردنی حەوزی گونجاو لە سفرەوە. ڕێنماییەکی عێراقی تەواو بۆ سەرەتاییەکان.",
  },
  "/calculators": {
    title: "ژمێرەرەکانی حەوزی ماسی — قەبارەی حەوز، فلتەر و گەرمکەر بە خۆڕایی | AQUAVO",
    description: "ژمێرەری خۆڕایی بۆ خاوەن حەوز لە عێراق: قەبارەی حەوز، هێزی فلتەری پێویست، واتی گەرمکەر، بڕی ئاو و ژمارەی ماسی گونجاو بۆ حەوزەکەت.",
  },
  "/fish-finder": {
    title: "دۆزینەوەی ماسی ڕازاندنەوەی گونجاو بۆ حەوزەکەت لە عێراق | AQUAVO",
    description: "ئامرازێکی زیرەک بۆ دۆزینەوەی ماسی گونجاو بۆ حەوزەکەت بەپێی قەبارە، پلەی گەرمی و گونجان. ماسی گونجاو لەگەڵ AQUAVO عێراق بدۆزەوە.",
  },
  "/fish-health": {
    title: "ناسینەوە و چارەسەری نەخۆشییەکانی ماسی ڕازاندنەوە لە عێراق | AQUAVO",
    description: "نەخۆشییەکانی ماسی ڕازاندنەوە بناسەوە و پلانی چارەسەری گونجاو وەربگرە. ڕێنماییەکی تەواو بۆ نەخۆشییە باوەکان لە عێراق: خاڵی سپی، کەڕوو، ڕزینی پەڕ و زیاتر.",
  },
  "/fish-health-diagnosis": {
    title: "ڕێکخەری نیشانەکانی ماسی | AQUAVO",
    description: "ئامرازێکی ڕێنمایی بۆ ڕێکخستنی نیشانە و زانیارییەکان پێش هەنگاونان یان ڕاوێژکردن لەگەڵ پسپۆڕ.",
  },
  "/beginner-guide": {
    title: "ڕێنمایی سەرەتاییەکان بۆ بەخێوکردنی ماسی ڕازاندنەوە لە عێراق | AQUAVO",
    description: "ڕێنماییەکی تەواو بۆ سەرەتاییەکان لە بەخێوکردنی ماسی ڕازاندنەوە لە عێراق. لە هەڵبژاردنی حەوز و فلتەرەوە تا زیادکردنی ماسی و چاودێری ڕۆژانە.",
  },
  "/fish-compatibility": {
    title: "گونجانی ماسی ڕازاندنەوە — کام ماسی پێکەوە دەژین | AQUAVO",
    description: "بزانە کام ماسی ڕازاندنەوە بە ئاشتی پێکەوە دەژین لە عێراق و کامیان دەبێت جیا بکرێنەوە. گۆپی، بێتا، سیکلید، نیۆن تیترا و زیاتر.",
  },
  "/tank-builder": {
    title: "دیزاینەری حەوزی ماسی — حەوزی نموونەییت ئۆنلاین دیزاین بکە | AQUAVO",
    description: "حەوزی ماسی نموونەییت هەنگاو بە هەنگاو ئۆنلاین دیزاین بکە. قەبارە، فلتەر، گەرمکەر و ڕازاندنەوە لەگەڵ دیزاینەری زیرەکی AQUAVO عێراق هەڵبژێرە.",
  },
  "/aquarium-wizard": {
    title: "یاریدەدەری حەوز — هەنگاو بە هەنگاو حەوزەکەت پلان بکە | AQUAVO",
    description: "چەند پرسیارێک دەربارەی شوێن و ئامانجەکانت وەڵام بدەوە و پلانی حەوزێکی گونجاو لەگەڵ کەرەستە پێویستەکانی وەربگرە.",
  },
  "/community-gallery": {
    title: "پێشانگای حەوزی ماسی — حەوزەکانی کڕیارانی AQUAVO لە عێراق",
    description: "جوانترین حەوزەکانی ماسی کڕیارانی AQUAVO لە عێراق ببینە. وێنەی حەوزەکەت هاوبەش بکە و ئیلهام بە خاوەن حەوزەکانی تر ببەخشە لە بەغدا و عێراق.",
  },
  "/faq": {
    title: "پرسیارە باوەکان دەربارەی حەوزی ماسی لە عێراق | AQUAVO",
    description: "وەڵامی باوترین پرسیارەکان دەربارەی بەخێوکردنی ماسی ڕازاندنەوە لە عێراق، چاودێری حەوز، گەیاندن و داواکردن لە AQUAVO.",
  },
  "/shipping": {
    title: "گەیاندنی پێداویستییەکانی حەوز بۆ هەموو عێراق | AQUAVO",
    description: "خزمەتگوزاری گەیاندنی پێداویستییەکانی حەوز بۆ هەموو پارێزگاکانی عێراق بە کرێی جێگیری 5,000 دینار و گەیاندن لە ماوەی 24 کاتژمێردا.",
  },
  "/terms": {
    title: "مەرج و ڕێساکان — AQUAVO پێداویستییەکانی حەوزی ماسی",
    description: "مەرج و ڕێساکانی بەکارهێنان و کڕین لە فرۆشگای AQUAVO بۆ پێداویستییەکانی حەوزی ماسی لە عێراق.",
  },
  "/privacy-policy": {
    title: "سیاسەتی تایبەتمەندی — AQUAVO پێداویستییەکانی حەوزی ماسی",
    description: "سیاسەتی تایبەتمەندی و پاراستنی زانیاری کڕیاران لە فرۆشگای AQUAVO.",
  },
  "/return-policy": {
    title: "سیاسەتی گەڕاندنەوە و گۆڕینەوە — AQUAVO عێراق",
    description: "سیاسەتی گەڕاندنەوە و گۆڕینەوەی بەرهەمەکان لە فرۆشگای AQUAVO. ڕەزامەندی کڕیار و مافەکانی بەکاربەر لە عێراق.",
  },
  "/about": {
    title: "ئێمە کێین — AQUAVO فرۆشگای پێداویستییەکانی حەوزی ماسی لە عێراق",
    description: "AQUAVO براند و فرۆشگایەکی عێراقییە پسپۆڕ لە کەرەستە و پێداویستییە پرێمیەمەکانی حەوزی ماسی، لەگەڵ گەیاندن بۆ هەموو عێراق و پارەدان لە کاتی وەرگرتن.",
  },
  "/about-aquavo": {
    title: "ئێمە کێین — AQUAVO فرۆشگای پێداویستییەکانی حەوزی ماسی لە عێراق",
    description: "AQUAVO براند و فرۆشگایەکی عێراقییە پسپۆڕ لە کەرەستە و پێداویستییە پرێمیەمەکانی حەوزی ماسی، لەگەڵ گەیاندن بۆ هەموو عێراق و پارەدان لە کاتی وەرگرتن.",
  },
  "/why-aquavo": {
    title: "بۆچی AQUAVO — فرۆشگایەکی پرێمیەم بۆ پێداویستییەکانی حەوز لە عێراق",
    description: "بۆچی خاوەن حەوزەکان لە عێراق AQUAVO هەڵدەبژێرن؟ بەرهەمی ڕەسەن بەپێی بەردەستی، گەیاندن بۆ هەموو پارێزگاکان، پشتگیری تەکنیکی و نرخی ڕوون.",
  },
  "/contact": {
    title: "پەیوەندی بە AQUAVO | AQUAVO",
    description: "بۆ پرسیار دەربارەی داواکاری یان هەڵبژاردنی کەرەستەی گونجاو لەگەڵ قەبارەی حەوزەکەت پەیوەندیمان پێوە بکە.",
  },
  "/fish-breeding-calculator": {
    title: "ژمێرەری زاوزێی ماسی ڕازاندنەوە | AQUAVO",
    description: "ئامرازێکی فێرکاری بۆ ڕێکخستنی زانیاری زاوزێ و بەدواداچوون بەپێی جۆر و بارودۆخی تۆمارکراو.",
  },
  "/sustainability": {
    title: "بەردەوامی لە AQUAVO — بەخێوکردنی بەرپرسیارانەی ماسی لە عێراق",
    description: "چۆن AQUAVO لە بەخێوکردنی بەرپرسیارانەی ماسی دەڕوانێت: کەرەستەی کارا، پاشماوەی کەمتر و ڕێنمایی ڕاستگۆیانە.",
  },
  "/ai-tools": {
    title: "ئامرازە زیرەکەکانی حەوزی ماسی | AQUAVO",
    description: "ئامرازی یاریدەدەر بۆ پلانکردن، ناسینەوەی نەخۆشی و چاودێری حەوزەکەت.",
  },
  "/invest": {
    title: "وەبەرهێنان لە AQUAVO | AQUAVO",
    description: "زانیاری بۆ هاوبەش و وەبەرهێنەرانی ئارەزوومەند بە AQUAVO.",
  },
};

const BY_LOCALE: Partial<Record<Locale, Record<string, LocalizedStaticMeta>>> = { en: EN, ckb: CKB };

export function getLocalizedStaticMeta(locale: Locale, path: string): LocalizedStaticMeta | undefined {
  const table = BY_LOCALE[locale];
  if (!table) return undefined;
  const clean = path.replace(/\/+$/, "") || "/";
  return table[clean];
}

/** Paths that have localized static metadata for a locale (for the coverage audit). */
export function localizedStaticMetaPaths(locale: Locale): string[] {
  return Object.keys(BY_LOCALE[locale] ?? {});
}
