import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

// Category IDs
const CATEGORIES = {
  CLEANING: '9cfde3f2-3b10-4c7d-a596-baaeced2f091', // الصيانة والتنظيف
  MEASUREMENT: 'db9d816c-ac55-4cef-8f6b-01490072163c', // الفحص والمراقبة
  FILTRATION: '3c8cc237-0c0c-4ff5-9bfc-9dd16fb120fb', // الفلترة والتنقية
  SUBSTRATE: 'b71fc5b0-00d9-4c98-b9f0-47cefeeb2d78', // التربة والديكور
  ACCESSORIES: '7ad11f33-498f-456d-b573-0fb5a54f9127', // ملحقات ومستلزمات
  AERATION: '7cb8fbad-24cf-4b5b-b5e9-8da34a18a533', // التهوية والأكسجين
};

// Mapping: Current DB slug -> New clean slug
const slugUpdates: { [oldSlug: string]: string } = {
  'houyi-155m-double-ended-spring-brush-bluehose-brush': 'houyi-spring-brush-155m',
  'houyi-4-port-blue-6port-blue': 'houyi-air-distributor-4-6-port',
  'houyi-4mm-t-4mm-i-4mm-y': 'houyi-air-connectors-t-i-y',
  'houyi-aquarium-fish-tank-five-in-one-cleaning-tool-fish-net-scraper-algae-knife-aquatic-clip': 'houyi-5in1-cleaning-tool',
  'houyi-aquarium-fish-tank-stainless-steel-telescopic-square-fishnet-three-section-fishing-net-mediam': 'houyi-telescopic-fishnet-medium',
  'houyi-blue-dragon-flake': 'houyi-blue-dragon-stone',
  'houyi-breathing-ring-white': 'houyi-breathing-ring',
  'houyi-ceramic-ring': 'houyi-ceramic-ring',
  'houyi-check-valve-round-red': 'houyi-check-valve-red',
  'houyi-chubby-thermometer': 'houyi-chubby-thermometer',
  'houyi-dophin-electric-skimmer': 'houyi-dophin-skimmer',
  'houyi-dutch-sand': 'houyi-dutch-sand',
  'houyi-foam-glue': 'houyi-foam-glue',
  'houyi-medium-cotton-grey-50g-medium-cotton-brown-50g': 'houyi-filter-cotton-medium',
  'houyi-moss-glue-5g-greenwhite-moss-glue-20g-white-glue-white-50g': 'houyi-moss-glue',
  'houyi-planting-ring-5226mm': 'houyi-planting-ring-52mm',
  'houyi-pumice-small-bag3-6mm': 'houyi-pumice-3-6mm',
  'houyi-river-sand-1-2mm': 'houyi-river-sand-1-2mm',
  'houyi-silicone-121': 'houyi-silicone-121',
  'houyi-small-wholesale-aquarium-special-nylon-fishing-net': 'houyi-nylon-fishnet-small',
  'houyi-stainless-steel-shunt-4-6': 'houyi-stainless-shunt',
  'houyi-stream-sand': 'houyi-stream-sand',
  'houyi-suction-cup-thermometer': 'houyi-suction-thermometer',
  'houyi-terminalia-leaves': 'houyi-terminalia-leaves',
  'houyi-tracheal-suction-cup': 'houyi-tracheal-suction-cup',
  'houyi-volcanic-black-red-35cm': 'houyi-volcanic-stone',
  'houyi-white-cotton-305025': 'houyi-white-cotton-30x50',
  'houyi-white-sand': 'houyi-white-sand',
  'houyi-activated-carbon': 'houyi-activated-carbon',
};

