/**
 * CLEAN YEE IMPORT - Start from scratch
 * 1. Deletes ALL existing products
 * 2. Imports 65 YEE products from Excel
 * 3. Uses Arabic names from audit log recovery
 * 4. Maps images from local yee folders
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { neon } from '@neondatabase/serverless';

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// ============ ARABIC NAME MAPPING (from audit logs - user's manual edits) ============
const arabicData: Record<string, { name: string; description: string; category: string; subcategory: string; specs?: any }> = {
  'yee-3006': { name: 'YEE سخان ستيل المدرع - غير قابل للكسر', description: 'سخان ستيل عالي الجودة مقاوم للكسر. مصنوع من الستانلس ستيل المتين.\n\nمثالي للأحواض التي تحتاج تسخين آمن وموثوق.', category: 'التحكم بالحرارة', subcategory: 'سخانات' },
  'c4-1432': { name: 'YEE سخان كوارتز راديانت برو 100 واط - أداء موثوق | للأحواض 50-100 لتر', description: 'سخان كوارتز عالي الجودة بقدرة 100 واط.\n\nتحكم بدرجة الحرارة مع مقبض تعديل سهل الاستخدام.', category: 'التحكم بالحرارة', subcategory: 'سخانات' },
  'c4-1103': { name: 'YEE سخان الساموراي الأسود', description: 'سخان بتصميم أنيق أسود. أداء عالي وموثوق للأحواض المتوسطة.', category: 'التحكم بالحرارة', subcategory: 'سخانات' },
  'ytz-300': { name: 'YEE مضخة هواء صغيرة 3 واط - YTZ-300', description: 'مضخة هواء صغيرة وهادئة بقدرة 3 واط. مثالية للأحواض الصغيرة.', category: 'التهوية والأكسجين', subcategory: 'مضخات هواء' },
  'ygg-135': { name: 'YEE ناشر فقاعات معدني كروي', description: 'ناشر فقاعات كروي 50 ملم من المعدن. ينتج فقاعات دقيقة وناعمة لتوزيع أفضل للأوكسجين.', category: 'التهوية والأكسجين', subcategory: 'ملحقات التهوية' },
  'c5-1144': { name: 'YEE سيفون تغيير ماء - تنظيف سهل وسريع | 1.5 متر', description: 'سيفون لتغيير الماء وتنظيف الحصى. طول 1.5 متر مقوى.', category: 'الصيانة والتنظيف', subcategory: 'أدوات التنظيف' },
  'c4-1117': { name: 'YEE سخان لمستوى مياه منخفض 30 واط', description: 'سخان مصمم خصيصاً لمستويات المياه المنخفضة. قدرة 30 واط.', category: 'التحكم بالحرارة', subcategory: 'سخانات' },
  'c4-1008': { name: 'YEE صندوق العزل والولادة المعلق', description: 'صندوق عزل معلق للأسماك الحامل والمريضة. شفاف لسهولة المراقبة.', category: 'التفريخ والعزل', subcategory: 'صناديق عزل' },
  'ysl-506': { name: 'YEE حاضنة هوائية كبيرة (غرفتين)', description: 'حاضنة هوائية بغرفتين لتفريخ وعزل الأسماك الصغيرة.', category: 'التفريخ والعزل', subcategory: 'حاضنات' },
  'nyh-006': { name: 'YEE مادة ترشيح ثلاثية الأبعاد (3D كوكيز) | 500 غرام', description: 'مادة ترشيح بيولوجية بتصميم ثلاثي الأبعاد فريد على شكل كوكيز.\n\nالبنية المعقدة توفر مساحة سطح هائلة لنمو البكتيريا النافعة.', category: 'الفلترة والتنقية', subcategory: 'مواد الفلترة' },
  'ylc-410': { name: 'YEE مواد ترشيح 16 في 1 الاحترافية | 2.5 كغم', description: 'أشمل حزمة وسائط ترشيح - تجمع 16 نوعاً من مواد الترشيح في عبوة واحدة كبيرة.', category: 'الفلترة والتنقية', subcategory: 'مواد الفلترة' },
  'ylc-409': { name: 'YEE مواد ترشيح 6 في 1 - 500 جم', description: 'مجموعة مواد ترشيح متكاملة 6 في 1. تغطي الترشيح الميكانيكي والبيولوجي والكيميائي.', category: 'الفلترة والتنقية', subcategory: 'مواد الفلترة' },
  'c4-1067': { name: 'YEE مزيل الطبقة الزيتية 3 واط - سطح ماء كريستالي | للأحواض حتى 350 لتر', description: 'مزيل الطبقة الزيتية بتقنية الرأس العائم الذكي. يسحب الطبقة الزيتية من السطح.', category: 'الفلترة والتنقية', subcategory: 'ملحقات الفلترة' },
  'led-318': { name: 'YEE إضاءة LED كليب 3.5 واط - شمس صغيرة لحوضك', description: 'إضاءة LED عالية الجودة قابلة للتعديل بثلاثة أوضاع للون. مثالية للأحواض الصغيرة.', category: 'الإضاءة', subcategory: 'إضاءة LED' },
  'cls-107': { name: 'YEE المغناطيس الجبار (كبير) - وداعاً للطحالب العنيدة', description: 'فرشاة مغناطيسية قوية لتنظيف الطحالب من زجاج الحوض. تصميم كبير.', category: 'الصيانة والتنظيف', subcategory: 'أدوات التنظيف' },
  'c1-1113': { name: 'YEE علف أسماك الزينة الصغيرة 0.6 مم - 75 جم', description: 'علف متكامل للأسماك الصغيرة. حبيبات دقيقة 0.6 مم.', category: 'طعام الأسماك', subcategory: 'أعلاف عامة' },
  'c1-1127': { name: 'YEE طعام رانشو الذهبية - لنمو الرأس (Wen)', description: 'علف متخصص لأسماك الذهبية رانشو مع سبيرولينا. حبيبات 3.0 مم.', category: 'طعام الأسماك', subcategory: 'أعلاف الذهبية' },
  'c1-1073': { name: 'YEE علف سمك البيتا 0.8 مم - 130 جم', description: 'علف متخصص لأسماك البيتا (السيامي المقاتل). حبيبات 0.8 مم.', category: 'طعام الأسماك', subcategory: 'أعلاف متخصصة' },
  'c1-1082': { name: 'YEE علف أسماك الزينة الصغيرة متعدد الأحجام', description: 'علف عالي الجودة للأسماك الصغيرة. متوفر بأحجام مختلفة.', category: 'طعام الأسماك', subcategory: 'أعلاف عامة' },
  'c1-1065': { name: 'YEE علف سمك الفراشة 1.5 مم - 300 جم', description: 'علف متخصص لسمك الفراشة (البترفلاي كوي). حبيبات 1.5 مم.', category: 'طعام الأسماك', subcategory: 'أعلاف متخصصة' },
  'c1-1066': { name: 'YEE طعام روبيان الكريستال - لتعزيز الألوان والنمو 260 جم', description: 'غذاء متخصص عالي البروتين لروبيان الزينة. يعزز النمو واللون.', category: 'طعام الأسماك', subcategory: 'طعام الروبيان' },
  'yyy-078': { name: 'YEE بيض أرتيميا مقشر 80 جرام مع مغذي', description: 'بيض أرتيميا مقشر جاهز للتغذية. غني بالبروتين.', category: 'طعام الأسماك', subcategory: 'طعام حي ومجفف' },
  'c1-1125': { name: 'YEE طعام سرطان الناسك المجفف بالتبريد 55 جرام', description: 'طعام مجفف بالتبريد لسرطان الناسك. غني بالمغذيات.', category: 'طعام الأسماك', subcategory: 'أعلاف متخصصة' },
  'c1-1069': { name: 'YEE عبوة عينات أعلاف متنوعة', description: 'عبوة عينات تحتوي على مجموعة متنوعة من أعلاف الأسماك.', category: 'طعام الأسماك', subcategory: 'عبوات متنوعة' },
  'c1-1134': { name: 'YEE علف ذهبية رانشو غارق 500 جرام', description: 'علف غارق متخصص لأسماك رانشو الذهبية. حبيبات صغيرة 1.5 مم.', category: 'طعام الأسماك', subcategory: 'أعلاف الذهبية' },
  'c1-1086': { name: 'YEE روبيان ملحي مجفف قطع 18 جرام', description: 'روبيان ملحي مجفف بالتبريد. غني بالبروتين.', category: 'طعام الأسماك', subcategory: 'طعام حي ومجفف' },
  'c1-1124': { name: 'YEE علف بيتا 3 في 1 - 15 جم', description: 'علف متكامل 3 في 1 لأسماك البيتا. عبوة صغيرة مناسبة.', category: 'طعام الأسماك', subcategory: 'أعلاف متخصصة' },
  'yyh-125': { name: 'YEE علاج للبقع البيضاء (الإيك)', description: 'علاج فعال لمرض البقع البيضاء (الإيك) في أسماك الزينة.', category: 'معالجة المياه', subcategory: 'علاج الأمراض' },
  'yyh-207': { name: 'YEE محلول أزرق الميثيلين 600 مل', description: 'محلول أزرق الميثيلين لعلاج الأمراض الفطرية والبكتيرية.', category: 'معالجة المياه', subcategory: 'علاج الأمراض' },
  'yyh-006': { name: 'YEE مسحوق مضاد للبكتيريا 10 أكياس', description: 'مسحوق سريع الذوبان للتعقيم ومكافحة البكتيريا.', category: 'معالجة المياه', subcategory: 'علاج الأمراض' },
  'c2-1016': { name: 'YEE معالج الأمونيا مع البروبيوتيك النشط', description: 'معالج أمونيا فعال مع بكتيريا نافعة لتنقية الماء.', category: 'معالجة المياه', subcategory: 'معالجات المياه' },
  'yyh-173': { name: 'YEE مثبت المياه ومانع الإجهاد - راحة فورية للأسماك', description: 'مثبت مياه يزيل الكلور ويقلل الإجهاد على الأسماك.', category: 'معالجة المياه', subcategory: 'معالجات المياه' },
  'c3-1010': { name: 'YEE طقم اختبار الأمونيا والنيتريت', description: 'مجموعة اختبار دقيقة للأمونيا والنيتريت في ماء الحوض.', category: 'الفحص والمراقبة', subcategory: 'أدوات فحص المياه' },
  'c4-1123': { name: 'YEE شرائط اختبار 9 في 1 - مختبرك المنزلي', description: 'شرائط اختبار سريعة 9 في 1 لفحص جميع معايير المياه.', category: 'الفحص والمراقبة', subcategory: 'أدوات فحص المياه' },
  'c2-1005': { name: 'YEE كبسولات البكتيريا النافعة (50 مليار) - إحياء الماء', description: 'كبسولات بكتيريا نافعة مركزة لتنشيط الدورة البيولوجية.', category: 'معالجة المياه', subcategory: 'بكتيريا نافعة' },
  'yyh-039': { name: 'YEE مزيل الطحالب 500 مل', description: 'مزيل طحالب فعال وآمن للأسماك والنباتات.', category: 'معالجة المياه', subcategory: 'مكافحة الطحالب' },
  'yan-915': { name: 'YEE ملح متعدد الفيتامينات 500 جم', description: 'ملح أحواض غني بالفيتامينات والمعادن الأساسية.', category: 'معالجة المياه', subcategory: 'أملاح ومعادن' },
  'yyh-053': { name: 'YEE محلول أزرق الميثيلين الكلاسيكي', description: 'محلول أزرق الميثيلين الكلاسيكي لعلاج الأمراض.', category: 'معالجة المياه', subcategory: 'علاج الأمراض' },
  'yff-049': { name: 'YEE تربة النباتات المائية المطورة - أساس الغابة المائية', description: 'تربة مخصصة للنباتات المائية. غنية بالمغذيات.', category: 'التربة والديكور', subcategory: 'تربة نباتية' },
  'pyd-200': { name: 'YEE مزيل الترسبات لحوض السمك', description: 'مزيل ترسبات فعال لتنظيف زجاج الحوض من الرواسب الكلسية.', category: 'الصيانة والتنظيف', subcategory: 'منظفات' },
  'c5-1123': { name: 'YEE حوض البانوراما الطويل 60 سم - مع نظام فلترة مدمج', description: 'حوض بانوراما طويل بفلتر جانبي مدمج. مثالي لأسماك الجداول.', category: 'أحواض', subcategory: 'أحواض زجاجية' },
};

// ============ IMAGE FOLDER MAPPING ============
const imageMap: Record<string, string> = {
  '1.5.1.7': 'YEE-3006', '1.5.1.8': 'YEE-3006', '1.5.1.9': 'YEE-3006',
  '03326': 'yee-ytz-300', '07154': 'yee-ygg-135',
  'c5-1144': 'yee-reinforced-tube', '1.8.3.2': 'yee-reinforced-tube',
  '02517': 'yee-ysl-506', '02771': 'yee-acrylic-incubator-201010',
  '05617a': 'yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces',
  '07116': 'yee-nyh-006', '17699a': 'yee-high-energy-culture-bricks',
  '11578': 'yee-nyh-006', '71934': 'yee-ylc-410', '17831': 'yee-ylc-409',
  '08116': 'yee-led-318-light', '07140': 'yee-cls-107-magnetic-brush',
  '1.15.60': 'yee-reinforced-tube',
  '06255': 'YEE Ultra-Clear Glass Tank', '05380': 'YEE Ultra-Clear Glass Tank',
  '05381': 'YEE Ultra-Clear Glass Tank', '16932': 'YEE Ultra-Clear Glass Tank',
  '05662': 'YEE Ultra-Clear Glass Tank', 'c5-1062': 'YEE Ultra-Clear Glass Tank',
  'c1-1127': 'yee-c1-1127-ranchu-feed', 'c1-1066': 'yee-c1-1066-shrimp-food',
  '03446a': 'yee-yyy-078-brine-shrimp-eggs', 'c1-1069': 'yee-c1-1069-sample-pack',
  'c1-1134': 'yee-c1-1134-ranchu-sinking',
  '12420': 'yee-yyh-125', '19768a': 'yee-yyh-207',
  '02856a': 'yee-yyh-006-antibacterial',
  '02924': 'yee-yyh-173', '16940': 'yee-yyh-173',
  '19429': 'yee-yyh-039', '19939': 'yee-yyh-173',
  '06834': 'yee-yan-915', '01831': 'yee-yan-915',
  '02938a': 'yee-yyh-053',
  '07509': 'yee-yff-049', '07512': 'yee-yff-049',
  '13343': 'yee-pyd-200', '00340': 'yee-c4-1103',
};

// ============ MAIN ============
const yeeImagesDir = path.resolve(__dirname, "../client/public/images/products/yee");
const imageFolders = fs.readdirSync(yeeImagesDir).filter(f =>
  fs.statSync(path.join(yeeImagesDir, f)).isDirectory()
);

function getImages(folderName: string): string[] {
  const folderPath = path.join(yeeImagesDir, folderName);
  if (!fs.existsSync(folderPath)) return [];
  return fs.readdirSync(folderPath)
    .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map(f => `/images/products/yee/${folderName}/${f}`);
}

function findImages(pictureCode: string, model: string): string[] {
  const modelClean = model.toLowerCase().replace(/-\d+[a-z]?$/, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  
  // Try direct folder match
  for (const folder of imageFolders) {
    const fLower = folder.toLowerCase();
    if (fLower === `yee-${modelClean}` || (fLower.includes(modelClean) && modelClean.length >= 4)) {
      const imgs = getImages(folder);
      if (imgs.length > 0) return imgs;
    }
  }
  
  // Try special mapping
  const mapKey = pictureCode.toLowerCase().replace(/-\d+[a-z]?$/, '');
  const mapped = imageMap[mapKey] || imageMap[pictureCode.toLowerCase()];
  if (mapped) {
    const matchedFolder = imageFolders.find(f => f.toLowerCase() === mapped.toLowerCase());
    if (matchedFolder) return getImages(matchedFolder);
  }
  
  return ['/images/products/placeholder.jpg'];
}

function getArabicInfo(model: string): typeof arabicData[string] | null {
  const modelClean = model.toLowerCase().replace(/-\d+[a-z]?$/, '');
  return arabicData[modelClean] || null;
}

function slugify(str: string): string {
  return str.normalize("NFKD").replace(/[^\w\s-]/g, " ").trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

// Exchange rate
const USD_TO_IQD = 1480;

async function main() {
  console.log("=== YEE CLEAN IMPORT ===\n");

  // Step 1: Clear dependent tables then delete ALL products
  console.log("🗑️ Step 1: Clearing dependent tables...");
  await sql`DELETE FROM product_interactions`;
  await sql`DELETE FROM cart_items`;
  await sql`DELETE FROM favorites`;
  await sql`DELETE FROM product_views`;
  await sql`DELETE FROM product_embeddings`;
  await sql`DELETE FROM price_history`;
  await sql`DELETE FROM reviews`;
  await sql`DELETE FROM review_ratings`;
  console.log("   ✅ Dependent tables cleared");

  console.log("   🗑️ Deleting ALL products...");
  const deleted = await sql`DELETE FROM products RETURNING id`;
  console.log(`   ✅ Deleted ${deleted.length} products\n`);

  // Step 2: Read Excel
  const workbookPath2 = path.resolve(__dirname, "../客户伊拉克-Jaafar-1.5 (1).xlsx");
  const workbook2 = XLSX.readFile(workbookPath2, { cellDates: false });
  const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
  const range2 = XLSX.utils.decode_range(sheet2['!ref']);

  let successCount = 0;
  let errorCount = 0;

  for (let r = 9; r <= range2.e.r; r++) {
    const getCell = (c: number) => {
      const cell = sheet2[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v).trim() : '';
    };

    const itemNo = getCell(0);
    if (!itemNo || isNaN(Number(itemNo))) continue;

    const pictureCode = getCell(1);
    const model = getCell(2);
    const chineseName = getCell(3);
    const englishName = getCell(4);
    const priceUSD = parseFloat(getCell(5)) || 0;
    const qty = parseInt(getCell(6)) || 0;

    const arabic = getArabicInfo(model);
    const images = findImages(pictureCode || model, model);

    const productName = arabic?.name || `YEE ${englishName}`;
    const slug = slugify(model || englishName).substring(0, 80);
    const productId = `yee-${slug}`;
    const priceIQD = Math.round(priceUSD * USD_TO_IQD);

    try {
      await sql`
        INSERT INTO products (
          id, slug, name, brand, category, subcategory, description,
          price, currency, images, thumbnail, rating,
          review_count, stock, low_stock_threshold, is_new, is_best_seller,
          is_product_of_week, specifications, has_variants
        ) VALUES (
          ${productId},
          ${slug},
          ${productName},
          'YEE',
          ${arabic?.category || 'ملحقات ومستلزمات'},
          ${arabic?.subcategory || ''},
          ${arabic?.description || `${englishName} - منتج عالي الجودة من YEE`},
          ${priceIQD.toString()},
          'IQD',
          ${JSON.stringify(images)}::jsonb,
          ${images[0] || '/images/products/placeholder.jpg'},
          '0',
          0,
          ${qty},
          ${Math.max(1, Math.floor(qty / 3))},
          true,
          ${qty >= 15},
          false,
          ${JSON.stringify({ model, priceUSD, englishName, chineseName })}::jsonb,
          false
        )
      `;
      console.log(`✅ ${slug} - ${productName} ($${priceUSD} → ${priceIQD} IQD) [${images.length} imgs]`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ ${slug}: ${err.message.substring(0, 80)}`);
      errorCount++;
    }
  }

  // Summary
  const finalCount = await sql`SELECT count(*) as cnt FROM products`;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 YEE IMPORT SUMMARY`);
  console.log(`${"=".repeat(60)}`);
  console.log(`   ✅ Imported: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total products: ${finalCount[0].cnt}`);

  const cats = await sql`SELECT category, count(*) as cnt FROM products GROUP BY category ORDER BY cnt DESC`;
  console.log(`\n   📂 By Category:`);
  for (const c of cats) console.log(`      ${c.category}: ${c.cnt}`);
}

main().catch(console.error);
