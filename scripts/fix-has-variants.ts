import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function main() {
  // Fix has_variants for polished driftwood
  const result = await sql`
    UPDATE products 
    SET has_variants = true 
    WHERE slug = 'houyi-polished-driftwood'
    RETURNING id, name, has_variants
  `;
  console.log("✅ تم تحديث has_variants:");
  console.log(JSON.stringify(result[0], null, 2));

  // Also check: are there other products with variants data but has_variants=false?
  const broken = await sql`
    SELECT slug, name, has_variants, jsonb_array_length(variants::jsonb) as variant_count
    FROM products 
    WHERE variants IS NOT NULL 
      AND variants::text != '[]' 
      AND variants::text != 'null'
      AND has_variants = false
      AND deleted_at IS NULL
  `;
  
  if (broken.length > 0) {
    console.log(`\n⚠️ وجدت ${broken.length} منتج آخر عنده variants لكن has_variants=false:`);
    for (const b of broken) {
      console.log(`  - [${b.slug}] ${b.name} (${b.variant_count} variants)`);
    }
    
    // Fix them all
    const fixResult = await sql`
      UPDATE products 
      SET has_variants = true 
      WHERE variants IS NOT NULL 
        AND variants::text != '[]' 
        AND variants::text != 'null'
        AND has_variants = false
        AND deleted_at IS NULL
      RETURNING slug, name
    `;
    console.log(`\n✅ تم إصلاح ${fixResult.length} منتج إضافي`);
    for (const f of fixResult) {
      console.log(`  ✅ ${f.slug} - ${f.name}`);
    }
  } else {
    console.log("\n✅ لا توجد منتجات أخرى بنفس المشكلة");
  }
}

main().catch(console.error);
