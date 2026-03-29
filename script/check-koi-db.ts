import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
  console.log('📡 جاري الاتصال بقاعدة البيانات الحية لفحص شبكة الكوي...');
  const p = await db.query.products.findFirst({
    where: eq(products.slug, 'houyi-koi-fish-net')
  });
  
  if (p) {
    console.log('----------------------------------------------------');
    console.log('📌 الصور الموجودة حالياً في قاعدة البيانات (Images):');
    console.dir(p.images, { depth: null });
    console.log('\n📌 الواجهة الأساسية للمنتج (Thumbnail):');
    console.log(p.thumbnail);
    console.log('----------------------------------------------------');
  } else {
    console.log('❌ المنتج غير موجود!');
  }
  process.exit(0);
}

check().catch(console.error);
