import { useMemo } from "react";
import { useLocale } from "@/i18n/locale-context";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { FOOD_FILTERS, foodFilterSchema, getFoodProfile, matchesFoodFilter, type FoodFilter } from "@shared/food-choice";
import type { Product } from "@/types";
import type { Locale } from "@shared/i18n/locales";

const labels: Record<Locale, Record<FoodFilter, string>> = {
  ar: { all: "كل الأكل ومستلزمات التغذية", betta: "بيتا (فايتر)", goldfish: "جولدفش ورانشو", "small-fish": "أسماك صغيرة مثل الجوبي والتترا", fry: "صغار الأسماك", shrimp: "روبيان الزينة", koi: "كوي", "hermit-crab": "سرطان الناسك", supplement: "غذاء تكميلي", accessories: "أدوات التغذية" },
  en: { all: "All food and feeding supplies", betta: "Betta", goldfish: "Goldfish and Ranchu", "small-fish": "Small fish such as guppies and tetras", fry: "Fry", shrimp: "Ornamental shrimp", koi: "Koi", "hermit-crab": "Hermit crabs", supplement: "Supplementary food", accessories: "Feeding accessories" },
  ckb: { all: "هەموو خواردن و کەرەستەکانی خواردندان", betta: "بێتا (فایتەر)", goldfish: "گۆڵدفیش و ڕانچوو", "small-fish": "ماسی بچووک وەک گوپی و تێترا", fry: "بچووکەماسی", shrimp: "ڕووبیانی ڕازاوە", koi: "کۆی", "hermit-crab": "قڕژاڵی هێرمیت", supplement: "خواردنی تەواوکەر", accessories: "کەرەستەکانی خواردندان" },
};

const copy = {
  ar: {
    title: "شنو تربي؟", intro: "حدد النوع حتى تشوف الأكل المخصص إله، وبعدها قارن حجم الحبيبة والعبوة.",
    hint: "التصنيف حسب النوع المذكور بالمنتج. حجم الفم وعمر السمكة هم يدخلون بالاختيار.",
    factsTitle: "قبل ما تختار هذا الأكل", target: "مخصص إلى", weight: "حجم العبوة", particle: "حجم الحبيبة", buoyancy: "طافي لو غاطس؟", role: "استخدامه بالغذاء",
    unknown: "مو مذكور؛ نتأكدلك من العبوة", floating: "طافي", sinking: "غاطس", mixed: "طافي وغاطس", complete: "غذاء كامل حسب وصف المنتج", supplement: "غذاء تكميلي؛ ضمن غذاء متنوع مناسب للنوع",
    note: "حجم الحبيبة لازم يناسب فم السمكة. اختلاف حجم العبوة وحده ما يعني أن التركيبة نفسها.",
    help: "تأكد من الأكل ويا AQUAVO", message: "مرحبا، أريد أتأكد من ملاءمة هذا الأكل لنوع وحجم سمكتي، وحجم حبيبته وهل هو طافي أو غاطس وغذاء كامل أو تكميلي:",
    alternatives: "أكل لنفس النوع حتى تقارن", alternativesNote: "قارن حجم الحبيبة والعبوة وتعليمات الغذاء؛ المنتجات مو بالضرورة نفس التركيبة.",
  },
  en: {
    title: "What do you keep?", intro: "Choose an animal to see food intended for it, then compare particle and pack size.",
    hint: "Groups use the animal named by the product. Mouth size and life stage also matter.",
    factsTitle: "Before choosing this food", target: "Intended for", weight: "Pack size", particle: "Particle size", buoyancy: "Floating or sinking?", role: "Dietary role",
    unknown: "Not stated; ask us to check the label", floating: "Floating", sinking: "Sinking", mixed: "Floating and sinking", complete: "Complete food according to the product description", supplement: "Supplementary food; part of a varied diet appropriate to the species",
    note: "Particle size must suit the fish's mouth. Different pack sizes do not establish identical formulas.",
    help: "Check this food with AQUAVO", message: "Hello, please help me check this food for my fish's species and size, its particle size, buoyancy, and whether it is complete or supplementary:",
    alternatives: "Compare food for the same animal", alternativesNote: "Compare particle size, pack size and feeding instructions; formulas may differ.",
  },
  ckb: {
    title: "چی بەخێو دەکەیت؟", intro: "جۆری ئاژەڵەکە هەڵبژێرە بۆ بینینی خواردنی تایبەت بەو، پاشان قەبارەی دانە و پاکەت بەراورد بکە.",
    hint: "پۆلێنکردن بەپێی جۆری ناوبراو لە بەرهەمەکەیە. قەبارەی دەم و تەمەنی ماسییش گرنگن.",
    factsTitle: "پێش هەڵبژاردنی ئەم خواردنە", target: "تایبەتە بە", weight: "قەبارەی پاکەت", particle: "قەبارەی دانە", buoyancy: "دەکەوێتە سەر ئاو یان نوقم دەبێت؟", role: "بەکارهێنانی لە خۆراکدا",
    unknown: "دیاری نەکراوە؛ لەسەر پاکەتەکە بۆت دەسەلمێنین", floating: "لەسەر ئاو دەمێنێتەوە", sinking: "نوقم دەبێت", mixed: "لەسەر ئاو و نوقم", complete: "خواردنی تەواو بەپێی وەسفی بەرهەم", supplement: "خواردنی تەواوکەر؛ لەگەڵ خۆراکی جۆراوجۆری گونجاو بۆ جۆرەکە",
    note: "قەبارەی دانە دەبێت بۆ دەمی ماسی بگونجێت. جیاوازی قەبارەی پاکەت بە مانای یەکسانی پێکهاتە نییە.",
    help: "لەگەڵ AQUAVO لە خواردنەکە دڵنیا ببە", message: "سڵاو، دەمەوێت لە گونجاوی ئەم خواردنە بۆ جۆر و قەبارەی ماسییەکەم، قەبارەی دانە، نوقمبوون و تەواو یان تەواوکەر بوونی دڵنیا ببمەوە:",
    alternatives: "خواردن بۆ هەمان جۆر بەراورد بکە", alternativesNote: "قەبارەی دانە، پاکەت و ڕێنمایی خواردندان بەراورد بکە؛ پێکهاتەکان لەوانەیە جیاواز بن.",
  },
};

