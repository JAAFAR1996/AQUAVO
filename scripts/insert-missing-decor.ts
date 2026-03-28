/**
 * Script: insert-missing-decor.ts
 * يُضيف منتجات الديكور الطبيعي الناقصة من الـ DB — باللهجة العراقية 2026
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/insert-missing-decor.ts
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const RAW_URL = process.env.DATABASE_URL ?? "";
const DATABASE_URL = RAW_URL.replace(/[&?]channel_binding=require/g, "");

if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL غير موجود");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const IMG_BASE = "/images/products/houyi";

const missingProducts = [
  // ──────────────────────────── خشب العنكبوت صغير ────────────────────────────
  {
    id: "houyi-spider-wood-sm",
    slug: "houyi-spider-wood-sm",
    name: "خشب العنكبوت الآسيوي — صغير",
    brand: "Houyi",
    category: "decor",
    subcategory: "driftwood",
    description: "خشب الرودوديندرون — Spider Wood — مو مجرد ديكور، قطعة فنية يصنعها الطبيع بنفسه. مستخرج من جذور نبات الأزاليا الآسيوي، وتفرعاته الرقيقة المتشابكة تشبه شبكة عنكبوت خشبية رائعة ما تشوف مثيلها. يطلق تانين خفيف ما يلون الماي بشكل واضح — كلش خوش لأحواض النباتات والجمبري. الموس والأنوبياس والجاوا فيرن يتعلقون بيه بسهولة. الحجم الصغير (30-35 سم) مثالي للنانو تانك والأحواض الصغيرة اللي تريد قطعة محورية ما تطغى على المساحة.",
    price: "2.77",
    thumbnail: `${IMG_BASE}/houyi-wood-products/spider-wood-sm.png`,
    specifications: {
      "النوع": "جذور الرودوديندرون الآسيوي (Spider Wood)",
      "الاسم التجاري": "Spider Wood / Azalea Root",
      "الحجم": "30-35 سم",
      "اللون": "بني داكن لأسود",
      "تأثيره على pH": "خفيف جداً",
      "يناسب": "نانو تانك، أحواض نباتات، أحواض جمبري",
      "التحضير": "نقع 3-7 أيام أو غلي لتسريع الإغراق",
      "تنبيه": "قد يطفو أسبوع — يحتاج تثبيت مبدئي",
    },
  },
  // ──────────────────────────── خشب العنكبوت وسط ────────────────────────────
  {
    id: "houyi-spider-wood-md",
    slug: "houyi-spider-wood-md",
    name: "خشب العنكبوت الآسيوي — وسط",
    brand: "Houyi",
    category: "decor",
    subcategory: "driftwood",
    description: "خشب الرودوديندرون الوسط (40-45 سم) — الأكثر طلباً والأكثر مرونة بكل المقاسات. كبير بما يكفي يكون قطعة محورية، وصغير بما يكفي يتناسب مع أحواض من 50 لـ 90 سم بدون ما يطغى. نفس مميزات Spider Wood الأصيل — تانين خفيف، نباتات تتعلق بيه بسهولة، وجمال طبيعي ما يشبع منه النظر. والله هادا الحجم ما تغلط بيه.",
    price: "7.66",
    thumbnail: `${IMG_BASE}/houyi-wood-products/spider-wood-md.png`,
    specifications: {
      "النوع": "جذور الرودوديندرون الآسيوي (Spider Wood)",
      "الاسم التجاري": "Spider Wood / Azalea Root",
      "الحجم": "40-45 سم",
      "اللون": "بني داكن لأسود",
      "تأثيره على pH": "خفيف جداً",
      "يناسب": "أحواض نباتات، أحواض جمبري، أكواسكيب",
      "التحضير": "نقع 3-7 أيام أو غلي لتسريع الإغراق",
      "تنبيه": "قد يطفو لأسبوعين — يحتاج تثبيت مبدئي",
    },
  },
  // ──────────────────────────── خشب العنكبوت كبير ────────────────────────────
  {
    id: "houyi-spider-wood-lg",
    slug: "houyi-spider-wood-lg",
    name: "خشب العنكبوت الآسيوي — كبير",
    brand: "Houyi",
    category: "decor",
    subcategory: "driftwood",
    description: "خشب الرودوديندرون الكبير (50-55 سم) — القطعة المحورية اللي تبني حولها كل شي بالحوض الكبير. حجمه يعطيه حضور بصري مهيمن يشكل النقطة البؤرية الرئيسية بأي تصميم. تفرعاته الرقيقة توفر ملاجئ لا تعد للأسماك الصغيرة والجمبري، ونباتات مثل الأنوبياس والموس تتعلق بيه وتكمل الصورة. يطلق تانين بسيط ما يلون الماي بشكل مبالغ. قطعة وحدة تحول الحوض من صندوق ماي لمشهد من غابات آسيا الاستوائية.",
    price: "4.62",
    thumbnail: `${IMG_BASE}/houyi-wood-products/spider-wood-lg.png`,
    specifications: {
      "النوع": "جذور الرودوديندرون الآسيوي (Spider Wood)",
      "الاسم التجاري": "Spider Wood / Azalea Root",
      "الحجم": "50-55 سم",
      "اللون": "بني داكن لأسود",
      "تأثيره على pH": "خفيف جداً",
      "يناسب": "أحواض كبيرة 90-150 سم، أكواسكيب احترافي",
      "التحضير": "نقع 5-10 أيام أو غلي لتسريع الإغراق",
      "تنبيه": "قد يطفو لأسبوعين — يحتاج تثبيت وثقل",
    },
  },
  // ──────────────────────────── جذر العنكبوت ────────────────────────────
  {
    id: "houyi-spider-wood-root",
    slug: "houyi-spider-wood-root",
    name: "جذر العنكبوت الضخم",
    brand: "Houyi",
    category: "decor",
    subcategory: "driftwood",
    description: "جذر الرودوديندرون الكبير — المادة الخام للتصميم الحقيقي. قسم جذري ضخم من نبات الأزاليا الآسيوي يمتد 30-45 سم ويزن 3 كيلو — يعطيك كتلة ثابتة تستقر بالگاع وما تطير. بعكس الأغصان الرفيعة، الجذر الكبير يوفر قاعدة واسعة تبني عليها كل التصميم. نسيجه الخشن ومساماته الكثيفة تستضيف بيوفيلم غني — غذاء طبيعي للجمبري يأكله باستمرار. هادا الجذر يبدأ منه الحوض — مو يضاف إليه.",
    price: "5.21",
    thumbnail: `${IMG_BASE}/houyi-wood-products/spider-wood-root.png`,
    specifications: {
      "النوع": "جذر رودوديندرون آسيوي (Rhododendron spp.)",
      "الحجم": "30-45 سم",
      "الوزن": "3 كيلوغرام",
      "تأثيره على pH": "خفيف جداً",
      "يناسب": "أحواض نباتات، أحواض جمبري، أكواسكيب",
      "التحضير": "نقع 3-7 أيام، غلي لتسريع الإغراق",
      "ملاحظة": "أثقل من الأغصان — يغرق بشكل أسرع",
    },
  },
  // ──────────────────────────── الصخر الأسود ────────────────────────────
  {
    id: "houyi-black-slate",
    slug: "houyi-black-slate",
    name: "ألواح الصخر الأسود",
    brand: "Houyi",
    category: "decor",
    subcategory: "rocks",
    description: "الأردواز الأسود — الحجر الكلاسيكي اللي ما تخطئه بأي حوض محترف. صخرة متحولة تشكلت ملايين السنين من ضغط الطين والرماد البركاني، وطلعت بهادا اللون الأسود العميق والبنية الشقائقية اللي تنقسم لألواح رفيعة براحة. خامل كيميائياً 100% — تتأكد بطريقة بسيطة: رش شوية خل عليه وشوف (لو ما في فقاعات = آمن). تكدر تكدسه وتشكله لكهوف وحوائط وسقالات تعطي حوضك عمق وطابع طبيعي كلش حلو. هادا الحجر يحچي بلغة الاحتراف.",
    price: "0.39",
    thumbnail: `${IMG_BASE}/houyi-black-slate/black-slate.png`,
    specifications: {
      "النوع": "صخرة متحوّلة (Metamorphic Rock)",
      "التركيب الجيولوجي": "طين مضغوط + رماد بركاني متحوّل",
      "اللون": "أسود داكن",
      "تأثيره على pH": "محايد تماماً",
      "اختبار السلامة": "يجتاز اختبار الخل (لا فوران = آمن)",
      "يناسب": "جميع أنواع أحواض الماي العذب",
      "وحدة البيع": "بالكيلوغرام",
      "التحضير": "شطف زين + غلي اختياري للتعقيم",
    },
  },
  // ──────────────────────────── خشب الغرق ────────────────────────────
  {
    id: "houyi-sinking-wood-large",
    slug: "houyi-sinking-wood-large",
    name: "خشب الغرق الثقيل المنتخب",
    brand: "Houyi",
    category: "decor",
    subcategory: "driftwood",
    description: "خشب الغرق المنتخب الكبير — الطرف الأول اللي تبني منه حوضك. قطعة خشب كبيرة مختارة بعناية لكثافتها العالية اللي تضمن الغرق التلقائي بدون أوزان أو تثبيت إضافي. قطعة وحدة تحدد قواعد اللعبة كلها — عليها تبني الحجارة، إليها تثبت النباتات، وتحتها تسكن الأسماك القاعية والبليكوستوموس اللي يحتاج الخشب بيولوجياً كجزء من أكله. يطلق تانين طبيعي يخفض pH تدريجياً ويمنح الماي الطابع الاستوائي. الحوض الزين يبدأ من خشبة زينة.",
    price: "2.90",
    thumbnail: `${IMG_BASE}/houyi-wood-products/sinking-wood.png`,
    specifications: {
      "النوع": "خشب استوائي كثيف منتخب",
      "الخاصية الرئيسية": "يغرق تلقائياً (Sinking Wood)",
      "اللون": "بني داكن",
      "تأثيره على pH": "يخفضه تدريجياً",
      "يناسب": "جميع أحواض الماي العذب، أحواض البليكو والكاتفيش",
      "وحدة البيع": "بالكيلوغرام",
      "التحضير": "شطف زين، جاهز للاستخدام شبه فوري",
    },
  },
  // ──────────────────────────── أغصان تايلاند ────────────────────────────
  {
    id: "houyi-thai-branches",
    slug: "houyi-thai-branches",
    name: "أغصان تايلاند المقشرة",
    brand: "Houyi",
    category: "decor",
    subcategory: "driftwood",
    description: "الأغصان التايلاندية المقشرة — الانتقال الحلو بين العشوائية الطبيعية والأناقة المصقولة. أغصان خشبية من غابات تايلاند انمشط قشرها الخارجي وطلع الخشب الداخلي بلونه الفاتح الدافئ ونسيجه الناعم المميز. القشر الممشوط يقلل إطلاق التانين ويعطي الماي نقاء أكثر من الأخشاب غير المعالجة — خوش لمن يريد الطابع الطبيعي بدون تلوين ماي الحوض. أغصانها المتعددة توفر مواقع لا تعد لتعليق النباتات والموس وتشكيل هياكل شجرية حلوة.",
    price: "11.50",
    thumbnail: `${IMG_BASE}/houyi-wood-products/thai-branches.png`,
    specifications: {
      "النوع": "أغصان خشبية تايلاندية مُقشَّرة",
      "اللون": "بيج فاتح لبني فاتح",
      "تأثيره على pH": "خفيف جداً",
      "يناسب": "أحواض نباتات فاتحة، أحواض موس، بيوتوب تايلاندي",
      "التحضير": "شطف زين + نقع 24-48 ساعة",
      "ملاحظة": "قد يطفو مبدئياً — نقع كافٍ يساعد على الغرق",
    },
  },
];

async function run() {
  console.log("🚀  إضافة منتجات الديكور الناقصة — اللهجة العراقية 2026...\n");
  let inserted = 0;
  let skipped = 0;

  for (const p of missingProducts) {
    try {
      // Check if already exists
      const exists = await db.execute(sql`SELECT id FROM products WHERE id = ${p.id}`);
      if ((exists as any).rows?.length > 0) {
        console.log(`  ⏭️   ${p.id}  (موجود بالفعل — تخطّي)`);
        skipped++;
        continue;
      }

      const specsJson = JSON.stringify(p.specifications);
      const imagesJson = JSON.stringify([p.thumbnail]);

      await db.execute(sql`
        INSERT INTO products (
          id, slug, name, brand, category, subcategory,
          description, price, currency,
          images, thumbnail,
          rating, review_count,
          stock, low_stock_threshold,
          is_new, is_best_seller, is_product_of_week,
          specifications, has_variants,
          created_at, updated_at
        ) VALUES (
          ${p.id},
          ${p.slug},
          ${p.name},
          ${p.brand},
          ${p.category},
          ${p.subcategory},
          ${p.description},
          ${p.price},
          'IQD',
          ${imagesJson}::jsonb,
          ${p.thumbnail},
          0,
          0,
          10,
          10,
          false,
          false,
          false,
          ${specsJson}::jsonb,
          false,
          NOW(),
          NOW()
        )
      `);

      console.log(`  ✅  ${p.id}  →  ${p.name}`);
      inserted++;
    } catch (err) {
      console.error(`  ❌  ${p.id}:`, (err as Error).message);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅  تم الإضافة: ${inserted} منتج`);
  console.log(`⏭️   تم التخطّي: ${skipped} (موجود بالفعل)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await pool.end();
}

run().catch((err) => {
  console.error("❌  خطأ عام:", err);
  process.exit(1);
});
