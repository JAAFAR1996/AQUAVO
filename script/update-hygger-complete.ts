/**
 * Update HYGGER HG978-18W with official images and specifications
 * Run: npx tsx script/update-hygger-complete.ts
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

const sql = neon(DATABASE_URL);

async function updateHyggerComplete() {
    console.log("🔧 Updating HYGGER HG978-18W with official data...");

    // Official Gallery Images from hyggerstore.com
    const officialImages = [
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_1.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_2.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_3.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_4.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_5.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_6.jpg",
        "https://www.hyggerstore.com/wp-content/uploads/2022/08/HG-978_7.jpg"
    ];

    // Enhanced Arabic description
    const description = `إضاءة LED احترافية بطيف كامل للأحواض المزروعة | وضع 24/7 يحاكي الطبيعة (شروق-نهار-غروب-ليل) | 7 ألوان RGB قابلة للتخصيص | مؤقت قابل للضبط | أقواس معدنية قابلة للتمديد | هيكل ألمنيوم لتبريد ممتاز | مناسب للأحواض 45-60 سم`;

    // Full specifications from official website
    const specifications = {
        // Basic
        model: "HG-978",
        power: "18W",
        inputVoltage: "AC 100-240V",
        outputVoltage: "DC 20V",
        ledCount: "78 LED",
        ledType: "5050 RGB + White",
        colorTemp: "6500K Full Spectrum",

        // Tank size
        lightSize: "18 بوصة (45 سم)",
        tankFit: "18-24 بوصة (45-60 سم)",

        // Features
        mode24h: true,
        adjustableTimer: true,
        timerOptions: "6, 10, 12 ساعة",
        brightnessLevels: "0-100% (بزيادة 10%)",
        colors: "7 ألوان RGB",
        remoteControl: false,

        // Design
        material: "هيكل ألمنيوم",
        brackets: "أقواس معدنية قابلة للتمديد",
        cordLength: "5.9 + 2.3 قدم (2.5 متر)",
        waterproof: true,

        // What's in the box
        packageContents: "إضاءة LED + محول طاقة + 2 قوس معدني + دليل المستخدم",

        // Sizing Guide
        sizingGuide: {
            "14W": "12-18 بوصة",
            "18W": "18-24 بوصة",
            "22W": "24-30 بوصة",
            "26W": "30-36 بوصة",
            "36W": "36-42 بوصة",
            "42W": "48-54 بوصة"
        },

        // Legacy
        difficulty: "easy",
        ecoFriendly: true
    };

    try {
        const updateResult = await sql`
            UPDATE products 
            SET 
                images = ${JSON.stringify(officialImages)}::jsonb,
                thumbnail = ${officialImages[0]},
                description = ${description},
                specifications = ${JSON.stringify(specifications)}::jsonb,
                updated_at = NOW()
            WHERE id = 'hygger-hg978-18w'
            RETURNING id, name
        `;

        if (updateResult.length > 0) {
            console.log("✅ Successfully updated:", updateResult[0].name);
            console.log(`📸 Added ${officialImages.length} official images`);
            console.log("📝 Updated description and specifications");
            console.log("\n🖼️ Images:");
            officialImages.forEach((img, i) => console.log(`   ${i + 1}. ${img}`));
        } else {
            console.log("❌ Product not found");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

updateHyggerComplete();
