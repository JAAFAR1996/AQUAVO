import { neon } from "@neondatabase/serverless";

const DB_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client(DB_URL);

async function main() {
  await client.connect();
  console.log("Connected to DB\n");

  // 1. Find all tables and columns that might contain image paths
  const { rows: cols } = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND (column_name ILIKE '%image%' OR column_name ILIKE '%img%' OR column_name ILIKE '%photo%' OR column_name ILIKE '%picture%' OR column_name ILIKE '%thumbnail%' OR column_name ILIKE '%avatar%' OR column_name ILIKE '%logo%')
    ORDER BY table_name, column_name
  `);
  
  console.log("Image-related columns found:");
  cols.forEach(c => console.log(`  ${c.table_name}.${c.column_name} (${c.data_type})`));
  console.log("");

  // 2. Check products table structure
  const { rows: productCols } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products'
    ORDER BY ordinal_position
  `);
  console.log("Products table columns:");
  productCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  console.log("");

  // 3. Sample some image data to see current format
  const { rows: sampleProducts } = await client.query(`
    SELECT id, name, images FROM products LIMIT 3
  `);
  console.log("Sample product images:");
  sampleProducts.forEach(p => {
    console.log(`  ${p.name}:`);
    if (Array.isArray(p.images)) {
      p.images.forEach(img => console.log(`    ${img}`));
    } else {
      console.log(`    ${JSON.stringify(p.images)}`);
    }
  });
  console.log("");

  // 4. Count PNG/JPG paths that need updating
  const { rows: [countResult] } = await client.query(`
    SELECT COUNT(*) as total FROM products 
    WHERE EXISTS (
      SELECT 1 FROM unnest(images) img 
      WHERE img ~ '\\.(png|jpg|jpeg)$'
    )
  `);
  console.log(`Products with PNG/JPG image paths: ${countResult.total}`);

  // 5. Update all image paths from .png/.jpg/.jpeg to .webp
  const { rowCount } = await client.query(`
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
  `);
  console.log(`\nUpdated ${rowCount} products`);

  // 6. Check variants table too
  const { rows: variantCols } = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_variants' 
      AND (column_name ILIKE '%image%' OR column_name ILIKE '%img%')
  `);
  
  if (variantCols.length > 0) {
    console.log("\nVariant image columns:", variantCols.map(c => c.column_name));
    
    // Update variant images too
    for (const col of variantCols) {
      const colName = col.column_name;
      // Check if it's an array or single value
      const { rows: [sample] } = await client.query(`SELECT ${colName} FROM product_variants LIMIT 1`);
      console.log(`  Sample variant ${colName}:`, sample?.[colName]);
      
      if (Array.isArray(sample?.[colName])) {
        const res = await client.query(`
          UPDATE product_variants 
          SET ${colName} = (
            SELECT array_agg(
              CASE 
                WHEN img ~ '\\.(png|jpg|jpeg)$' 
                THEN regexp_replace(img, '\\.(png|jpg|jpeg)$', '.webp')
                ELSE img 
              END
            )
            FROM unnest(${colName}) img
          )
          WHERE EXISTS (
            SELECT 1 FROM unnest(${colName}) img 
            WHERE img ~ '\\.(png|jpg|jpeg)$'
          )
        `);
        console.log(`  Updated ${res.rowCount} variant rows (${colName})`);
      } else {
        const res = await client.query(`
          UPDATE product_variants 
          SET ${colName} = regexp_replace(${colName}, '\\.(png|jpg|jpeg)$', '.webp')
          WHERE ${colName} ~ '\\.(png|jpg|jpeg)$'
        `);
        console.log(`  Updated ${res.rowCount} variant rows (${colName})`);
      }
    }
  }

  // 7. Verify
  const { rows: verify } = await client.query(`
    SELECT id, name, images[1] as first_image FROM products LIMIT 5
  `);
  console.log("\nVerification (first 5 products):");
  verify.forEach(p => console.log(`  ${p.name}: ${p.first_image}`));

  await client.end();
  console.log("\nDone!");
}

main().catch(e => { console.error("ERROR:", e.message); client.end(); });
