import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// إعداد مسار المجلد الذي يحتوي على الصور المنظمة
const basePath = path.join(process.cwd(), 'client/public/images/products/houyi');

// قائمة الربط بين اسم المنتج في الداتا بيس، واسم مجلده المنظم الجديد
const mappings = [
  { name: 'Aquarium Aluminum Alloy Retractable Koi Fish Net', slug: 'houyi-koi-fish-net' },
  { name: 'small Wholesale Aquarium Special Nylon Fishing Net', slug: 'houyi-nylon-fishing-net' },
  { name: 'Aquarium Fish Tank Stainless Steel Telescopic Square Fishnet Three-section Fishing Net  MEDIAM', slug: 'houyi-telescopic-fishnet' },
  { name: 'Aquarium Fish Tank Five-in-one Cleaning Tool Fish Net Scraper Algae Knife Aquatic Clip', slug: 'houyi-5-in-1-cleaning-tool' },
  { name: '3 in 1 Quick Water Changer Aquarium Siphon Bottom Filter Kit Filter Vacuum Gravel Cleaner Fish Tank Tool Accessory', slug: 'houyi-water-changer-siphon' },
  { name: 'Chubby thermometer', slug: 'houyi-chubby-thermometer' },
  { name: 'Suction cup thermometer', slug: 'houyi-suction-thermometer' },
  { name: 'DoPhin Electric Skimmer', slug: 'houyi-dophin-electric-skimmer' },
  { name: 'led屏显温度计', slug: 'houyi-led' },
  { name: 'Rhododendron 40-45cm', slug: 'houyi-rhododendron-root' },
  { name: 'Rhododendron 50–55cm', slug: 'houyi-rhododendron-root' },
  { name: 'Rhododendron 30–35cm', slug: 'houyi-rhododendron-root' },
  { name: 'Rhododendron Root 30–45cm', slug: 'houyi-rhododendron-root' },
  { name: 'Moss Tree 20-30cm', slug: 'houyi-moss-tree' },
  { name: 'Polished Driftwood5-8cm', slug: 'houyi-polished-driftwood' },
  { name: 'Polished Driftwood8-10cm', slug: 'houyi-polished-driftwood' },
  { name: 'Polished Driftwood10-15cm', slug: 'houyi-polished-driftwood' },
  { name: 'Polished Driftwood15-20cm', slug: 'houyi-polished-driftwood' },
  { name: 'Mountain wood', slug: 'houyi-mountain-wood' },
  { name: 'Large selected sinking wood (kg)', slug: 'houyi-sinking-wood' },
  { name: 'Thai branche Peeled', slug: 'houyi-thai-branch-peeled' },
  { name: 'Pumice Small bag/3-6mm', slug: 'houyi-pumice' },
  { name: 'Aquatic plants base fertilizer 500g', slug: 'houyi-base-fertilizer' },
  { name: 'River sand 1-2mm', slug: 'houyi-river-sand' },
  { name: 'No need to clean, stream sand 2-6mm', slug: 'houyi-stream-sand' },
  { name: 'South American Sands   New 1-2mm', slug: 'houyi-south-american-sand' },
  { name: 'White sand', slug: 'houyi-white-sand' },
  { name: 'Dutch Sand', slug: 'houyi-dutch-sand' },
  { name: 'Blue Dragon – flake', slug: 'houyi-blue-dragon-stone' },
  { name: 'Volcanic black 3–5cm', slug: 'houyi-volcanic-stone' },
  { name: 'Volcanic RED 3–5cm', slug: 'houyi-volcanic-stone' },
  { name: 'Planting ring 52×26mm', slug: 'houyi-planting-ring' },
  { name: 'Moss glue 5g green&White', slug: 'houyi-moss-glue' },
  { name: 'Moss Glue 20g White', slug: 'houyi-moss-glue' },
  { name: 'Instant Glue 50g (CA Liquid)', slug: 'houyi-instant-glue-50g' },
  { name: 'Silicone 121', slug: 'houyi-silicone-121' },
  { name: 'Ceramic ring', slug: 'houyi-ceramic-ring' },
  { name: 'Breathing ring – white', slug: 'houyi-breathing-ring-white' },
  { name: 'Activated carbon', slug: 'houyi-activated-carbon' },
  { name: 'White cotton 30×50×2.5', slug: 'houyi-white-cotton' },
  { name: 'Terminalia Leaves', slug: 'houyi-terminalia-leaves' },
  { name: 'Foam Glue', slug: 'houyi-foam-glue' },
  { name: 'Medium cotton brown 50g', slug: 'houyi-medium-cotton' },
  { name: 'Medium cotton grey 50g', slug: 'houyi-medium-cotton' },
  { name: 'Check valve round red', slug: 'houyi-check-valve' },
  { name: 'Control valve 4mm', slug: 'houyi-control-valve-4mm' },
  { name: '4mm T通', slug: 'houyi-connectors-4mm' },
  { name: '4mm I', slug: 'houyi-connectors-4mm' },
  { name: '4mm Y', slug: 'houyi-connectors-4mm' },
  { name: '4 port blue', slug: 'houyi-air-distributor-4port' },
  { name: '6 port blue', slug: 'houyi-air-distributor-4port' },
  { name: 'Stainless steel shunt 4', slug: 'houyi-stainless-steel-shunt' },
  { name: 'Stainless steel shunt6头', slug: 'houyi-stainless-steel-shunt' },
  { name: 'Tracheal suction cup', slug: 'houyi-tracheal-suction-cup' },
  { name: '1.55m double-ended spring brush (blue)Hose brush', slug: 'houyi-hose-brush' },
  { name: 'Mesh 8*8cm', slug: 'houyi-mesh' },
  { name: 'Net bag', slug: 'houyi-net-bag' }
];

