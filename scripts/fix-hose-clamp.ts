import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing houyi-hose-clamp ===\n');

  const newName = 'مشبك تثبيت خرطوم على الحوض — أزرق (20 قطعة)';

  const newDesc = `ثبّت خرطومك بإحكام على حافة الحوض — بدون انزلاق أو فوضى.

مشبك بلاستيكي أزرق قوي مصمم لتثبيت خراطيم الفلتر والسيفون والهواء على حافة زجاج الحوض. يُمسك الخرطوم بثبات ويمنعه من الانزلاق داخل الحوض أو السقوط خارجه أثناء تغيير الماء أو الترشيح.

مزوّد ببرغي ضغط قابل للتعديل يناسب سماكات زجاج مختلفة — من الأحواض الصغيرة إلى الكبيرة. التصميم المفتوح يسمح بتمرير الخرطوم بسهولة وتعديل وضعيته دون فك المشبك.

يأتي بعبوة 20 قطعة — كافية لتثبيت جميع خراطيم أحواضك.`;

  const newSpecs = {
    "العلامة التجارية": "HOUYI",
    "الكمية": "20 قطعة في العبوة",
    "اللون": "أزرق",
    "المادة": "بلاستيك ABS متين",
    "الاستخدام": "تثبيت الخراطيم على حافة زجاج الحوض",
    "قابل للتعديل": "نعم — برغي ضغط يناسب سماكات زجاج مختلفة",
    "يناسب": "خراطيم الفلتر، السيفون، الهواء",
    "benefits": [
      "تثبيت محكم — يمنع الخرطوم من الانزلاق داخل الحوض أو السقوط",
      "برغي قابل للتعديل — يناسب سماكات زجاج مختلفة",
      "20 قطعة بالعبوة — كافية لجميع خراطيمك",
      "تصميم مفتوح — يسمح بتعديل وضعية الخرطوم بدون فك المشبك",
      "بلاستيك متين — لا يصدأ ولا يخدش الزجاج",
      "تركيب فوري — بدون أدوات أو لاصق"
    ],
    "safetyWarnings": [
      "لا تشد البرغي بقوة زائدة على الزجاج الرقيق — قد يسبب ضغطاً",
      "تأكد من أن المشبك مثبت جيداً قبل ترك الخرطوم بدون مراقبة",
      "افحص المشبك دورياً للتأكد من عدم تشققه أو ضعف قبضته",
      "لا تستخدمه لتثبيت أنابيب معدنية ثقيلة — مصمم للخراطيم المرنة فقط"
    ],
    "usageInstructions": [
      "افتح البرغي بتدويره عكس اتجاه عقارب الساعة لتوسيع الفتحة",
      "علّق المشبك على حافة زجاج الحوض من الأعلى",
      "مرّر الخرطوم من الفتحة الجانبية للمشبك",
      "شد البرغي بتدويره باتجاه عقارب الساعة حتى يثبت على الزجاج بإحكام",
      "عدّل زاوية الخرطوم حسب الحاجة — المشبك يسمح بالتحريك"
    ]
  };

  await sql`
    UPDATE products SET
      name = ${newName},
      description = ${newDesc},
      specifications = ${JSON.stringify(newSpecs)}::jsonb,
      category = 'accessories',
      subcategory = 'clamps',
      updated_at = NOW()
    WHERE id = 'houyi-hose-clamp'
  `;

  console.log('✅ houyi-hose-clamp updated!');

  // Verify
  const verify = await sql`
    SELECT id, name, category, subcategory, price, stock
    FROM products WHERE id = 'houyi-hose-clamp'
  `;
  const p = verify[0];
  console.log(`\nName: ${p.name}`);
  console.log(`Category: ${p.category} / ${p.subcategory}`);
  console.log(`Price: ${p.price} IQD | Stock: ${p.stock}`);
  console.log('\n=== Done! ===');
}

main().catch(e => console.error(e));
