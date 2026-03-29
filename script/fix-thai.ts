import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixThai() {
  const newSlug = 'houyi-thai-branches';
  const newImagePath = `/images/products/houyi/${newSlug}/${newSlug}-1.png`;

  console.log('🔄 جاري تحديث مسارات الأغصان التايلاندية في الداتا بيس...');

  await db.update(products).set({
    images: [newImagePath],
    thumbnail: newImagePath
  }).where(eq(products.slug, newSlug));

  console.log('✅ تم تصحيح مسار الأغصان التايلاندية بنجاح ليطابق الـ Slug للموقع!');
  process.exit(0);
}

fixThai().catch(console.error);
