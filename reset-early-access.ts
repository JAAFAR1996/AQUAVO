
import { db } from "./server/db";
import { earlyAccessLeads, coupons } from "./shared/schema";
import { eq, like } from "drizzle-orm";

async function resetEarlyAccess() {
    console.log("Starting Early Access Reset...");

    try {
        // 1. Delete all leads
        const deletedLeads = await db.delete(earlyAccessLeads);
        console.log(`✅ Deleted all early access leads.`);

        // 2. Delete all coupons starting with AQUA- (Early access pattern)
        // using like is safer than deleting all coupons
        const deletedCoupons = await db.delete(coupons).where(like(coupons.code, 'AQUA-%'));
        console.log(`✅ Deleted all Early Access coupons (AQUA-...).`);

        console.log("🚀 Reset complete! Counter should show default value (24) now.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error resetting data:", error);
        process.exit(1);
    }
}

resetEarlyAccess();
