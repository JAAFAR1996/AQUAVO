import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

const BASE = 'client/public/images/products';

// ================================================
// Step 1: Rename & organize image files
// ================================================
function renameImages() {
  console.log('📁 Step 1: Organizing images...\n');

  // --- SUNSUN Air Pump ---
  const sunsunDir = path.join(BASE, 'sunsun', 'sunsun-air-pump');
  fs.mkdirSync(sunsunDir, { recursive: true });
  
  const sunsunSrc = path.join(BASE, 'sunsun');
  const sunsunFiles = fs.readdirSync(sunsunSrc).filter(f => f.endsWith('.jpeg'));
  sunsunFiles.sort();
  sunsunFiles.forEach((file, i) => {
    const src = path.join(sunsunSrc, file);
    const dst = path.join(sunsunDir, `sunsun-air-pump-${i + 1}.jpeg`);
    fs.copyFileSync(src, dst);
    console.log(`  ✅ sunsun/${file} → sunsun-air-pump-${i + 1}.jpeg`);
  });

  // --- Air Stone ---
  const airStoneDir = path.join(BASE, 'general', 'general-air-stone');
  fs.mkdirSync(airStoneDir, { recursive: true });
  
  const airStoneSrc = path.join(BASE, 'general', 'Air-Stone');
  const airStoneFiles = fs.readdirSync(airStoneSrc).filter(f => f.endsWith('.jpeg'));
  airStoneFiles.sort();
  airStoneFiles.forEach((file, i) => {
    const src = path.join(airStoneSrc, file);
    const dst = path.join(airStoneDir, `general-air-stone-${i + 1}.jpeg`);
    fs.copyFileSync(src, dst);
    console.log(`  ✅ Air-Stone/${file} → general-air-stone-${i + 1}.jpeg`);
  });

  // --- Sponge Filter XY-180 ---
  const spongeDir = path.join(BASE, 'general', 'general-sponge-filter-xy180');
  fs.mkdirSync(spongeDir, { recursive: true });
  
  const spongeSrc = path.join(BASE, 'general', 'Sponge-Filter-XY180');
  const spongeFiles = fs.readdirSync(spongeSrc).filter(f => f.endsWith('.jpeg'));
  spongeFiles.sort();
  spongeFiles.forEach((file, i) => {
    const src = path.join(spongeSrc, file);
    const dst = path.join(spongeDir, `general-sponge-filter-xy180-${i + 1}.jpeg`);
    fs.copyFileSync(src, dst);
    console.log(`  ✅ Sponge-Filter/${file} → general-sponge-filter-xy180-${i + 1}.jpeg`);
  });

  console.log('');
}

