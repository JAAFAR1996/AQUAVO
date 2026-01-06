/**
 * تصحيح أسماء الألوان في variants المنتجات
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixColorNames() {
    console.log("🔍 البحث عن منتجات بها variants مع ألوان...\n");

    // جلب كل المنتجات التي لها variants
    const products = await sql`
        SELECT id, name, variants 
        FROM products 
        WHERE has_variants = true AND variants IS NOT NULL
    `;

    console.log(`✅ تم العثور على ${products.length} منتج بخيارات\n`);

    let updatedCount = 0;

    for (const product of products) {
        if (!product.variants) continue;

        let variants = product.variants as any[];
        let hasChanges = false;

        // فحص وتحديث الألوان
        variants = variants.map((v: any) => {
            let updated = { ...v };

            // تصحيح ID و Label
            if (v.id === 'brown' || v.label === 'بن' || v.label === 'بني') {
                updated.id = 'brown';
                updated.label = 'بني';
                hasChanges = true;
            }
            if (v.id === 'grey' || v.label === 'رصادي' || v.label === 'رمادي') {
                updated.id = 'grey';
                updated.label = 'رمادي';
                hasChanges = true;
            }
            if (v.id === 'black' || v.label === 'اسود' || v.label === 'أسود') {
                updated.id = 'black';
                updated.label = 'أسود';
                hasChanges = true;
            }
            if (v.id === 'white' || v.label === 'ابيض' || v.label === 'أبيض') {
                updated.id = 'white';
                updated.label = 'أبيض';
                hasChanges = true;
            }
            if (v.id === 'blue' || v.label === 'ازرق' || v.label === 'أزرق') {
                updated.id = 'blue';
                updated.label = 'أزرق';
                hasChanges = true;
            }
            if (v.id === 'red' || v.label === 'احمر' || v.label === 'أحمر') {
                updated.id = 'red';
                updated.label = 'أحمر';
                hasChanges = true;
            }
            if (v.id === 'green' || v.label === 'اخضر' || v.label === 'أخضر') {
                updated.id = 'green';
                updated.label = 'أخضر';
                hasChanges = true;
            }
            if (v.id === 'yellow' || v.label === 'اصفر' || v.label === 'أصفر') {
                updated.id = 'yellow';
                updated.label = 'أصفر';
                hasChanges = true;
            }
            if (v.id === 'orange' || v.label === 'برتقالي') {
                updated.id = 'orange';
                updated.label = 'برتقالي';
                hasChanges = true;
            }
            if (v.id === 'pink' || v.label === 'وردي' || v.label === 'زهري') {
                updated.id = 'pink';
                updated.label = 'وردي';
                hasChanges = true;
            }
            if (v.id === 'purple' || v.label === 'بنفسجي') {
                updated.id = 'purple';
                updated.label = 'بنفسجي';
                hasChanges = true;
            }

            return updated;
        });

        if (hasChanges) {
            console.log(`🔄 تحديث: ${product.name}`);
            console.log(`   الألوان: ${variants.map((v: any) => v.label).join(', ')}`);

            await sql`
                UPDATE products 
                SET variants = ${JSON.stringify(variants)}::jsonb
                WHERE id = ${product.id}
            `;

            updatedCount++;
        }
    }

    console.log("\n═══════════════════════════════════════");
    console.log(`✅ تم تحديث ${updatedCount} منتج!`);
    console.log("═══════════════════════════════════════");

    process.exit(0);
}

fixColorNames().catch(console.error);
