/**
 * فحص بسيط لقاعدة البيانات
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
}

// إظهار جزء من الـ URL للتأكيد
console.log("\n═══════════════════════════════════════════════════");
console.log("🔗 DATABASE_URL (أول 70 حرف):");
console.log(DATABASE_URL.substring(0, 70) + "...");
console.log("═══════════════════════════════════════════════════\n");

const sql = neon(DATABASE_URL);

async function check() {
    // عدد المنتجات
    const result = await sql`SELECT COUNT(*) as total FROM products`;
    console.log(`✅ إجمالي المنتجات في قاعدة البيانات: ${result[0].total}`);

    // فحص منتج معين
    const glue = await sql`
        SELECT name, price, has_variants 
        FROM products 
        WHERE slug LIKE '%glue%' OR slug LIKE '%instant%'
        LIMIT 1
    `;

    if (glue.length > 0) {
        console.log(`\n📦 منتج اللصق:`);
        console.log(`   - الاسم: ${glue[0].name}`);
        console.log(`   - السعر: ${glue[0].price}`);
        console.log(`   - لديه خيارات: ${glue[0].has_variants ? 'نعم ✅' : 'لا ❌'}`);
    }

    process.exit(0);
}

check().catch(e => {
    console.error("Error:", e.message);
    process.exit(1);
});