// ================================================
// Step 2: Insert products into database
// ================================================
async function insertProducts() {
  console.log('🗄️ Step 2: Inserting products into database...\n');

  const products = [
    {
      id: 'sunsun-air-pump',
      slug: 'sunsun-air-pump',
      name: 'مضخة هواء SUNSUN — هادئة بمنفذين',
      brand: 'SUNSUN',
      category: 'التهوية والأكسجين',
      subcategory: 'air-pumps',
      description: `أداء احترافي بصمت استثنائي — مثالية للأحواض المزروعة وغرف النوم.

مضخة هواء SUNSUN بتصميم أنيق ومدمج بلون أبيض وأسود. مزوّدة بمنفذي هواء مستقلّين يتيحان تشغيل حجري فقاعات أو فلترين هوائيين في آن واحد.

تقنية عزل الاهتزازات المتقدمة تجعلها من أهدأ المضخات في فئتها. استهلاك كهربائي منخفض مع قوة ضخ كافية لأحواض تصل إلى 150 لتر.

ركّبها فوق مستوى سطح الماء أو استخدم صمام منع رجوع على كل خرطوم لحمايتها من ارتداد الماء عند انقطاع الكهرباء.`,
      price: '15000',
      currency: 'IQD',
      stock: 20,
      images: JSON.stringify([
        '/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-1.jpeg',
        '/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-2.jpeg'
      ]),
      thumbnail: '/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-1.jpeg',
      specifications: JSON.stringify({
        'العلامة التجارية': 'SUNSUN',
        'النوع': 'مضخة هواء كهربائية',
        'عدد المنافذ': '2',
        'مناسبة لـ': 'أحواض حتى 150 لتر',
        benefits: [
          'تصميم مدمج وأنيق — يندمج مع أي ديكور',
          'منفذا هواء مستقلّان — شغّل حجرين أو فلترين في وقت واحد',
          'تقنية عزل اهتزازات — صمت استثنائي',
          'استهلاك كهربائي منخفض — وفّر في فاتورة الكهرباء',
        ],
        usageInstructions: [
          'وصّل خراطيم الهواء بالمنفذين',
          'ركّب صمام منع رجوع على كل خرطوم',
          'ضعها فوق مستوى سطح الماء أو على رف مرتفع',
          'شغّلها واضبط التدفّق حسب الحاجة',
        ],
        safetyWarnings: [
          'لا تغمرها في الماء — مصمّمة للعمل خارج الحوض',
          'استخدم صمام منع رجوع لحماية المضخة من ارتداد الماء',
          'ضعها في مكان جيد التهوية لمنع ارتفاع حرارتها',
        ],
      }),
    },
    {
      id: 'general-air-stone',
      slug: 'general-air-stone',
      name: 'حجر هواء أسطواني — أحجام متعددة',
      brand: 'General',
      category: 'التهوية والأكسجين',
      subcategory: 'air-stones',
      description: `فقاعات متساوية ومنتظمة تُحسّن الأكسجين وتُضفي جمالاً على الحوض.

حجر هواء أسطواني مصنوع من مادة مسامية عالية الجودة تُحوّل تيار الهواء من المضخة إلى آلاف الفقاعات الدقيقة الموزّعة بالتساوي. كلّما كانت الفقاعات أصغر وأكثر انتظاماً، زاد انحلال الأكسجين في الماء.

متوفر بخمسة أحجام لتناسب جميع أنواع الأحواض — من الأحواض الصغيرة إلى البرك الكبيرة. اللون الأزرق الكلاسيكي يندمج بشكل طبيعي مع ديكور الحوض.

وصّله بخرطوم هواء 4 مم وثبّته في القاع بماصة شفط. إذا ضعف إنتاج الفقاعات مع مرور الوقت، انقعه في محلول خل أبيض لمدة ساعة ثم اشطفه لإزالة الترسّبات.`,
      price: '1000',
      currency: 'IQD',
      stock: 50,
      images: JSON.stringify([
        '/images/products/general/general-air-stone/general-air-stone-1.jpeg',
        '/images/products/general/general-air-stone/general-air-stone-2.jpeg'
      ]),
      thumbnail: '/images/products/general/general-air-stone/general-air-stone-1.jpeg',
      specifications: JSON.stringify({
        'النوع': 'حجر هواء أسطواني',
        'المادة': 'مادة مسامية عالية الكثافة',
        'قطر الخرطوم': '4 مم',
        'الألوان': 'أزرق',
        benefits: [
          'فقاعات دقيقة ومنتظمة — أكسجين أفضل',
          'متوفر بأحجام متعددة — من الصغير للكبير',
          'سعر اقتصادي — قابل للاستبدال بسهولة',
          'يعمل مع أي مضخة هواء — توافق كامل',
        ],
        usageInstructions: [
          'وصّل الخرطوم بمنفذ المضخة والطرف الآخر بالحجر',
          'اغمر الحجر بالكامل في القاع',
          'ثبّته بماصة شفط أو ادفنه جزئياً بالحصى',
          'استبدله كل 3-6 أشهر عندما يضعف الأداء',
        ],
        safetyWarnings: [
          'تأكد من إحكام التوصيل لمنع تسرّب الهواء',
          'استخدم صمام منع رجوع على الخرطوم لحماية المضخة',
        ],
      }),
    },
    {
      id: 'general-sponge-filter-xy180',
      slug: 'general-sponge-filter-xy180',
      name: 'فلتر إسفنجي هوائي XY-180 — ترشيح مزدوج',
      brand: 'General',
      category: 'الفلترة والتنقية',
      subcategory: 'sponge-filters',
      description: `الفلتر الأكثر أماناً لأحواض التفريخ والروبيان — ترشيح بيولوجي وميكانيكي بدون مخاطر.

فلتر إسفنجي هوائي طراز XY-180 يعمل بمضخة الهواء عبر نظام الرفع الهوائي (Airlift). الإسفنج الأسود كثيف المسام يوفّر ترشيحاً ميكانيكياً لاحتجاز المخلفات، ومساحة سطحية ضخمة لاستعمار البكتيريا النافعة.

الميزة الأهم: لا يسحب الأسماك الصغيرة أو صغار الروبيان — على عكس الفلاتر الكهربائية التي تشكّل خطراً حقيقياً على الكائنات الصغيرة. هذا ما يجعله الخيار الأول لأحواض التفريخ والعزل.

يحتاج مضخة هواء منفصلة (غير مرفقة). اغسل الإسفنج بماء الحوض القديم فقط — وليس ماء الصنبور — كل أسبوعين للحفاظ على البكتيريا النافعة.`,
      price: '3000',
      currency: 'IQD',
      stock: 30,
      images: JSON.stringify([
        '/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-1.jpeg',
        '/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-2.jpeg'
      ]),
      thumbnail: '/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-1.jpeg',
      specifications: JSON.stringify({
        'الطراز': 'XY-180',
        'النوع': 'فلتر إسفنجي هوائي',
        'نوع الترشيح': 'بيولوجي + ميكانيكي',
        'يحتاج': 'مضخة هواء (غير مرفقة)',
        'مناسب لـ': 'أحواض التفريخ، أحواض الروبيان، أحواض العزل',
        benefits: [
          'آمن تماماً — لا يسحب الصغار أو الروبيان',
          'ترشيح مزدوج — ميكانيكي وبيولوجي في وحدة واحدة',
          'عمر افتراضي طويل — الإسفنج يُغسل ويُعاد استخدامه',
          'تشغيل هادئ — يعمل بمضخة الهواء فقط',
          'اقتصادي — سعر منخفض وصيانة بسيطة',
        ],
        usageInstructions: [
          'وصّل خرطوم الهواء من المضخة إلى أنبوب الرفع',
          'اغمر الفلتر بالكامل في القاع',
          'شغّل المضخة وتأكد من ظهور الفقاعات',
          'اغسل الإسفنج بماء الحوض القديم كل أسبوعين',
          'استبدل الإسفنج كل 6-12 شهراً عندما يفقد مرونته',
        ],
        safetyWarnings: [
          'لا تغسل الإسفنج بماء الصنبور — الكلور يقتل البكتيريا',
          'لا تعصر الإسفنج بقوة — اضغط برفق فقط',
          'تأكد من ثبات القاعدة لمنع سقوطه وإزعاج الأسماك',
        ],
      }),
    },
  ];

  for (const p of products) {
    try {
      await sql`
        INSERT INTO products (id, slug, name, brand, category, subcategory, description, price, currency, stock, images, thumbnail, specifications, is_new, created_at, updated_at)
        VALUES (${p.id}, ${p.slug}, ${p.name}, ${p.brand}, ${p.category}, ${p.subcategory}, ${p.description}, ${p.price}, ${p.currency}, ${p.stock}, ${p.images}::jsonb, ${p.thumbnail}, ${p.specifications}::jsonb, true, NOW(), NOW())
      `;
      console.log(`  ✅ ${p.slug} — ${p.name}`);
    } catch (err) {
      console.error(`  ❌ ${p.slug} — ${err.message}`);
    }
  }
}

// Run
renameImages();
await insertProducts();

// Verify
console.log('\n🔍 Verification:');
const check = await sql`SELECT slug, name, brand, thumbnail FROM products WHERE slug IN ('sunsun-air-pump', 'general-air-stone', 'general-sponge-filter-xy180')`;
for (const p of check) {
  console.log(`  ✅ [${p.brand}] ${p.name} → ${p.thumbnail}`);
}
console.log(`\n📊 Total active products: ${(await sql`SELECT COUNT(*) as c FROM products WHERE deleted_at IS NULL`)[0].c}`);
