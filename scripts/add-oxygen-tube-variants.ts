/**
 * إضافة خيارات الألوان لأنبوب الأكسجين HOUYI
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function addOxygenTubeVariants() {
    console.log("🔄 إضافة خيارات الألوان لأنبوب الأكسجين HOUYI...\n");

    const colorVariants = [
        { id: "white", label: "أبيض", price: 0, stock: 50, isDefault: true },
        { id: "black", label: "أسود", price: 0, stock: 50, isDefault: false }
    ];

    const result = await sql`
        UPDATE products 
        SET 
            has_variants = true,
            variants = ${JSON.stringify(colorVariants)}::jsonb
        WHERE slug = 'houyi-oxygenation-tube'
           OR LOWER(name) LIKE '%أنبوب%أكسجين%'
           OR LOWER(name) LIKE '%oxygenation%tube%'
        RETURNING id, name
    `;

    if (result.length > 0) {
        console.log(`✅ تم تحديث: ${result[0].name}`);
        console.log(`   الخيارات: أبيض ✓ | أسود ✓`);
    } else {
        console.log("⚠️ لم يتم العثور على المنتج");
    }

    console.log("\n✅ تم!");
    process.exit(0);
}

addOxygenTubeVariants().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
