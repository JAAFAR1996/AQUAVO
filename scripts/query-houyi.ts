import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
    const rows = await sql`SELECT id, name, category, brand FROM products WHERE brand = 'Houyi' OR name ILIKE '%HOUYI%' OR name ILIKE '%houyi%' ORDER BY category, name`;
    console.log(`Total: ${rows.length} products\n`);
    for (const r of rows) {
        console.log(`[${r.category}] ${r.id} => ${r.name}`);
    }
}

main().catch(console.error);
