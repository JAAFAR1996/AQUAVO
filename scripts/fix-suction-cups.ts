import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing Both Suction Products ===\n');

  // ===== 1. houyi-tracheal-suction → Buckle Sucker (ماصة بمشبك) =====
  console.log('--- Updating houyi-tracheal-suction → Buckle Sucker ---');

  const buckleDesc = `ماصة شفط بمشبك مدمج — تثبيت أقوى وأسهل من الماصة العادية.

ماصة شفط شفافة مزوّدة بمشبك (بكلة) مدمج يقفل على خرطوم الهواء بضغطة واحدة. توفّر تثبيتاً أقوى وأكثر أماناً من الماصات العادية — الخرطوم لا يمكن أن ينزلق أو يتحرك بعد القفل.

تُلصق على زجاج الحوض من الداخل وتمسك الخرطوم بثبات تام. المشبك مصمم بحيث يمكنك فتحه وإغلاقه بسهولة لتعديل وضعية الخرطوم.

تأتي بعبوة 50 قطعة — كمية اقتصادية تكفي لتثبيت جميع خراطيم أحواضك لفترة طويلة.`;

  const buckleSpecs = {
    "العلامة التجارية": "HOUYI",
    "النوع": "ماصة شفط بمشبك (Buckle Sucker)",
    "الكمية": "50 قطعة في العبوة",
    "اللون": "شفاف",
    "المادة": "مطاط + بلاستيك مرن",
    "القطر المناسب": "4-6 ملم",
    "آلية التثبيت": "مشبك/بكلة يقفل على الخرطوم",
    "benefits": [
      "مشبك مدمج — يقفل الخرطوم بضغطة واحدة",
      "تثبيت أقوى — الخرطوم لا ينزلق أبداً بعد القفل",
      "50 قطعة بالعبوة — كمية اقتصادية",
      "شفافة — لا تشوه مظهر الحوض",
      "سهلة الفتح — اضغط المشبك لتحرير الخرطوم",
      "تناسب معظم أقطار خراطيم الهواء (4-6 ملم)"
    ],
    "safetyWarnings": [
      "استبدل الماصة عند فقدان قوة الالتصاق",
      "نظّف الزجاج من الطحالب قبل التثبيت",
      "لا تشد الخرطوم بقوة — افتح المشبك أولاً",
      "افحص التثبيت بعد كل تنظيف للحوض"
    ],
    "usageInstructions": [
      "نظّف سطح الزجاج الداخلي في المكان المراد",
      "بلّل كوب الشفط واضغطه على الزجاج بقوة",
      "افتح المشبك (البكلة) وضع الخرطوم بالداخل",
      "اضغط المشبك حتى يقفل على الخرطوم بإحكام",
      "لتحرير الخرطوم — اضغط على جانبي المشبك"
    ]
  };

  await sql`
    UPDATE products SET
      name = ${'ماصة شفط بمشبك (بكلة) — 50 قطعة'},
      description = ${buckleDesc},
      specifications = ${JSON.stringify(buckleSpecs)}::jsonb,
      price = ${30},
      stock = ${100},
      category = ${'air-pumps'},
      subcategory = ${'accessories'},
      updated_at = NOW()
    WHERE id = 'houyi-tracheal-suction'
  `;
  console.log('✅ houyi-tracheal-suction → Buckle Sucker updated!');

  // ===== 2. houyi-tracheal-suction-cup → Tracheal Suction Cup (ماصة عادية) =====
  console.log('\n--- Updating houyi-tracheal-suction-cup → Tracheal Suction Cup ---');

  const trachealDesc = `ماصة شفط كلاسيكية بفتحة مرنة — الحل الأبسط لتثبيت خرطوم الهواء.

ماصة شفط شفافة من المطاط عالي الجودة، مزوّدة بفتحة جانبية مرنة تمرّر فيها خرطوم الهواء. تُلصق على زجاج الحوض من الداخل وتُبقي الخرطوم مثبتاً في مساره.

تصميم بسيط وفعّال — لا مشابك ولا أقفال، فقط ادفع الخرطوم في الفتحة المرنة وهي تمسكه بضغط المطاط. مثالية لمن يريد تثبيتاً سريعاً بدون تعقيد.

شفافة تماماً فلا تشوه مظهر الحوض. تُباع بالقطعة.`;

  const trachealSpecs = {
    "العلامة التجارية": "HOUYI",
    "النوع": "ماصة شفط كلاسيكية (Tracheal Suction Cup)",
    "الكمية": "تُباع بالقطعة",
    "اللون": "شفاف",
    "المادة": "مطاط عالي الجودة",
    "القطر المناسب": "4-6 ملم",
    "آلية التثبيت": "فتحة مرنة بضغط المطاط",
    "benefits": [
      "شفط قوي — تثبت بإحكام على الزجاج",
      "شفافة — لا تشوه مظهر الحوض",
      "مرنة — تناسب أقطار أنابيب 4-6 ملم",
      "تركيب فوري — ادفع الخرطوم وانتهى",
      "تنظم مسار الخراطيم — مظهر مرتب واحترافي",
      "اقتصادية — أرخص وسيلة لتثبيت الخراطيم"
    ],
    "safetyWarnings": [
      "استبدل الماصة عند فقدان قوة الالتصاق",
      "نظّف الزجاج من الطحالب قبل التثبيت",
      "لا تشد الخرطوم بقوة من الماصة",
      "افحص التثبيت دورياً خاصة بعد تنظيف الحوض"
    ],
    "usageInstructions": [
      "نظّف سطح الزجاج الداخلي في المكان المراد",
      "بلّل كوب الشفط واضغطه على الزجاج بقوة",
      "أدخل الخرطوم في الفتحة المرنة الجانبية",
      "تأكد من أن الخرطوم مثبت ومرتب"
    ]
  };

  await sql`
    UPDATE products SET
      name = ${'ماصة شفط كلاسيكية لخرطوم الهواء'},
      description = ${trachealDesc},
      specifications = ${JSON.stringify(trachealSpecs)}::jsonb,
      price = ${30},
      stock = ${100},
      category = ${'air-pumps'},
      subcategory = ${'accessories'},
      deleted_at = ${null},
      updated_at = NOW()
    WHERE id = 'houyi-tracheal-suction-cup'
  `;
  console.log('✅ houyi-tracheal-suction-cup → Tracheal Suction Cup updated!');

  // ===== Verification =====
  console.log('\n=== Final Verification ===\n');
  const verify = await sql`
    SELECT id, name, price, stock, category, subcategory, 
           thumbnail, images, deleted_at
    FROM products 
    WHERE id IN ('houyi-tracheal-suction', 'houyi-tracheal-suction-cup')
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

  console.log('⚠️  ملاحظة: صور houyi-tracheal-suction (Buckle Sucker) حالياً هي نفس صور الماصة العادية.');
  console.log('   تحتاج صور مختلفة تُظهر الماصة بالمشبك/البكلة.');
  console.log('\n=== Done! ===');
}

main().catch(e => console.error(e));
