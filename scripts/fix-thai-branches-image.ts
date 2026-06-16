import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

const IMAGE = "/images/products/houyi/houyi-thai-branch-peeled/houyi-thai-branch-peeled-1.png";

async function fix() {
    const rows = await sql`
        SELECT id, name, thumbnail, images
        FROM products
        WHERE slug = 'houyi-thai-branches'
        LIMIT 1
    `;

    if (rows.length === 0) {
        console.error("❌ Product not found: houyi-thai-branches");
        process.exit(1);
    }

    const p = rows[0];
    console.log(`Found: ${p.id} — ${p.name}`);
    console.log(`Current thumbnail: ${p.thumbnail}`);
    console.log(`Current images:   ${JSON.stringify(p.images)}`);

    await sql`
        UPDATE products
        SET
            thumbnail = ${IMAGE},
            images    = ${JSON.stringify([IMAGE])}::jsonb
        WHERE slug = 'houyi-thai-branches'
    `;

    console.log(`\n✅ Updated to: ${IMAGE}`);
    process.exit(0);
}

fix().catch(e => { console.error("❌", e.message); process.exit(1); });
