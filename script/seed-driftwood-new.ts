/**
 * Seed new driftwood products DW-08 → DW-11 into NEON database.
 * Run: npx tsx script/seed-driftwood-new.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema.js";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DB_URL);
const db = drizzle(sql, { schema });

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

const newProducts = [
  { code: "DW-08", idSuffix: "dw-08", price: "14000" },
  { code: "DW-09", idSuffix: "dw-09", price: "14000" },
  { code: "DW-10", idSuffix: "dw-10", price: "16000" },
  { code: "DW-11", idSuffix: "dw-11", price: "24000" },
];

async function seedDriftwood() {
  console.log("🌊 Seeding new driftwood products into NEON...\n");

  for (const { code, idSuffix, price } of newProducts) {
    const slug = `aquavo-driftwood-${idSuffix}`;
    const poster = `/images/products/driftwood/${idSuffix}.webp`;
    const model = `/models/driftwood/${idSuffix}/model.glb`;

    // Check if already exists
    const existing = await db.query.products.findFirst({
      where: (p, { eq }) => eq(p.slug, slug),
      columns: { id: true, slug: true },
    });

    if (existing) {
      console.log(`⏭️  ${code} already exists (slug: ${slug}) — skipping`);
      continue;
    }

    const product = {
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
      specifications: JSON.stringify({
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
      }),
    };

    await db.insert(schema.products).values(product as any);
    console.log(`✅ Inserted ${code} → ${slug} (${price} IQD)`);
  }

  console.log("\n✅ Done! New driftwood products seeded successfully.");
  process.exit(0);
}

seedDriftwood().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
