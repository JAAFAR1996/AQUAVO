/**
 * Script to add ALL Houyi products to database (matching YEE format)
 * Run with: npx tsx scripts/add-all-houyi-products.ts
 */
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as fs from "fs";
import * as path from "path";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const HOUYI_FOLDER = './client/public/images/products/houyi';

function getImages(folderName: string): string[] {
  const folderPath = path.join(HOUYI_FOLDER, folderName);
  try {
    if (!fs.existsSync(folderPath)) return [];
    return fs.readdirSync(folderPath)
      .filter(f => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(f))
      .map(f => `/images/products/houyi/${encodeURIComponent(folderName)}/${f}`);
  } catch { return []; }
}

interface ProductData {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  stock: number;
  imageFolder: string;
  specifications?: Record<string, any>;
  variants?: any[];
  hasVariants?: boolean;
}

const products: ProductData[] = [
  // ═══════════════ أدوات (Tools) ═══════════════
  {
    id: 'houyi-koi-fish-net', slug: 'houyi-koi-fish-net',
    name: 'شبكة صيد كوي ألمنيوم قابلة للسحب',
    category: 'tools', subcategory: 'fishing-nets',
    description: 'شبكة صيد كوي احترافية من سبائك الألمنيوم خفيفة الوزن | قابلة للسحب والتعديل | مقبض مريح مضاد للانزلاق | شبكة ناعمة لحماية الأسماك | مثالية لأحواض الكوي والأسماك الكبيرة',
    price: 5000, stock: 10,
    imageFolder: 'houyi-koi-fish-net',
    specifications: { المادة: 'سبائك ألمنيوم', النوع: 'قابلة للسحب', الاستخدام: 'أحواض الكوي والأسماك الكبيرة' }
  },
  {
    id: 'houyi-nylon-fishing-net', slug: 'houyi-nylon-fishing-net',
    name: 'شبكة صيد نايلون صغيرة',
    category: 'tools', subcategory: 'fishing-nets',
    description: 'شبكة صيد نايلون عالية الجودة للأسماك الصغيرة والمتوسطة | خفيفة الوزن | شبكة دقيقة لمنع إصابة الأسماك | مقبض بلاستيكي مريح',
    price: 500, stock: 20,
    imageFolder: 'houyi-nylon-fishing-net',
    specifications: { المادة: 'نايلون', الحجم: 'صغير', الاستخدام: 'أسماك صغيرة ومتوسطة' }
  },
  {
    id: 'houyi-telescopic-fishnet', slug: 'houyi-telescopic-fishnet',
    name: 'شبكة صيد تلسكوبية ستانلس ستيل',
    category: 'tools', subcategory: 'fishing-nets',
    description: 'شبكة صيد من الستانلس ستيل مع عصا تلسكوبية ثلاثية الأقسام | طول قابل للتعديل 66-107 سم | مربعة الشكل | متينة ومقاومة للصدأ',
    price: 1000, stock: 15,
    imageFolder: 'houyi-telescopic-fishnet',
    specifications: { المادة: 'ستانلس ستيل', الطول: '66-107 سم', الأقسام: '3 أقسام تلسكوبية' }
  },
  {
    id: 'houyi-5-in-1-cleaning-tool', slug: 'houyi-5-in-1-cleaning-tool',
    name: 'أداة تنظيف 5 في 1 متعددة الاستخدامات',
    category: 'tools', subcategory: 'cleaning',
    description: 'مجموعة أدوات تنظيف شاملة 5 في 1 | تشمل: شبكة صيد + مكشطة زجاج + سكين طحالب + ملقط نباتات + شوكة رمل | كل ما تحتاجه لصيانة حوضك',
    price: 2000, stock: 15,
    imageFolder: 'houyi-5-in-1-cleaning-tool',
    specifications: { القطع: '5 أدوات', يشمل: 'شبكة + مكشطة + سكين طحالب + ملقط + شوكة' }
  },
  {
    id: 'houyi-water-changer-siphon', slug: 'houyi-water-changer-siphon',
    name: 'سيفون تغيير مياه 3 في 1 سريع',
    category: 'tools', subcategory: 'cleaning',
    description: 'سيفون تغيير مياه سريع 3 في 1 | مرشح حصى مدمج | طول 1.9 متر | تنظيف قاع الحوض وتغيير المياه بسهولة | مضخة يدوية بدون كهرباء',
    price: 1200, stock: 20,
    imageFolder: 'houyi-5-in-1-cleaning-tool',
    specifications: { الطول: '1.9 متر', الوظائف: '3 في 1', المضخة: 'يدوية' }
  },
  {
    id: 'houyi-hose-brush', slug: 'houyi-hose-brush',
    name: 'فرشاة تنظيف خراطيم مزدوجة 1.55 متر',
    category: 'tools', subcategory: 'cleaning',
    description: 'فرشاة تنظيف خراطيم بطول 1.55 متر | رأسين مختلفين للتنظيف العميق | مرنة وقابلة للثني | تنظف خراطيم الفلتر والمضخات بسهولة',
    price: 2000, stock: 20,
    imageFolder: 'houyi-hose-brush',
    specifications: { الطول: '1.55 متر', الرؤوس: '2 رأس مزدوج' }
  },
  {
    id: 'houyi-cleaning-towel', slug: 'houyi-cleaning-towel',
    name: 'منشفة تنظيف الحوض الاحترافية',
    category: 'tools', subcategory: 'cleaning',
    description: 'منشفة تنظيف خاصة بأحواض السمك | ماصة للماء | لا تترك وبراً | مثالية لتنظيف الزجاج الخارجي والمعدات',
    price: 600, stock: 40,
    imageFolder: 'houyi-cleaning-towel',
    specifications: { المادة: 'مايكروفايبر', الاستخدام: 'تنظيف الزجاج والمعدات' }
  },
  {
    id: 'houyi-tool-kit', slug: 'houyi-tool-kit',
    name: 'طقم أدوات أحواض احترافي 5 قطع',
    category: 'tools', subcategory: 'kits',
    description: 'طقم أدوات احترافي كامل | ملقط مستقيم 27 سم + ملقط منحني 27 سم + مقص مستقيم 24.5 سم + مقص منحني 24.5 سم + مجرفة رمل 31 سم | ستانلس ستيل',
    price: 12000, stock: 10,
    imageFolder: 'houyi-tool-kit',
    specifications: { القطع: '5 أدوات', المادة: 'ستانلس ستيل', يشمل: 'ملقط + مقص + مجرفة' }
  },

  // ═══════════════ القياس (Measurement) ═══════════════
  {
    id: 'houyi-chubby-thermometer', slug: 'houyi-chubby-thermometer',
    name: 'ترمومتر حوض بدين سهل القراءة',
    category: 'measurement', subcategory: 'thermometers',
    description: 'ترمومتر حوض سمك بتصميم بدين مميز | أرقام كبيرة سهلة القراءة | دقيق وموثوق | يلتصق بالزجاج الداخلي | قراءة فورية لدرجة الحرارة',
    price: 250, stock: 30,
    imageFolder: 'houyi-chubby-thermometer',
    specifications: { النوع: 'زجاجي بدين', التثبيت: 'داخلي على الزجاج' }
  },
  {
    id: 'houyi-suction-thermometer', slug: 'houyi-suction-thermometer',
    name: 'ترمومتر بماصة شفط زجاجي',
    category: 'measurement', subcategory: 'thermometers',
    description: 'ترمومتر حوض سمك زجاجي مع ماصة شفط قوية للتثبيت على الزجاج | قراءة دقيقة | تصميم نحيف لا يشغل مساحة | مدرج بالدرجة المئوية',
    price: 250, stock: 40,
    imageFolder: 'houyi-suction-thermometer',
    specifications: { النوع: 'زجاجي', التثبيت: 'ماصة شفط' }
  },

  // ═══════════════ الفلاتر (Filters) ═══════════════
  {
    id: 'houyi-dophin-skimmer', slug: 'houyi-dophin-electric-skimmer',
    name: 'DoPhin سكيمر كهربائي - مزيل الأغشية الزيتية',
    category: 'filters', subcategory: 'skimmers',
    description: 'سكيمر كهربائي من DoPhin لإزالة الأغشية الزيتية من سطح الماء | يحافظ على سطح ماء نظيف وكريستالي | تشغيل هادئ | سهل التركيب',
    price: 4000, stock: 10,
    imageFolder: 'houyi-dophin-electric-skimmer',
    specifications: { الماركة: 'DoPhin', النوع: 'كهربائي', الوظيفة: 'إزالة الأغشية الزيتية' }
  },

  // ═══════════════ مواد الترشيح (Filter Media) ═══════════════
  {
    id: 'houyi-ceramic-ring', slug: 'houyi-ceramic-ring',
    name: 'حلقات سيراميك للترشيح البيولوجي',
    category: 'filters', subcategory: 'media',
    description: 'حلقات سيراميك عالية المسامية للترشيح البيولوجي | توفر مساحة كبيرة لنمو البكتيريا النافعة | تكسر الأمونيا والنيتريت | مناسبة لجميع أنواع الفلاتر',
    price: 600, stock: 30,
    imageFolder: 'houyi-ceramic-ring',
    specifications: { النوع: 'ترشيح بيولوجي', المادة: 'سيراميك عالي المسامية' }
  },
  {
    id: 'houyi-activated-carbon', slug: 'houyi-activated-carbon',
    name: 'كربون منشط - إزالة السموم والروائح',
    category: 'filters', subcategory: 'media',
    description: 'كربون منشط عالي الجودة لإزالة السموم والروائح والتلوين من الماء | يمتص المواد الكيميائية الضارة | ينقي الماء بسرعة | يستبدل كل شهر',
    price: 700, stock: 30,
    imageFolder: 'houyi-activated-carbon',
    specifications: { النوع: 'ترشيح كيميائي', الاستبدال: 'كل شهر' }
  },
  {
    id: 'houyi-white-cotton', slug: 'houyi-white-cotton',
    name: 'قطن أبيض للفلتر 30×50 سم',
    category: 'filters', subcategory: 'media',
    description: 'قطن ترشيح أبيض ميكانيكي بقياس 30×50×2.5 سم | يحجز الشوائب والأوساخ | كثيف وفعال | قابل للقص حسب حجم الفلتر | يستبدل أسبوعياً',
    price: 350, stock: 40,
    imageFolder: 'houyi-white-cotton',
    specifications: { القياس: '30×50×2.5 سم', النوع: 'ترشيح ميكانيكي' }
  },
  {
    id: 'houyi-medium-cotton', slug: 'houyi-medium-cotton',
    name: 'قطن فلتر متوسط الكثافة',
    category: 'filters', subcategory: 'media',
    description: 'قطن ترشيح متوسط الكثافة | مناسب كطبقة وسطى بين القطن الناعم والخشن | يطيل عمر مواد الترشيح الأخرى | سهل القص والتركيب',
    price: 400, stock: 30,
    imageFolder: 'houyi-medium-cotton',
    specifications: { النوع: 'ترشيح ميكانيكي متوسط', الكثافة: 'متوسطة' }
  },

  // ═══════════════ التربة والرمل (Substrates) ═══════════════
  {
    id: 'houyi-pumice', slug: 'houyi-pumice',
    name: 'حجر خفاف طبيعي 3-6 ملم',
    category: 'substrates', subcategory: 'decorative',
    description: 'حجر خفاف طبيعي بحجم 3-6 ملم | خفيف الوزن ومسامي | مثالي للترشيح البيولوجي والديكور | لا يغير كيمياء الماء | يوفر سطح لنمو البكتيريا',
    price: 250, stock: 30,
    imageFolder: 'houyi-pumice',
    specifications: { الحجم: '3-6 ملم', النوع: 'طبيعي' }
  },
  {
    id: 'houyi-river-sand', slug: 'houyi-river-sand',
    name: 'رمل نهري ناعم 1-2 ملم',
    category: 'substrates', subcategory: 'sand',
    description: 'رمل نهري ناعم طبيعي بحجم 1-2 ملم | مثالي للنباتات المائية | لا يرفع pH الماء | منظف ومعقم | يعطي مظهر طبيعي جميل',
    price: 500, stock: 50,
    imageFolder: 'houyi-river-sand',
    specifications: { الحجم: '1-2 ملم', النوع: 'نهري طبيعي' }
  },
  {
    id: 'houyi-stream-sand', slug: 'houyi-stream-sand',
    name: 'رمل جداول طبيعي 2-6 ملم',
    category: 'substrates', subcategory: 'sand',
    description: 'رمل جداول طبيعي لا يحتاج غسيل | بحجم 2-6 ملم | ألوان طبيعية متنوعة | مثالي لأحواض البيوتوب | آمن للأسماك القاعية',
    price: 500, stock: 40,
    imageFolder: 'houyi-stream-sand',
    specifications: { الحجم: '2-6 ملم', الغسل: 'لا يحتاج' }
  },
  {
    id: 'houyi-south-american-sand', slug: 'houyi-south-american-sand',
    name: 'رمل أمريكي جنوبي 1-2 ملم',
    category: 'substrates', subcategory: 'sand',
    description: 'رمل أمريكي جنوبي بألوان داكنة جذابة | بحجم 1-2 ملم | يبرز ألوان الأسماك | متوفر بألوان الأسود والأحمر | طبيعي 100%',
    price: 500, stock: 30,
    imageFolder: 'houyi-south-american-sand',
    specifications: { الحجم: '1-2 ملم', الألوان: 'أسود وأحمر' }
  },
  {
    id: 'houyi-white-sand', slug: 'houyi-white-sand',
    name: 'رمل أبيض طبيعي للديكور',
    category: 'substrates', subcategory: 'sand',
    description: 'رمل أبيض طبيعي ناصع | يعطي مظهر نظيف ومشرق للحوض | مثالي لأحواض الأسماك البحرية والديكور | لا يؤثر على الماء',
    price: 300, stock: 30,
    imageFolder: 'houyi-white-sand',
    specifications: { اللون: 'أبيض ناصع', النوع: 'طبيعي' }
  },
  {
    id: 'houyi-dutch-sand', slug: 'houyi-dutch-sand',
    name: 'رمل هولندي عالي الجودة 1-2 ملم',
    category: 'substrates', subcategory: 'sand',
    description: 'رمل هولندي فاخر بحجم 1-2 ملم | مناسب لأحواض النباتات الهولندية | ألوان طبيعية دافئة | لا يؤثر على pH | منظف ومعقم',
    price: 500, stock: 20,
    imageFolder: 'houyi-dutch-sand',
    specifications: { الحجم: '1-2 ملم', الأصل: 'هولندي' }
  },

  // ═══════════════ الديكور والأخشاب (Decor & Wood) ═══════════════
  {
    id: 'houyi-polished-driftwood-sm', slug: 'houyi-polished-driftwood-small',
    name: 'خشب بوليش مصقول - حجم صغير 13-20 سم',
    category: 'decor', subcategory: 'driftwood',
    description: 'خشب طبيعي مصقول (بوليش) للأحواض | حجم صغير 13-20 سم | منظف ومعالج | جاهز للاستخدام مباشرة | يضيف مظهر طبيعي ساحر | كل قطعة فريدة',
    price: 1500, stock: 20,
    imageFolder: 'houyi-wood-products',
    specifications: { الحجم: '13-20 سم', النوع: 'مصقول بوليش', المعالجة: 'منظف وجاهز' }
  },
  {
    id: 'houyi-polished-driftwood-md', slug: 'houyi-polished-driftwood-medium',
    name: 'خشب بوليش مصقول - حجم متوسط 18-30 سم',
    category: 'decor', subcategory: 'driftwood',
    description: 'خشب طبيعي مصقول (بوليش) للأحواض | حجم متوسط 18-30 سم | أشكال عشوائية فنية | مثالي كنقطة محورية في الحوض | غارق بالماء',
    price: 3000, stock: 15,
    imageFolder: 'houyi-wood-products',
    specifications: { الحجم: '18-30 سم', النوع: 'مصقول بوليش' }
  },
  {
    id: 'houyi-polished-driftwood-lg', slug: 'houyi-polished-driftwood-large',
    name: 'خشب بوليش مصقول - حجم كبير 30-45 سم',
    category: 'decor', subcategory: 'driftwood',
    description: 'خشب طبيعي مصقول (بوليش) كبير للأحواض الكبيرة | حجم 30-45 سم | قطعة فنية مميزة | يرسي الحوض ويعطيه طابع طبيعي | غارق ثقيل',
    price: 5500, stock: 8,
    imageFolder: 'houyi-wood-products',
    specifications: { الحجم: '30-45 سم', النوع: 'مصقول بوليش' }
  },
  {
    id: 'houyi-polished-driftwood-xl', slug: 'houyi-polished-driftwood-xlarge',
    name: 'خشب بوليش مصقول - حجم كبير جداً 50-60 سم',
    category: 'decor', subcategory: 'driftwood',
    description: 'خشب طبيعي مصقول (بوليش) ضخم | حجم 50-60 سم | تحفة فنية طبيعية | مثالي للأحواض الكبيرة والعرض | كل قطعة فريدة من نوعها',
    price: 8000, stock: 5,
    imageFolder: 'houyi-wood-products',
    specifications: { الحجم: '50-60 سم', النوع: 'مصقول بوليش' }
  },
  {
    id: 'houyi-mountain-wood', slug: 'houyi-mountain-wood',
    name: 'خشب الجبل الطبيعي - ديكور فاخر',
    category: 'decor', subcategory: 'driftwood',
    description: 'خشب الجبل الطبيعي المميز | تشكيلات فريدة تشبه المناظر الجبلية | مثالي لعمل سكيب طبيعي | غارق ثقيل لا يطفو | كل قطعة مميزة',
    price: 5400, stock: 10,
    imageFolder: 'houyi-wood-products',
    specifications: { النوع: 'خشب جبلي طبيعي' }
  },
  {
    id: 'houyi-moss-tree', slug: 'houyi-moss-tree',
    name: 'شجرة موس جاهزة - ديكور حي',
    category: 'decor', subcategory: 'driftwood',
    description: 'شجرة خشبية جاهزة لربط الموس عليها | تصميم شجرة طبيعية | قاعدة ثابتة | مثالية كنقطة محورية | يمكن ربط Java Moss أو Christmas Moss',
    price: 3500, stock: 15,
    imageFolder: 'houyi-moss-tree',
    specifications: { النوع: 'شجرة خشبية للموس', الاستخدام: 'ربط الموس والنباتات' }
  },
  {
    id: 'houyi-blue-dragon-stone', slug: 'houyi-blue-dragon-stone',
    name: 'حجر التنين الأزرق - صخور ديكور',
    category: 'decor', subcategory: 'rocks',
    description: 'حجر التنين الأزرق الطبيعي (Ohko Stone) | تشكيلات وملمس فريد | مثالي لعمل إواغومي سكيب | لن يؤثر كثيراً على كيمياء الماء | بيع بالكيلو',
    price: 500, stock: 20,
    imageFolder: 'houyi-wood-products',
    specifications: { النوع: 'Ohko Stone', البيع: 'بالكيلو' }
  },
  {
    id: 'houyi-volcanic-stone', slug: 'houyi-volcanic-stone',
    name: 'حجر بركاني طبيعي 3-5 سم',
    category: 'decor', subcategory: 'rocks',
    description: 'حجر بركاني طبيعي بحجم 3-5 سم | مسامي للترشيح البيولوجي | متوفر بالأسود والأحمر | خفيف الوزن | مثالي للديكور والترشيح',
    price: 300, stock: 50,
    imageFolder: 'houyi-wood-products',
    specifications: { الحجم: '3-5 سم', الألوان: 'أسود وأحمر' },
    variants: [
      { id: 'black', label: 'أسود', price: 300, stock: 25, isDefault: true },
      { id: 'red', label: 'أحمر', price: 300, stock: 25 },
    ],
    hasVariants: true,
  },
  {
    id: 'houyi-planting-ring', slug: 'houyi-planting-ring',
    name: 'حلقة زراعة بركانية باغودا 52×26 ملم',
    category: 'decor', subcategory: 'accessories',
    description: 'حلقة زراعة من الحجر البركاني بشكل باغودا | تثبت النباتات المائية | تمنع الطفو | مسامية لنمو البكتيريا | حجم 52×26 ملم',
    price: 50, stock: 100,
    imageFolder: 'houyi-planting-ring',
    specifications: { القياس: '52×26 ملم', المادة: 'حجر بركاني' }
  },

  // ═══════════════ اللاصق (Adhesives) ═══════════════
  {
    id: 'houyi-moss-glue', slug: 'houyi-moss-glue',
    name: 'غراء موس آمن للأحواض',
    category: 'accessories', subcategory: 'glue',
    description: 'غراء آمن للأحواض لتثبيت الموس والنباتات على الصخور والأخشاب | يلتصق تحت الماء | آمن للأسماك والروبيان | متوفر بأحجام مختلفة',
    price: 500, stock: 80,
    imageFolder: 'houyi-wood-products',
    specifications: { الاستخدام: 'تثبيت الموس والنباتات' },
    variants: [
      { id: '5g-green', label: '5 جرام أخضر', price: 500, stock: 40, isDefault: true },
      { id: '20g-white', label: '20 جرام أبيض', price: 2500, stock: 40 },
    ],
    hasVariants: true,
  },
  {
    id: 'houyi-instant-glue', slug: 'houyi-instant-glue-50g',
    name: 'غراء فوري 50 جرام - لاصق قوي',
    category: 'accessories', subcategory: 'glue',
    description: 'غراء فوري 50 جرام أبيض | لاصق قوي وسريع الجفاف | آمن بعد الجفاف | مثالي لتثبيت الصخور والأخشاب والنباتات',
    price: 1500, stock: 30,
    imageFolder: 'houyi-instant-glue-50g',
    specifications: { الحجم: '50 جرام', اللون: 'أبيض' }
  },
  {
    id: 'houyi-silicone-121', slug: 'houyi-silicone-121',
    name: 'سيليكون خاص للأحواض 121 - آمن للأسماك',
    category: 'accessories', subcategory: 'glue',
    description: 'سيليكون خاص للأحواض آمن 100% للأسماك بعد الجفاف | لإصلاح التسريبات وبناء الأحواض | مقاوم للماء | يجف خلال 24 ساعة',
    price: 6000, stock: 10,
    imageFolder: 'houyi-silicone-121',
    specifications: { النوع: 'سيليكون أحواض', الأمان: 'آمن للأسماك', الجفاف: '24 ساعة' }
  },
  {
    id: 'houyi-foam-glue', slug: 'houyi-foam-glue',
    name: 'غراء فوم بلون الخشب 900 جرام - مناظر طبيعية',
    category: 'accessories', subcategory: 'glue',
    description: 'غراء فوم بلون الخشب الطبيعي | 900 جرام | لعمل خلفيات ومناظر طبيعية ثلاثية الأبعاد | يتمدد ويملأ الفراغات | آمن بعد الجفاف الكامل',
    price: 45000, stock: 5,
    imageFolder: 'houyi-foam-glue',
    specifications: { الحجم: '900 جرام', اللون: 'خشبي' }
  },

  // ═══════════════ ملحقات التهوية (Air Accessories) ═══════════════
  {
    id: 'houyi-check-valve', slug: 'houyi-check-valve',
    name: 'صمام عدم رجوع - حماية المضخة',
    category: 'air-pumps', subcategory: 'accessories',
    description: 'صمام عدم رجوع لمنع تسرب الماء للمضخة عند انقطاع الكهرباء | ضروري لحماية مضخة الهواء | سهل التركيب | قياسي 4 ملم',
    price: 50, stock: 60,
    imageFolder: 'houyi-check-valve',
    specifications: { القطر: '4 ملم', الوظيفة: 'حماية المضخة من الماء' }
  },
  {
    id: 'houyi-stainless-shunt', slug: 'houyi-stainless-shunt',
    name: 'موزع هواء ستانلس ستيل',
    category: 'air-pumps', subcategory: 'distributors',
    description: 'موزع هواء من الستانلس ستيل عالي الجودة | صمامات تحكم فردية لكل منفذ | مقاوم للصدأ | لتوزيع الهواء على عدة أحواض',
    price: 3500, stock: 20,
    imageFolder: 'houyi-wood-products',
    specifications: { المادة: 'ستانلس ستيل' },
    variants: [
      { id: '4-port', label: '4 منافذ', price: 3500, stock: 10, isDefault: true },
      { id: '6-port', label: '6 منافذ', price: 5000, stock: 10 },
    ],
    hasVariants: true,
  },
  {
    id: 'houyi-air-distributor', slug: 'houyi-air-distributor-4port',
    name: 'موزع هواء بلاستيكي 4 منافذ',
    category: 'air-pumps', subcategory: 'distributors',
    description: 'موزع هواء بلاستيكي 4 منافذ | صمامات تحكم فردية | اقتصادي وعملي | قياسي 4 ملم | خفيف الوزن',
    price: 500, stock: 40,
    imageFolder: 'houyi-air-distributor-4port',
    specifications: { المنافذ: '4', القطر: '4 ملم' }
  },
  {
    id: 'houyi-tracheal-suction', slug: 'houyi-tracheal-suction',
    name: 'ماصة شفط لتثبيت الخراطيم',
    category: 'air-pumps', subcategory: 'accessories',
    description: 'ماصة شفط شفافة لتثبيت خراطيم الهواء على جدار الحوض الداخلي | قبضة قوية | شفافة لا تشوه المنظر | قياسي 4 ملم',
    price: 30, stock: 100,
    imageFolder: 'houyi-tracheal-suction-cup',
    specifications: { القطر: '4 ملم', اللون: 'شفاف' }
  },
  {
    id: 'houyi-oxygenation-tube', slug: 'houyi-oxygenation-tube',
    name: 'أنبوب أكسجين ملون عالي الجودة',
    category: 'air-pumps', subcategory: 'tubes',
    description: 'أنبوب أكسجين ملون عالي الجودة | مرن ومتين | لا ينطوي ولا ينسد | متوفر بالأسود والأبيض | أطوال مختلفة',
    price: 1200, stock: 40,
    imageFolder: 'houyi-oxygenation-tube',
    specifications: { القطر: '4 ملم' },
    variants: [
      { id: '4m-black', label: '4 متر أسود', price: 1200, stock: 10, isDefault: true },
      { id: '4m-white', label: '4 متر أبيض', price: 1200, stock: 10 },
      { id: '100m-black', label: '100 متر أسود', price: 12000, stock: 5 },
      { id: '100m-white', label: '100 متر أبيض', price: 12000, stock: 5 },
    ],
    hasVariants: true,
  },
  {
    id: 'houyi-hose-clamp', slug: 'houyi-hose-clamp',
    name: 'مشبك خراطيم هواء - للتحكم بالتدفق',
    category: 'air-pumps', subcategory: 'accessories',
    description: 'مشبك خراطيم أزرق للتحكم في تدفق الهواء | سهل الاستخدام | قياسي 4 ملم | يثبت بإحكام بدون تسريب',
    price: 500, stock: 40,
    imageFolder: 'houyi-hose-clamp',
    specifications: { القطر: '4 ملم', اللون: 'أزرق' }
  },
  {
    id: 'houyi-connectors-4mm', slug: 'houyi-connectors-4mm',
    name: 'وصلات خراطيم هواء 4 ملم - أشكال متعددة',
    category: 'air-pumps', subcategory: 'accessories',
    description: 'وصلات خراطيم هواء بقطر 4 ملم | أشكال متعددة (مستقيم، T، L) | لتوصيل وتفريع خراطيم الهواء | بلاستيك متين',
    price: 100, stock: 100,
    imageFolder: 'houyi-connectors-4mm',
    specifications: { القطر: '4 ملم', الأشكال: 'مستقيم + T + L' }
  },
  {
    id: 'houyi-control-valve', slug: 'houyi-control-valve-4mm',
    name: 'صمام تحكم هواء 4 ملم',
    category: 'air-pumps', subcategory: 'accessories',
    description: 'صمام تحكم للتحكم الدقيق في كمية الهواء | قطر 4 ملم | دوران سلس | يتيح ضبط قوة الفقاعات بدقة',
    price: 150, stock: 80,
    imageFolder: 'houyi-control-valve-4mm',
    specifications: { القطر: '4 ملم', النوع: 'تحكم دوراني' }
  },

  // ═══════════════ ملحقات متنوعة (Accessories) ═══════════════
  {
    id: 'houyi-terminalia-leaves', slug: 'houyi-terminalia-leaves',
    name: 'أوراق الترمنالية (اللوز الهندي) - طبيعية',
    category: 'accessories', subcategory: 'natural',
    description: 'أوراق اللوز الهندي الطبيعية (كاتابا) | تخفض pH الماء طبيعياً | مضادة للبكتيريا والفطريات | مفضلة لأسماك البيتا والروبيان | تحاكي البيئة الطبيعية',
    price: 50, stock: 80,
    imageFolder: 'houyi-terminalia-leaves',
    specifications: { النوع: 'أوراق طبيعية', الفائدة: 'تخفيض pH + مضاد بكتيري' }
  },
  {
    id: 'houyi-mesh', slug: 'houyi-mesh',
    name: 'شبكة فلتر 8×8 سم',
    category: 'accessories', subcategory: 'mesh',
    description: 'شبكة فلتر بقياس 8×8 سم | لتغطية مدخل الفلتر ومنع دخول الأسماك الصغيرة والروبيان | ستانلس ستيل مقاوم للصدأ',
    price: 100, stock: 100,
    imageFolder: 'houyi-mesh',
    specifications: { القياس: '8×8 سم', المادة: 'ستانلس ستيل' }
  },
  {
    id: 'houyi-net-bag', slug: 'houyi-net-bag',
    name: 'أكياس شبك لمواد الترشيح',
    category: 'filters', subcategory: 'media',
    description: 'أكياس شبك لوضع مواد الترشيح (كربون، حلقات سيراميك) داخل الفلتر | سهلة الاستبدال والتنظيف | متوفرة بأحجام مختلفة',
    price: 350, stock: 120,
    imageFolder: 'houyi-net-bag',
    specifications: { الاستخدام: 'حفظ مواد الترشيح' },
    variants: [
      { id: 'black-15x20', label: 'أسود 15×20', price: 350, stock: 20 },
      { id: 'black-20x30', label: 'أسود 20×30', price: 450, stock: 20 },
      { id: 'black-30x40', label: 'أسود 30×40', price: 550, stock: 20, isDefault: true },
      { id: 'white-15x20', label: 'أبيض 15×20', price: 350, stock: 20 },
      { id: 'white-20x30', label: 'أبيض 20×30', price: 450, stock: 20 },
      { id: 'white-30x40', label: 'أبيض 30×40', price: 550, stock: 20 },
    ],
    hasVariants: true,
  },
  {
    id: 'houyi-moss-line', slug: 'houyi-moss-line',
    name: 'خيط موس شفاف - لتثبيت النباتات',
    category: 'accessories', subcategory: 'planting',
    description: 'خيط شفاف لتثبيت الموس على الأخشاب والصخور | يذوب تلقائياً بعد نمو الموس | رفيع وغير مرئي | سهل الاستخدام',
    price: 200, stock: 80,
    imageFolder: 'houyi-moss-line',
    specifications: { اللون: 'شفاف', الخاصية: 'قابل للذوبان' }
  },
  {
    id: 'houyi-sucker-buckle', slug: 'houyi-sucker-buckle',
    name: 'ماصة شفط بإبزيم تثبيت',
    category: 'accessories', subcategory: 'suction',
    description: 'ماصة شفط مع إبزيم لتثبيت المعدات (سخانات، أنابيب، مسابر) على جدار الحوض | قبضة قوية | شفافة',
    price: 30, stock: 100,
    imageFolder: 'houyi-sucker-buckle',
    specifications: { النوع: 'ماصة مع إبزيم' }
  },
  {
    id: 'houyi-acrylic-pump-compartment', slug: 'houyi-acrylic-pump-compartment',
    name: 'حجرة مضخة أكريليك شفافة',
    category: 'accessories', subcategory: 'compartments',
    description: 'حجرة مضخة أكريليك شفافة جديدة | قابلة للتوصيل بالحوض | لإخفاء المضخة والمعدات | تصميم أنيق وعملي',
    price: 3000, stock: 20,
    imageFolder: 'houyi-acrylic-pump-compartment',
    specifications: { المادة: 'أكريليك شفاف' }
  },
  {
    id: 'houyi-acrylic-tool-rack', slug: 'houyi-acrylic-tool-rack',
    name: 'رف أدوات أكريليك - تنظيم احترافي',
    category: 'accessories', subcategory: 'storage',
    description: 'رف أدوات أكريليك شفاف | يعلق على حافة الحوض | لتنظيم الأدوات (ملاقط، مقصات، مكاشط) | أنيق وعملي',
    price: 1000, stock: 20,
    imageFolder: 'houyi-acrylic-tool-rack',
    specifications: { المادة: 'أكريليك', التثبيت: 'على حافة الحوض' }
  },
  {
    id: 'houyi-gauze-isolation-net', slug: 'houyi-gauze-isolation-net',
    name: 'شبكة عزل شاش كبيرة - لفصل الأسماك',
    category: 'accessories', subcategory: 'isolation',
    description: 'شبكة عزل من الشاش الناعم | لفصل الأسماك المريضة أو العدوانية أو حديثة الولادة | مرنة وسهلة التركيب | لا تمنع تدفق الماء',
    price: 1200, stock: 20,
    imageFolder: 'houyi-gauze-isolation-net',
    specifications: { النوع: 'شاش ناعم', الاستخدام: 'عزل الأسماك' }
  },
  {
    id: 'houyi-fat-injection', slug: 'houyi-fat-injection',
    name: 'محقنة تسميد النباتات المائية',
    category: 'accessories', subcategory: 'fertilizer',
    description: 'محقنة لتسميد النباتات المائية مباشرة في جذورها | دقيقة وسهلة الاستخدام | تضمن وصول السماد للمكان المطلوب | ستانلس ستيل',
    price: 1800, stock: 20,
    imageFolder: 'houyi-fat-injection',
    specifications: { المادة: 'ستانلس ستيل', الاستخدام: 'تسميد الجذور' }
  },
  {
    id: 'houyi-feeding-cup', slug: 'houyi-feeding-cup',
    name: 'كوب تغذية للأسماك',
    category: 'accessories', subcategory: 'feeding',
    description: 'كوب تغذية يلتصق بجدار الحوض | يمنع انتشار الطعام في كل الحوض | يقلل هدر العلف | بماصة شفط | متوفر بالأخضر والأبيض',
    price: 100, stock: 40,
    imageFolder: 'houyi-feeding-cup',
    specifications: { التثبيت: 'ماصة شفط' },
    variants: [
      { id: 'green', label: 'أخضر', price: 100, stock: 20, isDefault: true },
      { id: 'white', label: 'أبيض', price: 100, stock: 20 },
    ],
    hasVariants: true,
  },
  {
    id: 'houyi-base-fertilizer', slug: 'houyi-base-fertilizer',
    name: 'سماد أساسي للنباتات المائية',
    category: 'accessories', subcategory: 'fertilizer',
    description: 'سماد أساسي للنباتات المائية | يوضع تحت التربة عند بناء الحوض | غني بالعناصر الغذائية | يوفر تغذية طويلة الأمد للجذور',
    price: 2000, stock: 20,
    imageFolder: 'houyi-base-fertilizer',
    specifications: { النوع: 'سماد أساسي', الوضع: 'تحت التربة' }
  },

  // ═══════════════ الإضاءة (Lighting) ═══════════════
  {
    id: 'houyi-led-light', slug: 'houyi-led-light',
    name: 'إضاءة LED للأحواض الصغيرة',
    category: 'lighting', subcategory: 'led',
    description: 'إضاءة LED مشبكية للأحواض الصغيرة | إضاءة بيضاء ساطعة | استهلاك طاقة منخفض | مناسبة للنباتات المائية | سهلة التركيب بمشبك',
    price: 3000, stock: 15,
    imageFolder: 'houyi-led',
    specifications: { النوع: 'LED', التثبيت: 'مشبك' }
  },

  // ═══════════════ المضخات (Pumps) ═══════════════
  {
    id: 'houyi-wave-pump', slug: 'houyi-wave-pump',
    name: 'مضخة موجات Songbao WP-50M',
    category: 'pumps', subcategory: 'wave',
    description: 'مضخة موجات Songbao موديل WP-50M | تخلق حركة ماء طبيعية | مثالية لأحواض الشعاب المرجانية والنباتات | تدفق قوي وهادئ',
    price: 5500, stock: 10,
    imageFolder: 'houyi-dophin-electric-skimmer',
    specifications: { الموديل: 'WP-50M', الماركة: 'Songbao' }
  },

  // ═══════════════ النقل (Transport) ═══════════════
  {
    id: 'houyi-inflatable-fish-bag', slug: 'houyi-inflatable-fish-bag',
    name: 'أكياس نقل سمك قابلة للنفخ - 100 قطعة',
    category: 'accessories', subcategory: 'transport',
    description: '100 كيس نقل سمك قابل للنفخ | قياس 20×30×16 سم | شفاف لمراقبة الأسماك | للاستخدام التجاري | متين ومقاوم للتسرب',
    price: 9000, stock: 5,
    imageFolder: 'houyi-inflatable-fish-bag',
    specifications: { العدد: '100 كيس', القياس: '20×30×16 سم' }
  },
];

