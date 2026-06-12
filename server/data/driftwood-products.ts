import type { Product } from "../../shared/schema.js";

type DriftwoodProductSeed = Partial<Product> & {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  price: string;
  currency: string;
  images: string[];
  thumbnail: string;
  rating: string;
  reviewCount: number;
  stock: number;
  lowStockThreshold: number;
  isNew: boolean;
  isBestSeller: boolean;
  isProductOfWeek: boolean;
  hasVariants: false;
  variants: null;
  specifications: Record<string, unknown>;
};

const driftwoodDescription = () =>
  `هاي القطعة مو صورة تمثيلية؛ هذا نفس الشكل اللي تستلمه.

تكدر تلفها 3D وتشوفها من كل زاوية قبل الشراء، حتى تختار وأنت مطمئن من الشكل والتفاصيل.

مناسبة للي يريد يضيف عمق وشخصية أقوى لترتيب الحوض. كل قطعة تختلف عن الثانية، وهذا جزء من قيمتها.`;

const driftwoodBenefits = [
  "تعاين نفس القطعة قبل الشراء، مو صورة عامة.",
  "تعطي ترتيب الحوض عمق وشخصية طبيعية أقوى.",
  "كل قطعة فريدة وتختلف عن الثانية.",
];

const usageInstructions = [
  "عاين الصورة والـ 3D قبل اختيار القطعة.",
  "نظف أي ديكور قبل إدخاله للحوض حسب طريقة العناية المناسبة لحوضك.",
  "ثبتها داخل الترتيب بدون ضغط على الزجاج أو المعدات.",
];

const safetyWarnings = [
  "تأكد أن مكان القطعة لا يضغط على الزجاج أو يعيق حركة الماء.",
  "إذا حوضك صغير أو مزدحم، اختار القطعة بعد ما تقارن حجمها بصرياً مع ترتيب الحوض.",
];

function createDriftwoodProduct({
  code,
  idSuffix,
  price,
  title,
  description,
}: {
  code: string;
  idSuffix: string;
  price: string;
  title: string;
  description?: string;
}): DriftwoodProductSeed {
  const slug = `aquavo-driftwood-${idSuffix}`;
  const poster = `/images/products/driftwood/${idSuffix}.webp`;
  const model = `/models/driftwood/${idSuffix}/model.glb`;

  return {
    id: `aquavo-driftwood-${idSuffix}`,
    slug,
    name: title,
    brand: "AQUAVO",
    category: "decor",
    subcategory: "driftwood",
    description: description || driftwoodDescription(),
    price,
    currency: "IQD",
    images: [poster],
    thumbnail: poster,
    rating: "0",
    reviewCount: 0,
    stock: 1,
    lowStockThreshold: 1,
    isNew: true,
    isBestSeller: false,
    isProductOfWeek: false,
    hasVariants: false,
    variants: null,
    specifications: {
      "رمز القطعة": code,
      "طريقة المعاينة": "صورة وموديل 3D لنفس القطعة",
      "نمط الاستخدام": "ديكور وأكواسكايب",
      "ملاحظة": "الشكل المعروض هو نفس القطعة التي تستلمها",
      benefits: driftwoodBenefits,
      usageInstructions,
      safetyWarnings,
      __model3d: {
        src: model,
        poster,
        label: code,
        pieceCode: code,
      },
    },
  };
}

