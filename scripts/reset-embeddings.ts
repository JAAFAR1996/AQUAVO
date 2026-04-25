import { getDb } from "../server/db.js";
import { productEmbeddings } from "../shared/schema.js";

async function main() {
  console.log("🧹 Resetting product embeddings...");
  
  const db = getDb();
  try {
    const result = await db.delete(productEmbeddings);
    console.log("✅ Successfully cleared all product embeddings.");
    console.log("The system will lazily regenerate them using text-embedding-004 as products are viewed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing embeddings:", error);
    process.exit(1);
  }
}

main();
