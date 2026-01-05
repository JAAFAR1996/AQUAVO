import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq, or, ilike } from "drizzle-orm";

async function verifyHouyi() {
    const db = getDb();
    if (!db) process.exit(1);

    console.log("🔍 Verifying Houyi Products Data Integrity...");

    const allHouyi = await db.select().from(products)
        .where(or(
            eq(products.brand, "Houyi"),
            ilike(products.name, "%Houyi%"),
            ilike(products.name, "%هوي%")
        ));

    let healthyCount = 0;
    let hollowCount = 0; // Has benefits but NO tech specs (shouldn't happen with my script logic but checking)
    let legacyCount = 0; // No benefits (Old content)

    const legacyProducts: typeof allHouyi = [];

    for (const p of allHouyi) {
        const specs = p.specifications as any || {};
        const hasBenefits = Array.isArray(specs.benefits) && specs.benefits.length > 0;

        // Check for tech specs: keys that are NOT 'benefits' or 'brand'
        const techKeys = Object.keys(specs).filter(k => !['benefits', 'brand', 'difficulty', 'ecoFriendly'].includes(k));
        const hasTechSpecs = techKeys.length > 0;

        if (hasBenefits && hasTechSpecs) {
            healthyCount++;
        } else if (hasBenefits && !hasTechSpecs) {
            hollowCount++;
        } else {
            legacyCount++;
            legacyProducts.push(p);
        }
    }

    console.log(`\n📊 Status Report (Total: ${allHouyi.length}):`);
    console.log(`✅ Healthy (Benefits + Specs): ${healthyCount}`);
    console.log(`⚠️ Hollow (Benefits Only):   ${hollowCount}`);
    console.log(`❌ Legacy (Needs Update):    ${legacyCount}`);

    if (legacyCount > 0) {
        console.log(`\n📝 List of Remaining Products to Update (${legacyCount}):`);
        legacyProducts.forEach(p => console.log(`   - "${p.id}": ${p.name}`));
    }

    process.exit(0);
}

verifyHouyi().catch(console.error);
