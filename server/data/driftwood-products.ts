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
}: {
  code: string;
  idSuffix: string;
  price: string;
  title: string;
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
    description: driftwoodDescription(),
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
];
