/**
 * تحديث slug الموزع البلاستيكي 
 * من houyi-air-distributor-4port إلى houyi-air-distributor
 * لأن المنتج الآن يشمل 4 و 6 منافذ
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fixSlug() {
  console.log("=== تحديث slug الموزع البلاستيكي ===\n");

  try {
    // تغيير الـ slug لأن المنتج الآن شامل 4 و 6
    await sql`
      UPDATE products SET 
        slug = 'houyi-air-distributor',
        updated_at = NOW()
      WHERE id = 'houyi-air-distributor'
    `;
    console.log("✓ الـ slug تم تغييره:");
    console.log("  من: houyi-air-distributor-4port");
    console.log("  إلى: houyi-air-distributor");
    
    // تأكيد
    const p = await sql`SELECT id, slug, name, variants IS NOT NULL as has_variants FROM products WHERE id = 'houyi-air-distributor'`;
    console.log("\n✓ تأكيد:");
    console.log(`  ID: ${p[0].id}`);
    console.log(`  Slug: ${p[0].slug}`);
    console.log(`  Has variants: ${p[0].has_variants}`);
  } catch (e: any) {
    console.error("✗ خطأ:", e.message);
  }

  console.log("\n=== تم ===");
}

fixSlug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
