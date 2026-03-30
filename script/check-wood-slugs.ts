import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { like, or } from 'drizzle-orm';

async function checkSlugs() {
  const allWoods = await db.query.products.findMany({
    where: or(
      like(products.nameEn, '%wood%'),
      like(products.nameEn, '%Tree%'),
      like(products.nameEn, '%branch%'),
      like(products.nameEn, '%Root%')
    ),
    columns: { slug: true, nameEn: true }
  });

  console.log("=== الأخشاب الموجودة حالياً في قاعدة البيانات ===");
  allWoods.forEach(w => console.log(`- ${w.nameEn} => ${w.slug}`));
}
checkSlugs().then(() => process.exit(0)).catch(console.error);
