
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root
dotenv.config({ path: resolve(__dirname, '../.env') });
// fallback if not found
if (!process.env.DATABASE_URL) dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function listYeeProducts() {
    console.log("🔍 Searching for YEE products...\n");

    const products = await sql`
        SELECT id, name, description, brand, images, thumbnail, specifications 
        FROM products 
        WHERE name ILIKE '%YEE%' OR brand = 'YEE'
    `;

    console.log(`Found ${products.length} products:`);
    console.log(JSON.stringify(products, null, 2));
}

listYeeProducts().catch(console.error);
