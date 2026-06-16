/**
 * دمج منتجات سبايدر وود الأربعة في منتج واحد بمتغيرات
 * بنفس أسلوب الدريفت وود المصقول
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function mergeSpiderWood() {
  console.log("=== دمج سبايدر وود ===\n");

  // 1. تجهيز صور كل المتغيرات (لاستخدامها في المنتج الرئيسي)
  const allImages = [
    "/images/products/houyi/houyi-wood-products/spider-wood-sm.png",
    "/images/products/houyi/houyi-wood-products/spider-wood-md.png",
    "/images/products/houyi/houyi-wood-products/spider-wood-lg.png",
    "/images/products/houyi/houyi-wood-products/spider-wood-root.png"
  ];

  // 2. المتغيرات
  const variants = [
    {
      id: "sm",
      label: "صغير 10-20 سم",
      price: 2770,
      stock: 10,
      isDefault: true,
      image: "/images/products/houyi/houyi-wood-products/spider-wood-sm.png",
      specifications: { "الحجم": "10-20 سم" }
    },
    {
      id: "md",
      label: "وسط 20-35 سم",
      price: 7660,
      stock: 10,
      isDefault: false,
      image: "/images/products/houyi/houyi-wood-products/spider-wood-md.png",
      specifications: { "الحجم": "20-35 سم" }
    },
    {
      id: "lg",
      label: "كبير 35-50 سم",
      price: 4620,
      stock: 10,
      isDefault: false,
      image: "/images/products/houyi/houyi-wood-products/spider-wood-lg.png",
      specifications: { "الحجم": "35-50 سم" }
    },
    {
      id: "root",
      label: "جذر ضخم 40-60 سم",
      price: 5210,
      stock: 10,
      isDefault: false,
      image: "/images/products/houyi/houyi-wood-products/spider-wood-root.png",
      specifications: { "الحجم": "40-60 سم" }
    }
  ];

  // 3. الوصف والمواصفات الموحّدة
  const description = "سبايدر وود — خشب تشعبي مميز بأشكال فريدة لا تتكرر، المفضل عند هواة الأكواسكيب لإنشاء غابات ومناظر طبيعية تحت الماء. ثبّت عليه الموس والنباتات الملتصقة وشوف كيف يتحول لعمل فني. يحتاج نقع 1-2 أسبوع قبل ما يغرق، ويطلق تانين طبيعي يعطي الماء لون عسلي.";

  const specifications = {
    "المادة": "خشب طبيعي استوائي",
    "النوع": "Spider Wood (Azalea Root)",
    "الأحجام": "صغير / وسط / كبير / جذر ضخم",
    "التحضير": "نقع 1-2 أسبوع حتى يغرق",
    "benefits": [
      "تشعبات فريدة — كل قطعة عمل فني طبيعي لا يتكرر",
      "سطح مثالي لنمو الموس والنباتات الملتصقة",
      "يخلق ملاجئ طبيعية للروبيان والأسماك الصغيرة",
      "يطلق تانين يحاكي بيئة المياه السوداء الطبيعية",
      "متعدد الأحجام — يناسب أحواض النانو حتى الأحواض الكبيرة"
    ],
    "usageInstructions": [
      "انقعه في ماء لمدة 1-2 أسبوع حتى يتشبع ويغرق",
      "يمكن ربطه بحجر ثقيل لتسريع الغرق",
      "ثبّت الموس على الأغصان بخيط شفاف أو غراء موس فوري",
      "غيّر ماء النقع يومياً لتقليل التانين"
    ],
    "safetyWarnings": [
      "يحتاج صبراً بالنقع — لا تضعه بالحوض قبل ما يغرق",
      "يطلق تانين يلوّن الماء — طبيعي وغير ضار",
      "الأغصان الرفيعة قد تنكسر — تعامل بلطف",
      "قص أي أطراف حادة قد تؤذي الأسماك"
    ]
  };

  try {
    // 4. تحديث المنتج الأساسي (houyi-spider-wood-sm → نجعله المنتج الرئيسي)
    // لكن بما أن slug = houyi-spider-wood-sm أفضل نختار واحد جديد
    // الأفضل نحدّث houyi-spider-wood-sm ليكون المنتج الرئيسي

    await sql`
      UPDATE products SET 
        name = 'سبايدر وود — أحجام متعددة',
        description = ${description},
        price = '2770',
        has_variants = true,
        variants = ${JSON.stringify(variants)}::jsonb,
        images = ${JSON.stringify(allImages)}::jsonb,
        specifications = ${JSON.stringify(specifications)}::jsonb,
        updated_at = NOW()
      WHERE id = 'houyi-spider-wood-sm'
    `;
    console.log("✓ تم تحديث houyi-spider-wood-sm كمنتج رئيسي بمتغيرات");

    // 5. حذف المنتجات المنفصلة (soft delete)
    const toDelete = ['houyi-spider-wood-md', 'houyi-spider-wood-lg', 'houyi-spider-wood-root'];
    
    for (const id of toDelete) {
      await sql`UPDATE products SET deleted_at = NOW() WHERE id = ${id}`;
      console.log(`✓ تم إخفاء ${id} (soft delete)`);
    }

    console.log("\n=== اكتمل الدمج بنجاح! ===");
    console.log("المنتج الرئيسي: houyi-spider-wood-sm");
    console.log("المتغيرات: صغير | وسط | كبير | جذر ضخم");
    console.log("المحذوفة: houyi-spider-wood-md, lg, root");

  } catch (e: any) {
    console.error("✗ خطأ:", e.message);
  }
}

mergeSpiderWood().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
