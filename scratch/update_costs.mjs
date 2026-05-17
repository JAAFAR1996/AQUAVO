import { neon } from '@neondatabase/serverless';

const DB = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DB);

// كل update بـ id مباشرة — مضمون 100%
const updates = [
  // ── سخانات ──────────────────────────────────────────────
  // yee-1-5-1-7 عنده 3 فولطات (50/100/200W) بصف واحد → نستخدم 200W (الأغلى)
  { id: 'yee-1-5-1-7',         cost: 3918,  pkg: 3266, ins: 0, note: 'سخان ستيل مدرّع (200W — راجع الملاحظة)' },
  { id: 'yee-c4-1432-1',       cost: 14835, pkg: 3292, ins: 0, note: 'سخان كوارتز 100 واط' },
  { id: 'yee-c4-1103-4',       cost: 5352,  pkg: 3248, ins: 0, note: 'سخان الساموراي الأسود 100 واط' },

  // ── هواء / فلترة ─────────────────────────────────────────
  { id: 'yee-03326',           cost: 1777,  pkg: 3106, ins: 0, note: 'مضخة هواء صغيرة هادئة 3 واط' },
  { id: 'yee-c4-1067-1',       cost: 3967,  pkg: 3168, ins: 0, note: 'مزيل الطبقة الزيتية 3 واط' },
  { id: 'yee-07154',           cost: 2371,  pkg: 3106, ins: 0, note: 'ناشر فقاعات كروي 50مم' },

  // ── إكسسوارات ────────────────────────────────────────────
  { id: 'yee-c5-1144-1a',      cost: 557,   pkg: 3062, ins: 0, note: 'سيفون 1.5م مقوّى' },
  { id: 'houyi-water-changer-siphon', cost: 1392, pkg: 3195, ins: 0, note: 'سيفون 3 في 1 (airbag 1.7m)' },
  { id: 'yee-c4-1008-1',       cost: 4068,  pkg: 3168, ins: 0, note: 'صندوق عزل وولادة عائم' },
  { id: 'yee-02517',           cost: 1505,  pkg: 3168, ins: 0, note: 'حاضنة هوائية كبيرة بغرفتين' },
  { id: 'yee-02771',           cost: 4347,  pkg: 3257, ins: 0, note: 'حاضنة أكريليك 20×10×10' },
  { id: 'yee-08116',           cost: 0,     pkg: 3230, ins: 0, note: 'إضاءة LED ثلاثية 3.5 واط' },
  { id: 'yee-07140',           cost: 0,     pkg: 3700, ins: 0, note: 'فرشاة مغناطيسية كبيرة' },
  { id: 'yee-00340',           cost: 1672,  pkg: 1534, ins: 0, note: 'ميزان حرارة رقمي ذكي' },

  // ── مكنسة رمل ───────────────────────────────────────────
  { id: 'yee-c4-1117-1',       cost: 12588, pkg: 3780, ins: 0, note: 'مكنسة رمل كهربائية 20 واط' },

  // ── مواد ترشيح ───────────────────────────────────────────
  { id: 'yee-05617a',          cost: 4624,  pkg: 3257, ins: 0, note: 'قطن فلتر 6D' },
  { id: 'yee-07116',           cost: 1991,  pkg: 3611, ins: 0, note: 'حلقات ترشيح نانو' },
  { id: 'yee-17699a',          cost: 1262,  pkg: 3345, ins: 0, note: 'طوب ترشيح بكتيري' },
  { id: 'yee-11578',           cost: 2538,  pkg: 3514, ins: 0, note: 'مادة ترشيح 3D 500جم' },
  { id: 'yee-71934',           cost: 3961,  pkg: 5207, ins: 0, note: 'مواد ترشيح 16 في 1 — 2.5كغم' },
  { id: 'yee-17831',           cost: 1477,  pkg: 3523, ins: 0, note: 'مواد ترشيح 6 في 1 — 500جم' },

  // ── أحواض ───────────────────────────────────────────────
  // yee-c5-1123-2 = حوض بانوراما 60سم (side stream 60×15×15)
  { id: 'yee-c5-1123-2',       cost: 26290, pkg: 7902,  ins: 5155, note: 'حوض بانوراما 60سم (60×15×15)' },
  // yee-06255 = Ultra Clear — راجع الملاحظة أدناه لتختار الحجم الصحيح
  { id: 'yee-06255',           cost: 19032, pkg: 16288, ins: 7351, note: 'حوض Ultra Clear (⚠ راجع الحجم)' },

  // ── تربة ────────────────────────────────────────────────
  { id: 'yee-07509',           cost: 3633,  pkg: 6441, ins: 0, note: 'تربة نباتات مائية (coarse 3K — ⚠ راجع إذا فاين 1.5K)' },
  { id: 'yee-13343',           cost: 1156,  pkg: 1906, ins: 0, note: 'مزيل ترسبات كلسية' },

  // ── غذاء ─────────────────────────────────────────────────
  { id: 'yee-c1-1113-2',       cost: 958,   pkg: 1648, ins: 0, note: 'علف صغير 0.6مم 75جم' },
  { id: 'yee-c1-1065-1',       cost: 2736,  pkg: 2087, ins: 0, note: 'علف كوي فراشة (Orchid Longevity)' },
  { id: 'yee-c1-1073-1a',      cost: 1474,  pkg: 1729, ins: 0, note: 'علف بيتا 0.8مم 130جم' },
  { id: 'yee-c1-1082-5',       cost: 2584,  pkg: 1583, ins: 0, note: 'علف بروتين عالي زينة 40%' },
  { id: 'yee-c1-1066-2',       cost: 2052,  pkg: 1713, ins: 0, note: 'طعام روبيان زينة (imitation red worm)' },
  { id: 'yee-c1-1134-6',       cost: 1307,  pkg: 2087, ins: 0, note: 'علف رانشو غارق (competition grade)' },
  { id: 'yee-03446a',          cost: 2508,  pkg: 1697, ins: 0, note: 'بيض أرتيميا مقشّر 80جم' },
  { id: 'yee-c1-1125-1',       cost: 1930,  pkg: 1664, ins: 0, note: 'طعام سرطان ناسك مجفّف' },
  { id: 'yee-c1-1082-2a',      cost: 1581,  pkg: 1859, ins: 0, note: 'علف حبيبات دقيقة 0.2مم 210جم' },
  { id: 'yee-c1-1127-1',       cost: 2569,  pkg: 2087, ins: 0, note: 'طعام رانشو ذهبية سبيرولينا' },
  { id: 'yee-c1-1086-1',       cost: 1368,  pkg: 1583, ins: 0, note: 'روبيان ملحي مجفّف 18جم' },
  { id: 'yee-c1-1124-1',       cost: 730,   pkg: 1551, ins: 0, note: 'علف بيتا 3 في 1 — 15جم' },

  // ── علاج ─────────────────────────────────────────────────
  { id: 'yee-12420',           cost: 1092,  pkg: 2054, ins: 0, note: 'علاج البقع البيضاء 300مل' },
  { id: 'yee-19768a',          cost: 1414,  pkg: 2590, ins: 0, note: 'محلول أزرق الميثيلين 600مل' },
  { id: 'yee-02856a',          cost: 1718,  pkg: 1583, ins: 0, note: 'مسحوق مضاد بكتيري' },
  { id: 'yee-02938a',          cost: 684,   pkg: 1859, ins: 0, note: 'محلول أزرق الميثيلين الكلاسيكي 235مل' },

  // ── كيماوي ────────────────────────────────────────────────
  { id: 'yee-c2-1016-2',       cost: 3557,  pkg: 2899, ins: 0, note: 'معالج الأمونيا بروبيوتيك (760مل)' },
  { id: 'yee-02924',           cost: 1094,  pkg: 2493, ins: 0, note: 'مزيل كلور ومثبّت مياه 535مل' },
  { id: 'yee-16940',           cost: 1392,  pkg: 2477, ins: 0, note: 'مثبّت مياه مضاد للإجهاد 500مل' },
  { id: 'yee-c2-1005-1',       cost: 1930,  pkg: 1648, ins: 0, note: 'كبسولات بكتيريا نافعة (⚠ 50g=1292 | 100g=1930)' },
  { id: 'yee-19429',           cost: 1392,  pkg: 2412, ins: 0, note: 'مزيل طحالب آمن 500مل' },
  { id: 'yee-06834',           cost: 304,   pkg: 2347, ins: 0, note: 'ملح متعدد الفيتامينات 500جم' },
  { id: 'yee-01831',           cost: 1322,  pkg: 2428, ins: 0, note: 'ملح فيتامينات علبة (YAN-915)' },
  { id: 'yee-c4-1123-1a',      cost: 1611,  pkg: 1551, ins: 0, note: 'شرائط اختبار 9 في 1 — 50 شريط' },

  // ── اختبار ───────────────────────────────────────────────
  { id: 'yee-c3-1010-3',       cost: 4362,  pkg: 2330, ins: 0, note: 'طقم اختبار أمونيا ونيتريت' },
];

