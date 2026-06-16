import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function main() {
  console.log("=== UPDATING SLUGS TO MODELS ===");
  
  const products = await sql`SELECT id, slug, specifications FROM products WHERE brand = 'YEE'`;
  let updatedCount = 0;
  const allSlugs = await sql`SELECT slug FROM products`;
  const usedSlugs = new Set<string>(allSlugs.map((s: any) => s.slug));

  for (const product of products) {
    let spec = product.specifications;
    if (typeof spec === 'string') {
      try { spec = JSON.parse(spec); } catch(e) { spec = {}; }
    }
    
    const model = spec?.['الموديل'];
    
    if (model) {
      let newSlug = slugify(model);
      
      // Ensure unique slug
      let finalSlug = newSlug;
      let counter = 1;
      while (usedSlugs.has(finalSlug)) {
        finalSlug = `${newSlug}-${counter}`;
        counter++;
      }
      
      usedSlugs.add(finalSlug);
      
      if (product.slug !== finalSlug) {
        try {
          await sql`UPDATE products SET slug = ${finalSlug} WHERE id = ${product.id}`;
          console.log(`✅ Updated: ${product.slug} -> ${finalSlug}`);
          updatedCount++;
        } catch (err: any) {
          console.log(`❌ Error mapping ${product.slug} to ${finalSlug}: ${err.message}`);
        }
      } else {
        console.log(`➡ Unchanged: ${product.slug}`);
      }
    } else {
      console.log(`⚠ Skipped: ${product.slug} (No model found)`);
    }
  }

  console.log(`\n🎉 Updated URLs for ${updatedCount} products.`);
}

main().catch(console.error);
