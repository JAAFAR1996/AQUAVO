import { db } from './server/db.js';
import { products, translations } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
  const p = await db.query.products.findFirst({
    where: eq(products.slug, 'houyi-south-american-sand')
  });
  console.log('=== PRODUCT ===');
  console.log(p);
  
  if (p) {
    const t = await db.query.translations.findMany({
      where: eq(translations.entityId, p.id)
    });
    console.log('=== TRANSLATIONS ===');
    console.log(t);
  }
  
  process.exit(0);
}

check().catch(console.error);