console.log(`\nتحديث ${updates.length} منتج...\n`);

let updated = 0;
let notFound = 0;
const warnings = [];

for (const u of updates) {
  const result = await sql`
    UPDATE products
    SET cost_price = ${String(u.cost)},
        packaging_cost = ${String(u.pkg)},
        insert_cost = ${String(u.ins)},
        updated_at = NOW()
    WHERE id = ${u.id}
    RETURNING id, name
  `;

  if (result.length === 0) {
    notFound++;
    console.log(`  ❌ لم يُوجد: ${u.id} — ${u.note}`);
  } else {
    updated++;
    const warn = u.note.includes('⚠');
    if (warn) warnings.push(`  ⚠  ${result[0].name}: ${u.note}`);
    else console.log(`  ✓  ${result[0].name}`);
  }
}

console.log(`\n══════════════════════════════`);
console.log(`✅ تم تحديث: ${updated} منتج`);
console.log(`❌ لم يُوجد: ${notFound} منتج`);

if (warnings.length > 0) {
  console.log(`\n⚠  يحتاج مراجعة يدوية:`);
  warnings.forEach(w => console.log(w));
}

// تحقق نهائي
const check = await sql`SELECT count(*) as cnt FROM products WHERE cost_price::numeric > 0`;
console.log(`\nإجمالي المنتجات بكلفة > 0 الآن: ${check[0].cnt}`);
