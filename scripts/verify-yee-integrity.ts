import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkIntegrity() {
    const db = getDb();
    if (!db) process.exit(1);

    console.log("🔍 Verifying YEE Products Data Integrity...");

    const allYee = await db.select().from(products).where(eq(products.brand, "YEE"));

    let healthyCount = 0;
    let hollowCount = 0; // Has benefits but NO tech specs
    let legacyCount = 0; // No benefits (Old content)

    const hollowProducts: typeof allYee = [];

    for (const p of allYee) {
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

    console.log(`\n📊 Status Report (Total: ${allYee.length}):`);
    console.log(`✅ Healthy (Benefits + Specs): ${healthyCount}`);
    console.log(`⚠️ Hollow (Benefits Only):   ${hollowCount}`);
    console.log(`❌ Legacy (Old Content):     ${legacyCount}`);

    if (hollowCount > 0) {
        console.log(`\n⚠️ Found ${hollowCount} products with missing Technical Specs:`);
        hollowProducts.forEach(p => console.log(`   - [${p.id}] ${p.name}`));
    }

    // Legacy should be 0 since we just updated the last 13
    if (legacyCount > 0) {
        console.log(`\n❌ Found ${legacyCount} legacy items (Should be 0?):`);
        // We can list them if needed
    }

    process.exit(0);
}

checkIntegrity().catch(console.error);
