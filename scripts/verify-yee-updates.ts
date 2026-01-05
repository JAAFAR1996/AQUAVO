import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

async function verify() {
    const db = getDb();
    if (!db) {
        console.error("❌ No DB connection");
        process.exit(1);
    }

    const idsToCheck = [
        "yee-yee-black-warrior-heater-100w",
        "yee-imitation-red-worm-feed-05mm-115g",
        "yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces"
    ];

    console.log("🔍 Verifying 3 updated products...\n");

    const results = await db.select().from(products).where(inArray(products.id, idsToCheck));

    for (const p of results) {
        console.log(`✅ Product: ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Description Start: ${p.description?.substring(0, 50)}...`);

        const specs = p.specifications as any;
        console.log(`   Benefits:`, specs?.benefits);
        console.log(`   Brand in Specs:`, specs?.brand);
        console.log("---------------------------------------------------");
    }

    if (results.length === 0) {
        console.log("❌ No products found! Update might have failed silently or IDs are wrong.");
    }

    process.exit(0);
}

verify().catch(console.error);
