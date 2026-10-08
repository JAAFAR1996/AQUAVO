export type StorefrontLocale = "ar" | "en" | "ckb";

const BUNDLE_COPY: Record<string, Record<StorefrontLocale, { name: string; description: string }>> = {
  "betta-care-starter": {
    ar: { name: "باقة بداية البيتا", description: "أساسيات الرعاية اليومية للبيتا بدون شراء قطع غير ضرورية." },
    en: { name: "Betta Care Starter", description: "Daily betta-care essentials without unnecessary extras." },
    ckb: { name: "پاکێجی دەستپێکی بێتا", description: "پێداویستییە سەرەکییەکانی چاودێری ڕۆژانەی بێتا بەبێ کڕینی شتی ناپێویست." },
  },
  "guppy-starter": {
    ar: { name: "باقة بداية الجوبي", description: "فلترة وتهوية وطعام ومعالجة ماء مناسبة كبداية لحوض جوبي." },
    en: { name: "Guppy Starter", description: "Filtration, aeration, food and water-care essentials for a guppy tank." },
    ckb: { name: "پاکێجی دەستپێکی گوپی", description: "فلتەر، هەواگۆڕکێ، خواردن و چاودێری ئاو بۆ دەستپێکی حەوزی گوپی." },
  },
  "planted-tank-starter": {
    ar: { name: "باقة بداية الحوض المزروع", description: "مواد تأسيس وعناية بالأكواسكيب والنباتات." },
    en: { name: "Planted Tank Starter", description: "Core setup and maintenance supplies for a planted aquascape." },
    ckb: { name: "پاکێجی دەستپێکی حەوزی ڕووەکدار", description: "کەرەستە سەرەکییەکانی دامەزراندن و چاودێری ئەکواسکەیپ و ڕووەک." },
  },
  "filter-maintenance-pack": {
    ar: { name: "باقة صيانة الفلتر", description: "مواد وأدوات أساسية لصيانة الفلتر والخراطيم." },
    en: { name: "Filter Maintenance Pack", description: "Core media and tools for filter and hose maintenance." },
    ckb: { name: "پاکێجی چاکسازی فلتەر", description: "ماددە و ئامرازی سەرەکی بۆ پاککردنەوە و چاکسازی فلتەر و هۆز." },
  },
  "water-testing-pack": {
    ar: { name: "باقة فحص ومراقبة الماء", description: "فحص سريع ومراقبة حرارة الحوض مع أساسيات معالجة الماء." },
    en: { name: "Water Testing Pack", description: "Quick water testing, temperature monitoring and basic water care." },
    ckb: { name: "پاکێجی پشکنین و چاودێری ئاو", description: "پشکنینی خێرای ئاو، چاودێری پلەی گەرمی و بنەمای چاودێری ئاو." },
  },
  "safe-water-change-pack": {
    ar: { name: "باقة تغيير الماء الآمن", description: "سيفون لتغيير الماء + مزيل كلور + فحص سريع، حتى تكمل الصيانة الأساسية بطلب واحد." },
    en: { name: "Safe Water Change Pack", description: "Siphon + dechlorinator + quick water test for the core water-change routine in one order." },
    ckb: { name: "پاکێجی گۆڕینی ئاوی پارێزراو", description: "سایفۆن + لابەری کلۆر + پشکنینی خێرا بۆ ڕوتینی سەرەکی گۆڕینی ئاو لە یەک داواکاری." },
  },
};

export function getBundleCopy(
  slug: string,
  locale: string,
  fallbackName: string,
  fallbackDescription: string,
): { name: string; description: string } {
  const safeLocale: StorefrontLocale = locale === "en" || locale === "ckb" ? locale : "ar";
  return BUNDLE_COPY[slug]?.[safeLocale] ?? { name: fallbackName, description: fallbackDescription };
}
