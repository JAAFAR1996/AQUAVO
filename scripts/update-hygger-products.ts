import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

// Category IDs
const CATEGORIES = {
  LIGHTING: 'd0f3e5a2-1b4c-4e8f-9a2d-6c7b8e9f0a1b', // الإضاءة
  HEATING: '1165697b-96b0-4582-ab30-dba0e9233c4e', // التحكم بالحرارة
  FILTRATION: '3c8cc237-0c0c-4ff5-9bfc-9dd16fb120fb', // الفلترة والتنقية
  AERATION: '7cb8fbad-24cf-4b5b-b5e9-8da34a18a533', // التهوية والأكسجين
  CLEANING: '9cfde3f2-3b10-4c7d-a596-baaeced2f091', // التنظيف والصيانة
  MEASUREMENT: 'db9d816c-ac55-4cef-8f6b-01490072163c', // الفحص والمراقبة
  DECORATION: 'b71fc5b0-00d9-4c98-b9f0-47cefeeb2d78', // الديكور
};

// Slug updates for existing products
const slugUpdates: { [oldSlug: string]: { newSlug: string; model: string } } = {
  'hygger-led-aquarium-light-22w': { newSlug: 'hg-978-22w', model: 'HG-978-22W' },
  'hygger-titanium-heater-200w': { newSlug: 'hg085-200w', model: 'HG085-200W' },
  'hygger-4in1-filter-10w': { newSlug: 'hg153-10w', model: 'HG153-10W' },
  'hygger-canister-filter-uv-1200l': { newSlug: 'hg101-1200l-uv', model: 'HG101-1200L(UV)' },
  'hygger-hob-filter-surface-skimmer': { newSlug: 'hg150-6w', model: 'HG150-6W' },
  'hygger-quiet-air-pump-3w': { newSlug: 'hg037-3w', model: 'HG037-3W' },
  'hygger-rechargeable-oxygen-pump': { newSlug: 'hg087-1.5w', model: 'HG087-1.5W' },
  'hygger-ultra-quiet-air-pump-5w': { newSlug: 'hg-958-5w', model: 'HG-958-5W' },
  'hygger-black-knight-cleaning-kit': { newSlug: 'hgy0001-m', model: 'HGY0001-M' },
  'hygger-magnetic-glass-cleaner-small': { newSlug: 'hg124-s', model: 'HG124-S' },
  'hygger-magnetic-algae-scraper': { newSlug: 'hg953-m', model: 'HG953-M' },
  'hygger-digital-thermometer': { newSlug: 'hg073-l', model: 'HG073-L' },
  'hygger-aquascaping-tools-kit': { newSlug: 'hg030-color', model: 'HG030-Color' },
  'hygger-rgb-led-light-controller-36w': { newSlug: 'hg-957-36w', model: 'HG-957-36W' },
  'hygger-5in1-water-tester': { newSlug: 'hg239', model: 'HG239' },
  'hygger-aquarium-background-small': { newSlug: 'hc004-s', model: 'HC004-S' },
  'hygger-8in1-test-strips': { newSlug: 'hg006-50', model: 'HG006-50' },
};