// Missing products to add
const missingProducts = [
  {
    id: 'houyi-led-thermometer',
    slug: 'houyi-led-thermometer',
    name: 'ميزان حرارة رقمي بشاشة LED',
    brand: 'Houyi',
    category: 'الفحص والمراقبة',
    subcategory: 'موازين حرارة',
    description: 'ميزان حرارة رقمي دقيق بشاشة LED واضحة. يعرض درجة الحرارة بدقة عالية. سهل القراءة حتى في الإضاءة الخافتة. مثالي لمراقبة درجة حرارة الحوض.',
    price: 2366,
    category_id: CATEGORIES.MEASUREMENT,
    specifications: {
      نوع_الشاشة: 'LED رقمية',
      الدقة: '±0.1°C',
      نطاق_القياس: '0-50°C',
      الطاقة: 'بطارية'
    }
  },
  {
    id: 'houyi-rhododendron-40-45cm',
    slug: 'houyi-rhododendron-40-45cm',
    name: 'جذر الرودودندرون 40-45 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'جذر رودودندرون طبيعي للأكواسكيب. مظهر فريد وطبيعي. آمن للأسماك والنباتات. يضيف لمسة جمالية استثنائية للحوض.',
    price: 6956,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '40-45 سم',
      النوع: 'جذر طبيعي',
      المعالجة: 'مجفف ومعقم'
    }
  },
  {
    id: 'houyi-rhododendron-50-55cm',
    slug: 'houyi-rhododendron-50-55cm',
    name: 'جذر الرودودندرون 50-55 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'جذر رودودندرون طبيعي كبير الحجم للأحواض الكبيرة. شكل فني مميز. مثالي كقطعة مركزية في الأكواسكيب.',
    price: 10869,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '50-55 سم',
      النوع: 'جذر طبيعي',
      المعالجة: 'مجفف ومعقم'
    }
  },
  {
    id: 'houyi-rhododendron-30-35cm',
    slug: 'houyi-rhododendron-30-35cm',
    name: 'جذر الرودودندرون 30-35 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'جذر رودودندرون طبيعي صغير الحجم. مثالي للأحواض الصغيرة والمتوسطة. يخلق بيئة طبيعية للأسماك.',
    price: 6087,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '30-35 سم',
      النوع: 'جذر طبيعي',
      المعالجة: 'مجفف ومعقم'
    }
  },
  {
    id: 'houyi-rhododendron-with-base',
    slug: 'houyi-rhododendron-with-base',
    name: 'جذر الرودودندرون مع قاعدة حجرية',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'جذر رودودندرون مثبت على قاعدة حجرية. جاهز للوضع في الحوض مباشرة. لا يحتاج لتثبيت إضافي.',
    price: 7826,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '30-45 سم',
      النوع: 'جذر مع قاعدة',
      القاعدة: 'حجر طبيعي'
    }
  },
  {
    id: 'houyi-moss-tree',
    slug: 'houyi-moss-tree',
    name: 'شجرة موس صناعية 20-30 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'ديكور صناعي',
    description: 'شجرة موس صناعية جاهزة للديكور. مظهر طبيعي وجميل. لا تحتاج صيانة. تضيف لمسة خضراء للحوض.',
    price: 2869,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الارتفاع: '20-30 سم',
      النوع: 'صناعي',
      المادة: 'موس على قاعدة خشب'
    }
  },
  {
    id: 'houyi-polished-driftwood-5-8cm',
    slug: 'houyi-polished-driftwood-5-8cm',
    name: 'خشب عائم مصقول 5-8 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'قطعة خشب عائم مصقولة صغيرة الحجم. مثالية للأحواض الصغيرة والنانو. سطح أملس وآمن للأسماك.',
    price: 217,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '5-8 سم',
      النوع: 'خشب عائم مصقول'
    }
  },
  {
    id: 'houyi-polished-driftwood-8-10cm',
    slug: 'houyi-polished-driftwood-8-10cm',
    name: 'خشب عائم مصقول 8-10 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'قطعة خشب عائم مصقولة متوسطة الحجم. تصميم طبيعي جميل. معالجة خاصة لمنع تغير لون الماء.',
    price: 326,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '8-10 سم',
      النوع: 'خشب عائم مصقول'
    }
  },
  {
    id: 'houyi-polished-driftwood-10-15cm',
    slug: 'houyi-polished-driftwood-10-15cm',
    name: 'خشب عائم مصقول 10-15 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'قطعة خشب عائم مصقولة كبيرة. قطعة ديكور مميزة للأحواض المتوسطة.',
    price: 782,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '10-15 سم',
      النوع: 'خشب عائم مصقول'
    }
  },
  {
    id: 'houyi-polished-driftwood-15-20cm',
    slug: 'houyi-polished-driftwood-15-20cm',
    name: 'خشب عائم مصقول 15-20 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'قطعة خشب عائم مصقولة كبيرة جداً. قطعة فنية للأحواض الكبيرة والأكواسكيب المتقدم.',
    price: 1413,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '15-20 سم',
      النوع: 'خشب عائم مصقول'
    }
  },
  {
    id: 'houyi-mountain-wood',
    slug: 'houyi-mountain-wood',
    name: 'خشب الجبل 20-50 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'خشب جبلي طبيعي فريد الشكل. قطعة ديكور استثنائية. يباع بالكيلوغرام.',
    price: 5217,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '20-50 سم',
      النوع: 'خشب جبلي',
      البيع: 'بالكيلوغرام'
    }
  },
  {
    id: 'houyi-sinking-wood-large',
    slug: 'houyi-sinking-wood-large',
    name: 'خشب غارق كبير 70-120 سم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'خشب غارق طبيعي كبير الحجم للأحواض الكبيرة. يغرق مباشرة في الماء. قطعة فنية مذهلة.',
    price: 4347,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '70-120 سم',
      النوع: 'خشب غارق',
      البيع: 'بالكيلوغرام'
    }
  },
  {
    id: 'houyi-thai-branches',
    slug: 'houyi-thai-branches',
    name: 'أغصان تايلندية مقشرة',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أخشاب وجذور',
    description: 'أغصان تايلندية طبيعية مقشرة. مظهر أنيق وراقي. مثالية للأكواسكيب الآسيوي.',
    price: 17391,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      النوع: 'أغصان تايلندية مقشرة',
      البيع: 'بالكيلوغرام'
    }
  },
  {
    id: 'houyi-base-fertilizer',
    slug: 'houyi-base-fertilizer',
    name: 'سماد قاعدي للنباتات المائية 500 جم',
    brand: 'Houyi',
    category: 'التربة والديكور',
    subcategory: 'أسمدة',
    description: 'سماد قاعدي متخصص للنباتات المائية. يوضع تحت التربة. يوفر المغذيات الأساسية لجذور النباتات.',
    price: 3108,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الوزن: '500 جم',
      النوع: 'سماد قاعدي',
      الاستخدام: 'تحت التربة'
    }
  },
  {
    id: 'houyi-instant-glue-50g',
    slug: 'houyi-instant-glue-50g',
    name: 'لاصق فوري 50 جم (CA)',
    brand: 'Houyi',
    category: 'ملحقات ومستلزمات',
    subcategory: 'لواصق',
    description: 'لاصق فوري سائل عالي القوة. مثالي للصخور والأخشاب. يجف خلال ثوانٍ. آمن للاستخدام في الأحواض.',
    price: 652,
    category_id: CATEGORIES.ACCESSORIES,
    specifications: {
      الوزن: '50 جم',
      النوع: 'CA Liquid',
      وقت_الجفاف: 'فوري'
    }
  },
  {
    id: 'houyi-control-valve-4mm',
    slug: 'houyi-control-valve-4mm',
    name: 'صمام تحكم 4 مم',
    brand: 'Houyi',
    category: 'التهوية والأكسجين',
    subcategory: 'صمامات ووصلات',
    description: 'صمام تحكم في تدفق الهواء 4 مم. للتحكم في كمية الهواء الواصلة للحوض. سهل الاستخدام.',
    price: 48,
    category_id: CATEGORIES.AERATION,
    specifications: {
      القطر: '4 مم',
      النوع: 'صمام تحكم'
    }
  },
  {
    id: 'houyi-connector-t-4mm',
    slug: 'houyi-connector-t-4mm',
    name: 'موصل T شكل 4 مم',
    brand: 'Houyi',
    category: 'التهوية والأكسجين',
    subcategory: 'صمامات ووصلات',
    description: 'موصل على شكل T لتوزيع الهواء. قطر 4 مم. لتفريع خط الهواء إلى اتجاهين.',
    price: 19,
    category_id: CATEGORIES.AERATION,
    specifications: {
      القطر: '4 مم',
      الشكل: 'T'
    }
  },
  {
    id: 'houyi-connector-i-4mm',
    slug: 'houyi-connector-i-4mm',
    name: 'موصل I مستقيم 4 مم',
    brand: 'Houyi',
    category: 'التهوية والأكسجين',
    subcategory: 'صمامات ووصلات',
    description: 'موصل مستقيم لوصل خراطيم الهواء. قطر 4 مم. لتمديد خط الهواء.',
    price: 13,
    category_id: CATEGORIES.AERATION,
    specifications: {
      القطر: '4 مم',
      الشكل: 'I مستقيم'
    }
  },
  {
    id: 'houyi-connector-y-4mm',
    slug: 'houyi-connector-y-4mm',
    name: 'موصل Y شكل 4 مم',
    brand: 'Houyi',
    category: 'التهوية والأكسجين',
    subcategory: 'صمامات ووصلات',
    description: 'موصل على شكل Y لتوزيع الهواء. قطر 4 مم. لتفريع خط الهواء بزاوية.',
    price: 43,
    category_id: CATEGORIES.AERATION,
    specifications: {
      القطر: '4 مم',
      الشكل: 'Y'
    }
  },
  {
    id: 'houyi-air-distributor-4port',
    slug: 'houyi-air-distributor-4port',
    name: 'موزع هواء 4 منافذ أزرق',
    brand: 'Houyi',
    category: 'التهوية والأكسجين',
    subcategory: 'موزعات هواء',
    description: 'موزع هواء 4 منافذ مع صمامات تحكم فردية. لتوزيع الهواء على عدة أحواض أو حجارة هواء.',
    price: 1435,
    category_id: CATEGORIES.AERATION,
    specifications: {
      عدد_المنافذ: '4',
      اللون: 'أزرق',
      صمامات: 'مستقلة لكل منفذ'
    }
  },
  {
    id: 'houyi-air-distributor-6port',
    slug: 'houyi-air-distributor-6port',
    name: 'موزع هواء 6 منافذ أزرق',
    brand: 'Houyi',
    category: 'التهوية والأكسجين',
    subcategory: 'موزعات هواء',
    description: 'موزع هواء 6 منافذ مع صمامات تحكم فردية. للاستخدام المتقدم وتوزيع الهواء على عدة نقاط.',
    price: 2152,
    category_id: CATEGORIES.AERATION,
    specifications: {
      عدد_المنافذ: '6',
      اللون: 'أزرق',
      صمامات: 'مستقلة لكل منفذ'
    }
  },
  {
    id: 'houyi-medium-cotton-brown',
    slug: 'houyi-medium-cotton-brown',
    name: 'قطن فلتر بني متوسط 50 جم',
    brand: 'Houyi',
    category: 'الفلترة والتنقية',
    subcategory: 'مواد ترشيح',
    description: 'قطن فلتر بني متوسط الكثافة. للترشيح الميكانيكي والبيولوجي. قابل للغسل وإعادة الاستخدام.',
    price: 1578,
    category_id: CATEGORIES.FILTRATION,
    specifications: {
      الوزن: '50 جم',
      اللون: 'بني',
      الكثافة: 'متوسطة'
    }
  },
  {
    id: 'houyi-medium-cotton-grey',
    slug: 'houyi-medium-cotton-grey',
    name: 'قطن فلتر رمادي متوسط 50 جم',
    brand: 'Houyi',
    category: 'الفلترة والتنقية',
    subcategory: 'مواد ترشيح',
    description: 'قطن فلتر رمادي متوسط الكثافة. ترشيح فعال للشوائب. طويل العمر ومتين.',
    price: 1578,
    category_id: CATEGORIES.FILTRATION,
    specifications: {
      الوزن: '50 جم',
      اللون: 'رمادي',
      الكثافة: 'متوسطة'
    }
  }
];

