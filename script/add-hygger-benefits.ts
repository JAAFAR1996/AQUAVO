/**
 * Add benefits to HYGGER product in database
 * Run: npx tsx script/add-hygger-benefits.ts
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

const sql = neon(DATABASE_URL);

async function addHyggerBenefits() {
    console.log("🔧 Adding benefits to HYGGER HG978-18W...");

    // Benefits to add to specifications
    const benefits = [
        "طيف ضوئي كامل 6500K يحاكي ضوء الشمس الطبيعي",
        "وضع 24/7 ذكي يحاكي دورة الإضاءة الطبيعية (شروق-نهار-غروب)",
        "يعزز نمو النباتات المائية ويبرز ألوان الأسماك",
        "7 ألوان RGB قابلة للتخصيص مع 9 مستويات سطوع",
        "هيكل ألمنيوم ممتاز للتبريد وعمر افتراضي +50,000 ساعة"
    ];

    try {
        // First get current specifications
        const current = await sql`
            SELECT specifications FROM products WHERE id = 'hygger-hg978-18w'
        `;

        if (current.length === 0) {
            console.log("❌ Product not found");
            return;
        }

        // Merge benefits into existing specifications
        const currentSpecs = current[0].specifications as Record<string, any>;
        const updatedSpecs = {
            ...currentSpecs,
            benefits: benefits
        };

        // Update the product
        const updateResult = await sql`
            UPDATE products 
            SET 
                specifications = ${JSON.stringify(updatedSpecs)}::jsonb,
                updated_at = NOW()
            WHERE id = 'hygger-hg978-18w'
            RETURNING id, name
        `;

        if (updateResult.length > 0) {
            console.log("✅ Successfully added benefits to:", updateResult[0].name);
            console.log("\n📋 Benefits added:");
            benefits.forEach((b, i) => console.log(`   ${i + 1}. ${b}`));
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

addHyggerBenefits();
