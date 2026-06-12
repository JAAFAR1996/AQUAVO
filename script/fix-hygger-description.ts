/**
 * Fix HYGGER description format
 * Run: npx tsx script/fix-hygger-description.ts
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

const sql = neon(DATABASE_URL);

async function fixDescription() {
    console.log("🔧 Fixing HYGGER HG978-18W description...");

    // Better formatted description - short and clean
    const newDescription = "إضاءة LED احترافية بطيف كامل للأحواض المزروعة. تدعم وضع 24/7 لمحاكاة الإضاءة الطبيعية مع 7 ألوان RGB قابلة للتخصيص ومؤقت قابل للضبط. مناسبة للأحواض 45-60 سم.";

    try {
        const updateResult = await sql`
            UPDATE products 
            SET 
                description = ${newDescription},
                updated_at = NOW()
            WHERE id = 'hygger-hg978-18w'
            RETURNING id, name, description
        `;

        if (updateResult.length > 0) {
            console.log("✅ Updated:", updateResult[0].name);
            console.log("\n📝 New description:");
            console.log(updateResult[0].description);
        } else {
            console.log("❌ Product not found");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

fixDescription();
