import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

// Category IDs from database
const CATEGORIES = {
  FISH_FOOD: '1e3c6ec2-1bdf-4c60-a02f-b24aedb7fb8d',
  WATER_TREATMENT: '6fb87a1a-333e-4844-af5d-c032289363ed',
  LIGHTING: '12108ef0-0174-4096-9b6c-cd386563037d',
  CLEANING: '9cfde3f2-3b10-4c7d-a596-baaeced2f091',
  ACCESSORIES: '7ad11f33-498f-456d-b573-0fb5a54f9127',
  TANKS: '754e2ef5-7d30-49d9-a46a-e0f35466efcf',
};

// Missing products with detailed specifications
const missingProducts = [
  {
    id: 'yee-c1-1127-ranchu-feed',
    slug: 'c1-1127',
    name: 'علف ذهبية رانشو بالسبيرولينا 290 جرام',
    brand: 'YEE',
    category: 'طعام الأسماك',
    subcategory: 'أعلاف الذهبية',
    description: 'علف متخصص لأسماك الذهبية رانشو (لانشو) مع سبيرولينا وفطريات اليشم الصحية. يحتوي على بروتين عالي لتعزيز النمو وألوان زاهية. حبيبات بطيئة الغرق بحجم 3.0 مم مثالية للأسماك المستديرة. غني بالفيتامينات والمعادن الأساسية.',
    price: 2700,
    category_id: CATEGORIES.FISH_FOOD,
    specifications: {
      الوزن: '290 جرام',
      حجم_الحبيبات: '3.0 مم',
      النوع: 'بطيء الغرق',
      البروتين: '≥40%',
      المكونات: ['مسحوق السمك', 'سبيرولينا', 'فطريات اليشم', 'دقيق القمح', 'فيتامينات'],
      مناسب_لـ: ['ذهبية رانشو', 'أوراندا', 'رأس الأسد'],
      الصلاحية: '24 شهر'
    }
  },
  {
    id: 'yee-c1-1066-shrimp-food',
    slug: 'c1-1066',
    name: 'طعام روبيان الزينة عالي البروتين 260 جرام',
    brand: 'YEE',
    category: 'طعام الأسماك',
    subcategory: 'طعام الروبيان',
    description: 'غذاء متخصص عالي البروتين (40%) لروبيان الزينة. يعزز النمو الصحي واللون الزاهي. مثالي لجميع أنواع روبيان المياه العذبة. يحتوي على الكالسيوم لتقوية القشرة.',
    price: 2550,
    category_id: CATEGORIES.FISH_FOOD,
    specifications: {
      الوزن: '260 جرام',
      البروتين: '40%',
      المكونات: ['مسحوق الروبيان', 'سبيرولينا', 'كالسيوم', 'فيتامينات'],
      مناسب_لـ: ['روبيان الكرز', 'روبيان الكريستال', 'روبيان أمانو', 'روبيان النحل'],
      الصلاحية: '24 شهر'
    }
  },
  {
    id: 'yee-yyy-078-brine-shrimp-eggs',
    slug: 'yyy-078',
    name: 'بيض أرتيميا مقشر 80 جرام مع مغذي',
    brand: 'YEE',
    category: 'طعام الأسماك',
    subcategory: 'طعام حي ومجفف',
    description: 'بيض أرتيميا (جمبري ملحي) مقشر جاهز للتغذية. غني بالبروتين والأحماض الدهنية الأساسية. مثالي لصغار الأسماك والروبيان. يأتي مع مغذي خاص لسهولة الاستخدام.',
    price: 2475,
    category_id: CATEGORIES.FISH_FOOD,
    specifications: {
      الوزن: '80 جرام',
      الحجم: '150 مل',
      البروتين: '≥50%',
      يشمل: 'قطارة تغذية',
      مناسب_لـ: ['صغار الأسماك', 'البيتا', 'الروبيان', 'الأسماك الصغيرة'],
      التخزين: 'يحفظ مبرداً بعد الفتح'
    }
  },
  {
    id: 'yee-c1-1069-sample-pack',
    slug: 'c1-1069',
    name: 'عبوة عينات أعلاف متنوعة',
    brand: 'YEE',
    category: 'طعام الأسماك',
    subcategory: 'عبوات متنوعة',
    description: 'عبوة عينات تحتوي على مجموعة متنوعة من أعلاف الأسماك. مثالية للتجربة والعرض في المتاجر. تأتي مع علاقة ورقية مطلية للعرض.',
    price: 930,
    category_id: CATEGORIES.FISH_FOOD,
    specifications: {
      النوع: 'عبوة عينات',
      العرض: 'علاقة ورقية مطلية',
      المحتويات: 'تشكيلة أعلاف متنوعة'
    }
  },
  {
    id: 'yee-c1-1134-ranchu-sinking',
    slug: 'c1-1134',
    name: 'علف ذهبية رانشو غارق 500 جرام',
    brand: 'YEE',
    category: 'طعام الأسماك',
    subcategory: 'أعلاف الذهبية',
    description: 'علف غارق متخصص لأسماك رانشو الذهبية. حبيبات صغيرة 1.5 مم تغرق ببطء. يعزز نمو الهامة (ون) والجسم المستدير. غني بالبروتين والفيتامينات.',
    price: 2535,
    category_id: CATEGORIES.FISH_FOOD,
    specifications: {
      الوزن: '500 جرام',
      حجم_الحبيبات: '1.5 مم',
      النوع: 'غارق',
      البروتين: '≥38%',
      مناسب_لـ: ['رانشو', 'رأس الأسد', 'أوراندا التايلندية'],
      الصلاحية: '24 شهر'
    }
  },
  {
    id: 'yee-yyh-006-antibacterial',
    slug: 'yyh-006',
    name: 'مسحوق مضاد للبكتيريا 10 أكياس',
    brand: 'YEE',
    category: 'معالجة المياه',
    subcategory: 'علاج الأمراض',
    description: 'مسحوق سريع الذوبان للتعقيم ومكافحة البكتيريا في أحواض السمك. فعال ضد مجموعة واسعة من الأمراض البكتيرية. آمن للأسماك والنباتات عند استخدامه وفق التعليمات.',
    price: 1695,
    category_id: CATEGORIES.WATER_TREATMENT,
    specifications: {
      المحتويات: '10 أكياس × 2 جرام',
      الوزن_الكلي: '20 جرام',
      النوع: 'مسحوق سريع الذوبان',
      الفعالية: 'واسع الطيف ضد البكتيريا',
      الاستخدام: 'كيس واحد لكل 50 لتر',
      الصلاحية: '24 شهر'
    }
  },
  {
    id: 'yee-led-318-light',
    slug: 'led-318',
    name: 'إضاءة LED ثلاثية الألوان 3.5 واط 27 سم',
    brand: 'YEE',
    category: 'الإضاءة',
    subcategory: 'إضاءة LED',
    description: 'إضاءة LED عالية الجودة قابلة للتعديل بثلاثة أوضاع للون. مثالية للأحواض الصغيرة والمتوسطة. توفر إضاءة ممتازة لنمو النباتات وإبراز ألوان الأسماك. هدية مجانية.',
    price: 0,
    category_id: CATEGORIES.LIGHTING,
    specifications: {
      القدرة: '3.5 واط',
      الطول: '27 سم',
      النوع: 'صف مزدوج زاوية واسعة',
      الألوان: ['أبيض', 'أزرق', 'مزيج RGB'],
      مناسب_لـ: 'أحواض 20-40 سم',
      الجهد: '220 فولت'
    }
  },
  {
    id: 'yee-cls-107-magnetic-brush',
    slug: 'cls-107',
    name: 'فرشاة مغناطيسية كبيرة زرقاء',
    brand: 'YEE',
    category: 'الصيانة والتنظيف',
    subcategory: 'أدوات التنظيف',
    description: 'فرشاة مغناطيسية قوية لتنظيف الطحالب من زجاج الحوض. تصميم كبير للأحواض المتوسطة والكبيرة. مغناطيس قوي يمنع السقوط. سهلة الاستخدام دون بلل اليدين. هدية مجانية.',
    price: 0,
    category_id: CATEGORIES.CLEANING,
    specifications: {
      الحجم: 'كبير',
      اللون: 'أزرق',
      قوة_المغناطيس: 'قوي',
      سماكة_الزجاج: 'حتى 10 مم',
      يطفو: 'نعم'
    }
  },
  {
    id: 'yee-3656-tubing',
    slug: 'yee-3656',
    name: 'أنبوب بلاستيكي مقوى 16 مم × 1 متر',
    brand: 'YEE',
    category: 'ملحقات ومستلزمات',
    subcategory: 'أنابيب ووصلات',
    description: 'أنبوب بلاستيكي مقوى عالي الجودة لأنظمة الفلترة والمضخات. مقاوم للكسر والتشقق. مرن وسهل التركيب. هدية مجانية.',
    price: 0,
    category_id: CATEGORIES.ACCESSORIES,
    specifications: {
      القطر: '16 مم',
      الطول: '1.0 متر',
      المادة: 'بلاستيك مقوى (نيوجين)',
      المرونة: 'عالية',
      التوافق: 'وصلات الحوض القياسية'
    }
  },
  {
    id: 'yee-yxl-003-tank',
    slug: 'yxl-003',
    name: 'حوض زجاجي 40×23×25 سم',
    brand: 'YEE',
    category: 'أحواض',
    subcategory: 'أحواض زجاجية',
    description: 'حوض زجاجي فائق الوضوح بسماكة 5 مم. تصميم أنيق ومتين. مثالي للأسماك الصغيرة والنباتات المائية. زوايا مصقولة لمظهر احترافي.',
    price: 9420,
    category_id: CATEGORIES.TANKS,
    specifications: {
      الأبعاد: '400×230×250 مم',
      سماكة_الزجاج: '5 مم',
      السعة: 'تقريباً 23 لتر',
      المادة: 'زجاج فائق الوضوح',
      الحواف: 'مصقولة'
    }
  },
  {
    id: 'yee-ykk-50-tank',
    slug: 'ykk-50',
    name: 'حوض زجاجي 50×27×30 سم',
    brand: 'YEE',
    category: 'أحواض',
    subcategory: 'أحواض زجاجية',
    description: 'حوض زجاجي فائق الوضوح متوسط الحجم. سماكة 5 مم للمتانة. مناسب لمجموعة متنوعة من الأسماك. تصميم عصري وأنيق.',
    price: 14595,
    category_id: CATEGORIES.TANKS,
    specifications: {
      الأبعاد: '500×270×300 مم',
      سماكة_الزجاج: '5 مم',
      السعة: 'تقريباً 40 لتر',
      المادة: 'زجاج فائق الوضوح',
      الحواف: 'مصقولة'
    }
  },
  {
    id: 'yee-ykk-60-tank',
    slug: 'ykk-60',
    name: 'حوض زجاجي 60×30×35 سم',
    brand: 'YEE',
    category: 'أحواض',
    subcategory: 'أحواض زجاجية',
    description: 'حوض زجاجي فائق الوضوح كبير الحجم. سماكة 5 مم عالية الجودة. مثالي للأحياء المائية المتنوعة. زوايا نظيفة ومصقولة.',
    price: 18780,
    category_id: CATEGORIES.TANKS,
    specifications: {
      الأبعاد: '600×300×350 مم',
      سماكة_الزجاج: '5 مم',
      السعة: 'تقريباً 63 لتر',
      المادة: 'زجاج فائق الوضوح',
      الحواف: 'مصقولة'
    }
  },
  {
    id: 'yee-1090-cube-tank',
    slug: 'yee-1090',
    name: 'حوض مكعب 35×35×35 سم',
    brand: 'YEE',
    category: 'أحواض',
    subcategory: 'أحواض مكعبة',
    description: 'حوض مكعب أنيق بزجاج فائق الوضوح. سماكة 6 مم للمتانة الممتازة. تصميم مثالي للأكواسكيب والنباتات. مناسب لغرف المعيشة والمكاتب.',
    price: 12885,
    category_id: CATEGORIES.TANKS,
    specifications: {
      الأبعاد: '35×35×35 سم',
      سماكة_الزجاج: '6 مم',
      السعة: 'تقريباً 43 لتر',
      المادة: 'زجاج فائق الوضوح',
      الشكل: 'مكعب'
    }
  },
  {
    id: 'yee-ycg-40-cube-tank',
    slug: 'ycg-40',
    name: 'حوض مكعب 40×40×40 سم',
    brand: 'YEE',
    category: 'أحواض',
    subcategory: 'أحواض مكعبة',
    description: 'حوض مكعب كبير بزجاج فائق الوضوح. سماكة 6 مم للقوة والمتانة. مثالي للأكواسكيب الاحترافي. يوفر رؤية ممتازة من جميع الزوايا.',
    price: 17325,
    category_id: CATEGORIES.TANKS,
    specifications: {
      الأبعاد: '40×40×40 سم',
      سماكة_الزجاج: '6 مم',
      السعة: 'تقريباً 64 لتر',
      المادة: 'زجاج فائق الوضوح',
      الشكل: 'مكعب'
    }
  }
];

async function addMissingProducts() {
  console.log('=== ADDING MISSING PRODUCTS ===\n');

  let addedCount = 0;
  let errorCount = 0;

  for (const product of missingProducts) {
    try {
      // Check if product already exists
      const existing = await sql`SELECT id FROM products WHERE slug = ${product.slug}`;

      if (existing.length > 0) {
        console.log(`⚠ Already exists: ${product.slug}`);
        continue;
      }

      // Insert new product
      const result = await sql`
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
        RETURNING id, slug, name
      `;

      if (result.length > 0) {
        console.log(`✓ Added: ${product.slug} - ${product.name}`);
        addedCount++;
      }
    } catch (error: any) {
      console.log(`✗ Error adding ${product.slug}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Added: ${addedCount}`);
  console.log(`Errors: ${errorCount}`);
}

addMissingProducts().catch(console.error);
