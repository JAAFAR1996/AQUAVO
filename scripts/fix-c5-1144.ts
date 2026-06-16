import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing C5-1144 — Water Change Siphon ===\n');

  const name = 'سيفون تغيير ماء 1.5 متر — نسخة مقوّاة بمضخة ضغط';

  const description = `غيّر ماء الحوض ونظّف الحصى في عملية واحدة — بدون شفط بالفم.

سيفون يدوي بطول 1.5 متر (نسخة محسّنة بخرطوم سميك ومقوّى) مزوّد بمضخة ضغط يدوية تبدأ عملية السحب بضغطات قليلة. بمجرد بدء التدفّق، تعمل الجاذبية تلقائياً لسحب الماء من الحوض إلى الدلو.

مزوّد برأس شفط يُغمر في الحصى لسحب الفضلات والمخلفات المتراكمة بين الحبيبات دون سحب الحصى نفسه. الخرطوم المقوّى بسماكة إضافية لا ينثني ولا ينسدّ — يضمن تدفّقاً مستمراً طوال عملية التنظيف.

أداة أساسية للصيانة الأسبوعية — تغيير 20-30% من الماء أسبوعياً يُبقي حوضك نظيفاً وصحياً.`;

  const specifications = {
    "العلامة التجارية": "YEE",
    "الموديل": "C5-1144",
    "النوع": "سيفون تغيير ماء يدوي مع مضخة ضغط",
    "طول الخرطوم": "1.5 متر",
    "المادة": "PVC مقوّى سميك + مضخة ضغط مطاطية",
    "الميزة": "نسخة محسّنة — خرطوم أسمك وأطول (Enhanced)",
    "يتضمّن": "رأس شفط + مضخة ضغط يدوية + خرطوم 1.5 متر",
    "benefits": [
      "مضخة ضغط يدوية — لا حاجة للشفط بالفم",
      "خرطوم مقوّى وسميك — لا ينثني ولا ينسدّ",
      "1.5 متر — طول مناسب للأحواض المتوسطة",
      "رأس شفط — ينظّف الحصى من المخلفات",
      "نسخة محسّنة — أمتن وأطول عمراً من العادية",
      "لا يحتاج كهرباء — يعمل بالكامل يدوياً"
    ],
    "safetyWarnings": [
      "لا تترك السيفون يعمل بدون مراقبة",
      "غيّر 20-30% فقط من الماء في كل مرة",
      "تأكد من أن الدلو أسفل مستوى الحوض",
      "اغسل الرأس بعد كل استخدام"
    ],
    "usageInstructions": [
      "ضع رأس الشفط داخل الحوض واغمره في الحصى",
      "ضع طرف الخرطوم الآخر في دلو أسفل مستوى الحوض",
      "اضغط مضخة الضغط 5-7 مرات حتى يبدأ الماء بالتدفّق",
      "حرّك الرأس ببطء فوق الحصى لسحب المخلفات",
      "ارفع الرأس من الماء لإيقاف السحب عند الانتهاء"
    ]
  };

  await sql`
    UPDATE products SET
      name = ${name},
      description = ${description},
      specifications = ${JSON.stringify(specifications)}::jsonb,
      price = ${1500},
      stock = ${10},
      category = ${'tools'},
      subcategory = ${'cleaning'},
      updated_at = NOW()
    WHERE id = 'yee-c5-1144-1a'
  `;

  console.log('✅ C5-1144 fixed as water change siphon!\n');

  // Verify
  const r = await sql`SELECT id, name, price, category, subcategory, images, thumbnail FROM products WHERE id = 'yee-c5-1144-1a'`;
  const p = r[0];
  console.log(`Name: ${p.name}`);
  console.log(`Price: ${p.price} IQD`);
  console.log(`Category: ${p.category}/${p.subcategory}`);
  console.log(`Images: ${JSON.stringify(p.images)}`);
  console.log(`\n⚠️  ملاحظة: الصور الحالية تُظهر خرطوم PVC فقط — قد تحتاج صور تُظهر السيفون الكامل مع مضخة الضغط`);
}

main().catch(e => console.error(e));
