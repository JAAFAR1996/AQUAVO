import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
  console.log("Connected to DB\n");

  // 1. Count products with PNG/JPG paths (jsonb array)
  const countResult = await sql`
    SELECT COUNT(*) as total FROM products 
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(images) img 
      WHERE img ~ '\\.(png|jpg|jpeg)$'
    )
  `;
  console.log(`Products with PNG/JPG paths: ${countResult[0].total}`);

  // 2. Show what will change
  const preview = await sql`
    SELECT id, name, 
      (SELECT jsonb_agg(img) FROM jsonb_array_elements_text(images) img WHERE img ~ '\\.(png|jpg|jpeg)$') as old_paths
    FROM products 
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(images) img 
      WHERE img ~ '\\.(png|jpg|jpeg)$'
    )
    LIMIT 5
  `;
  console.log("\nPreview (first 5):");
  preview.forEach(p => {
    console.log(`  ${p.name}:`);
    const paths = Array.isArray(p.old_paths) ? p.old_paths : JSON.parse(p.old_paths || '[]');
    paths.forEach(img => console.log(`    ${img} → ${img.replace(/\.(png|jpe?g)$/i, '.webp')}`));
  });

  // 3. Update all image paths from .png/.jpg/.jpeg to .webp
  const updateResult = await sql`
    UPDATE products 
    SET images = (
      SELECT jsonb_agg(
        CASE 
          WHEN img::text ~ '\\.(png|jpg|jpeg)"?$'
          THEN regexp_replace(img::text, '\\.(png|jpg|jpeg)("?)$', '.webp\\2')
          ELSE img::text
        END
      )
      FROM jsonb_array_elements_text(images) img
    ),
    updated_at = NOW()
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(images) img 
      WHERE img ~ '\\.(png|jpg|jpeg)$'
    )
    RETURNING id, name
  `;
  console.log(`\n✓ Updated ${updateResult.length} products:`);
  updateResult.forEach(p => console.log(`  ✓ ${p.name}`));

  // 4. Also update thumbnail column
  const thumbResult = await sql`
    UPDATE products 
    SET thumbnail = regexp_replace(thumbnail, '\\.(png|jpg|jpeg)$', '.webp'),
        updated_at = NOW()
    WHERE thumbnail ~ '\\.(png|jpg|jpeg)$'
    RETURNING id, name, thumbnail
  `;
  console.log(`\n✓ Updated ${thumbResult.length} thumbnails:`);
  thumbResult.forEach(p => console.log(`  ✓ ${p.name}: ${p.thumbnail}`));

  // 5. Update variants jsonb (images inside variants)
  const variantCheck = await sql`
    SELECT id, name, variants->0->'images' as var_images 
    FROM products 
    WHERE has_variants = true AND variants IS NOT NULL
    LIMIT 2
  `;
  console.log("\nVariant images sample:");
  variantCheck.forEach(p => console.log(`  ${p.name}: ${JSON.stringify(p.var_images)}`));

  if (variantCheck.length > 0 && variantCheck[0].var_images) {
    // Update variant images too - replace .png/.jpg/.jpeg with .webp inside the jsonb
    const varResult = await sql`
      UPDATE products
      SET variants = (
        SELECT jsonb_agg(
          jsonb_set(
            variant,
            '{images}',
            COALESCE(
              (SELECT jsonb_agg(
                regexp_replace(vimg::text, '\\.(png|jpg|jpeg)("?)$', '.webp\\2')
              )
              FROM jsonb_array_elements_text(variant->'images') vimg),
              '[]'::jsonb
            )
          )
        )
        FROM jsonb_array_elements(variants) variant
      ),
      updated_at = NOW()
      WHERE has_variants = true 
        AND variants IS NOT NULL
        AND variants::text ~ '\\.(png|jpg|jpeg)'
      RETURNING id, name
    `;
    console.log(`\n✓ Updated ${varResult.length} products with variant images`);
    varResult.forEach(p => console.log(`  ✓ ${p.name}`));
  }

  // 6. Verify
  const verify = await sql`
    SELECT name, images->0 as first_image FROM products LIMIT 5
  `;
  console.log("\nVerification AFTER update:");
  verify.forEach(p => console.log(`  ${p.name}: ${p.first_image}`));

  // Count remaining PNG/JPG
  const remaining = await sql`
    SELECT COUNT(*) as total FROM products 
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(images) img 
      WHERE img ~ '\\.(png|jpg|jpeg)$'
    )
  `;
  console.log(`\nRemaining PNG/JPG paths: ${remaining[0].total}`);

  console.log("\nDone!");
}

main().catch(e => console.error("ERROR:", e.message));
