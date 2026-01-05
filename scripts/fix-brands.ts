/**
 * Fix product brands - change عام to YEE for products with YEE in name
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function fixBrands() {
    console.log("🔧 Fixing product brands...\n");

    // Fix YEE products that have عام brand
    const result = await sql`
        UPDATE products 
        SET brand = 'YEE'
        WHERE brand = 'عام' 
        AND name LIKE '%YEE%'
        RETURNING id, name, brand
    `;

    console.log(`✅ Updated ${result.length} products to YEE brand:`);
    for (const p of result) {
        console.log(`  - ${p.name}`);
    }

    // Check remaining عام products
    const remaining = await sql`
        SELECT id, name, brand 
        FROM products 
        WHERE brand = 'عام'
    `;

    console.log(`\n📊 Remaining عام products: ${remaining.length}`);
    for (const p of remaining) {
        console.log(`  - ${p.name}`);
    }
}

fixBrands().catch(console.error);
