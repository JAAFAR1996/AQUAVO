/**
 * Fix HYGGER HG978-18W with correct image URLs
 * Run: npx tsx script/fix-hygger-final.ts
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

const sql = neon(DATABASE_URL);

async function fixHyggerImages() {
    console.log("🔧 Updating HYGGER HG978-18W with correct images...");

    // Correct image URLs from hyggerstore.com (2022/08 folder)
    const correctImages = [
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_1.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_2.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_5.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_7.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_6.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_4.jpg"
    ];

    try {
        const updateResult = await sql`
            UPDATE products 
            SET 
                images = ${JSON.stringify(correctImages)}::jsonb,
                thumbnail = ${correctImages[0]},
                updated_at = NOW()
            WHERE id = 'hygger-hg978-18w'
            RETURNING id, name
        `;

        if (updateResult.length > 0) {
            console.log("✅ Successfully updated:", updateResult[0].name);
            console.log(`📸 Added ${correctImages.length} images`);
            correctImages.forEach((img, i) => console.log(`   ${i + 1}. ${img}`));
        } else {
            console.log("❌ Product not found");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

fixHyggerImages();
