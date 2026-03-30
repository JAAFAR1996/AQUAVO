import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function verify() {
  console.log('🔍 Final Verification...\n');

  // 1. Check total active products
  const total = await sql`SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL`;
  console.log(`📊 Total active products: ${total[0].count}`);

  // 2. Check for any remaining "YEE" in names
  const yeeInName = await sql`SELECT slug, name FROM products WHERE name LIKE '%YEE%' AND deleted_at IS NULL`;
  console.log(`\n🔎 Products with "YEE" still in name: ${yeeInName.length}`);
  for (const p of yeeInName) {
    console.log(`   ⚠️  ${p.slug}: ${p.name}`);
  }

  // 3. Check for any English-only names (Houyi)
  const englishNames = await sql`SELECT slug, name FROM products WHERE name ~ '^[A-Za-z]' AND deleted_at IS NULL AND brand = 'Houyi'`;
  console.log(`\n🔎 Houyi products with English-only names: ${englishNames.length}`);
  for (const p of englishNames) {
    console.log(`   ⚠️  ${p.slug}: ${p.name}`);
  }

  // 4. Check description lengths
  const shortDesc = await sql`SELECT slug, name, LENGTH(description) as len FROM products WHERE LENGTH(description) < 100 AND deleted_at IS NULL ORDER BY len`;
  console.log(`\n🔎 Products with very short descriptions (<100 chars): ${shortDesc.length}`);
  for (const p of shortDesc) {
    console.log(`   ⚠️  ${p.slug} (${p.len} chars): ${p.name}`);
  }

  // 5. Check for empty descriptions
  const noDesc = await sql`SELECT slug, name FROM products WHERE (description IS NULL OR description = '') AND deleted_at IS NULL`;
  console.log(`\n🔎 Products with no description: ${noDesc.length}`);
  for (const p of noDesc) {
    console.log(`   ⚠️  ${p.slug}: ${p.name}`);
  }

  // 6. Sample 5 random products to verify quality
  const samples = await sql`SELECT slug, name, LEFT(description, 80) as desc_preview FROM products WHERE deleted_at IS NULL ORDER BY RANDOM() LIMIT 5`;
  console.log(`\n📋 Random quality samples:`);
  for (const p of samples) {
    console.log(`   ✅ [${p.slug}] ${p.name}`);
    console.log(`      "${p.desc_preview}..."`);
    console.log('');
  }

  // 7. Brand distribution
  const brands = await sql`SELECT brand, COUNT(*) as count FROM products WHERE deleted_at IS NULL GROUP BY brand ORDER BY count DESC`;
  console.log(`📊 Brand distribution:`);
  for (const b of brands) {
    console.log(`   ${b.brand}: ${b.count} products`);
  }

  console.log('\n✅ Verification complete!');
}

verify().catch(console.error);
