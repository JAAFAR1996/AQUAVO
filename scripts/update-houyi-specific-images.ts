/**
 * Update specific Houyi product images
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const updates = [
    // Polished Driftwood (all sizes use same image)
    {
        pattern: 'houyi-polished-driftwood%',
        image: '/images/products/houyi/polished-driftwood/polished-driftwood.png'
    },
    // Moss Tree
    {
        id: 'houyi-moss-tree',
        image: '/images/products/houyi/moss-tree/moss-tree.png'
    },
    // Rhododendron (all sizes)
    {
        pattern: 'houyi-rhododendron%',
        image: '/images/products/houyi/rhododendron-root/rhododendron-root.png'
    },
];

async function main() {
    console.log('=== Updating Product Images ===\n');

    for (const update of updates) {
        try {
            const images = JSON.stringify([update.image]);

            if (update.id) {
                await db.execute(sql`
          UPDATE products 
          SET thumbnail = ${update.image},
              images = ${images}::jsonb,
              updated_at = NOW()
          WHERE id = ${update.id}
        `);
                console.log(`✅ Updated: ${update.id}`);
            } else if (update.pattern) {
                const result = await db.execute(sql`
          UPDATE products 
          SET thumbnail = ${update.image},
              images = ${images}::jsonb,
              updated_at = NOW()
          WHERE id LIKE ${update.pattern}
          RETURNING id
        `);
                console.log(`✅ Updated ${result.rows.length} products matching: ${update.pattern}`);
            }
        } catch (err: any) {
            console.error(`❌ Error: ${err.message}`);
        }
    }

    console.log('\nDone!');
    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