async function main() {
  console.log('=== UPDATING HOUYI PRODUCTS ===\n');

  // Step 1: Update existing slugs
  console.log('--- Updating existing slugs ---');
  let updatedCount = 0;
  for (const [oldSlug, newSlug] of Object.entries(slugUpdates)) {
    try {
      const result = await sql`
        UPDATE products
        SET slug = ${newSlug}
        WHERE slug = ${oldSlug}
        RETURNING id, slug
      `;
      if (result.length > 0) {
        console.log(`✓ Updated: ${oldSlug} -> ${newSlug}`);
        updatedCount++;
      }
    } catch (error: any) {
      console.log(`⚠ Error updating ${oldSlug}: ${error.message}`);
    }
  }
  console.log(`Updated ${updatedCount} slugs\n`);

  // Step 2: Add missing products
  console.log('--- Adding missing products ---');
  let addedCount = 0;
  for (const product of missingProducts) {
    try {
      const existing = await sql`SELECT id FROM products WHERE slug = ${product.slug}`;
      if (existing.length > 0) {
        console.log(`⚠ Already exists: ${product.slug}`);
        continue;
      }

      await sql`
        INSERT INTO products (
          id, slug, name, brand, category, subcategory, description,
          price, category_id, specifications, stock, is_new, is_best_seller,
          images, thumbnail, currency
        )
        VALUES (
          ${product.id},
          ${product.slug},
          ${product.name},
          ${product.brand},
          ${product.category},
          ${product.subcategory},
          ${product.description},
          ${product.price},
          ${product.category_id},
          ${JSON.stringify(product.specifications)}::jsonb,
          50,
          true,
          false,
          ${JSON.stringify(['/images/products/placeholder.jpg'])}::jsonb,
          '/images/products/placeholder.jpg',
          'IQD'
        )
      `;
      console.log(`✓ Added: ${product.slug} - ${product.name}`);
      addedCount++;
    } catch (error: any) {
      console.log(`✗ Error adding ${product.slug}: ${error.message}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Slugs updated: ${updatedCount}`);
  console.log(`Products added: ${addedCount}`);
}

main().catch(console.error);
