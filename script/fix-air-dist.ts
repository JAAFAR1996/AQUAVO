import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const slug = 'houyi-air-distributor';
const folderRelativePath = /images/products/houyi/ + slug + /;
const localFolderPath = path.join(process.cwd(), 'client/public/images/products/houyi', slug);

async function fixAir() {
  console.log('🔄 جاري تحديث الداتا بيس لموزع الهواء...');
  if (!fs.existsSync(localFolderPath)) process.exit(1);

  const files = fs.readdirSync(localFolderPath).filter(f => !f.startsWith('.')).sort();
  const images = files.map(f => folderRelativePath + f);

  await db.update(products).set({
    images: images,
    thumbnail: images[0]
  }).where(eq(products.slug, slug));

  console.log('✅ تم تصحيح مسارات صور موزع الهواء البلاستيكي في قاعدة البيانات!');
  process.exit(0);
}
fixAir().catch(console.error);
