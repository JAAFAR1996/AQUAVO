/**
 * Update HYGGER HG978-18W with multiple images
 * Run: npx tsx script/update-hygger-images.ts
 */

import { neon } from "@neondatabase/serverless";

// Direct connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

const sql = neon(DATABASE_URL);

async function updateHyggerProduct() {
    console.log("🔍 Looking for HYGGER HG978-18W product...");

    // New images array with official Hygger images
    const newImages = [
        "https://hyggerstore.com/wp-content/uploads/2023/04/HG-978_1.jpg",
        "https://hyggerstore.com/wp-content/uploads/2023/04/HG-978_2.jpg",
        "https://hyggerstore.com/wp-content/uploads/2023/04/HG-978_3.jpg",
        "https://hyggerstore.com/wp-content/uploads/2023/04/HG-978_4.jpg",
        "https://hyggerstore.com/wp-content/uploads/2023/04/HG-978_5.jpg",
        "https://hyggerstore.com/wp-content/uploads/2023/04/HG-978_6.jpg"
    ];

    // Enhanced specifications
    const newSpecifications = {
        difficulty: "easy",
        ecoFriendly: true,
        power: "18W",
        ledCount: "98 LED",
        lumens: "1075 لومن",
        tankSize: "45-60 سم",
        colorTemp: "6500K",
        colors: "7 ألوان",
        brightnessLevels: "9 مستويات",
        lifespan: "50,000+ ساعة",
        waterproof: true,
        remoteControl: true,
        mode24h: true
    };

    // Enhanced description
    const newDescription = "إضاءة LED احترافية للأحواض 45-60 سم | دورة إضاءة 24/7 طبيعية | 7 ألوان قابلة للتخصيص | ريموت كنترول | 98 LED | 1075 لومن | طيف كامل 6500K";

    try {
        // First, check what products exist
        const allProducts = await sql`SELECT id, name, slug FROM products LIMIT 10`;
        console.log("📋 Sample products in database:", allProducts);

        // Search for HYGGER
        const findResult = await sql`
      SELECT id, name, slug FROM products 
      WHERE slug ILIKE '%hygger%' OR name ILIKE '%hygger%'
      LIMIT 5
    `;

        console.log("📋 HYGGER products found:", findResult);

        if (findResult.length === 0) {
            console.log("⚠️ No HYGGER product found. Creating new product...");

            // INSERT the product
            const insertResult = await sql`
              INSERT INTO products (
                id, slug, name, brand, category, subcategory, description, 
                price, currency, images, thumbnail, rating, review_count, 
                stock, low_stock_threshold, is_new, is_best_seller, 
                is_product_of_week, specifications, created_at, updated_at
              ) VALUES (
                'hygger-hg978-18w',
                'hygger-hg978-18w',
                'HYGGER HG978-18W',
                'Hygger',
                'lighting',
                'led',
                ${newDescription},
                '16751',
                'IQD',
                ${JSON.stringify(newImages)}::jsonb,
                ${newImages[0]},
                '4.5',
                8,
                8,
                3,
                true,
                true,
                false,
                ${JSON.stringify(newSpecifications)}::jsonb,
                NOW(),
                NOW()
              )
              RETURNING id, name, slug
            `;

            console.log("✅ Created new product:", insertResult);
            console.log(`📸 With ${newImages.length} images`);
            return;
        }

        // Update existing product(s)
        const updateResult = await sql`
      UPDATE products 
      SET 
        images = ${JSON.stringify(newImages)}::jsonb,
        thumbnail = ${newImages[0]},
        description = ${newDescription},
        specifications = ${JSON.stringify(newSpecifications)}::jsonb,
        updated_at = NOW()
      WHERE slug ILIKE '%hygger%' AND slug ILIKE '%18w%'
         OR name ILIKE '%hygger%' AND name ILIKE '%18w%'
      RETURNING id, name, slug
    `;

        if (updateResult.length > 0) {
            console.log("✅ Successfully updated product(s):");
            updateResult.forEach(p => {
                console.log(`   - ${p.name} (${p.slug})`);
            });
            console.log(`\n📸 Added ${newImages.length} images`);
            console.log(`📝 Updated description and specifications`);
        } else {
            console.log("⚠️ No products were updated");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

updateHyggerProduct();
