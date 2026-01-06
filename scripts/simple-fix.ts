/**
 * إصلاح سريع لمنتج اللصق
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

async function fix() {
    // عرض كل المنتجات مع glue
    const products = await sql`
        SELECT id, name, slug FROM products 
        WHERE slug LIKE '%instant%' OR slug LIKE '%50g%'
    `;

    console.log("المنتجات الموجودة:");
    products.forEach(p => {
        console.log(`- ${p.id}: ${p.name} (${p.slug})`);
    });

    if (products.length === 0) {
        // جرب بحث آخر
        const allProducts = await sql`SELECT id, name FROM products LIMIT 10`;
        console.log("\nأول 10 منتجات:");
        allProducts.forEach(p => {
            console.log(`- ${p.id}: ${p.name}`);
        });
    }

    // تحديث مباشر بدون JSONB cast
    const variants = [
        { id: "5g-green", label: "5 جرام - أخضر", price: 0, stock: 50, isDefault: false },
        { id: "5g-white", label: "5 جرام - أبيض", price: 0, stock: 50, isDefault: false },
        { id: "20g-white", label: "20 جرام - أبيض", price: 0, stock: 50, isDefault: false },
        { id: "50g-clear", label: "50 جرام - شفاف", price: 0, stock: 50, isDefault: true }
    ];

    // تحديث أي منتج يحتوي على "instant" أو "50g" في الاسم
    const result = await sql`
        UPDATE products 
        SET has_variants = true
        WHERE slug LIKE '%instant%' OR LOWER(name) LIKE '%instant%'
        RETURNING id, name
    `;

    console.log("\nتم تحديث has_variants للمنتجات:");
    result.forEach(p => console.log(`- ${p.id}: ${p.name}`));

    process.exit(0);
}

fix().catch(e => {
    console.error("Error:", e);
    process.exit(1);
});
