/**
 * إصلاح منتج الـ Connectors 4mm
 * - إزالة "صمام التحكم" من الخيارات (منتج منفصل)
 * - إضافة 3 أشكال كخيارات: T, Y, I
 * - ربط كل صورة بالشكل المناسب
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fixConnectors() {
  console.log("=== إصلاح وصلات الخراطيم 4mm ===\n");

  // الصور حسب الشكل
  const imageY = "/images/products/houyi/houyi-connectors-4mm/Gemini_Generated_Image_gcjcaxgcjcaxgcjc.png";
  const imageI = "/images/products/houyi/houyi-connectors-4mm/Gemini_Generated_Image_kz3fevkz3fevkz3f (1).png";
  const imageT = "/images/products/houyi/houyi-connectors-4mm/Gemini_Generated_Image_kz3fevkz3fevkz3f.png";

  // 3 variants: T, Y, I
  const variants = [
    {
      id: "shape-t",
      label: "شكل T (تفريعة ثلاثية)",
      price: 100,
      stock: 50,
      isDefault: true,
      image: imageT,
      specifications: {
        "الشكل": "T — تفريع ثلاثي",
        "القطر": "4 ملم",
        "الاستخدام": "توزيع الهواء لاتجاهين + مدخل"
      }
    },
    {
      id: "shape-y",
      label: "شكل Y (تفريعة مزدوجة)",
      price: 100,
      stock: 50,
      isDefault: false,
      image: imageY,
      specifications: {
        "الشكل": "Y — تفريع مزدوج",
        "القطر": "4 ملم",
        "الاستخدام": "تقسيم خرطوم واحد إلى اثنين"
      }
    },
    {
      id: "shape-i",
      label: "شكل I (توصيل مستقيم)",
      price: 100,
      stock: 50,
      isDefault: false,
      image: imageI,
      specifications: {
        "الشكل": "I — توصيل مستقيم",
        "القطر": "4 ملم",
        "الاستخدام": "وصل خرطومين ببعض"
      }
    }
  ];

  // الصور — فقط صور الوصلات بدون صمام التحكم
  const images = [imageT, imageY, imageI];

  try {
    await sql`
      UPDATE products SET 
        name = 'وصلات خراطيم هواء 4 ملم',
        variants = ${JSON.stringify(variants)}::jsonb,
        images = ${JSON.stringify(images)}::jsonb,
        thumbnail = ${imageT},
        updated_at = NOW()
      WHERE id = 'houyi-connectors-4mm'
    `;
    console.log("✓ تم تحديث houyi-connectors-4mm:");
    console.log("  - 3 خيارات: T / Y / I");
    console.log("  - إزالة صمام التحكم من الخيارات");
    console.log("  - إزالة صور صمام التحكم من المعرض");
    console.log("  - ربط كل صورة بالشكل المناسب");
  } catch (e: any) {
    console.error("✗ خطأ:", e.message);
  }

  // التأكد من أن صمام التحكم لا يزال منتج منفصل
  const cv = await sql`SELECT id, name, deleted_at FROM products WHERE id = 'houyi-control-valve'`;
  if (cv.length > 0 && !cv[0].deleted_at) {
    console.log("\n✓ صمام التحكم يبقى منتج منفصل:", cv[0].name);
  } else if (cv.length > 0 && cv[0].deleted_at) {
    console.log("\n⚠️ صمام التحكم محذوف (soft delete)");
  }

  console.log("\n=== تم ===");
}

fixConnectors().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
