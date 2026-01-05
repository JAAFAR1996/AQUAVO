/**
 * Check and fix product brands
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function checkBrands() {
    console.log("🔍 Checking product brands...\n");

    // Get products with issues
    const products = await sql`
        SELECT id, name, brand 
        FROM products 
        WHERE id IN (
            'yee-sponge-filter', 
            'yee-uk-plug-adapter', 
            'yee-battery-air-pump', 
            'yee-cylinder-air-stone'
        )
    `;

    console.log("Current brands:");
    for (const p of products) {
        console.log(`  ${p.name} -> Brand: ${p.brand}`);
    }

    // These should be different brands or marked as 'عام'
    // The user says these are NOT YEE products

    console.log("\n❓ These products need brand correction.");
    console.log("What should be their correct brands?");
}

checkBrands().catch(console.error);
