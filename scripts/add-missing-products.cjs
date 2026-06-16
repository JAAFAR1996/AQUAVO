/**
 * إضافة المنتجات المفقودة من قاعدة البيانات مع الـ variants
 */
const { neon } = require("@neondatabase/serverless");

const sql = neon("postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");
const BASE = "/images/products/houyi";

const PRODUCTS = [
  // ─────────────────────────────────────────────────────────────────
  // 1. Rhododendron Root — أحجام متعددة + نسخة مع قاعدة
  // ─────────────────────────────────────────────────────────────────
  {
    id: "houyi-rhododendron-root",
    slug: "houyi-rhododendron-root",
    name: "جذر الروديدندرون الطبيعي",
    arabicName: "جذر الروديدندرون الطبيعي",
    description: "جذر الروديدندرون الطبيعي — خشب أحمر بني بتفرعات عضوية معقدة يصنع مناطق مخبأ ممتازة. خفيف طبيعياً لكن يغطس بعد نقع 3-7 أيام. يُصدر تانين بسيط يلوّن الماء بلون شاي خفيف — ينعدم بعد أسبوعين.",
    specs: "متوفر بأحجام متعددة. خشب طبيعي مناسب لجميع أنواع الأسماك والجمبري.",
    category: "decor",
    subcategory: "wood",
    brand: "Houyi",
    price: 0,
    stock: 0,
    hasVariants: true,
    images: [
      `${BASE}/houyi-rhododendron-root/houyi-rhododendron-root-1-v5.png`,
      `${BASE}/houyi-rhododendron-root/houyi-rhododendron-root-2-v5.png`,
      `${BASE}/houyi-rhododendron-root-stone/houyi-rhododendron-root-stone-1-v5.png`,
      `${BASE}/houyi-rhododendron-root-stone/houyi-rhododendron-root-stone-2-v5.png`,
      `${BASE}/houyi-rhododendron-root-stone/houyi-rhododendron-root-stone-3-v5.png`,
      `${BASE}/houyi-rhododendron-root-stone/houyi-rhododendron-root-stone-4-v5.png`,
    ],
    thumbnail: `${BASE}/houyi-rhododendron-root/houyi-rhododendron-root-1-v5.png`,
    variants: [
      {
        id: "rhododendron-30-35cm",
        label: "30–35 سم",
        price: 0,
        stock: 0,
        isDefault: true,
        specifications: { "الحجم": "30–35 سم", "النوع": "بدون قاعدة" }
      },
      {
        id: "rhododendron-40-45cm",
        label: "40–45 سم",
        price: 0,
        stock: 0,
        isDefault: false,
        specifications: { "الحجم": "40–45 سم", "النوع": "بدون قاعدة" }
      },
      {
        id: "rhododendron-50-55cm",
        label: "50–55 سم",
        price: 0,
        stock: 0,
        isDefault: false,
        specifications: { "الحجم": "50–55 سم", "النوع": "بدون قاعدة" }
      },
      {
        id: "rhododendron-with-base",
        label: "مع قاعدة حجرية 30–45 سم",
        price: 0,
        stock: 0,
        isDefault: false,
        specifications: { "الحجم": "30–45 سم", "النوع": "مع قاعدة حجرية" }
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 2. Moss Glue — 3 أحجام وألوان
  // ─────────────────────────────────────────────────────────────────
  {
    id: "houyi-moss-glue",
    slug: "houyi-moss-glue",
    name: "غراء تثبيت الموس والنباتات",
    arabicName: "غراء تثبيت الموس والنباتات",
    description: "غراء سيانوأكريلات متخصص لتثبيت الموس والنباتات المائية على الخشب والحجر. يجف سريعاً تحت الماء، آمن تماماً للأسماك والجمبري. متوفر بحجمين وصيغتين.",
    specs: "آمن للأسماك والجمبري. يجف خلال 30-60 ثانية. متوفر 5 غرام أو 20 غرام.",
    category: "Accessories",
    subcategory: "accessories",
    brand: "Houyi",
    price: 0,
    stock: 0,
    hasVariants: true,
    images: [
      `${BASE}/houyi-moss-glue/houyi-moss-glue-1.png`,
      `${BASE}/houyi-moss-glue/houyi-moss-glue-2.png`,
      `${BASE}/houyi-moss-glue/houyi-moss-glue-3.png`,
      `${BASE}/houyi-moss-glue/houyi-moss-glue-4.png`,
      `${BASE}/houyi-moss-glue/houyi-moss-glue-5.png`,
      `${BASE}/houyi-moss-glue/houyi-moss-glue-6.png`,
    ],
    thumbnail: `${BASE}/houyi-moss-glue/houyi-moss-glue-1.png`,
    variants: [
      {
        id: "moss-glue-5g-green",
        label: "5 غرام — أخضر",
        price: 0,
        stock: 0,
        isDefault: true,
        specifications: { "الحجم": "5 غرام", "اللون": "أخضر" }
      },
      {
        id: "moss-glue-5g-white",
        label: "5 غرام — أبيض",
        price: 0,
        stock: 0,
        isDefault: false,
        specifications: { "الحجم": "5 غرام", "اللون": "أبيض" }
      },
      {
        id: "moss-glue-20g-white",
        label: "20 غرام — أبيض",
        price: 0,
        stock: 0,
        isDefault: false,
        specifications: { "الحجم": "20 غرام", "اللون": "أبيض" }
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 3. Instant Glue 50g — منتج واحد
  // ─────────────────────────────────────────────────────────────────
  {
    id: "houyi-instant-glue-50g",
    slug: "houyi-instant-glue-50g",
    name: "غراء فوري سائل 50 غرام",
    arabicName: "غراء فوري سائل 50 غرام",
    description: "غراء سيانوأكريلات سائل 50 غرام لتثبيت الخشب والحجر والنباتات في الحوض. قوة تثبيت عالية جداً، يجف بثوانٍ. الصيغة السائلة تخترق الشقوق الدقيقة لتثبيت أقوى.",
    specs: "50 غرام. سائل CA. آمن للأسماك. يجف في 10-30 ثانية.",
    category: "Accessories",
    subcategory: "accessories",
    brand: "Houyi",
    price: 0,
    stock: 0,
    hasVariants: false,
    images: [
      `${BASE}/houyi-instant-glue-50g/houyi-instant-glue-50g-1.png`,
      `${BASE}/houyi-instant-glue-50g/houyi-instant-glue-50g-2.png`,
      `${BASE}/houyi-instant-glue-50g/houyi-instant-glue-50g-3.png`,
      `${BASE}/houyi-instant-glue-50g/houyi-instant-glue-50g-4.png`,
      `${BASE}/houyi-instant-glue-50g/houyi-instant-glue-50g-5.png`,
      `${BASE}/houyi-instant-glue-50g/houyi-instant-glue-50g-6.png`,
    ],
    thumbnail: `${BASE}/houyi-instant-glue-50g/houyi-instant-glue-50g-1.png`,
    variants: null,
  },

  // ─────────────────────────────────────────────────────────────────
  // 4. Breathing Ring White — منتج واحد
  // ─────────────────────────────────────────────────────────────────
  {
    id: "houyi-breathing-ring-white",
    slug: "houyi-breathing-ring-white",
    name: "حلقة التنفس البيولوجية — أبيض",
    arabicName: "حلقة التنفس البيولوجية — أبيض",
    description: "حلقة تنفس بيضاء مصنوعة من مادة مسامية عالية الجودة تستضيف البكتيريا النافعة. مثالية للفلترة البيولوجية في أحواض المياه العذبة والمالحة.",
    specs: "لون أبيض. مادة مسامية عالية المساحة السطحية. مناسبة لجميع أنواع الفلاتر.",
    category: "Filter media",
    subcategory: "media",
    brand: "Houyi",
    price: 0,
    stock: 0,
    hasVariants: false,
    images: [
      `${BASE}/houyi-breathing-ring-white/houyi-breathing-ring-white-1.png`,
      `${BASE}/houyi-breathing-ring-white/houyi-breathing-ring-white-2.png`,
    ],
    thumbnail: `${BASE}/houyi-breathing-ring-white/houyi-breathing-ring-white-1.png`,
    variants: null,
  },

  // ─────────────────────────────────────────────────────────────────
  // 5. Foam Glue — منتج واحد
  // ─────────────────────────────────────────────────────────────────
  {
    id: "houyi-foam-glue",
    slug: "houyi-foam-glue",
    name: "معجون ملء وإخفاء للخشب والديكور",
    arabicName: "معجون ملء وإخفاء للخشب والديكور",
    description: "معجون بلون الخشب (900 غرام) لملء الفراغات وإخفاء مواقع التثبيت في الديكورات الخشبية. يُستخدم مع الغراء الفوري لنتيجة احترافية غير مرئية.",
    specs: "900 غرام × 15 قطعة. بلون الخشب الطبيعي. قابل للتشكيل قبل الجفاف.",
    category: "Accessories",
    subcategory: "accessories",
    brand: "Houyi",
    price: 0,
    stock: 0,
    hasVariants: false,
    images: [
      `${BASE}/houyi-foam-glue/houyi-foam-glue-1.png`,
      `${BASE}/houyi-foam-glue/houyi-foam-glue-2.png`,
    ],
    thumbnail: `${BASE}/houyi-foam-glue/houyi-foam-glue-1.png`,
    variants: null,
  },

  // ─────────────────────────────────────────────────────────────────
  // 6. Tracheal Suction Cup — منتج واحد
  // ─────────────────────────────────────────────────────────────────
  {
    id: "houyi-tracheal-suction-cup",
    slug: "houyi-tracheal-suction-cup",
    name: "كأس ماصة لتثبيت خراطيم الهواء",
    arabicName: "كأس ماصة لتثبيت خراطيم الهواء",
    description: "كأس ماصة شفاطة مخصصة لتثبيت خراطيم الهواء والأنابيب الدقيقة على جدران الحوض. مصنوعة من مطاط عالي الجودة، قبضة قوية على الزجاج والأكريليك.",
    specs: "مطاط عالي الجودة. مناسبة لخراطيم 4-6 ملم. قبضة قوية على الزجاج.",
    category: "Accessories",
    subcategory: "accessories",
    brand: "Houyi",
    price: 0,
    stock: 0,
    hasVariants: false,
    images: [
      `${BASE}/houyi-tracheal-suction-cup/houyi-tracheal-suction-cup-1.jpg`,
      `${BASE}/houyi-tracheal-suction-cup/houyi-tracheal-suction-cup-2.jpg`,
      `${BASE}/houyi-tracheal-suction-cup/houyi-tracheal-suction-cup-3.jpg`,
    ],
    thumbnail: `${BASE}/houyi-tracheal-suction-cup/houyi-tracheal-suction-cup-1.jpg`,
    variants: null,
  },
];

async function run() {
  console.log("🚀 إضافة المنتجات المفقودة...\n");

  for (const p of PRODUCTS) {
    // تحقق من عدم وجوده مسبقاً
    const existing = await sql`SELECT id FROM products WHERE slug = ${p.slug}`;
    if (existing.length > 0) {
      console.log(`⚠️  موجود مسبقاً: ${p.slug}`);
      continue;
    }

    await sql`
      INSERT INTO products (
        id, slug, name, description, specifications,
        category, subcategory, brand,
        price, stock, currency,
        images, thumbnail,
        rating, review_count,
        has_variants, variants
      ) VALUES (
        ${p.id},
        ${p.slug},
        ${p.name},
        ${p.description},
        ${JSON.stringify({ specs: p.specs })}::jsonb,
        ${p.category},
        ${p.subcategory},
        ${p.brand},
        ${p.price},
        ${p.stock},
        'IQD',
        ${JSON.stringify(p.images)}::jsonb,
        ${p.thumbnail},
        0,
        0,
        ${p.hasVariants},
        ${p.variants ? JSON.stringify(p.variants) : null}::jsonb
      )
    `;

    console.log(`✅ أُضيف: ${p.slug} (${p.variants ? p.variants.length + " variants" : "no variants"})`);
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("✅ تمت الإضافة");
  process.exit(0);
}

run().catch(e => { console.error("❌", e.message); process.exit(1); });
