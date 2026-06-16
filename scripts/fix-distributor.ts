/**
 * إضافة خيارات 4 و 6 منافذ لموزع الهواء البلاستيكي
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fixDistributor() {
  console.log("=== إضافة خيارات موزع الهواء البلاستيكي ===\n");

  const variants = [
    {
      id: "4-port",
      label: "4 منافذ",
      price: 500,
      stock: 45,
      isDefault: true,
      specifications: {
        "عدد المنافذ": "4",
        "المادة": "بلاستيك عالي الجودة",
        "اللون": "أزرق",
        "الاستخدام": "مثالي لحوض واحد بعدة أحجار هواء"
      }
    },
    {
      id: "6-port",
      label: "6 منافذ",
      price: 750,
      stock: 30,
      isDefault: false,
      specifications: {
        "عدد المنافذ": "6",
        "المادة": "بلاستيك عالي الجودة",
        "اللون": "أزرق",
        "الاستخدام": "لمن عندهم أكثر من حوض أو يحتاجون توزيع أكبر"
      }
    }
  ];

  try {
    await sql`
      UPDATE products SET 
        name = 'موزع هواء بلاستيكي — بصمامات',
        variants = ${JSON.stringify(variants)}::jsonb,
        updated_at = NOW()
      WHERE id = 'houyi-air-distributor'
    `;
    console.log("✓ تم التحديث:");
    console.log("  اسم: موزع هواء بلاستيكي — بصمامات");
    console.log("  خيارات: 4 منافذ (500 د.ع) | 6 منافذ (750 د.ع)");
  } catch (e: any) {
    console.error("✗ خطأ:", e.message);
  }

  console.log("\n=== تم ===");
}

fixDistributor().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
