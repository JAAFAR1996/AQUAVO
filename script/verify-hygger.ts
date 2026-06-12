/**
 * Verify HYGGER product data
 * Run: npx tsx script/verify-hygger.ts
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

const sql = neon(DATABASE_URL);

async function verifyHygger() {
    console.log("🔍 Checking HYGGER HG978-18W product data...\n");

    try {
        const result = await sql`
            SELECT id, name, description, images, specifications 
            FROM products 
            WHERE id = 'hygger-hg978-18w'
        `;

        if (result.length > 0) {
            const product = result[0];
            console.log("✅ Product Found:", product.name);
            console.log("\n📝 Description:");
            console.log(product.description);
            console.log("\n📸 Images (" + (product.images as string[]).length + "):");
            (product.images as string[]).forEach((img, i) => console.log(`   ${i + 1}. ${img}`));
            console.log("\n🔧 Specifications:");
            console.log(JSON.stringify(product.specifications, null, 2));
        } else {
            console.log("❌ Product not found");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

verifyHygger();