// Price source: aquavo_invoice_pricing_1_8cbm_market_breaker.xlsx
// Master Pricing rows for Rhododendron/root wood tiers:
// 30-35cm = 14,000 IQD, 40-45cm = 16,000 IQD, 50-55cm = 24,000 IQD.
// The GLB files do not provide confirmed sellable dimensions, so titles avoid size claims.
export const driftwoodProducts: DriftwoodProductSeed[] = [
  createDriftwoodProduct({
    code: "DW-01",
    idSuffix: "dw-01",
    price: "14000",
    title: "خشب ديكور للأحواض — قطعة DW-01",
  }),
  createDriftwoodProduct({
    code: "DW-02",
    idSuffix: "dw-02",
    price: "16000",
    title: "خشب ديكور للأحواض — قطعة DW-02",
  }),
  createDriftwoodProduct({
    code: "DW-03",
    idSuffix: "dw-03",
    price: "24000",
    title: "خشب ديكور للأحواض — قطعة DW-03",
  }),
  createDriftwoodProduct({
    code: "DW-04",
    idSuffix: "dw-04",
    price: "14000",
    title: "خشب ديكور للأحواض — قطعة DW-04",
  }),
  createDriftwoodProduct({
    code: "DW-05",
    idSuffix: "dw-05",
    price: "14000",
    title: "خشب ديكور للأحواض — قطعة DW-05",
  }),
  createDriftwoodProduct({
    code: "DW-06",
    idSuffix: "dw-06",
    price: "16000",
    title: "خشب ديكور للأحواض — قطعة DW-06",
  }),
  createDriftwoodProduct({
    code: "DW-07",
    idSuffix: "dw-07",
    price: "24000",
    title: "خشب ديكور للأحواض — قطعة DW-07",
  }),
  createDriftwoodProduct({
    code: "DW-08",
    idSuffix: "dw-08",
    price: "15000",
    title: "خشب ديكور للأحواض — قطعة DW-08",
  }),
  createDriftwoodProduct({
    code: "DW-09",
    idSuffix: "dw-09",
    price: "13000",
    title: "خشب ديكور للأحواض — قطعة DW-09",
  }),
  createDriftwoodProduct({
    code: "DW-10",
    idSuffix: "dw-10",
    price: "18000",
    title: "خشب ديكور للأحواض — قطعة DW-10",
  }),
  createDriftwoodProduct({
    code: "DW-11",
    idSuffix: "dw-11",
    price: "28000",
    title: "خشب ديكور للأحواض — قطعة DW-11",
  }),
  createDriftwoodProduct({
    code: "DW-12",
    idSuffix: "dw-12",
    price: "48000",
    title: "خشب ديكور للأحواض — قطعة DW-12",
    description: "قطعة خشبية ملكية بتفاصيل جذور معقدة ومتشعبة تعطي عمق طبيعي فائق للحوض. هذي القطعة تم اختيارها بعناية لتمثل محور التصميم الأساسي، بفضل تداخلاتها اللي تسمح بنمو الطحالب والنباتات المائية عليها بشكل انسيابي. مناسبة جدا لأحواض الأكواسكايب الاحترافية."
  }),
  createDriftwoodProduct({
    code: "DW-13",
    idSuffix: "dw-13",
    price: "38000",
    title: "خشب ديكور للأحواض — قطعة DW-13",
    description: "جذر طبيعي ممتد بتموجات ناعمة وتفاصيل خشبية عتيقة تضفي طابع الغابات الاستوائية القديمة. مثالية لإنشاء ممرات ومخابئ طبيعية للأسماك الصغيرة والروبيان. قوامها المتين ولونها الغني يجعلها قطعة مميزة تدوم طويلا داخل حوضك."
  }),
  createDriftwoodProduct({
    code: "DW-14",
    idSuffix: "dw-14",
    price: "42000",
    title: "خشب ديكور للأحواض — قطعة DW-14",
    description: "قطعة فريدة تمتاز بقاعدة عريضة وتفرعات مرتفعة تشبه الأشجار القزمة، تمنح حوضك لمسة فنية وارتفاعا بصريا مميزا. تكدر تستخدمها لربط نباتات الأنوبياس أو الجافا موس لتصميم منظر طبيعي خلاب يحاكي الطبيعة بدقة."
  }),
  createDriftwoodProduct({
    code: "DW-15",
    idSuffix: "dw-15",
    price: "45000",
    title: "خشب ديكور للأحواض — قطعة DW-15",
    description: "تمتاز هذي القطعة بتجويفاتها الطبيعية الفريدة وتمازج ألوان الخشب الداكنة مع الإضاءة المائية. شكلها الانسيابي يسهل تنسيقها مع الصخور البركانية أو صخور التنين لإنشاء جدار صخري خشبي متكامل يبهر الناظرين."
  }),
  createDriftwoodProduct({
    code: "DW-16",
    idSuffix: "dw-16",
    price: "65000",
    title: "خشب ديكور للأحواض — قطعة DW-16",
    description: "تحفة فنية عملاقة ونادرة، تتميز بجذورها المتشعبة بكثافة عالية وكتلتها الخشبية الثقيلة التي تستقر بثبات في قاع الحوض. تفاصيلها الملتوية تعكس سنوات من العوامل الطبيعية التي صقلت هذا الخشب ليكون لوحة جمالية ساحرة تجذب الأنظار وتجعله القطعة الأبرز في الحوض."
  }),
];