export function foodComparisonCopy(locale: Locale) {
  return { title: copy[locale].alternatives, note: copy[locale].alternativesNote };
}

export function FoodCategoryGuide({ products, value, onChange }: { products: Product[]; value: FoodFilter; onChange: (filter: FoodFilter) => void }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const options = useMemo(() => FOOD_FILTERS.map(filter => ({ filter, count: products.filter(product => matchesFoodFilter(product, filter)).length })), [products]);
  return (
    <section className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex sm:items-center sm:gap-6" aria-labelledby="food-choice-title">
      <div className="min-w-0 flex-1">
        <h2 id="food-choice-title" className="text-base font-bold">{text.title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text.intro}</p>
      </div>
      <div className="mt-3 min-w-0 sm:mt-0 sm:w-80">
        <select
          aria-labelledby="food-choice-title"
          aria-describedby="food-choice-hint"
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={value}
          onChange={event => { const choice = foodFilterSchema.safeParse(event.target.value); if (choice.success) onChange(choice.data); }}
        >
          {options.filter(option => option.count > 0 || option.filter === "all" || option.filter === value).map(({ filter, count }) => <option key={filter} value={filter}>{labels[locale][filter]} ({count})</option>)}
        </select>
        <p id="food-choice-hint" className="mt-2 text-xs leading-5 text-muted-foreground">{text.hint}</p>
      </div>
    </section>
  );
}

export function FoodProductFacts({ product }: { product: Product }) {
  const { locale } = useLocale();
  const profile = getFoodProfile(product);
  if (!profile || profile.accessory) return null;
  const text = copy[locale];
  const facts = [
    [text.target, profile.intendedFor ?? (profile.targets.map(target => labels[locale][target]).join(" / ") || text.unknown)],
    [text.weight, profile.weight ?? text.unknown],
    [text.particle, profile.particleSize ?? text.unknown],
    [text.buoyancy, text[profile.buoyancy]],
    [text.role, text[profile.dietRole]],
  ];
  return (
    <section className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.045] p-4" aria-labelledby="food-facts-title">
      <h2 id="food-facts-title" className="text-sm font-bold">{text.factsTitle}</h2>
      <dl className="mt-3 divide-y divide-border/60 text-sm">
        {facts.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] gap-3 py-2"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 leading-6" dir="auto">{value}</dd></div>)}
      </dl>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{text.note}</p>
      <WhatsAppLink source="product" productId={product.id} productName={product.name} category={product.category} message={`${text.message}\n${product.name}\nhttps://www.aquavoiq.com/products/${product.slug}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">{text.help}</WhatsAppLink>
    </section>
  );
}
