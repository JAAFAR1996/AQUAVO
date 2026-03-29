/**
 * إصلاح منتج YGG-135
 * Mineral Bubble Diffuser ≠ معدني — هو حجر هواء سيراميكي/معدني طبيعي
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fix() {
  console.log("=== إصلاح ناشر الفقاعات YGG-135 ===\n");

  const name = "YEE ناشر فقاعات كروي 50 مم — أكسجين ناعم";
  const description = "ناشر فقاعات كروي من السيراميك المضغوط بقطر 50 مم — ينتج فقاعات صغيرة وناعمة جداً تذوب في الماء بكفاءة أعلى من أحجار الهواء العادية. الشكل الكروي يوزّع الفقاعات بزاوية 360 درجة لتغطية مساحة أوسع. يعمل كناشر CO2 أو ناشر هواء، متوافق مع جميع مضخات الهواء وأنظمة CO2.";

  const specifications = {
    benefits: [
      "فقاعات ناعمة جداً — ذوبان أكسجين أعلى",
      "شكل كروي يوزّع الفقاعات 360 درجة",
      "يعمل كناشر هواء وناشر CO2",
      "مصنوع من السيراميك المضغوط — عمر طويل",
      "قطر 50 مم — مناسب للأحواض الصغيرة والمتوسطة"
    ],
    usageInstructions: [
      "انقع الناشر بالماء 24 ساعة قبل أول استخدام",
      "وصّله بخرطوم 4 ملم من مضخة الهواء أو نظام CO2",
      "ثبّته بقاع الحوض باستخدام ماصة أو حصى",
      "نظّفه شهرياً بنقعه بخل أبيض ثم غسله بماء نظيف"
    ],
    safetyWarnings: [
      "لا تضغط عليه بقوة — السيراميك قابل للكسر",
      "استبدله كل 6-12 شهر عند انسداد المسام"
    ]
  };

  try {
    await sql`
      UPDATE products SET 
        name = ${name},
        description = ${description},
        specifications = ${JSON.stringify(specifications)}::jsonb,
        updated_at = NOW()
      WHERE slug = 'ygg-135'
    `;
    console.log("✓ تم التحديث:");
    console.log(`  اسم: ${name}`);
    console.log("  إزالة كلمة 'معدني' — المنتج سيراميك مضغوط");
  } catch (e: any) {
    console.error("✗ خطأ:", e.message);
  }

  console.log("\n=== تم ===");
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
