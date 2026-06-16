import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("=== FIXING REMAINING PRODUCTS (category_id issue) ===\n");

  const recovered = JSON.parse(fs.readFileSync('recovered_products_from_audit.json', 'utf-8'));

  // Get existing product IDs
  const existing = await sql`SELECT id FROM products`;
  const existingIds = new Set(existing.map((p: any) => p.id));

  // Get existing slugs
  const existingSlugs = await sql`SELECT slug FROM products`;
  const slugSet = new Set(existingSlugs.map((p: any) => p.slug));

  // Get valid category IDs
  const categories = await sql`SELECT id FROM categories`;
  const validCategoryIds = new Set(categories.map((c: any) => c.id));

  let successCount = 0;
  let skipCount = 0;

  for (const p of recovered) {
    delete p._audit_action;
    delete p._audit_date;

    // Skip if already exists
    if (existingIds.has(p.id)) {
      skipCount++;
      continue;
    }

    // Fix slug collision
    let slug = p.slug;
    if (slugSet.has(slug)) {
      slug = slug + '-v2';
    }

    // Fix category_id: set to null if not valid
    const categoryId = validCategoryIds.has(p.categoryId) ? p.categoryId : null;

    try {
      await sql`
        INSERT INTO products (
          id, slug, name, brand, category, subcategory, description,
          price, original_price, currency, images, thumbnail, rating,
          review_count, stock, low_stock_threshold, is_new, is_best_seller,
          is_product_of_week, specifications, has_variants, variants,
          category_id
        ) VALUES (
          ${p.id},
          ${slug},
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
          ${categoryId}
        )
      `;
      console.log(`✅ ${slug} - ${p.name}`);
      successCount++;
      slugSet.add(slug);
    } catch (err: any) {
      console.log(`❌ ${slug}: ${err.message.substring(0, 100)}`);
    }
  }

  const finalCount = await sql`SELECT count(*) as cnt FROM products`;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ Fixed: ${successCount} | ⏭ Skipped (existed): ${skipCount}`);
  console.log(`📦 Total products now: ${finalCount[0].cnt}`);
}

main().catch(console.error);
