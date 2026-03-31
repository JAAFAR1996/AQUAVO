import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Restoring 2 Deleted Products with Enhanced Content ===\n');

  // ─── 1. Control Valve 4mm ───
  const controlValveSpecs = {
    "العلامة التجارية": "HOUYI",
    "القطر": "4 ملم",
    "النوع": "تحكم دوراني",
    "المادة": "بلاستيك ABS متين",
    "آلية العمل": "دوران سلس — تحكم تدريجي بكمية الهواء",
    "التوافق": "خراطيم هواء 4 ملم (القياس العالمي)",
    "benefits": [
      "تحكم دقيق وسلس — ضبط كمية الهواء بدوران تدريجي بدلاً من فتح/إغلاق مفاجئ",
      "تقليل إزعاج الأسماك — ضبط قوة الفقاعات لتناسب حجم الحوض ونوع الأسماك",
      "توزيع متعدد — ركّب صمام على كل خرطوم لتوزيع الهواء بين عدة أحواض بنسب مختلفة",
      "بلاستيك متين — يتحمل الاستخدام المتكرر دون أن يتصلب أو ينكسر",
      "تركيب فوري — يُدخل مباشرة في خرطوم 4 ملم بدون أدوات"
    ],
    "safetyWarnings": [
      "لا تغلق الصمام بالكامل إذا كانت المضخة تعمل — الضغط المرتد قد يُتلف المضخة",
      "استخدم صمام عدم رجوع (Check Valve) بين المضخة والصمام لحماية المضخة من الماء",
      "تأكد من إحكام التوصيل لمنع تسرب الهواء",
      "استبدل الصمام إذا أصبح الدوران صعباً أو فيه تسريب"
    ],
    "usageInstructions": [
      "قص الخرطوم في النقطة المراد التحكم فيها",
      "أدخل طرفي الخرطوم في فتحتي الصمام بإحكام",
      "أدِر العجلة لضبط كمية الهواء: اتجاه عقارب الساعة = أقل، عكسها = أكثر",
      "اضبط حتى تصل لحجم الفقاعات المناسب لحوضك",
      "تفحّص التوصيلات بعد 24 ساعة للتأكد من عدم وجود تسريب"
    ]
  };

  const controlValveDesc = `تحكم دقيق بكمية الهواء الواصلة لحوضك — بدوران سلس وتدريجي.

صمام تحكم بلاستيكي بقطر 4 ملم يُركّب على خرطوم الهواء بين المضخة وحجر الهواء. يتيح لك ضبط قوة الفقاعات بشكل دقيق لتناسب حجم حوضك ونوع أسماكك — من فقاعات خفيفة هادئة للبيتا، إلى تدفق قوي للأحواض الكبيرة.

مثالي لتوزيع هواء مضخة واحدة على عدة أحواض بنسب مختلفة. التحكم الدوراني يمنع الفتح/الإغلاق المفاجئ الذي يزعج الأسماك أو يضغط على المضخة.`;

  // ─── 2. Tool Kit ───
  const toolKitSpecs = {
    "العلامة التجارية": "HOUYI",
    "القطع": "5 أدوات",
    "المادة": "ستانلس ستيل مقاوم للصدأ",
    "يشمل": "ملقط مستقيم 27 سم + ملقط منحني 27 سم + مقص مستقيم 24.5 سم + مقص منحني 24.5 سم + مجرفة رمل 31 سم",
    "طول الأدوات": "24.5 — 31 سم",
    "الفئة المستهدفة": "هواة الأكواسكيب والنباتات المائية",
    "benefits": [
      "طقم كامل 5 قطع — كل ما تحتاجه لزراعة وتقليم وصيانة النباتات المائية في حقيبة واحدة",
      "ملقط مستقيم — لزراعة النباتات الأمامية الدقيقة بدقة ميليمترية",
      "ملقط منحني — للوصول لزوايا صعبة وزراعة النباتات بين الصخور",
      "مقص مستقيم — لقص السيقان والأوراق الطويلة بشكل مستوٍ",
      "مقص منحني — لتقليم النباتات القاعية (كاربت) بزاوية مريحة",
      "مجرفة رمل — لتسوية التربة والرمل وعمل المنحدرات",
      "ستانلس ستيل — مقاوم للصدأ ويتحمل الاستخدام المتكرر في الماء"
    ],
    "safetyWarnings": [
      "الأدوات حادة — احذر عند الاستخدام وأبعدها عن الأطفال",
      "جفف الأدوات جيداً بعد كل استخدام لإطالة عمرها",
      "لا تستخدم القوة الزائدة — المقصات مصممة للنباتات الرقيقة وليس المواد الصلبة",
      "تجنب ملامسة المواد الكيميائية القوية (كلور مركز) لحماية الطبقة المقاومة للصدأ"
    ],
    "usageInstructions": [
      "استخدم الملقط المستقيم لزراعة النباتات في المناطق المفتوحة — أمسك الجذر وادفعه بزاوية 45° في التربة",
      "استخدم الملقط المنحني للزراعة بين الصخور والأخشاب والزوايا الضيقة",
      "المقص المستقيم لقص سيقان النباتات الطويلة (Rotala, Ludwigia) بشكل مستوٍ",
      "المقص المنحني لتقليم نباتات السجادة (HC, Monte Carlo) — مرره أفقياً فوق السطح",
      "المجرفة لتسوية التربة وعمل المنحدرات والممرات",
      "بعد الانتهاء اغسل الأدوات بماء عذب وجففها وأعِدها للحقيبة"
    ]
  };

  const toolKitDesc = `الأدوات التي يحتاجها كل عاشق أكواسكيب — طقم احترافي متكامل من 5 قطع.

مجموعة أدوات من الستانلس ستيل المقاوم للصدأ مصممة خصيصاً لزراعة وتقليم وصيانة النباتات المائية بدقة عالية. يشمل الطقم: ملقط مستقيم 27 سم للزراعة الدقيقة، ملقط منحني 27 سم للوصول للزوايا الصعبة، مقص مستقيم 24.5 سم لقص السيقان، مقص منحني 24.5 سم لتقليم نباتات السجادة، ومجرفة رمل 31 سم لتسوية التربة.

كل أداة بطول مناسب يمنع غمر اليد في الماء — تعمل براحة وأناقة. الخيار الأمثل لمن يريد تحويل حوضه إلى لوحة فنية خضراء.`;

  // ─── Execute Updates ───

  // Update Control Valve
  console.log('Updating houyi-control-valve...');
  await sql`
    UPDATE products SET
      description = ${controlValveDesc},
      specifications = ${JSON.stringify(controlValveSpecs)}::jsonb,
      deleted_at = NULL,
      updated_at = NOW()
    WHERE id = 'houyi-control-valve'
  `;
  console.log('✅ houyi-control-valve restored & enhanced!\n');

  // Update Tool Kit
  console.log('Updating houyi-tool-kit...');
  await sql`
    UPDATE products SET
      description = ${toolKitDesc},
      specifications = ${JSON.stringify(toolKitSpecs)}::jsonb,
      deleted_at = NULL,
      updated_at = NOW()
    WHERE id = 'houyi-tool-kit'
  `;
  console.log('✅ houyi-tool-kit restored & enhanced!\n');

  // ─── Verify ───
  console.log('=== Verification ===\n');
  const verify = await sql`
    SELECT id, name, price, stock, deleted_at, 
           array_length(string_to_array(description, E'\n'), 1) as desc_lines,
           jsonb_array_length(specifications->'benefits') as benefits_count
    FROM products 
    WHERE id IN ('houyi-control-valve', 'houyi-tool-kit')
  `;
  for (const p of verify) {
    console.log(`${p.deleted_at ? '❌' : '✅'} ${p.id}`);
    console.log(`   Name: ${p.name} | Price: ${p.price} IQD | Stock: ${p.stock}`);
    console.log(`   Description lines: ${p.desc_lines} | Benefits: ${p.benefits_count}`);
    console.log(`   Deleted: ${p.deleted_at || 'NO ✅'}\n`);
  }

  console.log('=== Done! Both products restored successfully ===');
}

main().catch(e => console.error(e));
