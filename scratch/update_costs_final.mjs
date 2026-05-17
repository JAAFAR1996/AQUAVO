import { neon } from '@neondatabase/serverless';
const DB = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DB);

// التكلفة = شراء د + شحن/ق + خشب = السعر النهائي للبضاعة
// packaging_cost يبقى صفر — تحدده يدوياً بزر الكارتونة (صغير/وسط/كبير)
const updates = [
  // ── سخانات ──────────────────────────────────────────────────────
  // yee-1-5-1-7 عنده 3 وطاجات — 200W هو الأكثر مبيعاً (التكلفة 7184)
  { id: 'yee-1-5-1-7',    cost: 7184,  note: 'سخان ستيل مدرّع 200W ⚠ 50W=6945 | 100W=7162' },
  { id: 'yee-c4-1432-1',  cost: 18127, note: 'سخان كوارتز 100W' },
  { id: 'yee-c4-1103-4',  cost: 8600,  note: 'سخان الساموراي الأسود 100W' },

  // ── فلتر / هواء ──────────────────────────────────────────────────
  { id: 'yee-03326',       cost: 4883,  note: 'مضخة هواء صغيرة 3W' },
  { id: 'yee-c4-1067-1',   cost: 7135,  note: 'مزيل الطبقة الزيتية 3W' },
  { id: 'yee-07154',       cost: 5477,  note: 'ناشر فقاعات كروي 50مم' },

  // ── إكسسوارات ────────────────────────────────────────────────────
  { id: 'yee-c5-1144-1a',           cost: 3619,  note: 'سيفون 1.5م مقوّى' },
  { id: 'houyi-water-changer-siphon', cost: 4587, note: 'سيفون airbag 1.7م' },
  { id: 'yee-c4-1008-1',   cost: 7236,  note: 'صندوق عزل وولادة عائم' },
  { id: 'yee-02517',       cost: 4673,  note: 'حاضنة هوائية كبيرة بغرفتين' },
  { id: 'yee-02771',       cost: 7604,  note: 'حاضنة أكريليك 20×10×10' },
  { id: 'yee-08116',       cost: 3230,  note: 'إضاءة LED ثلاثية 3.5W' },
  { id: 'yee-07140',       cost: 3700,  note: 'فرشاة مغناطيسية كبيرة' },
  { id: 'yee-00340',       cost: 3206,  note: 'ثيرموميتر رقمي ذكي' },

  // ── مكنسة رمل ────────────────────────────────────────────────────
  { id: 'yee-c4-1117-1',   cost: 16368, note: 'مكنسة رمل 30W' },

  // ── مواد ترشيح ───────────────────────────────────────────────────
  { id: 'yee-05617a',      cost: 7881,  note: 'قطن فلتر 6D' },
  { id: 'yee-07116',       cost: 5602,  note: 'حلقات ترشيح نانو' },
  { id: 'yee-17699a',      cost: 4607,  note: 'طوب ترشيح بكتيري' },
  { id: 'yee-11578',       cost: 6052,  note: 'مادة ترشيح 3D 500جم' },
  { id: 'yee-71934',       cost: 9168,  note: 'مواد ترشيح 16 في 1 — 2.5كغم' },
  { id: 'yee-17831',       cost: 5000,  note: 'مواد ترشيح 6 في 1 — 500جم' },

  // ── أحواض ────────────────────────────────────────────────────────
  { id: 'yee-c5-1123-2',   cost: 39347, note: 'حوض بانوراما 60سم (60×15×15)' },
  // يحتاج مراجعة — yee-06255 حجمه مو محدد بالداتابيس
  { id: 'yee-06255',       cost: 42671, note: 'حوض Ultra Clear ⚠ راجع الحجم الصحيح' },

  // ── تربة وحجر ────────────────────────────────────────────────────
  { id: 'yee-07509',       cost: 10074, note: 'تربة نباتات مائية coarse 3K ⚠ fine 1.5K=5890' },
  { id: 'yee-13343',       cost: 3062,  note: 'مزيل ترسبات كلسية 200مل' },

  // ── غذاء ─────────────────────────────────────────────────────────
  { id: 'yee-c1-1113-2',   cost: 2606,  note: 'علف صغير 0.6مم 75جم' },
  { id: 'yee-c1-1065-1',   cost: 4823,  note: 'علف كوي / Orchid Longevity' },
  { id: 'yee-c1-1073-1a',  cost: 3203,  note: 'علف بيتا 0.8مم 130جم' },
  { id: 'yee-c1-1082-5',   cost: 4167,  note: 'علف بروتين عالي 40%' },
  { id: 'yee-c1-1066-2',   cost: 3765,  note: 'طعام روبيان زينة 260جم (red worm)' },
  { id: 'yee-c1-1134-6',   cost: 3394,  note: 'علف رانشو — Floating Competition' },
  { id: 'yee-03446a',      cost: 4205,  note: 'بيض أرتيميا مقشّر 80جم' },
  { id: 'yee-c1-1125-1',   cost: 3594,  note: 'طعام سرطان ناسك مجفّف 55جم' },
  { id: 'yee-c1-1082-2a',  cost: 3440,  note: 'علف حبيبات دقيقة 0.2مم 210جم' },
  { id: 'yee-c1-1127-1',   cost: 4656,  note: 'طعام رانشو ذهبية سبيرولينا 1.5مم' },
  { id: 'yee-c1-1086-1',   cost: 2951,  note: 'روبيان ملحي مجفّف 18جم' },
  { id: 'yee-c1-1124-1',   cost: 2281,  note: 'علف بيتا 3 في 1 — 15جم' },

  // ── علاج ─────────────────────────────────────────────────────────
  { id: 'yee-12420',       cost: 3146,  note: 'علاج البقع البيضاء 300مل' },
  { id: 'yee-19768a',      cost: 4004,  note: 'محلول أزرق الميثيلين 600مل' },
  { id: 'yee-02856a',      cost: 3301,  note: 'مسحوق مضاد بكتيري' },
  { id: 'yee-02938a',      cost: 2543,  note: 'محلول أزرق الميثيلين الكلاسيكي 235مل' },

  // ── كيماوي ────────────────────────────────────────────────────────
  { id: 'yee-c2-1016-2',   cost: 6456,  note: 'معالج الأمونيا 760g' },
  { id: 'yee-02924',       cost: 3587,  note: 'مزيل كلور ومثبّت مياه 535مل' },
  { id: 'yee-16940',       cost: 3869,  note: 'مثبّت مياه مضاد للإجهاد 500مل' },
  { id: 'yee-19429',       cost: 3804,  note: 'مزيل طحالب آمن 500مل' },
  { id: 'yee-06834',       cost: 2651,  note: 'ملح متعدد الفيتامينات 500جم' },
  { id: 'yee-01831',       cost: 3750,  note: 'ملح فيتامينات علبة YAN-915' },
  // كبسولات بكتيريا — نضع 100g (الأكثر مبيعاً)، 50g=2891
  { id: 'yee-c2-1005-1',   cost: 3578,  note: 'كبسولات بكتيريا نافعة 100g ⚠ 50g=2891' },

  // ── اختبار ───────────────────────────────────────────────────────
  { id: 'yee-c3-1010-3',   cost: 6692,  note: 'طقم اختبار الأمونيا والنيتريت' },
  { id: 'yee-c4-1123-1a',  cost: 3162,  note: 'شرائط اختبار 9 في 1 — Refill 50 شريط' },
];

