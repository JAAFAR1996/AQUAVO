/**
 * Migration script: Update HYGGER HG-957 variant labels from wattage to tank size
 * 
 * Changes:
 *   - "36 واط" → "60-76 سم"
 *   - "48 واط" → "76-90 سم"
 * 
 * Run: npx tsx scripts/update-hygger-variants.ts
 * Requires: DATABASE_URL environment variable
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set!");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  console.log("🔄 Updating HYGGER HG-957 variant labels...\n");

  // 1. Read current variants
  const { rows } = await pool.query(
    `SELECT id, name, variants FROM products WHERE id = $1`,
    ["hygger-hg957-36w"]
  );

  if (rows.length === 0) {
    console.error("❌ Product hygger-hg957-36w not found!");
    process.exit(1);
  }

  const product = rows[0];
  const variants = product.variants;

  console.log("📦 Product:", product.name);
  console.log("📋 Current variants:");
  for (const v of variants) {
    console.log(`   - ${v.id}: "${v.label}" (${v.price} IQD)`);
  }

  // 2. Update labels
  const updatedVariants = variants.map((v: any) => {
    if (v.id === "36") {
      return { ...v, label: "60-76 سم" };
    }
    if (v.id === "48") {
      return { ...v, label: "76-90 سم" };
    }
    return v;
  });

  // 3. Write back to DB
  await pool.query(
    `UPDATE products SET variants = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(updatedVariants), "hygger-hg957-36w"]
  );

  console.log("\n✅ Updated variants:");
  for (const v of updatedVariants) {
    console.log(`   - ${v.id}: "${v.label}" (${v.price} IQD)`);
  }

  console.log("\n🎉 Done! Variant labels changed from wattage to tank size.");

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
