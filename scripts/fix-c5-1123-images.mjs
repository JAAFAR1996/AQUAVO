import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");

const IMAGES = [
  "/images/products/yee/yee-tank-601515/Reference_image_editing_2k_202602202013.webp",
  "/images/products/yee/yee-tank-601515/Reference_image_editing_2k_202602202014.webp",
  "/images/products/yee/yee-tank-601515/Reference_image_editing_2k_202602202013 (2).webp",
];

const THUMBNAIL = IMAGES[0];

async function main() {
  // Show current state
  const current = await sql`
    SELECT id, slug, name, images, thumbnail FROM products WHERE slug = 'c5-1123'
  `;
  if (current.length === 0) {
    console.error("Product c5-1123 not found in DB");
    process.exit(1);
  }
  console.log("Current:", current[0].slug, JSON.stringify(current[0].images));

  // Update
  const result = await sql`
    UPDATE products
    SET images = ${JSON.stringify(IMAGES)}::jsonb,
        thumbnail = ${THUMBNAIL},
        updated_at = NOW()
    WHERE slug = 'c5-1123'
    RETURNING id, slug, name, images, thumbnail
  `;
  console.log("Updated:", result[0].slug, JSON.stringify(result[0].images));
  console.log("Thumbnail:", result[0].thumbnail);
  console.log("Done.");
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
