export interface EducationalGuideLink {
  href: string;
  label: string;
  description: string;
}

const FILTER_GUIDE: EducationalGuideLink = {
  href: "/guides/aquarium-filter-guide",
  label: "دليل اختيار الفلتر",
  description: "اقرأ شلون تختار فلتر مناسب حسب حجم الحوض وقوة التدفق.",
};

const HEATER_GUIDE: EducationalGuideLink = {
  href: "/guides/aquarium-heater-guide",
  label: "دليل اختيار السخان",
  description: "اقرأ شلون تحسب واط السخان وتثبت الحرارة بدون تذبذب.",
};

const DECOR_GUIDE: EducationalGuideLink = {
  href: "/guides/aquarium-decor-stones-guide",
  label: "دليل ديكور وأحجار الحوض",
  description: "اقرأ شلون تختار حجر أو ديكور آمن وما يربك ماء الحوض.",
};

const WATER_TEST_GUIDE: EducationalGuideLink = {
  href: "/guides/aquarium-water-test-guide",
  label: "دليل فحص ماء الحوض",
  description: "اقرأ معنى قراءات الماء وشلون تتصرف إذا الأمونيا أو النتريت ارتفعت.",
};

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function getEducationalGuideForSignals(
  signals: Array<string | null | undefined>,
): EducationalGuideLink | null {
  const text = signals
    .filter((signal): signal is string => typeof signal === "string" && signal.trim().length > 0)
    .map((signal) => signal.toLowerCase().replace(/[_-]+/g, " "))
    .join(" ");

  if (!text) return null;

  if (includesAny(text, ["filters", "filter", "filtration", "فلتر", "فلاتر", "ترشيح", "ميديا"])) {
    return FILTER_GUIDE;
  }

  if (includesAny(text, ["heaters", "heater", "heating", "سخان", "سخانات", "هيتر", "حرارة"])) {
    return HEATER_GUIDE;
  }

  if (
    includesAny(text, [
      "decorations",
      "decoration",
      "decor",
      "substrates",
      "substrate",
      "aquascape",
      "stone",
      "stones",
      "gravel",
      "sand",
      "ديكور",
      "ديكورات",
      "حجر",
      "أحجار",
      "احجار",
      "حصى",
      "رمل",
      "ركائز",
      "خشب",
      "درفت",
    ])
  ) {
    return DECOR_GUIDE;
  }

  if (
    includesAny(text, [
      "test kits",
      "test kit",
      "testing",
      "water treatments",
      "water treatment",
      "water care",
      "treatments",
      "conditioner",
      "conditioners",
      "chlorine",
      "dechlorinator",
      "مزيل",
      "كلور",
      "فحص",
      "اختبار",
      "شرائط",
      "معالجة",
      "معالجات",
      "علاجات",
    ])
  ) {
    return WATER_TEST_GUIDE;
  }

  return null;
}