async function updateDatabase() {
  console.log('🔄 بدء عملية تحديث قاعدة البيانات بناءً على المجلدات المنظمة...');
  let updatedCount = 0;
  let missingCount = 0;

  for (const m of mappings) {
    const folderPath = path.join(basePath, m.slug);
    
    if (fs.existsSync(folderPath)) {
      // قراءة الصور بداخل المجلد المرتبط وتصفيتها من أي ملفات نظام مخفية
      const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));
      
      if (files.length > 0) {
        // ترتيب الملفات لضمان أن `-1.jpg` تكون هي الأولى (الـ Thumbnail)
        const sortedFiles = files.sort();
        
        // بناء المسارات الخاصة بالموقع (Relative paths للفرونت إند)
        const images = sortedFiles.map(f => `/images/products/houyi/${m.slug}/${f}`);
        const thumbnail = images[0];

        try {
          // تحديث الحقلين (الصور والواجهة) في الداتا بيس
          await db.update(products)
            .set({ images, thumbnail })
            .where(eq(products.name, m.name));
            
          console.log(`✅ تم تحديث المنتج بنجاح: ${m.name}`);
          console.log(`   └─ الصور: ${images.length} صور | الواجهة: ${thumbnail}`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ حدث خطأ أثناء تحديث المنتج ${m.name}:`, error);
        }
      } else {
        console.log(`⚠️ مجلد المنتج موجود لكنه فارغ: ${m.name}`);
        missingCount++;
      }
    } else {
      console.log(`❌ مجلد المنتج غير موجود على القرص: ${m.name} (Slug: ${m.slug})`);
      missingCount++;
    }
  }

  console.log('====================================================');
  console.log(`🎉 اكتملت العملية!`);
  console.log(`المنتجات التي تم تحديث صورها بنجاح: ${updatedCount}`);
  console.log(`المنتجات التي واجهت مشكلة / لم يكتشفت مجلدها: ${missingCount}`);
  process.exit(0);
}

updateDatabase().catch(console.error);