// Missing products to add
const missingProducts = [
  // Aquarium Lights HG-978 series
  {
    id: 'hygger-hg-978-18w',
    slug: 'hg-978-18w',
    name: 'HYGGER إضاءة LED للحوض 18 واط',
    brand: 'HYGGER',
    category: 'الإضاءة',
    subcategory: 'إضاءة LED',
    description: 'إضاءة LED احترافية من HYGGER بقدرة 18 واط للأحواض 45-60 سم. طيف كامل يدعم نمو النباتات. تتضمن أضواء بيضاء 6500K وزرقاء وحمراء وخضراء. شدة إضاءة 1075 لومن مع CRI 86. مثالية للأحواض المزروعة والأسماك الاستوائية.',
    price: 38100, // $12.7 * 3000 IQD
    category_id: CATEGORIES.LIGHTING,
    specifications: {
      'القدرة': '18 واط',
      'الجهد': 'AC 220-240V / 50Hz',
      'شدة_الإضاءة': '1075 لومن',
      'CRI': '86',
      'الطيف': 'أبيض 6500K، أزرق 455nm، أحمر 620nm، أخضر 560nm',
      'عدد_LEDs': '98 قطعة',
      'طول_الإضاءة': '45 سم (17.7 بوصة)',
      'مناسب_لـ': 'أحواض 45-60 سم',
      'طول_السلك': '2.2 متر',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG-978-18W'
    }
  },
  {
    id: 'hygger-hg-978-26w',
    slug: 'hg-978-26w',
    name: 'HYGGER إضاءة LED للحوض 26 واط',
    brand: 'HYGGER',
    category: 'الإضاءة',
    subcategory: 'إضاءة LED',
    description: 'إضاءة LED احترافية من HYGGER بقدرة 26 واط للأحواض 75-90 سم. طيف كامل متقدم لنمو النباتات المثالي. 138 قطعة LED بشدة 1662 لومن. تصميم نحيف وأنيق مع أقواس قابلة للتعديل.',
    price: 56300, // $18.77 * 3000
    category_id: CATEGORIES.LIGHTING,
    specifications: {
      'القدرة': '26 واط',
      'الجهد': 'AC 220-240V / 50Hz',
      'شدة_الإضاءة': '1662 لومن',
      'CRI': '86',
      'الطيف': 'أبيض 6500K، أزرق 455nm، أحمر 620nm، أخضر 560nm',
      'عدد_LEDs': '138 قطعة',
      'طول_الإضاءة': '75 سم (29.5 بوصة)',
      'مناسب_لـ': 'أحواض 75-90 سم',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG-978-26W'
    }
  },
  {
    id: 'hygger-hg-978-36w',
    slug: 'hg-978-36w',
    name: 'HYGGER إضاءة LED للحوض 36 واط',
    brand: 'HYGGER',
    category: 'الإضاءة',
    subcategory: 'إضاءة LED',
    description: 'إضاءة LED عالية القدرة من HYGGER بقوة 36 واط للأحواض الكبيرة 90-105 سم. أقوى إضاءة في السلسلة مع 2728 لومن و158 قطعة LED. طيف كامل يضمن نمو النباتات الكثيفة والألوان الزاهية للأسماك.',
    price: 79300, // $26.43 * 3000
    category_id: CATEGORIES.LIGHTING,
    specifications: {
      'القدرة': '36 واط',
      'الجهد': 'AC 220-240V / 50Hz',
      'شدة_الإضاءة': '2728 لومن',
      'CRI': '86',
      'الطيف': 'أبيض 6500K، أزرق 455nm، أحمر 620nm، أخضر 560nm',
      'عدد_LEDs': '158 قطعة',
      'طول_الإضاءة': '90 سم (35.4 بوصة)',
      'مناسب_لـ': 'أحواض 90-105 سم',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG-978-36W'
    }
  },
  // 4-in-1 Filter 18W variant
  {
    id: 'hygger-hg153-18w',
    slug: 'hg153-18w',
    name: 'HYGGER فلتر غاطس 4 في 1 - 18 واط',
    brand: 'HYGGER',
    category: 'الفلترة والتنقية',
    subcategory: 'فلاتر داخلية',
    description: 'فلتر غاطس متعدد الوظائف من HYGGER بقدرة 18 واط. يوفر 4 وظائف: فلترة، تهوية، صناعة موجات، وتدوير المياه. مناسب للأحواض 110-300 لتر. سفنجة بيوكيميائية لترشيح ميكانيكي وبيولوجي فعال.',
    price: 13650, // $4.55 * 3000
    category_id: CATEGORIES.FILTRATION,
    specifications: {
      'القدرة': '18 واط',
      'الوظائف': '4 في 1 (فلترة، تهوية، موجات، تدوير)',
      'معدل_التدفق': '1200 لتر/ساعة',
      'مناسب_لـ': 'أحواض 110-300 لتر',
      'الترشيح': 'سفنجة بيوكيميائية قابلة للغسل',
      'التحكم': 'تدفق وهواء قابل للتعديل',
      'الضوضاء': 'هادئ جداً',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG153-18W'
    }
  },
  // Canister Filter 1800L variant
  {
    id: 'hygger-hg101-1800l-uv',
    slug: 'hg101-1800l-uv',
    name: 'HYGGER فلتر كانيستر مع معقم UV - 1800 لتر',
    brand: 'HYGGER',
    category: 'الفلترة والتنقية',
    subcategory: 'فلاتر خارجية',
    description: 'فلتر كانيستر خارجي احترافي من HYGGER مع معقم UV بقوة 9 واط. تدفق 1800 لتر/ساعة للأحواض الكبيرة حتى 400 لتر. يقضي على البكتيريا والطحالب. قدرة 35 واط مع ترشيح متعدد المراحل.',
    price: 229600, // $76.53 * 3000
    category_id: CATEGORIES.FILTRATION,
    specifications: {
      'القدرة': '35 واط',
      'لمبة_UV': '9 واط',
      'معدل_التدفق': '1800 لتر/ساعة',
      'الجهد': 'AC 220-240V / 50Hz',
      'الأبعاد': '28×28×43 سم',
      'مناسب_لـ': 'أحواض حتى 400 لتر',
      'الميزات': 'معقم UV، ترشيح متعدد المراحل',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG101-1800L(UV)'
    }
  },
  // Magnetic Cleaner M and L
  {
    id: 'hygger-hg124-m',
    slug: 'hg124-m',
    name: 'HYGGER منظف زجاج مغناطيسي - وسط',
    brand: 'HYGGER',
    category: 'التنظيف والصيانة',
    subcategory: 'منظفات الزجاج',
    description: 'منظف زجاج مغناطيسي متوسط الحجم من HYGGER للأحواض بسماكة 6-13 مم. تنظيف سهل وآمن بدون ابتلال اليدين. كاشطة ناعمة لا تخدش الزجاج. مقبض مريح وقوة مغناطيسية متوازنة.',
    price: 11550, // $3.85 * 3000
    category_id: CATEGORIES.CLEANING,
    specifications: {
      'الحجم': 'وسط M',
      'سماكة_الزجاج': '6-13 مم',
      'الأبعاد': '13.7×5×7.5 سم',
      'المادة': 'مغناطيس + بلاستيك ABS',
      'الكاشطة': 'ناعمة - لا تخدش',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG124-M'
    }
  },
  {
    id: 'hygger-hg124-l',
    slug: 'hg124-l',
    name: 'HYGGER منظف زجاج مغناطيسي - كبير',
    brand: 'HYGGER',
    category: 'التنظيف والصيانة',
    subcategory: 'منظفات الزجاج',
    description: 'منظف زجاج مغناطيسي كبير من HYGGER للأحواض بسماكة 13-20 مم. قوة مغناطيسية عالية للزجاج السميك. تنظيف فعال للأحواض الكبيرة. تصميم مريح للاستخدام المطول.',
    price: 18200, // $6.07 * 3000
    category_id: CATEGORIES.CLEANING,
    specifications: {
      'الحجم': 'كبير L',
      'سماكة_الزجاج': '13-20 مم',
      'الأبعاد': '15×6×7.6 سم',
      'المادة': 'مغناطيس قوي + بلاستيك ABS',
      'الكاشطة': 'ناعمة - لا تخدش',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG124-L'
    }
  },
  // RGB Light 48W
  {
    id: 'hygger-hg957-48w',
    slug: 'hg957-48w',
    name: 'HYGGER إضاءة LED RGB مع متحكم خارجي 48 واط',
    brand: 'HYGGER',
    category: 'الإضاءة',
    subcategory: 'إضاءة LED',
    description: 'إضاءة LED RGB احترافية من HYGGER بقدرة 48 واط مع متحكم خارجي. 144 قطعة LED تشمل RGB للألوان المتنوعة. CRI 89 لألوان طبيعية. شدة 2365 لومن. تحكم كامل بالألوان والسطوع.',
    price: 77400, // $25.8 * 3000
    category_id: CATEGORIES.LIGHTING,
    specifications: {
      'القدرة': '48 واط',
      'الجهد': 'AC 100-240V',
      'جهد_الخرج': 'DC 15V',
      'شدة_الإضاءة': '2365 لومن',
      'CRI': '89',
      'عدد_LEDs': '144 (أبيض 79، أزرق 14، أحمر 8، أخضر 7، RGB 36)',
      'طول_الإضاءة': '75 سم (29.5 بوصة)',
      'مناسب_لـ': 'أحواض 60-75 سم',
      'طول_السلك': '2.7 متر',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HG957-48W'
    }
  },
  // Background sizes M, L, XL
  {
    id: 'hygger-hc004-m',
    slug: 'hc004-m',
    name: 'HYGGER خلفية حوض كهروستاتيكية - وسط',
    brand: 'HYGGER',
    category: 'التربة والديكور',
    subcategory: 'خلفيات',
    description: 'خلفية حوض كهروستاتيكية من HYGGER مقاس وسط 45×120 سم. لاصقة بالكهرباء الساكنة بدون غراء. سهلة التركيب والإزالة. تمنح الحوض مظهر طبيعي ثلاثي الأبعاد.',
    price: 2590, // $0.86 * 3000
    category_id: CATEGORIES.DECORATION,
    specifications: {
      'الحجم': 'وسط M',
      'الأبعاد': '45×120 سم',
      'النوع': 'كهروستاتيكية - بدون غراء',
      'المادة': 'PVC عالي الجودة',
      'قابل_للإزالة': 'نعم - بدون بقايا',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HC004-M'
    }
  },
  {
    id: 'hygger-hc004-l',
    slug: 'hc004-l',
    name: 'HYGGER خلفية حوض كهروستاتيكية - كبير',
    brand: 'HYGGER',
    category: 'التربة والديكور',
    subcategory: 'خلفيات',
    description: 'خلفية حوض كهروستاتيكية من HYGGER مقاس كبير 50×150 سم. مثالية للأحواض الكبيرة. تركيب سهل بالضغط فقط. مقاومة للماء ولا تبهت.',
    price: 3360, // $1.12 * 3000
    category_id: CATEGORIES.DECORATION,
    specifications: {
      'الحجم': 'كبير L',
      'الأبعاد': '50×150 سم',
      'النوع': 'كهروستاتيكية - بدون غراء',
      'المادة': 'PVC عالي الجودة',
      'قابل_للإزالة': 'نعم - بدون بقايا',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HC004-L'
    }
  },
  {
    id: 'hygger-hc004-xl',
    slug: 'hc004-xl',
    name: 'HYGGER خلفية حوض كهروستاتيكية - كبير جداً',
    brand: 'HYGGER',
    category: 'التربة والديكور',
    subcategory: 'خلفيات',
    description: 'خلفية حوض كهروستاتيكية من HYGGER مقاس كبير جداً 60×200 سم. للأحواض الضخمة والعرض. جودة طباعة عالية. سهلة القص للتعديل على أي حجم.',
    price: 5040, // $1.68 * 3000
    category_id: CATEGORIES.DECORATION,
    specifications: {
      'الحجم': 'كبير جداً XL',
      'الأبعاد': '60×200 سم',
      'النوع': 'كهروستاتيكية - بدون غراء',
      'المادة': 'PVC عالي الجودة',
      'قابل_للإزالة': 'نعم - بدون بقايا',
      'العلامة_التجارية': 'HYGGER',
      'الموديل': 'HC004-XL'
    }
  }
];

