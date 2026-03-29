import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const TARGET_ROWS = {
  10: 'houyi-rhododendron-root',
  14: 'houyi-rhododendron-root-stone',
  15: 'houyi-moss-tree',
  16: 'houyi-polished-driftwood',
  20: 'houyi-mountain-wood',
  21: 'houyi-large-selected-sinking-wood',
  22: 'houyi-thai-branches'
};

async function extractAndFix() {
  const workbook = new ExcelJS.Workbook();
  const excelPath = path.join(process.cwd(), 'Binzhou_Houyi (1) (1).xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.log('❌ ملف الإكسل غير موجود في المسار المتوقع:', excelPath);
    return;
  }

  console.log('📂 جاري فتح ملف الإكسل وقراءة هيكلة الصور (تخيل أنني أرى الملف الآن)...');
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet(1);

  const images = worksheet.getImages();
  console.log(`🔍 تم العثور على ${images.length} صورة داخل الإكسل. جاري فلترة صور الأخشاب...`);
  
  for (const image of images) {
    // تحديد موقع الصورة بدقة داخل الإكسل
    const nativeRow = image.range.tl.nativeRow;
    const excelRow = nativeRow + 1; // الإكسل يبدأ من رقم 1
    
    let matchedSlug = null;
    let matchedRow = null;
    
    // مطابقتها مع الصفوف المستهدفة للأخشاب (نتجنب الانحرافات البسيطة بمقدار صف واحد)
    for (const [rowStr, slug] of Object.entries(TARGET_ROWS)) {
      const targetRow = parseInt(rowStr);
      if (Math.abs(excelRow - targetRow) <= 1) {
        matchedSlug = slug;
        matchedRow = targetRow;
        break;
      }
    }
    
    if (matchedSlug) {
      console.log(`\n🌲 تم اصطياد صورة: ${matchedSlug} (الصف ${matchedRow})`);
      
      // استخراج الصورة المادية
      const imgData = workbook.model.media.find(m => m.index === image.imageId);
      if (!imgData) continue;
      
      const buffer = imgData.buffer;
      const ext = imgData.extension; 
      
      const outDir = path.join(process.cwd(), `client/public/images/products/houyi/${matchedSlug}`);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      
      // تنظيف المجلد من الصور الخاطئة القديمة
      const oldFiles = fs.readdirSync(outDir);
      for(const off of oldFiles) fs.unlinkSync(path.join(outDir, off));
      
      // حفظ الصورة بالاسم المثالي والمنسق لتجاوز كاش Vercel
      const finalFileName = `${matchedSlug}-1-v4.${ext}`;
      const finalPath = path.join(outDir, finalFileName);
      
      fs.writeFileSync(finalPath, buffer);
      console.log(`💾 تم حفظ الصورة الصحيحة محلياً: ${finalFileName}`);
      
      // تحديث قاعدة البيانات
      const dbPath = `/images/products/houyi/${matchedSlug}/${finalFileName}`;
      await db.update(products).set({
        images: [dbPath],
        thumbnail: dbPath
      }).where(eq(products.slug, matchedSlug));
      
      console.log(`✅ تم دمج ${matchedSlug} في المتجر بنجاح!`);
    }
  }
}

extractAndFix().then(() => {
  console.log('\n🎉 اكتملت عملية اجتثاث صور الأخشاب من الإكسل وربطها بالمتجر بدقة متناهية!');
  process.exit(0);
}).catch(console.error);
