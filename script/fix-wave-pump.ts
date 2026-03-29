import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const slug = 'houyi-wave-pump';
const folderRelativePath = `/images/products/houyi/${slug}/`;
const localFolderPath = path.join(process.cwd(), `client/public/images/products/houyi/${slug}`);

async function fixWavePump() {
  console.log('⏳ جاري فحص مجلد مضخة الأمواج...');
  
  if (!fs.existsSync(localFolderPath)) {
    console.log('❌ المجلد غير موجود! تأكد من تشغيل أمر البورشيل لنسخ الصور أولاً.');
    process.exit(1);
  }

  const files = fs.readdirSync(localFolderPath).filter(f => !f.startsWith('.'));
  
  if (files.length === 0) {
    console.log('❌ المجلد فارغ! لم يتم نسخ أي صور من مجلد WP-50M.');
    process.exit(1);
  }

  const sortedFiles = files.sort();
  const imagesArray = sortedFiles.map(f => folderRelativePath + f);
  const thumbnail = imagesArray[0];

  console.log(`🖼️ تمت قراءة الصور الجديدة:\n${imagesArray.join('\n')}`);
  console.log('🔄 جاري تحديث بيانات المضخة في الداتا بيس...');

  await db.update(products).set({
    images: imagesArray,
    thumbnail: thumbnail
  }).where(eq(products.slug, slug));

  console.log('✅ تم تصحيح صور مضخة الأمواج (Wave Pump WP-50M) بنجاح!');
  process.exit(0);
}

fixWavePump().catch(console.error);
