import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq, ilike, or } from "drizzle-orm";

async function listHouyi() {
    const db = getDb();
    if (!db) process.exit(1);

    console.log("🔍 Scanning for Houyi products...");

    // Search by brand "Houyi" or name containing "Houyi"
    const items = await db.select().from(products)
        .where(or(
            eq(products.brand, "Houyi"),
            ilike(products.name, "%Houyi%"),
            ilike(products.name, "%هوي%") // Possible Arabic transliteration if exists
        ));

    console.log(`📊 Total Houyi Products: ${items.length}\n`);

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

listHouyi().catch(console.error);
