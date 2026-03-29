/**
 * إصلاح منتج C4-1117
 * المنتج مكناسة رمل كهربائية وليس سخان!
 * الصور صحيحة — فقط تحديث الاسم والوصف والتصنيف
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fixSandWasher() {
  console.log("=== إصلاح منتج C4-1117 ===\n");

  const name = "YEE مكناسة رمل كهربائية 30 واط — تنظيف حصى وتغيير مياه";
  const description = "مكناسة رمل كهربائية بقوة 30 واط — تنظّف الحصى وتسحب الفضلات وتغيّر الماء بنفس الوقت. تشتغل بمستوى ماء منخفض (حتى 5 سم) — مثالية للأحواض الصغيرة وأحواض السلاحف. فقط شغّلها ومرّرها على الرمل، تسحب الأوساخ وترجع الحصى مكانه.";

  const specifications = {
    benefits: [
      "تنظيف الحصى وشفط الفضلات بدون تعب",
      "تغيير مياه جزئي تلقائي أثناء التنظيف",
      "تشتغل بمستوى ماء منخفض 5 سم فقط",
      "مناسبة للأحواض الصغيرة وأحواض السلاحف",
      "توفّر وقت وجهد مقارنة بالسايفون اليدوي"
    ],
    usageInstructions: [
      "وصّل الخرطوم بالمكناسة وبالدلو أو البالوعة",
      "اغمر المكناسة بالماء وشغّلها",
      "مرّر الرأس على الحصى ببطء — تسحب الأوساخ تلقائياً",
      "بعد الانتهاء، طفّيها واسحبها من الماء",
      "نظّف الفلتر الداخلي بعد كل استخدام"
    ],
    safetyWarnings: [
      "لا تشغّلها بدون ماء — ممكن تحترق المضخة",
      "لا تستخدمها مع رمل ناعم جداً — حجر 2mm فما فوق",
      "افصل الكهرباء قبل وضع يدك بالماء"
    ]
  };

  try {
    await sql`
      UPDATE products SET 
        name = ${name},
        description = ${description},
        category = 'maintenance/cleaning',
        specifications = ${JSON.stringify(specifications)}::jsonb,
        updated_at = NOW()
      WHERE id = 'yee-c4-1117-1'
    `;
    console.log("✓ تم تحديث المنتج:");
    console.log(`  اسم: ${name}`);
    console.log(`  تصنيف: maintenance/cleaning`);
    console.log(`  وصف: مكناسة رمل كهربائية`);
  } catch (e: any) {
    console.error("✗ خطأ:", e.message);
  }

  console.log("\n=== تم ===");
}

fixSandWasher().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
