import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const MAPPINGS = [
  { keyword: 'large selected sinking', slug: 'houyi-large-selected-sinking-wood' },
  { keyword: 'moss tree', slug: 'houyi-moss-tree' },
  { keyword: 'mountain wood', slug: 'houyi-mountain-wood' },
  { keyword: 'polished driftwood', slug: 'houyi-polished-driftwood' },
  { keyword: '+stone', slug: 'houyi-rhododendron-root-stone' },
  { keyword: 'rhododendron root', slug: 'houyi-rhododendron-root', exclude: '+stone' },
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

  console.log('🚀 بدء عملية معالجة مجلدات الأخشاب وترتيبها في الداتا بيس...');

  for (const mapping of MAPPINGS) {
    // العثور على المجلد العشوائي الذي وضعه المستخدم
    const sourceFolderName = allFolders.find(f => {
      const lowerF = f.toLowerCase();
      if (mapping.exclude && lowerF.includes(mapping.exclude)) return false;
      return lowerF.includes(mapping.keyword);
    });

    if (sourceFolderName) {
      const sourceDir = path.join(baseDir, sourceFolderName);
      const destDir = path.join(baseDir, mapping.slug);
      
      // التأكد من وجود المجلد الهدف
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      } else {
        // تنظيف المجلد الهدف من أي صور قديمة
        const oldDestFiles = fs.readdirSync(destDir);
        for(const off of oldDestFiles) fs.unlinkSync(path.join(destDir, off));
      }

      console.log(`\n📂 تم اكتشاف مجلد: ${sourceFolderName}`);
      
      // قراءة الصور الجديدة
      const files = fs.readdirSync(sourceDir).filter(f => !f.startsWith('.'));
      const dbImages: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file) || '.jpg';
        const newFileName = `${mapping.slug}-${i + 1}-v5${ext}`; // v5 لمنع الكاش
        const oldFilePath = path.join(sourceDir, file);
        const newFilePath = path.join(destDir, newFileName);

        // نسخ الصورة للمجلد الصحيح
        fs.renameSync(oldFilePath, newFilePath);
        
        // تجهيز مسار الداتا بيس
        dbImages.push(`/images/products/houyi/${mapping.slug}/${newFileName}`);
        console.log(`   📸 تجهيز صورة: ${newFileName}`);
      }

      // بعد نقل جميع الصور، نمسح المجلد العشوائي القديم لتنظيف المساحة
      if (fs.readdirSync(sourceDir).length === 0) {
        fs.rmdirSync(sourceDir);
      } else {
        // إذا كان هناك ملفات مخفية
        fs.rmSync(sourceDir, { recursive: true, force: true });
      }

      // تحديث قاعدة البيانات
      if (dbImages.length > 0) {
        await db.update(products).set({
          images: dbImages,
          thumbnail: dbImages[0] // نجعل أول صورة هي الصورة الرئيسية
        }).where(eq(products.slug, mapping.slug));
        
        console.log(`✅ تم دمج ${mapping.slug} في قاعدة بيانات Vercel/Neon بنجاح!`);
      }

    } else {
      console.log(`⚠️ لم يتم العثور على مجلد يطابق: ${mapping.keyword}`);
    }
  }
}

processWoodFolders().then(() => {
  console.log('\n🎉 اكتمل العمل! جميع مجلدات الأخشاب أصبحت قياسية وقاعدة البيانات محدثة تماماً.');
  process.exit(0);
}).catch(console.error);
