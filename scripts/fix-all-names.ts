import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// ============================================
// Phase 1: Fix ALL Product Names
// ============================================

interface NameUpdate {
  slug: string;
  newName: string;
}

const nameUpdates: NameUpdate[] = [
  // =============================================
  // YEE Products — Remove "YEE" prefix + shorten
  // =============================================
  { slug: 'yee-3656', newName: 'أنبوب بلاستيكي مقوّى 16 مم' },
  { slug: 'led-318', newName: 'إضاءة LED ثلاثية الألوان — 3.5 واط' },
  { slug: 'yyy-078', newName: 'بيض أرتيميا مقشّر 80 جم — مع مُغذّي' },
  { slug: 'yff-049', newName: 'تربة نباتات مائية مخصّبة' },
  { slug: 'ykl-018', newName: 'حاضنة أكريليك شفافة — 20×10×10 سم' },
  { slug: 'ysl-506', newName: 'حاضنة هوائية كبيرة بغرفتين' },
  { slug: 'yff-042', newName: 'حلقات ترشيح نانو مختلطة' },
  { slug: 'c5-1123', newName: 'حوض بانوراما 60 سم — مع فلتر ومضخة' },
  { slug: 'yxl-003', newName: 'حوض زجاجي فائق الشفافية — Ultra Clear' },
  { slug: 'c1-1086', newName: 'روبيان ملحي مجفّف بالتبريد — 18 جم' },
  { slug: 'c4-1103', newName: 'سخان الساموراي الأسود — 100 واط' },
  { slug: 'yee-3006', newName: 'سخان ستيل مدرّع — غير قابل للكسر' },
  { slug: 'c4-1432', newName: 'سخان كوارتز — 100 واط' },
  { slug: 'c4-1123', newName: 'شرائط اختبار الماء 9 في 1 — 50 شريط' },
  { slug: 'c4-1008', newName: 'صندوق عزل وولادة عائم — شفاف' },
  { slug: 'c1-1127', newName: 'طعام رانشو الذهبية — سبيرولينا 290 جم' },
  { slug: 'c1-1066', newName: 'طعام روبيان الزينة — 260 جم' },
  { slug: 'c1-1125', newName: 'طعام سرطان الناسك مجفّف — 55 جم' },
  { slug: 'c3-1010', newName: 'طقم اختبار الأمونيا والنيتريت' },
  { slug: 'yaa-009', newName: 'طوب ترشيح بكتيري عالي الكثافة' },
  { slug: 'c1-1069', newName: 'عبوة عيّنات أعلاف متنوعة' },
  { slug: 'yyh-125', newName: 'علاج البقع البيضاء (الإيك) — 300 مل' },
  { slug: 'c1-1113', newName: 'علف أسماك الزينة الصغيرة — 75 جم' },
  { slug: 'c1-1082', newName: 'علف أسماك الزينة — بروتين عالي' },
  { slug: 'c1-1073', newName: 'علف البيتا المقاتل — 130 جم' },
  { slug: 'c1-1124', newName: 'علف بيتا 3 في 1 — 15 جم' },
  { slug: 'c1-1134', newName: 'علف رانشو غارق — 500 جم' },
  { slug: 'c1-1065', newName: 'علف الفراشة كوي — 300 جم' },
  { slug: 'cls-107', newName: 'فرشاة مغناطيسية كبيرة' },
  { slug: 'yll-087', newName: 'قطن فلتر 6D مطوّر — قطعتين' },
  { slug: 'c2-1005', newName: 'كبسولات بكتيريا نافعة — نيتروجين' },
  { slug: 'nyh-006', newName: 'مادة ترشيح 3D كوكيز — 500 جم' },
  { slug: 'yyh-216', newName: 'مثبّت مياه مضاد للإجهاد — 1000 مل' },
  { slug: 'yyh-173', newName: 'مثبّت مياه مضاد للإجهاد — 500 مل' },
  { slug: 'yyh-207', newName: 'محلول أزرق الميثيلين — 600 مل' },
  { slug: 'yyh-053', newName: 'محلول أزرق الميثيلين الكلاسيكي — 235 مل' },
  { slug: 'c4-1067', newName: 'مزيل الطبقة الزيتية — 3 واط' },
  { slug: 'pyd-200', newName: 'مزيل ترسّبات كلسية — 200 مل' },
  { slug: 'yyh-189', newName: 'مزيل طحالب آمن — 500 مل' },
  { slug: 'yyh-039', newName: 'مزيل كلور ومثبّت مياه — 535 مل' },
  { slug: 'yyh-006', newName: 'مسحوق مضاد بكتيري — 10 أكياس' },
  { slug: 'ytz-300', newName: 'مضخة هواء صغيرة هادئة — 3 واط' },
  { slug: 'c2-1016', newName: 'معالج الأمونيا بالبروبيوتيك النشط' },
  { slug: 'c4-1117', newName: 'مكنسة رمل كهربائية — 30 واط' },
  { slug: 'yan-804', newName: 'ملح أحواض متعدد الفيتامينات — 500 جم' },
  { slug: 'yan-915', newName: 'ملح متعدد الفيتامينات — علبة 500 جم' },
  { slug: 'ylc-410', newName: 'مواد ترشيح 16 في 1 احترافية — 2.5 كغم' },
  { slug: 'ylc-409', newName: 'مواد ترشيح 6 في 1 — 500 جم' },
  { slug: 'ygg-135', newName: 'ناشر فقاعات كروي — 50 مم' },
  { slug: 'cwd-003', newName: 'ميزان حرارة رقمي ذكي' },

  // =============================================
  // Houyi Products — Arabize + shorten
  // =============================================
  { slug: 'houyi-south-american-sand', newName: 'رمل أمريكا الجنوبية — أحمر وأسود' },
  { slug: 'houyi-spider-wood-sm', newName: 'سبايدر وود — خشب تشعّبي طبيعي' },
  { slug: 'houyi-sucker-buckle', newName: 'شفاطات تثبيت جدارية' },
  { slug: 'houyi-sinking-wood-large', newName: 'خشبة غاطسة طبيعية — حجم كبير' },
  { slug: 'houyi-fat-injection', newName: 'حقنة تغذية وتسميد دقيقة' },
  { slug: 'houyi-foam-glue', newName: 'معجون ملء وإخفاء — لون الخشب' },
  { slug: 'houyi-tracheal-suction-cup', newName: 'كأس ماصة لتثبيت الخراطيم' },
  { slug: 'houyi-tracheal-suction', newName: 'ماصة تثبيت خراطيم الهواء' },
  { slug: 'houyi-polished-driftwood', newName: 'خشب طافٍ مصقول — دريفت وود' },
];

async function updateNames() {
  console.log('🔄 Phase 1: Updating Product Names...\n');
  
  let successCount = 0;
  let failCount = 0;

  for (const update of nameUpdates) {
    try {
      const result = await sql`
        UPDATE products 
        SET name = ${update.newName}, updated_at = NOW()
        WHERE slug = ${update.slug} AND deleted_at IS NULL
      `;
      
      if (result.length === 0) {
        // neon returns empty for updates, check with select
        const check = await sql`SELECT name FROM products WHERE slug = ${update.slug} AND deleted_at IS NULL`;
        if (check.length > 0) {
          console.log(`✅ ${update.slug} → ${update.newName}`);
          successCount++;
        } else {
          console.log(`⚠️  ${update.slug} — not found`);
          failCount++;
        }
      } else {
        console.log(`✅ ${update.slug} → ${update.newName}`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`❌ ${update.slug} — Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} updated, ${failCount} failed`);
  console.log(`   Total: ${nameUpdates.length} planned`);
}

updateNames().catch(console.error);
