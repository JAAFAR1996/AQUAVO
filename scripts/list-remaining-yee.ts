import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq, sql, and, not } from "drizzle-orm";

async function listRemaining() {
    const db = getDb();
    if (!db) process.exit(1);

    console.log("🔍 Scanning for remaining YEE products...");

    // We identify "updated" products by checking if they have the new 'benefits' array in specifications
    // OR if we track them by ID. I'll check for specs that are null or missing 'benefits'.

    const allYee = await db.select().from(products)
        .where(eq(products.brand, "YEE"));

    const remaining = allYee.filter(p => {
        const specs = p.specifications as any;
        return !specs || !specs.benefits || !Array.isArray(specs.benefits);
    });

    console.log(`📊 Total YEE: ${allYee.length}`);
    console.log(`📋 Remaining to Update: ${remaining.length}\n`);

    // Group by category for easier planning
    const byCategory: Record<string, typeof remaining> = {};
    for (const p of remaining) {
        const cat = p.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(p);
    }

    for (const [cat, items] of Object.entries(byCategory)) {
        console.log(`\n📂 Category: ${cat} (${items.length})`);
        items.forEach(p => console.log(`   - [${p.id}] ${p.name}`));
    }

    process.exit(0);
}

listRemaining().catch(console.error);
