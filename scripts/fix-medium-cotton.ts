/**
 * إصلاح منتج houyi-medium-cotton
 * هو قطن تثبيت — يوضع على الحجر/الخشب ثم يُوضع الغراء فوقه لتثبيت الموس
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fix() {
  const newName = "قطن تثبيت موس ونباتات — 50 غرام";
  
  const description = "قطن تثبيت خاص بأعمال الأكواسكيب — تاخذ قطعة وتفردها على سطح الحجر أو الخشب، ثم تحط الغراء (سوبر قلو) فوقها وتضغط الموس أو النبتة عليها. القطن يوفر قاعدة ليفية تخلّي الغراء يمسك أقوى وأوسع بدل ما يكون نقطة صغيرة. يجي بلونين: بني ورمادي — لتختار اللي يندمج مع ديكورك.";

  const specifications = {
    "النوع": "قطن تثبيت للأكواسكيب (Attachment Cotton)",
    "الوزن": "50 غرام",
    "الألوان": "بني / رمادي",
    "الاستخدام": "قاعدة للصق الموس والنباتات على الحجارة والأخشاب",
    "benefits": [
      "يوسّع منطقة اللصق — الغراء يمسك على مساحة أكبر",
      "يخلق قاعدة ليفية — الموس يتجذر فيها ويثبت بقوة",
      "ألوان تندمج مع الديكور — بني يختفي مع الخشب، رمادي مع الحجر",
      "أسهل من الخيط — نتيجة أسرع وأنظف",
      "كمية 50 غرام تكفي لمشاريع أكواسكيب كاملة"
    ],
    "usageInstructions": [
      "اقطع قطعة صغيرة من القطن وافردها بطبقة رقيقة على سطح الحجر أو الخشب",
      "ضع نقاط من الغراء الفوري (سوبر قلو) على القطن",
      "اضغط قطعة الموس أو النبتة فوقها لمدة 10-15 ثانية",
      "الغراء يجف خلال 30 ثانية — النتيجة ثابتة ومتينة"
    ],
    "safetyWarnings": [
      "استخدم غراء آمن للأحواض فقط (سيانو أكريلات)",
      "لا تستخدم كمية مفرطة من القطن — طبقة رقيقة تكفي",
      "تجنب ملامسة الغراء للجلد أثناء العمل",
      "القطن الزائد يختفي مع نمو الموس وتغطيته"
    ]
  };

  const variants = [
    {
      id: "brown",
      label: "بني 50 غرام",
      price: 400,
      stock: 30,
      isDefault: true,
      specifications: { "اللون": "بني — يندمج مع الأخشاب" }
    },
    {
      id: "grey",
      label: "رمادي 50 غرام",
      price: 400,
      stock: 30,
      isDefault: false,
      specifications: { "اللون": "رمادي — يندمج مع الحجارة" }
    }
  ];

  try {
    await sql`
      UPDATE products SET 
        name = ${newName},
        description = ${description},
        specifications = ${JSON.stringify(specifications)}::jsonb,
        has_variants = true,
        variants = ${JSON.stringify(variants)}::jsonb,
        category = 'accessories',
        subcategory = 'planting',
        updated_at = NOW()
      WHERE id = 'houyi-medium-cotton'
    `;
    console.log("✓ تم التحديث:");
    console.log(`  الاسم: ${newName}`);
    console.log("  التصنيف: accessories/planting");
    console.log("  المتغيرات: بني / رمادي");
  } catch (e: any) {
    console.error("✗ خطأ:", e.message);
  }
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
