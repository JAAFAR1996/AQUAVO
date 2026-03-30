import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';

async function verifyWoods() {
  console.log('🔍 استخراج جميع المنتجات من قاعدة البيانات للبحث الدقيق...');
  
  // لضمان عدم تعطل قاعدة بيانات Neon كما حدث سابقاً، سنسحب المنتجات ونفلترها محلياً
  const allProducts = await db.query.products.findMany({
    columns: { slug: true, nameEn: true, name: true, images: true, thumbnail: true }
  });

  const targetSlugs = [
    'houyi-sinking-wood-large',
    'houyi-moss-tree',
    'houyi-mountain-wood',
    'houyi-polished-driftwood',
    'houyi-rhododendron-root-stone',
    'houyi-spider-wood-sm',
    'houyi-thai-branches'
  ];

  const woods = allProducts.filter(p => {
    if (!p.slug || !p.slug.startsWith('houyi-')) return false;
    
    const isTarget = targetSlugs.includes(p.slug);
    const matchesEn = p.nameEn && (
       p.nameEn.toLowerCase().includes('wood') || 
       p.nameEn.toLowerCase().includes('tree') || 
       p.nameEn.toLowerCase().includes('branch') || 
       p.nameEn.toLowerCase().includes('root')
    );
    
    return isTarget || matchesEn;
  });

  console.log(`\nتم العثور على ${woods.length} منتج خشبي في الداتا بيس، جاري الفحص المعمق 🔬:\n`);
  let completelyClean = true;

  for (const w of woods) {
    console.log(`📌 المنتج: [${w.name}] (${w.nameEn})`);
    console.log(`   - الرابط الحي (Slug): ${w.slug}`);
    
    // 1. فحص مجلد الصور والتأكد من عدم وجود مسارات ميتة (404)
    if (!w.images || !Array.isArray(w.images) || w.images.length === 0) {
      console.log('   ❌ خطأ: الداتا بيس فارغة لا تحتوى على أي مسار للصور لهذا المنتج!');
      completelyClean = false;
      continue;
    }

    w.images.forEach((img: string) => {
      const localPath = path.join(process.cwd(), 'client/public', img);
      if (fs.existsSync(localPath)) {
        console.log(`   ✅ مسار الصورة متطابق في الداتا بيس والكمبيوتر: ${img}`);
      } else {
        console.log(`   ❌ خطأ مميت (404): الداتا بيس تشير لمسار غير موجود في الكمبيوتر أبداً!`);
        console.log(`      🚷 ${img}`);
        completelyClean = false;
      }
    });
    
    // 2. فحص الصورة المصغرة (Thumbnail)
    if (w.thumbnail) {
      const thumbPath = path.join(process.cwd(), 'client/public', w.thumbnail);
      if (!fs.existsSync(thumbPath)) {
        console.log(`   ❌ خطأ: الصورة المصغرة مسارها وهمي: ${w.thumbnail}`);
        completelyClean = false;
      }
    } else {
      console.log('   ❌ خطأ: المنتج لا يمتلك صورة عرض رئيسية (Thumbnail)!');
      completelyClean = false;
    }

    console.log('--------------------------------------------------');
  }

  if (completelyClean) {
    console.log('\n🌟 تقرير نهائي: 100%! تم التحقق بنجاح من كافة الروبط والمسارات.');
  } else {
    console.log('\n⚠️ تقرير نهائي: اكتشفنا روابط ميتة أو صور غير موجودة فعلياً كما هو موضح أعلاه.');
  }
}

verifyWoods().catch(console.error).finally(() => process.exit(0));
