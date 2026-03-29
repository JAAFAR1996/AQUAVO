import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq, ilike } from 'drizzle-orm';

async function checkThai() {
  const allThai = await db.query.products.findMany({
    where: ilike(products.name, '%Thai%')
  });

  console.log("النتائج من الداتا بيس:");
  for (const p of allThai) {
    console.log(`- Item Name: ${p.name}`);
    console.log(`  Slug     : ${p.slug}`);
    console.log(`  Thumbnail: ${p.thumbnail}`);
    console.log('---------------------------');
  }
  process.exit(0);
}
checkThai().catch(console.error);
