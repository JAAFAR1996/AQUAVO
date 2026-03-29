import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const slug = 'houyi-acrylic-pump-compartment';
const folderRelativePath = `/images/products/houyi/${slug}/`;
const localFolderPath = path.join(process.cwd(), `client/public/images/products/houyi/${slug}`);

async function fixPump() {
  console.log('⏳ جاري فحص مجلد فلتر شبكة الأكريليك...');
  
  if (!fs.existsSync(localFolderPath)) {
    console.log('❌ المجلد غير موجود! تأكد من تشغيل كود البورشيل أولاً.');
    process.exit(1);
  }

  const files = fs.readdirSync(localFolderPath).filter(f => !f.startsWith('.'));
  
  if (files.length === 0) {
    console.log('❌ المجلد فارغ! تأكد من نقل الصور إليه.');
    process.exit(1);
  }

  const sortedFiles = files.sort();
  const imagesArray = sortedFiles.map(f => folderRelativePath + f);
  const thumbnail = imagesArray[0];

  console.log(`🖼️ الصور التي تم اكتشافها: \n${imagesArray.join('\n')}`);
  console.log('🔄 جاري تحديث الداتا بيس...');

  await db.update(products).set({
    images: imagesArray,
    thumbnail: thumbnail
  }).where(eq(products.slug, slug));

  console.log('✅ تم تصحيح صور فلتر الأكريليك (Acrylic Pump Compartment) بنجاح في الموقع!');
  process.exit(0);
}

fixPump().catch(console.error);
