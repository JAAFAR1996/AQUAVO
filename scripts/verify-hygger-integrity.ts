import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq, or, ilike } from "drizzle-orm";

async function verifyHygger() {
    const db = getDb();
    if (!db) process.exit(1);

    console.log("🔍 Verifying Hygger Products Data Integrity...");

    const allHygger = await db.select().from(products)
        .where(or(
            eq(products.brand, "Hygger"),
            ilike(products.name, "%Hygger%"),
            ilike(products.name, "%هيجر%")
        ));

    let healthyCount = 0;
    let hollowCount = 0; // Has benefits but NO tech specs
    let legacyCount = 0; // No benefits (Old content)

    const hollowProducts: typeof allHygger = [];

    for (const p of allHygger) {
        const specs = p.specifications as any || {};
        const hasBenefits = Array.isArray(specs.benefits) && specs.benefits.length > 0;

        // Check for tech specs: keys that are NOT 'benefits' or 'brand'
        const techKeys = Object.keys(specs).filter(k => !['benefits', 'brand', 'difficulty', 'ecoFriendly'].includes(k));
        const hasTechSpecs = techKeys.length > 0;

        if (hasBenefits && hasTechSpecs) {
            healthyCount++;
        } else if (hasBenefits && !hasTechSpecs) {
            hollowCount++;
            hollowProducts.push(p);
        } else {
            legacyCount++;
        }
    }

    console.log(`\n📊 Status Report (Total: ${allHygger.length}):`);
    console.log(`✅ Healthy (Benefits + Specs): ${healthyCount}`);
    console.log(`⚠️ Hollow (Benefits Only):   ${hollowCount}`);
    console.log(`❌ Legacy (Old Content):     ${legacyCount}`);

    if (hollowCount > 0) {
        console.log(`\n⚠️ Found ${hollowCount} products with missing Technical Specs:`);
        hollowProducts.forEach(p => console.log(`   - [${p.id}] ${p.name}`));
    }

    if (legacyCount > 0) {
        console.log(`\n❌ Found ${legacyCount} legacy items:`);
    }

    process.exit(0);
}

verifyHygger().catch(console.error);
