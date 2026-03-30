import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// التحديث الجوهري بناءً على الروابط الحية من موقعك الفعلي:
const MAPPINGS = [
  // الخشب الغاطس الكبير (تغير اسمه في الموقع إلى sinking-wood-large)
  { keyword: 'large selected sinking', slug: 'houyi-sinking-wood-large' },
  
  // شجرة الطحالب
  { keyword: 'moss tree', slug: 'houyi-moss-tree' },
  
  // خشب الجبل
  { keyword: 'mountain wood', slug: 'houyi-mountain-wood' },
  
  // الخشب المصقول
  { keyword: 'polished driftwood', slug: 'houyi-polished-driftwood' },
  
  // الرودوديندرون مع الحجر 
  { keyword: '+stone', slug: 'houyi-rhododendron-root-stone' },
  
  // الرودوديندرون العادي (اسمه في الموقع spider-wood-sm)
  { keyword: 'rhododendron root', slug: 'houyi-spider-wood-sm', exclude: '+stone' },
  
  // الأغصان التايلاندية
  { keyword: 'thai branches', slug: 'houyi-thai-branches' }
];

async function processWoodFolders() {
  const baseDir = path.join(process.cwd(), 'client/public/images/products/houyi');
  
  if (!fs.existsSync(baseDir)) {
    console.log('❌ Base directory not found.');
    return;
  }

  const allFolders = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log('🚀 بدء عملية معالجة مجلدات الأخشاب وربطها بالروابط الأصلية الحية...');

  for (const mapping of MAPPINGS) {
    // العثور على المجلد العشوائي الذي وضعته
    const sourceFolderName = allFolders.find(f => {
      const lowerF = f.toLowerCase();
      if (mapping.exclude && lowerF.includes(mapping.exclude)) return false;
      return lowerF.includes(mapping.keyword);
    });

    if (sourceFolderName) {
      const sourceDir = path.join(baseDir, sourceFolderName);
      const destDir = path.join(baseDir, mapping.slug); // الآن يتم استخدام الروابط الحقيقية (spider-wood-sm)
      
      // التأكد من وجود المجلد الهدف
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      else {
        // تنظيف المجلد الهدف من أي صور قديمة
        const oldDestFiles = fs.readdirSync(destDir);
        for(const off of oldDestFiles) fs.unlinkSync(path.join(destDir, off));
      }

      console.log(`\n📂 تم اكتشاف مجلد الصور الخاصة بك: ${sourceFolderName}`);
      
      // قراءة الصور الجديدة
      const files = fs.readdirSync(sourceDir).filter(f => !f.startsWith('.'));
      const dbImages: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file) || '.jpg';
        const newFileName = `${mapping.slug}-${i + 1}-v7${ext}`; // v7 لضمان تحديث كاش Vercel
        const oldFilePath = path.join(sourceDir, file);
        const newFilePath = path.join(destDir, newFileName);

        try {
          // نسخ الصورة للمجلد الصحيح
          fs.renameSync(oldFilePath, newFilePath);
          
          // تجهيز مسار الداتا بيس
          dbImages.push(`/images/products/houyi/${mapping.slug}/${newFileName}`);
          console.log(`   📸 تجهيز صورة للصعود للموقع: ${newFileName}`);
        } catch(e) { /* تجاهل خطأ نقل نفس الملفات */ }
      }

      try {
        if (fs.readdirSync(sourceDir).length === 0) fs.rmdirSync(sourceDir);
        else fs.rmSync(sourceDir, { recursive: true, force: true });
      } catch(e){}

      // تحديث قاعدة البيانات
      if (dbImages.length > 0) {
        await db.update(products).set({
          images: dbImages,
          thumbnail: dbImages[0]
        }).where(eq(products.slug, mapping.slug));
        
        console.log(`✅ تم دمج ${mapping.slug} مع الرابط الحي في Vercel بنجاح!`);
      }

    } else {
      console.log(`⚠️ لم يتم العثور على مجلد صور جديد خاص بـ: ${mapping.keyword}`);
    }
  }
}

processWoodFolders().then(() => {
  console.log('\n🎉 اكتمل العمل! تم دمج جميع الأخشاب مع روابطها الحقيقية في الموقع.');
  process.exit(0);
}).catch(console.error);
