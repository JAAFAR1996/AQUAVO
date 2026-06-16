import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Adding/Restoring Both Products ===\n');

  // ===== 1. Restore C5-1144 =====
  console.log('--- Restoring yee-c5-1144-1a ---');

  const c5Desc = `خرطوم مقوّى سميك بطول 1.5 متر — مصمم لعمليات تغيير الماء والتوصيلات الثقيلة.

خرطوم PVC شفاف بسماكة مضاعفة مقارنة بالخراطيم العادية. النسخة المحسّنة (Enhanced) أطول وأسمك — لا ينثني عند الزوايا ولا ينسدّ تحت الضغط، مما يضمن تدفّقاً مستمراً بدون انقطاع.

مثالي لتوصيل الفلاتر الخارجية، عمليات تغيير الماء، أو أي استخدام يحتاج خرطوماً متيناً يتحمّل الاستخدام المتكرر. شفاف بالكامل يسمح لك بمراقبة تدفّق الماء بداخله.

قابل للقص حسب الطول المطلوب — اشترِ قطعة واحدة وقصّها لعدة استخدامات.`;

  const c5Specs = {
    "العلامة التجارية": "YEE",
    "الموديل": "C5-1144",
    "الطول": "1.5 متر",
    "المادة": "PVC مقوّى سميك",
    "اللون": "شفاف",
    "النوع": "خرطوم مقوّى — نسخة محسّنة",
    "benefits": [
      "سميك ومقوّى — لا ينثني ولا ينسدّ عند الزوايا",
      "1.5 متر — طول كافٍ لتوصيل الفلتر أو تغيير الماء",
      "شفاف — يسمح بمراقبة تدفّق الماء",
      "PVC عالي الجودة — يتحمّل الاستخدام المتكرر",
      "قابل للقص — حسب الطول المطلوب",
      "نسخة محسّنة — أسمك وأطول من العادي"
    ],
    "safetyWarnings": [
      "لا تثني الخرطوم بزاوية حادة لفترات طويلة",
      "اغسل الخرطوم قبل الاستخدام الأول",
      "استبدله عند ظهور اصفرار أو تصلّب",
      "تأكد من إحكام التوصيلات لمنع التسريب"
    ],
    "usageInstructions": [
      "قص الخرطوم بالطول المطلوب بمقص حاد",
      "وصّل أحد الأطراف بمخرج الفلتر أو المضخة",
      "وصّل الطرف الآخر بالحوض أو الدلو",
      "تأكد من عدم وجود ثنيات تعيق التدفّق"
    ]
  };

  await sql`
    UPDATE products SET
      name = ${'خرطوم مقوّى سميك 1.5 متر — نسخة محسّنة'},
      description = ${c5Desc},
      specifications = ${JSON.stringify(c5Specs)}::jsonb,
      price = ${1500},
      stock = ${10},
      category = ${'tools'},
      subcategory = ${'hoses'},
      brand = ${'YEE'},
      deleted_at = ${null},
      updated_at = NOW()
    WHERE id = 'yee-c5-1144-1a'
  `;
  console.log('✅ yee-c5-1144-1a restored!\n');

  // ===== 2. Add YEE-3621 =====
  console.log('--- Adding yee-3621 ---');

  const yeeDesc = `سيفون تغيير ماء بمضخة يدوية — الطريقة الأسهل والأسرع لتغيير ماء الحوض.

سيفون بطول 1.7 متر مزوّد بكيس ضغط (مضخة يدوية) متين ومقوّى يبدأ عملية السحب بضغطات قليلة — لا حاجة لشفط الماء بالفم. يتضمّن رأس شفّاف يُغمر في الحصى لسحب المخلفات المتراكمة بين الحبيبات.

مزوّد بصمام تحكم في التدفّق يسمح لك بإيقاف وتشغيل السحب بسهولة دون رفع الخرطوم. الخرطوم المرن بطول 1.7 متر يصل بسهولة إلى الدلو أو المغسلة.

أداة أساسية لروتين الصيانة الأسبوعي — تغيير 20-30% من الماء أسبوعياً يحافظ على بيئة صحية لأسماكك.`;

  const yeeSpecs = {
    "العلامة التجارية": "YEE",
    "الموديل": "YEE-3621",
    "الطول الكلي": "1.7 متر",
    "المادة": "PVC + كيس ضغط مقوّى",
    "اللون": "شفاف / رمادي",
    "يتضمّن": "رأس شفط + كيس ضغط + خرطوم + صمام تحكم",
    "benefits": [
      "كيس ضغط مقوّى — يبدأ السحب بدون شفط بالفم",
      "1.7 متر — طول مريح يصل إلى الدلو بسهولة",
      "رأس شفط شفاف — يسحب المخلفات من بين الحصى",
      "صمام تحكم — أوقف التدفّق بدون رفع الخرطوم",
      "متين ويدوم طويلاً — كيس ضغط بسماكة إضافية",
      "لا يحتاج كهرباء — يعمل بالكامل يدوياً"
    ],
    "safetyWarnings": [
      "لا تترك السيفون يعمل بدون مراقبة — قد يفرّغ الحوض بالكامل",
      "غيّر 20-30% فقط من الماء في كل مرة",
      "تأكد من أن الدلو أسفل مستوى الحوض لضمان التدفّق",
      "اغسل الرأس بعد كل استخدام لمنع انسداده"
    ],
    "usageInstructions": [
      "ضع رأس الشفط داخل الحوض واغمره في الحصى",
      "ضع طرف الخرطوم الآخر في الدلو (أسفل مستوى الحوض)",
      "اضغط كيس الضغط عدة مرات لبدء السحب",
      "حرّك الرأس ببطء فوق الحصى لسحب المخلفات",
      "استخدم الصمام لإيقاف التدفّق عند الانتهاء"
    ]
  };

  const yeeImages = [
    "/images/products/yee/YEE-3621/45.jpeg",
    "/images/products/yee/YEE-3621/3.jpeg",
    "/images/products/yee/YEE-3621/_model_gemini25flashimage_4k_20260.jpeg"
  ];

  // Check if exists
  const existing = await sql`SELECT id FROM products WHERE id = 'yee-3621'`;
  if (existing.length > 0) {
    await sql`
      UPDATE products SET
        name = ${'سيفون تغيير ماء 1.7 متر — بمضخة يدوية مقوّاة'},
        slug = ${'yee-3621'},
        description = ${yeeDesc},
        specifications = ${JSON.stringify(yeeSpecs)}::jsonb,
        price = ${3500},
        stock = ${10},
        category = ${'tools'},
        subcategory = ${'cleaning'},
        brand = ${'YEE'},
        thumbnail = ${yeeImages[0]},
        images = ${JSON.stringify(yeeImages)}::jsonb,
        deleted_at = ${null},
        updated_at = NOW()
      WHERE id = 'yee-3621'
    `;
  } else {
    await sql`
      INSERT INTO products (id, name, slug, description, specifications, price, stock, category, subcategory, brand, thumbnail, images, created_at, updated_at)
      VALUES (
        ${'yee-3621'},
        ${'سيفون تغيير ماء 1.7 متر — بمضخة يدوية مقوّاة'},
        ${'yee-3621'},
        ${yeeDesc},
        ${JSON.stringify(yeeSpecs)}::jsonb,
        ${3500},
        ${10},
        ${'tools'},
        ${'cleaning'},
        ${'YEE'},
        ${yeeImages[0]},
        ${JSON.stringify(yeeImages)}::jsonb,
        NOW(),
        NOW()
      )
    `;
  }
  console.log('✅ yee-3621 added!\n');

  // ===== Verify =====
  console.log('=== Final Verification ===\n');
  const verify = await sql`
    SELECT id, name, price, stock, category, subcategory, thumbnail, images, deleted_at
    FROM products WHERE id IN ('yee-c5-1144-1a', 'yee-3621')
    ORDER BY id
  `;
  for (const p of verify) {
    console.log(`✅ ${p.id}`);
    console.log(`   Name: ${p.name}`);
    console.log(`   Price: ${p.price} IQD | Stock: ${p.stock}`);
    console.log(`   Category: ${p.category}/${p.subcategory}`);
    console.log(`   Images: ${p.images?.length || 0} files`);
    console.log(`   Deleted: ${p.deleted_at || 'NO'}\n`);
  }

  console.log('=== Done! ===');
}

main().catch(e => console.error(e));
