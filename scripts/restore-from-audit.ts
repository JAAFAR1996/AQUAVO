import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("=== RESTORING PRODUCTS FROM AUDIT LOGS ===\n");

  // Step 1: Load recovered products
  const recovered = JSON.parse(fs.readFileSync('recovered_products_from_audit.json', 'utf-8'));
  console.log(`📦 Loaded ${recovered.length} products to restore\n`);

  // Step 2: Delete ALL corrupted UUID products (created today at 01:24)
  console.log("🗑️ Step 1: Deleting corrupted UUID products...");
  const deleted = await sql`
    DELETE FROM products 
    WHERE id LIKE '%-%-%-%-%' AND length(id) = 36
    RETURNING id
  `;
  console.log(`   ✅ Deleted ${deleted.length} corrupted products\n`);

  // Step 3: Check what's left (should be yee-battery-air-pump only)
  const remaining = await sql`SELECT count(*) as cnt FROM products`;
  console.log(`   📊 Products remaining after cleanup: ${remaining[0].cnt}\n`);

  // Step 4: Insert recovered products one by one
  console.log("📥 Step 2: Inserting recovered products...");
  let successCount = 0;
  let errorCount = 0;

  for (const p of recovered) {
    try {
      // Remove audit metadata
      delete p._audit_action;
      delete p._audit_date;

      // Check if product already exists
      const existing = await sql`SELECT id FROM products WHERE id = ${p.id}`;
      if (existing.length > 0) {
        console.log(`   ⚠ Already exists: ${p.slug} - ${p.name}`);
        continue;
      }

      await sql`
        INSERT INTO products (
          id, slug, name, brand, category, subcategory, description,
          price, original_price, currency, images, thumbnail, rating,
          review_count, stock, low_stock_threshold, is_new, is_best_seller,
          is_product_of_week, specifications, has_variants, variants,
          category_id
        ) VALUES (
          ${p.id},
          ${p.slug},
          ${p.name},
          ${p.brand || 'Generic'},
          ${p.category || ''},
          ${p.subcategory || ''},
          ${p.description || ''},
          ${p.price?.toString() || '0'},
          ${p.originalPrice?.toString() || null},
          ${p.currency || 'IQD'},
          ${JSON.stringify(p.images || [])}::jsonb,
          ${p.thumbnail || ''},
          ${p.rating?.toString() || '0'},
          ${p.reviewCount || 0},
          ${p.stock || 0},
          ${p.lowStockThreshold || 10},
          ${p.isNew ?? true},
          ${p.isBestSeller ?? false},
          ${p.isProductOfWeek ?? false},
          ${JSON.stringify(p.specifications || {})}::jsonb,
          ${p.hasVariants ?? false},
          ${p.variants ? JSON.stringify(p.variants) : null}::jsonb,
          ${p.categoryId || null}
        )
      `;

      console.log(`   ✅ ${p.slug} - ${p.name}`);
      successCount++;
    } catch (err: any) {
      console.log(`   ❌ Error: ${p.slug} - ${err.message.substring(0, 80)}`);
      errorCount++;
    }
  }

  // Step 5: Final summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESTORATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`   ✅ Restored from audit logs: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  const finalCount = await sql`SELECT count(*) as cnt FROM products`;
  console.log(`   📦 Total products now: ${finalCount[0].cnt}`);

  // Show categories breakdown
  const categories = await sql`
    SELECT category, count(*) as cnt 
    FROM products 
    GROUP BY category 
    ORDER BY cnt DESC
  `;
  console.log("\n   📂 By Category:");
  for (const c of categories) {
    console.log(`      ${c.category}: ${c.cnt}`);
  }

  console.log("\n✅ Phase 1 Complete! Products from audit logs restored.");
  console.log("⚠️ Run seed import scripts next to fill remaining products.");
}

main().catch(console.error);
