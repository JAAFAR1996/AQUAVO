import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function checkImages() {
  if (!db) {
    console.error('❌ No DB connection');
    process.exit(1);
  }

  const slugs = ['houyi-koi-fish-net', 'houyi-connectors-4mm'];
  
  const results = await db.select({
    id: products.id,
    slug: products.slug,
    name: products.name,
    images: products.images,
    thumbnail: products.thumbnail,
  }).from(products).where(inArray(products.slug, slugs));

  for (const p of results) {
    console.log('\n========================================');
    console.log(`Product: ${p.name}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Thumbnail: ${p.thumbnail}`);
    console.log(`Images:`);
    if (Array.isArray(p.images)) {
      (p.images as string[]).forEach((img: string, i: number) => {
        console.log(`  [${i}] ${img}`);
      });
    } else {
      console.log(`  RAW: ${JSON.stringify(p.images)}`);
    }
    console.log('========================================');
  }

  process.exit(0);
}

checkImages().catch(console.error);
