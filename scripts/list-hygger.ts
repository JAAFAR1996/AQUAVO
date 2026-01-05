import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq, ilike, or } from "drizzle-orm";

async function listHygger() {
    const db = getDb();
    if (!db) process.exit(1);

    console.log("🔍 Scanning for Hygger products...");

    const items = await db.select().from(products)
        .where(or(
            eq(products.brand, "Hygger"),
            ilike(products.name, "%Hygger%"),
            ilike(products.name, "%هيجر%")
        ));

    console.log(`📊 Total Hygger Products: ${items.length}\n`);

    // Group by category
    const byCategory: Record<string, typeof items> = {};
    for (const p of items) {
        const cat = p.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(p);
    }

    for (const [cat, list] of Object.entries(byCategory)) {
        console.log(`📂 Category: ${cat} (${list.length})`);
        list.forEach(p => console.log(`   - [${p.id}] ${p.name}`));
    }

    process.exit(0);
}

listHygger().catch(console.error);
