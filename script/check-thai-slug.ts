import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { ilike } from 'drizzle-orm';

async function checkThaiSlug() {
  const allThai = await db.query.products.findMany({
    where: ilike(products.slug, '%thai%')
  });

  console.log("النتائج البحث بقيمة الروابط (Slug):");
  for (const p of allThai) {
    console.log(`- Item Name: ${p.name}`);
    console.log(`  Slug     : ${p.slug}`);
    console.log(`  Thumbnail: ${p.thumbnail}`);
    console.log('---------------------------');
  }
  process.exit(0);
}
checkThaiSlug().catch(console.error);
