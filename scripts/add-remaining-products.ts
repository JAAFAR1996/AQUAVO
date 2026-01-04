import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const CATEGORIES = {
  HEATING: '1165697b-96b0-4582-ab30-dba0e9233c4e', // التحكم بالحرارة
  SUBSTRATE: 'b71fc5b0-00d9-4c98-b9f0-47cefeeb2d78', // التربة والديكور
  AERATION: '7cb8fbad-24cf-4b5b-b5e9-8da34a18a533', // التهوية والأكسجين
};

const remainingProducts = [
  {
    id: 'yee-3007-heater-100w',
    slug: 'yee-3007',
    name: 'سخان ستيل نقي 100 واط',
    brand: 'YEE',
    category: 'التحكم بالحرارة',
    subcategory: 'سخانات',
    description: 'سخان من الستيل النقي 304 بقدرة 100 واط. مقاوم للصدأ ومناسب للأحواض متوسطة الحجم (60-80 سم). تحكم دقيق في درجة الحرارة مع مؤشر LED. آمن وموثوق للاستخدام المستمر.',
    price: 3840,
    category_id: CATEGORIES.HEATING,
    specifications: {
      القدرة: '100 واط',
      المادة: 'ستيل 304 مقاوم للصدأ',
      نطاق_الحرارة: '20-34 درجة مئوية',
      مناسب_لـ: 'أحواض 60-80 سم (50-100 لتر)',
      الجهد: '220-240 فولت',
      الموديل: 'YSH-100'
    }
  },
  {
    id: 'yee-3008-heater-200w',
    slug: 'yee-3008',
    name: 'سخان ستيل نقي 200 واط',
    brand: 'YEE',
    category: 'التحكم بالحرارة',
    subcategory: 'سخانات',
    description: 'سخان من الستيل النقي 304 بقدرة 200 واط. مقاوم للصدأ ومناسب للأحواض الكبيرة (80-100 سم). تحكم دقيق في درجة الحرارة مع مؤشر LED. قوة تسخين ممتازة للأحواض الكبيرة.',
    price: 3870,
    category_id: CATEGORIES.HEATING,
    specifications: {
      القدرة: '200 واط',
      المادة: 'ستيل 304 مقاوم للصدأ',
      نطاق_الحرارة: '20-34 درجة مئوية',
      مناسب_لـ: 'أحواض 80-100 سم (100-200 لتر)',
      الجهد: '220-240 فولت',
      الموديل: 'YSH-200'
    }
  },
  {
    id: 'yee-yff-052-substrate-coarse',
    slug: 'yff-052',
    name: 'تربة نباتات مائية حبيبات خشنة 3 لتر',
    brand: 'YEE',
    category: 'التربة والديكور',
    subcategory: 'تربة نباتات',
    description: 'تربة نباتات مائية عالية الخصوبة بحبيبات خشنة. مثالية للنباتات ذات الجذور القوية. غنية بالمغذيات الطبيعية. تحافظ على توازن الـ pH. لا تحتاج للغسل قبل الاستخدام.',
    price: 3585,
    category_id: CATEGORIES.SUBSTRATE,
    specifications: {
      الحجم: '3 لتر',
      حجم_الحبيبات: 'خشنة (3-5 مم)',
      الخصوبة: 'مطورة +80%',
      المميزات: ['غنية بالنيتروجين', 'تحافظ على pH', 'لا تحتاج غسل'],
      مناسب_لـ: 'النباتات ذات الجذور القوية'
    }
  },
  {
    id: 'yee-c5-1144-air-tube',
    slug: 'c5-1144',
    name: 'خرطوم هواء مقوى 1.5 متر',
    brand: 'YEE',
    category: 'التهوية والأكسجين',
    subcategory: 'خراطيم وملحقات',
    description: 'خرطوم هواء مقوى ومحسن بطول 1.5 متر. سمك إضافي للمتانة. مرن وسهل التركيب. مقاوم للطي والانسداد. مثالي لمضخات الهواء والفلاتر.',
    price: 550,
    category_id: CATEGORIES.AERATION,
    specifications: {
      الطول: '1.5 متر',
      القطر: 'قياسي 4 مم',
      المميزات: ['مقوى', 'سميك', 'مرن'],
      التوافق: 'جميع مضخات الهواء القياسية'
    }
  }
];

async function addRemainingProducts() {
  console.log('=== ADDING REMAINING PRODUCTS ===\n');

  let addedCount = 0;

  for (const product of remainingProducts) {
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
      console.log(`✗ Error: ${product.slug} - ${error.message}`);
    }
  }

  console.log(`\nTotal added: ${addedCount}`);
}

addRemainingProducts().catch(console.error);
