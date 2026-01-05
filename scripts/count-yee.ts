import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { count, like, or, eq, ilike } from "drizzle-orm";

async function countYee() {
    const db = getDb();
    if (!db) {
        console.error("❌ No DB connection");
        process.exit(1);
    }

    console.log("🔍 Counting YEE products...");

    // Count by Brand column
    const [brandCount] = await db.select({ count: count() })
        .from(products)
        .where(eq(products.brand, "YEE"));

    // Count by Name containing YEE (case insensitive)
    const [nameCount] = await db.select({ count: count() })
        .from(products)
        .where(ilike(products.name, "%YEE%"));

    console.log(`📊 Products with BRAND = 'YEE': ${brandCount.count}`);
    console.log(`📊 Products with NAME containing 'YEE': ${nameCount.count}`);

    // List a few to verify
    const sample = await db.select({ name: products.name, brand: products.brand })
        .from(products)
        .where(or(eq(products.brand, "YEE"), ilike(products.name, "%YEE%")))
        .limit(5);

    console.log("\n📋 Sample YEE Products:");
    sample.forEach(p => console.log(`- [${p.brand}] ${p.name}`));

    process.exit(0);
}

countYee().catch(console.error);