async function updateHyggerProducts() {
  console.log('=== UPDATING HYGGER PRODUCTS ===\n');

  // 1. Update existing slugs
  console.log('--- Updating existing slugs ---');
  let slugsUpdated = 0;

  for (const [oldSlug, data] of Object.entries(slugUpdates)) {
    try {
      const result = await sql`
        UPDATE products
        SET slug = ${data.newSlug}
        WHERE slug = ${oldSlug}
        RETURNING id
      `;
      if (result.length > 0) {
        console.log(`✓ ${oldSlug} -> ${data.newSlug}`);
        slugsUpdated++;
      } else {
        console.log(`⚠ Not found: ${oldSlug}`);
      }
    } catch (error: any) {
      if (error.message.includes('duplicate')) {
        console.log(`⚠ Already exists: ${data.newSlug}`);
      } else {
        console.log(`✗ Error: ${oldSlug} - ${error.message}`);
      }
    }
  }
  console.log(`Updated ${slugsUpdated} slugs\n`);

  // 2. Add missing products
  console.log('--- Adding missing products ---');
  let productsAdded = 0;

  for (const product of missingProducts) {
    try {
      // Check if already exists
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
      productsAdded++;
    } catch (error: any) {
      console.log(`✗ Error: ${product.slug} - ${error.message}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Slugs updated: ${slugsUpdated}`);
  console.log(`Products added: ${productsAdded}`);
}

updateHyggerProducts().catch(console.error);