async function main() {
  console.log('=== Adding ALL Houyi Products (YEE Format) ===\n');
  let added = 0, skipped = 0, errors = 0;

  for (const product of products) {
    try {
      const existing = await db.execute(sql`SELECT id FROM products WHERE id = ${product.id} LIMIT 1`);
      if (existing.rows.length > 0) {
        console.log(`⏭️ SKIP: ${product.id} already exists`);
        skipped++;
        continue;
      }

      const images = getImages(product.imageFolder);
      const thumbnail = images[0] || '/images/placeholder.jpg';

      await db.execute(sql`
        INSERT INTO products (
          id, slug, name, brand, category, subcategory, description,
          price, currency, images, thumbnail, stock, rating, review_count,
          is_new, is_best_seller, specifications, variants, has_variants,
          created_at, updated_at
        ) VALUES (
          ${product.id}, ${product.slug}, ${product.name}, 'Houyi',
          ${product.category}, ${product.subcategory}, ${product.description},
          ${product.price}, 'IQD',
          ${JSON.stringify(images)}::jsonb, ${thumbnail},
          ${product.stock}, 0, 0, true, false,
          ${JSON.stringify(product.specifications || {})}::jsonb,
          ${product.variants ? JSON.stringify(product.variants) : null}::jsonb,
          ${product.hasVariants || false},
          NOW(), NOW()
        )
      `);

      console.log(`✅ ADDED: ${product.id} - ${product.name} (${images.length} images)`);
      added++;
    } catch (err: any) {
      console.error(`❌ ERROR: ${product.id} - ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Added: ${added}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  const count = await db.execute(sql`SELECT COUNT(*) as count FROM products`);
  console.log(`\nTotal products in DB: ${count.rows[0]?.count}`);

  const houyiCount = await db.execute(sql`SELECT COUNT(*) as count FROM products WHERE brand = 'Houyi'`);
  console.log(`Total Houyi products: ${houyiCount.rows[0]?.count}`);

  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
