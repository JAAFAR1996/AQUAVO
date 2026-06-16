import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const newDescription = `تحكّم فعّال في الطحالب بعبوة اقتصادية مضاعفة — 1000 مل.

مزيل طحالب بتركيبة آمنة على الأسماك والنباتات المائية والروبيان بعبوة اقتصادية 1000 مل. يعمل على تثبيط نموّ الطحالب الخيطية والطحالب الخضراء وطحالب الزجاج دون تأثير سلبي على الكائنات الحيّة الأخرى.

يُعدّ حلاً علاجياً مؤقتاً يجب أن يُرافقه معالجة الأسباب الجذرية لنموّ الطحالب: الإضاءة المفرطة، المغذيات الزائدة، أو غياب النباتات المنافسة.

أضف الجرعة المحددة مع إطفاء الإضاءة لمدة 24 ساعة لتعزيز الفعالية. استخدمه كخطوة أولى ثم عالج السبب الأساسي بتقليل مدة الإضاءة إلى 6-8 ساعات وزيادة تغييرات الماء.

عبوة 1000 مل الاقتصادية — ضعف الحجم وتوفير أكبر لأصحاب الأحواض الكبيرة والمتعددة.`;

  const newSpecifications = {
    "benefits": [
      "1000 مل — ضعف حجم العبوة العادية بسعر أوفر",
      "يقضي على الطحالب بدون إيذاء الأسماك أو النباتات",
      "يمنع نمو الطحالب مجدداً — ليس فقط علاج مؤقت",
      "فعّال ضد أنواع متعددة من الطحالب",
      "آمن على الروبيان بالجرعة الصحيحة",
      "مثالي للأحواض الكبيرة والاستخدام المتكرر"
    ],
    "الحجم": "1000 مل",
    "النوع": "مزيل طحالب — آمن للأسماك والنباتات",
    "safetyWarnings": [
      "قلّل الجرعة 50% إذا كان لديك روبيان حساس",
      "لا تتجاوز الجرعة الموصى بها",
      "زد التهوية — الطحالب الميتة تسحب الأكسجين",
      "لا تخلطه مع أدوية أخرى",
      "أبعده عن الأطفال",
      "احفظه بعيداً عن أشعة الشمس والحرارة"
    ],
    "التوافق": "أحواض مياه عذبة مع أسماك ونباتات",
    "الموديل": "YYH-216",
    "فعّال ضد": "طحالب خضراء، بنية، خيطية",
    "usageInstructions": [
      "أزل أكبر قدر من الطحالب يدوياً قبل العلاج",
      "أضف الجرعة المحددة حسب حجم الحوض (راجع العبوة)",
      "أطفئ الإضاءة لمدة 24 ساعة بعد الجرعة لتعزيز الفعالية",
      "زد التهوية أثناء العلاج — الطحالب الميتة تستهلك أكسجين",
      "كرر الجرعة بعد 3 أيام إذا لزم الأمر",
      "قلّل فترة الإضاءة إلى 6-8 ساعات لمنع عودة الطحالب",
      "غيّر 30% من الماء بعد أسبوع من العلاج",
      "رجّ العبوة جيداً قبل الاستخدام"
    ],
    "بداية المفعول": "3-7 أيام"
  };

  console.log('🔄 Updating yee-19939 to مزيل طحالب 1000 مل...\n');

  await sql`
    UPDATE products 
    SET 
      name = 'مزيل طحالب — 1000 مل',
      description = ${newDescription},
      specifications = ${JSON.stringify(newSpecifications)}::jsonb,
      updated_at = NOW()
    WHERE id = 'yee-19939'
  `;

  // Verify
  const [updated] = await sql`SELECT id, name, description, specifications FROM products WHERE id = 'yee-19939'`;
  
  console.log('✅ UPDATED PRODUCT:');
  console.log('Name:', updated.name);
  console.log('Description:', updated.description.substring(0, 100) + '...');
  console.log('Specifications:');
  console.log('  النوع:', updated.specifications['النوع']);
  console.log('  الحجم:', updated.specifications['الحجم']);
  console.log('  الموديل:', updated.specifications['الموديل']);
  console.log('  فعّال ضد:', updated.specifications['فعّال ضد']);
  console.log('  التوافق:', updated.specifications['التوافق']);
  console.log('  بداية المفعول:', updated.specifications['بداية المفعول']);
  console.log('  Benefits:', updated.specifications.benefits?.length, 'items');
  console.log('  Usage:', updated.specifications.usageInstructions?.length, 'steps');
  console.log('  Warnings:', updated.specifications.safetyWarnings?.length, 'items');
  console.log('\n✅ Done!');
}

main().catch(e => console.error('Error:', e.message));
