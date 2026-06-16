/**
 * تحديث صورة الأغصان التايلندية بالصورة الأصلية
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function updateWithOriginalImage() {
    const originalImage = "/images/products/houyi/houyi-wood-products/thai-branches-original.jpg";

    console.log("🔄 تحديث صورة الأغصان التايلندية...\n");

    // تحديث المنتج
    const result = await sql`
        UPDATE products 
        SET 
            images = ${JSON.stringify([originalImage])}::jsonb,
            thumbnail = ${originalImage}
        WHERE slug = 'houyi-thai-branches'
           OR LOWER(name) LIKE '%أغصان%تايلندية%'
           OR LOWER(name) LIKE '%تايلاندية%متشابكة%'
        RETURNING id, name
    `;

    if (result.length > 0) {
        console.log(`✅ تم تحديث: ${result[0].name}`);
        console.log(`   الصورة: ${originalImage}`);
    } else {
        console.log("⚠️ لم يتم العثور على المنتج");
    }

    console.log("\n✅ تم بنجاح!");
    process.exit(0);
}

updateWithOriginalImage().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
