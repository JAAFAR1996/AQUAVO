import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
  console.log("Connected to DB\n");

  // 1. Check products table columns
  const productCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products'
    ORDER BY ordinal_position
  `;
  console.log("Products columns:");
  productCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  // 2. Sample current image paths
  const samples = await sql`SELECT id, name, images FROM products LIMIT 3`;
  console.log("\nSample images BEFORE update:");
  samples.forEach(p => {
    console.log(`  ${p.name}:`);
    const imgs = Array.isArray(p.images) ? p.images : [p.images];
    imgs.forEach(img => console.log(`    ${img}`));
  });

  // 3. Count products with PNG/JPG paths
  const countResult = await sql`
    SELECT COUNT(*) as total FROM products 
    WHERE EXISTS (
      SELECT 1 FROM unnest(images) img 
      WHERE img ~ '\\.(png|jpg|jpeg)$'
    )
  `;
  console.log(`\nProducts with PNG/JPG paths: ${countResult[0].total}`);

  if (parseInt(countResult[0].total) === 0) {
    console.log("No PNG/JPG paths found — already WebP or no local images.");
    
    // Check if paths contain .png/.jpg anywhere (not just at end)
    const anyPng = await sql`
      SELECT COUNT(*) as total FROM products 
      WHERE EXISTS (
        SELECT 1 FROM unnest(images) img 
        WHERE img LIKE '%.png%' OR img LIKE '%.jpg%' OR img LIKE '%.jpeg%'
      )
    `;
    console.log(`Products with .png/.jpg anywhere in path: ${anyPng[0].total}`);
    
    // Show ALL distinct image extensions
    const extensions = await sql`
      SELECT DISTINCT regexp_replace(img, '^.*\\.', '.') as ext, COUNT(*) as cnt
      FROM products, unnest(images) img
      GROUP BY ext
      ORDER BY cnt DESC
    `;
    console.log("\nImage extensions in DB:");
    extensions.forEach(e => console.log(`  ${e.ext}: ${e.cnt} images`));
    
    return;
  }

  // 4. Update PNG/JPG to WebP
  const updateResult = await sql`
    UPDATE products 
    SET images = (
      SELECT array_agg(
        CASE 
          WHEN img ~ '\\.(png|jpg|jpeg)$' 
          THEN regexp_replace(img, '\\.(png|jpg|jpeg)$', '.webp')
          ELSE img 
        END
      )
      FROM unnest(images) img
    )
    WHERE EXISTS (
      SELECT 1 FROM unnest(images) img 
      WHERE img ~ '\\.(png|jpg|jpeg)$'
    )
    RETURNING id, name
  `;
  console.log(`\nUpdated ${updateResult.length} products:`);
  updateResult.forEach(p => console.log(`  ✓ ${p.name}`));

  // 5. Check product_variants
  const variantImgCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_variants' 
      AND (column_name ILIKE '%image%' OR column_name ILIKE '%img%')
  `;
  
  if (variantImgCols.length > 0) {
    console.log("\nVariant image columns:", variantImgCols.map(c => c.column_name));
    
    for (const col of variantImgCols) {
      const colName = col.column_name;
      // Try array update
      try {
        const vRes = await sql`
          UPDATE product_variants 
          SET images = (
            SELECT array_agg(
              CASE 
                WHEN img ~ '\\.(png|jpg|jpeg)$' 
                THEN regexp_replace(img, '\\.(png|jpg|jpeg)$', '.webp')
                ELSE img 
              END
            )
            FROM unnest(images) img
          )
          WHERE EXISTS (
            SELECT 1 FROM unnest(images) img 
            WHERE img ~ '\\.(png|jpg|jpeg)$'
          )
          RETURNING id
        `;
        console.log(`  Updated ${vRes.length} variant rows (images array)`);
      } catch (e) {
        // Try single column update
        try {
          const vRes2 = await sql`
            UPDATE product_variants 
            SET ${sql(colName)} = regexp_replace(${sql(colName)}, '\\.(png|jpg|jpeg)$', '.webp')
            WHERE ${sql(colName)} ~ '\\.(png|jpg|jpeg)$'
            RETURNING id
          `;
          console.log(`  Updated ${vRes2.length} variant rows (${colName} string)`);
        } catch (e2) {
          console.log(`  Skipped ${colName}: ${e2.message}`);
        }
      }
    }
  }

  // 6. Verify
  const verify = await sql`SELECT id, name, images[1] as first_image FROM products LIMIT 5`;
  console.log("\nVerification (first 5):");
  verify.forEach(p => console.log(`  ${p.name}: ${p.first_image}`));

  console.log("\nDone!");
}

main().catch(e => console.error("ERROR:", e.message));
