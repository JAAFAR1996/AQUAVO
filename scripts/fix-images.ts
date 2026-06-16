/**
 * إصلاح صور المنتجات الخاطئة
 * 1. houyi-stainless-shunt: استبدال صور البلاستيكي بصور الستانلس الحقيقية
 * 2. houyi-wave-pump: لا صور موجودة — يبقى مؤقتاً بدون تغيير
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fixImages() {
  console.log("=== إصلاح صور المنتجات ===\n");

  // 1. إصلاح صور الستانلس شنت
  const stainlessImages = [
    "/images/products/houyi/houyi-stainless-shunt/H339bc012817e4c71af7e9734e41ba3c5d.jpg",
    "/images/products/houyi/houyi-stainless-shunt/H8c98a39e966843ba9e0361bb39c8d387E.jpg"
  ];

  try {
    await sql`
      UPDATE products SET 
        images = ${JSON.stringify(stainlessImages)}::jsonb,
        thumbnail = ${stainlessImages[0]},
        updated_at = NOW()
      WHERE id = 'houyi-stainless-shunt'
    `;
    console.log("✓ houyi-stainless-shunt: صور ستانلس حقيقية");
  } catch (e: any) {
    console.error("✗ stainless-shunt:", e.message);
  }

  // 2. تأكيد: الويف ميكر لا صور أصلية — اترك الصور الحالية مع ملاحظة
  const wavePump = await sql`SELECT images FROM products WHERE id = 'houyi-wave-pump'`;
  console.log(`\n⚠️ houyi-wave-pump: لا صور أصلية متاحة`);
  console.log(`   الصور الحالية (خاطئة - من السكيمر): ${JSON.stringify(wavePump[0]?.images)}`);
  console.log(`   → يحتاج رفع صور يدوياً`);

  console.log("\n=== تم ===");
}

fixImages().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
