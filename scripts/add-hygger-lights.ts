import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const LIGHTING_CATEGORY = '12108ef0-0174-4096-9b6c-cd386563037d';

const lightingProducts = [
  {
    id: 'hygger-hg-978-18w',
    slug: 'hg-978-18w',
    name: 'HYGGER إضاءة LED للحوض 18 واط',
    brand: 'HYGGER',
    category: 'الإضاءة',
    subcategory: 'إضاءة LED',
    description: 'إضاءة LED احترافية من HYGGER بقدرة 18 واط للأحواض 45-60 سم. طيف كامل يدعم نمو النباتات. تتضمن أضواء بيضاء 6500K وزرقاء وحمراء وخضراء. شدة إضاءة 1075 لومن مع CRI 86. مثالية للأحواض المزروعة والأسماك الاستوائية.',
    price: 38100,
    category_id: LIGHTING_CATEGORY,
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
    price: 56300,
    category_id: LIGHTING_CATEGORY,
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
    price: 79300,
    category_id: LIGHTING_CATEGORY,
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
  {
    id: 'hygger-hg957-48w',
    slug: 'hg957-48w',
    name: 'HYGGER إضاءة LED RGB مع متحكم خارجي 48 واط',
    brand: 'HYGGER',
    category: 'الإضاءة',
    subcategory: 'إضاءة LED',
    description: 'إضاءة LED RGB احترافية من HYGGER بقدرة 48 واط مع متحكم خارجي. 144 قطعة LED تشمل RGB للألوان المتنوعة. CRI 89 لألوان طبيعية. شدة 2365 لومن. تحكم كامل بالألوان والسطوع.',
    price: 77400,
    category_id: LIGHTING_CATEGORY,
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
  }
];

async function addLights() {
  console.log('=== ADDING HYGGER LIGHTING PRODUCTS ===\n');

  for (const product of lightingProducts) {
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
    } catch (error: any) {
      console.log(`✗ Error: ${product.slug} - ${error.message}`);
    }
  }
}

addLights().catch(console.error);
