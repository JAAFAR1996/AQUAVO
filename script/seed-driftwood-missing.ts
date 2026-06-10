/**
 * Seed missing driftwood products DW-04 → DW-07 into NEON database.
 * Run: npx tsx script/seed-driftwood-missing.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema.js";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1); }

const sql = neon(DB_URL);
const db = drizzle(sql, { schema });

const driftwoodDescription = () =>
  `هاي القطعة مو صورة تمثيلية؛ هذا نفس الشكل اللي تستلمه.

تكدر تلفها 3D وتشوفها من كل زاوية قبل الشراء، حتى تختار وأنت مطمئن من الشكل والتفاصيل.

مناسبة للي يريد يضيف عمق وشخصية أقوى لترتيب الحوض. كل قطعة تختلف عن الثانية، وهذا جزء من قيمتها.`;

const specs = (code: string, idSuffix: string) => ({
  "رمز القطعة": code,
  "طريقة المعاينة": "صورة وموديل 3D لنفس القطعة",
  "نمط الاستخدام": "ديكور وأكواسكايب",
  "ملاحظة": "الشكل المعروض هو نفس القطعة التي تستلمها",
  benefits: [
    "تعاين نفس القطعة قبل الشراء، مو صورة عامة.",
    "تعطي ترتيب الحوض عمق وشخصية طبيعية أقوى.",
    "كل قطعة فريدة وتختلف عن الثانية.",
  ],
  usageInstructions: [
    "عاين الصورة والـ 3D قبل اختيار القطعة.",
    "نظف أي ديكور قبل إدخاله للحوض حسب طريقة العناية المناسبة لحوضك.",
    "ثبتها داخل الترتيب بدون ضغط على الزجاج أو المعدات.",
  ],
  safetyWarnings: [
    "تأكد أن مكان القطعة لا يضغط على الزجاج أو يعيق حركة الماء.",
    "إذا حوضك صغير أو مزدحم، اختار القطعة بعد ما تقارن حجمها بصرياً مع ترتيب الحوض.",
  ],
  __model3d: {
    src: `/models/driftwood/${idSuffix}/model.glb`,
    poster: `/images/products/driftwood/${idSuffix}.webp`,
    label: code,
    pieceCode: code,
  },
});

const missingProducts = [
  { code: "DW-04", idSuffix: "dw-04", price: "14000" },
  { code: "DW-05", idSuffix: "dw-05", price: "14000" },
  { code: "DW-06", idSuffix: "dw-06", price: "16000" },
  { code: "DW-07", idSuffix: "dw-07", price: "24000" },
];

async function seedMissing() {
  console.log("🌊 Seeding missing driftwood products DW-04 → DW-07...\n");

  for (const { code, idSuffix, price } of missingProducts) {
    const slug = `aquavo-driftwood-${idSuffix}`;
    const poster = `/images/products/driftwood/${idSuffix}.webp`;

    const existing = await db.query.products.findFirst({
      where: (p, { eq }) => eq(p.slug, slug),
      columns: { id: true },
    });

    if (existing) {
      console.log(`⏭️  ${code} already exists — skipping`);
      continue;
    }

    await db.insert(schema.products).values({
      id: `aquavo-driftwood-${idSuffix}`,
      slug,
      name: `خشب ديكور للأحواض — قطعة ${code}`,
      nameEn: `Aquarium Driftwood — Piece ${code}`,
      brand: "AQUAVO",
      category: "decor",
      subcategory: "driftwood",
      description: driftwoodDescription(),
      price,
      currency: "IQD",
      images: JSON.stringify([poster]),
      thumbnail: poster,
      image: poster,
      rating: "0",
      reviewCount: 0,
      stock: 1,
      lowStockThreshold: 1,
      isNew: true,
      isBestSeller: false,
      isProductOfWeek: false,
      hasVariants: false,
      variants: null,
      specifications: JSON.stringify(specs(code, idSuffix)),
    } as any);

    console.log(`✅ Inserted ${code} → ${slug} (${price} IQD)`);
  }

  console.log("\n✅ Done!");
  process.exit(0);
}

seedMissing().catch((e) => { console.error("❌", e); process.exit(1); });
