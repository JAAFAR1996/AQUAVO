import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verifyFormatting() {
    const db = getDb();
    if (!db) process.exit(1);

    console.log("🔍 Verifying Description Formatting...");

    const product = await db.query.products.findFirst({
        where: eq(products.id, "houyi-dutch-sand")
    });

    if (product) {
        console.log("---------------------------------------------------");
        console.log(product.description);
        console.log("---------------------------------------------------");

        if (product.description?.includes("\n\n**\"الفائدة\":**")) {
            console.log("✅ Double newline before Benefit verified.");
        } else {
            console.log("❌ Double newline MISSING.");
        }
    } else {
        console.log("Product not found.");
    }

    process.exit(0);
}

verifyFormatting().catch(console.error);
