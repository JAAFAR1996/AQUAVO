import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const folderRelativePath = '/images/products/houyi/houyi-koi-fish-net/';
const localFolderPath = path.join(process.cwd(), 'client/public/images/products/houyi/houyi-koi-fish-net');

async function fixKoiNet() {
  console.log('⏳ جاري فحص مجلد شبكة الكوي...');
  const files = fs.readdirSync(localFolderPath).filter(f => !f.startsWith('.'));
  
  if (files.length === 0) {
    console.log('❌ المجلد فارغ! تأكد من تشغيل كود جلب الصور (البورشيل) أولاً.');
    process.exit(1);
  }

  // فرز الملفات ليكون "-1" هو الأول
  const sortedFiles = files.sort();
  const imagesArray = sortedFiles.map(f => folderRelativePath + f);
  const thumbnail = imagesArray[0];

  console.log(`🖼️ الصور التي تم اكتشافها: \n${imagesArray.join('\n')}`);
  console.log('🔄 جاري تحديث الداتا بيس والـ Thumbnail...');

  await db.update(products).set({
    images: imagesArray,
    thumbnail: thumbnail
  }).where(eq(products.slug, 'houyi-koi-fish-net'));

  console.log('✅ تم تصحيح صور Aluminum Alloy Koi Fish Net بنجاح في الموقع!');
  process.exit(0);
}

fixKoiNet().catch(console.error);
