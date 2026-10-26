/** Display-only localization. Original specification keys/values remain selection identities. */
const LABELS: Record<string, {en: string; ckb: string}> = {
  "الحجم": {
    "en": "Size",
    "ckb": "قەبارە"
  },
  "الوزن": {
    "en": "Weight",
    "ckb": "کێش"
  },
  "القدرة": {
    "en": "Power",
    "ckb": "هێز"
  },
  "القطر": {
    "en": "Diameter",
    "ckb": "تیرە"
  },
  "النوع": {
    "en": "Type",
    "ckb": "جۆر"
  },
  "الأبعاد": {
    "en": "Dimensions",
    "ckb": "ڕەهەندەکان"
  },
  "القياسات": {
    "en": "Measurements",
    "ckb": "پێوانەکان"
  },
  "المقاس": {
    "en": "Size",
    "ckb": "قەبارە"
  },
  "الموديل": {
    "en": "Model",
    "ckb": "مۆدێل"
  },
  "الماركة": {
    "en": "Brand",
    "ckb": "براند"
  },
  "اللون": {
    "en": "Color",
    "ckb": "ڕەنگ"
  },
  "الألوان": {
    "en": "Colors",
    "ckb": "ڕەنگەکان"
  },
  "المادة": {
    "en": "Material",
    "ckb": "ماددە"
  },
  "السعة": {
    "en": "Capacity",
    "ckb": "توانای هەڵگرتن"
  },
  "التدفق": {
    "en": "Flow rate",
    "ckb": "ڕێژەی لێشاو"
  },
  "الطاقة": {
    "en": "Power",
    "ckb": "هێز"
  },
  "الجهد": {
    "en": "Voltage",
    "ckb": "ڤۆڵتیە"
  },
  "الحرارة": {
    "en": "Temperature",
    "ckb": "پلەی گەرمی"
  },
  "الضمان": {
    "en": "Warranty",
    "ckb": "گەرەنتی"
  },
  "العمر الافتراضي": {
    "en": "Service life",
    "ckb": "تەمەنی بەکارهێنان"
  },
  "التوافق": {
    "en": "Compatibility",
    "ckb": "گونجان"
  },
  "الإعدادات": {
    "en": "Settings",
    "ckb": "ڕێکخستنەکان"
  },
  "العمق": {
    "en": "Depth",
    "ckb": "قووڵی"
  },
  "الطول": {
    "en": "Length",
    "ckb": "درێژی"
  },
  "العرض": {
    "en": "Width",
    "ckb": "پانی"
  },
  "الارتفاع": {
    "en": "Height",
    "ckb": "بەرزی"
  },
  "قياس الحوض": {
    "en": "Tank size",
    "ckb": "قەبارەی حەوز"
  },
  "حجم الحوض": {
    "en": "Tank volume",
    "ckb": "قەبارەی حەوز"
  },
  "الكمية": {
    "en": "Quantity",
    "ckb": "بڕ"
  },
  "يشمل": {
    "en": "Includes",
    "ckb": "لەخۆدەگرێت"
  },
  "عدد الأدوات": {
    "en": "Number of tools",
    "ckb": "ژمارەی ئامرازەکان"
  },
  "يحتاج": {
    "en": "Requires",
    "ckb": "پێویستی بە"
  },
  "ملاحظة": {
    "en": "Note",
    "ckb": "تێبینی"
  },
  "رمز القطعة": {
    "en": "Item code",
    "ckb": "کۆدی پارچە"
  },
  "نمط الاستخدام": {
    "en": "Usage type",
    "ckb": "شێوازی بەکارهێنان"
  },
  "طريقة المعاينة": {
    "en": "Preview method",
    "ckb": "شێوازی پێشبینین"
  },
  "الاستخدام": {
    "en": "Usage",
    "ckb": "بەکارهێنان"
  },
  "طريقة الاستخدام": {
    "en": "How to use",
    "ckb": "شێوازی بەکارهێنان"
  },
  "تحذيرات": {
    "en": "Warnings",
    "ckb": "ئاگادارییەکان"
  },
  "المنشأ": {
    "en": "Origin",
    "ckb": "سەرچاوە"
  },
  "بلد المنشأ": {
    "en": "Country of origin",
    "ckb": "وڵاتی بەرهەمهێنان"
  },
  "القوة": {
    "en": "Power",
    "ckb": "هێز"
  },
  "العدد": {
    "en": "Quantity",
    "ckb": "ژمارە"
  }
};
export function variantDimensionLabel(key: string, locale: string): string {
  return locale === "en" || locale === "ckb" ? LABELS[key]?.[locale] ?? key : key;
}
const VALUES: Record<string, {en: string; ckb: string}> = {
  "صغير": {en: "Small", ckb: "بچووک"},
  "متوسط": {en: "Medium", ckb: "مامناوەند"},
  "كبير": {en: "Large", ckb: "گەورە"},
  "أسود": {en: "Black", ckb: "ڕەش"},
  "اسود": {en: "Black", ckb: "ڕەش"},
  "أبيض": {en: "White", ckb: "سپی"},
  "ابيض": {en: "White", ckb: "سپی"},
  "شفاف": {en: "Clear", ckb: "ڕوون"},
  "أزرق": {en: "Blue", ckb: "شین"},
  "ازرق": {en: "Blue", ckb: "شین"}
};
export function variantDisplayValue(value: string, locale: string): string {
  if (locale !== "en" && locale !== "ckb") return value;
  if (VALUES[value]) return VALUES[value][locale];
  return value.replace(/واط/g, locale === "en" ? "W" : "وات")
    .replace(/لتر/g, locale === "en" ? "L" : "لیتر")
    .replace(/سم/g, locale === "en" ? "cm" : "سم")
    .replace(/ملم/g, locale === "en" ? "mm" : "ملم")
    .replace(/متر/g, locale === "en" ? "m" : "مەتر");
}
