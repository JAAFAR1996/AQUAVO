/**
 * إعادة تسمية جميع منتجات Houyi بأسماء طبيعية
 * تستخدم المصطلحات المتداولة في مجتمع أحواض السمك العربي
 */
import { neon } from "@neondatabase/serverless";
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

const renames: Record<string, string> = {
  // ═══ الأخشاب ═══
  "houyi-spider-wood-sm":    "سبايدر وود — صغير",
  "houyi-spider-wood-md":    "سبايدر وود — وسط",
  "houyi-spider-wood-lg":    "سبايدر وود — كبير",
  "houyi-spider-wood-root":  "سبايدر وود — جذر ضخم",
  "houyi-sinking-wood-large":"خشبة غاطسة طبيعية — كبيرة",
  "houyi-mountain-wood":     "خشب الجبل الطبيعي",
  "houyi-polished-driftwood":"دريفت وود مصقول",
  "houyi-thai-branches":     "أغصان تايلاندية مقشّرة",
  "houyi-moss-tree":         "شجرة موس جاهزة",

  // ═══ الحجارة ═══
  "houyi-black-slate":       "صخر السلايت الأسود",
  "houyi-blue-dragon-stone": "حجر التنين الأزرق (دراقون ستون)",
  "houyi-volcanic-stone":    "صخور اللافا البركانية",
  "houyi-pumice":            "حجر البيوميس الخفيف",

  // ═══ الرمال ═══
  "houyi-dutch-sand":        "رمل هولندي احترافي",
  "houyi-river-sand":        "رمل نهري طبيعي",
  "houyi-south-american-sand":"رمل أمازوني ذهبي",
  "houyi-white-sand":        "رمل أبيض ناصع",
  "houyi-stream-sand":       "رمل جداول جاهز — بدون غسيل",

  // ═══ الترشيح ═══
  "houyi-activated-carbon":  "كربون نشط لتصفية المياه",
  "houyi-ceramic-ring":      "حلقات سيراميك بيولوجية",
  "houyi-white-cotton":      "قطن فلتر أبيض 30×50 سم",
  "houyi-medium-cotton":     "قطن فلتر كثيف (ميديوم)",
  "houyi-net-bag":           "كيس شبكي لمواد الفلتر",
  "houyi-dophin-skimmer":    "سكيمر سطحي كهربائي — DoPhin",
  "houyi-acrylic-pump-compartment": "حجرة فلتر أكريليك شفافة",

  // ═══ مضخات ═══
  "houyi-wave-pump":         "ويف ميكر WP-50M",

  // ═══ الهواء ═══
  "houyi-oxygenation-tube":  "خرطوم هواء أحواض — ملوّن",
  "houyi-check-valve":       "صمام منع رجوع الماء",
  "houyi-connectors-4mm":    "وصلات خراطيم هواء 4ملم — T / Y / I",
  "houyi-hose-clamp":        "مشبك تحكم بتدفق الهواء",
  "houyi-tracheal-suction":  "ماصة تثبيت خراطيم هواء",
  "houyi-air-distributor":   "موزع هواء بلاستيكي — 4 منافذ",
  "houyi-stainless-shunt":   "موزع هواء ستانلس ستيل — بصمامات",

  // ═══ القياس ═══
  "houyi-led-light":         "ثيرموميتر رقمي بشاشة LED",
  "houyi-chubby-thermometer":"ثيرموميتر عريض سهل القراءة",
  "houyi-suction-thermometer":"ثيرموميتر زجاجي بماصة شفط",

  // ═══ أدوات التنظيف ═══
  "houyi-5-in-1-cleaning-tool":"طقم تنظيف أحواض 5 في 1",
  "houyi-cleaning-towel":    "منشفة أحواض مايكروفايبر",
  "houyi-hose-brush":        "فرشاة خراطيم مزدوجة — 1.55م",
  "houyi-water-changer-siphon":"سيفون تنظيف وتغيير ماء — 3 في 1",

  // ═══ شبكات الصيد ═══
  "houyi-koi-fish-net":      "شبكة كوي ألمنيوم — تلسكوبية",
  "houyi-nylon-fishing-net": "شبكة صيد نايلون ناعمة",
  "houyi-telescopic-fishnet":"شبكة صيد تلسكوبية — ستانلس ستيل",

  // ═══ إكسسوارات ═══
  "houyi-feeding-cup":       "كوب تغذية أسماك بماصة شفط",
  "houyi-fat-injection":     "حقنة تغذية وتسميد دقيقة",
  "houyi-gauze-isolation-net":"شبكة عزل وفصل أسماك",
  "houyi-sucker-buckle":     "ماصة تثبيت بإبزيم — للمعدات",
  "houyi-acrylic-tool-rack": "حامل أدوات أكريليك شفاف",
  "houyi-planting-ring":     "حلقة تثبيت نباتات — سيراميك بركاني",
  "houyi-moss-line":         "خيط تثبيت موس شفاف",
  "houyi-silicone-121":      "سيليكون أحواض 121 — آمن للأسماك",
  "houyi-instant-glue":      "غراء موس فوري — لون أخضر",
  "houyi-base-fertilizer":   "سماد أساس للتربة المزروعة",
  "houyi-terminalia-leaves": "ورق الكاتابا (اللوز الاستوائي)",
  "houyi-mesh":              "شبكة موس ستانلس 8×8 سم",
};

async function renameAll() {
  console.log("=== إعادة تسمية المنتجات ===\n");
  let ok = 0, fail = 0, skip = 0;

  for (const [id, newName] of Object.entries(renames)) {
    try {
      const result = await sql`
        UPDATE products SET name = ${newName}, updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
      `;
      console.log(`✓ ${newName}`);
      ok++;
    } catch (e: any) {
      console.error(`✗ ${id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n=== تم: ${ok} | فشل: ${fail} ===`);
}

renameAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