console.log(`\nتحديث ${updates.length} منتج بالتكلفة النهائية...\n`);

let updated = 0, notFound = 0;
const warnings = [];

for (const u of updates) {
  const r = await sql`
    UPDATE products
    SET cost_price     = ${String(u.cost)},
        packaging_cost = '0',
        insert_cost    = '0',
        updated_at     = NOW()
    WHERE id = ${u.id}
    RETURNING id, name
  `;
  if (r.length === 0) {
    notFound++;
    console.log(`  ❌ لم يُوجد: ${u.id}`);
  } else {
    updated++;
    if (u.note.includes('⚠')) warnings.push(`  ⚠  ${r[0].name} — ${u.note}`);
    else console.log(`  ✓  ${r[0].name} → ${u.cost.toLocaleString()} د.ع`);
  }
}

// المنتجات الجديدة من الجدول التي لم نعثر على ID لها
const missing = [
  'Ammonia 400g (yee-c2-1016-2?) — 4461 د.ع — ⚠ قد يكون variant لـ 760g',
  'Anti-stress 1000ml — 4287 د.ع — ⚠ لا يوجد ID منفصل',
  'Nitrifying Bacteria 50g — 2891 د.ع — ⚠ نفس ID الـ 100g',
  '9-in-1 Bucket Starter — 4094 د.ع — ⚠ يحتاج ID منفصل',
  'Water grass mud fine 1.5K — 5890 د.ع — ⚠ نفس ID الـ coarse 3K',
  'Cherlam slow-sinking 130g — 1794 د.ع — ⚠ لا يوجد ID',
  'Fish feed coated paper hanger — 1583 د.ع — ⚠ لا يوجد ID',
  'Tank 400x230x250 — 23868 د.ع — ⚠ لا يوجد ID',
  'Tank 500x270x300 — 35572 د.ع — ⚠ لا يوجد ID',
  'Tank 35×35×35 — 31200 د.ع — ⚠ لا يوجد ID',
  'Tank 40x40x40 — 40358 د.ع — ⚠ لا يوجد ID',
  'Tank 60x40x40 — 58916 د.ع — ⚠ لا يوجد ID',
];

console.log(`\n══════════════════════════════`);
console.log(`✅ تم تحديث: ${updated} منتج`);
console.log(`❌ لم يُوجد: ${notFound} منتج`);

if (warnings.length) {
  console.log(`\n⚠  يحتاج مراجعة:`);
  warnings.forEach(w => console.log(w));
}

console.log(`\n📋 منتجات موجودة بجدولك لكن ما عندها ID بالداتابيس:`);
missing.forEach(m => console.log(`  - ${m}`));

const check = await sql`SELECT count(*) as cnt FROM products WHERE cost_price::numeric > 0`;
console.log(`\nإجمالي المنتجات بكلفة > 0: ${check[0].cnt}`);
