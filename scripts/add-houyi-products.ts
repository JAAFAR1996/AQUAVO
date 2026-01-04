/**
 * Script to add missing Houyi products to database
 * Run with: npx tsx scripts/add-houyi-products.ts
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as fs from "fs";
import * as path from "path";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const HOUYI_FOLDER = './client/public/images/products/houyi';

// Helper to get images from folder
function getImages(folderName: string): string[] {
    const folderPath = path.join(HOUYI_FOLDER, folderName);
    try {
        if (!fs.existsSync(folderPath)) return [];
        const files = fs.readdirSync(folderPath);
        return files
            .filter(f => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(f))
            .map(f => `/images/products/houyi/${encodeURIComponent(folderName)}/${f}`);
    } catch {
        return [];
    }
}

// Get category ID
async function getCategoryId(categoryName: string): Promise<string | null> {
    const result = await db.execute(sql`
    SELECT id FROM categories WHERE name = ${categoryName} LIMIT 1
  `);
    return result.rows[0]?.id as string || null;
}

interface ProductData {
    id: string;
    slug: string;
    name: string;
    category: string;
    subcategory: string;
    description: string;
    price: number;
    stock: number;
    imageFolder: string;
    variants?: any[];
    hasVariants?: boolean;
}

// Products to add
const productsToAdd: ProductData[] = [
    // === Tools ===
    {
        id: 'houyi-koi-fish-net',
        slug: 'houyi-koi-fish-net',
        name: 'شبكة صيد كوي ألمنيوم قابلة للسحب',
        category: 'tools',
        subcategory: 'fishing-nets',
        description: 'شبكة صيد كوي من سبائك الألمنيوم عالية الجودة، قابلة للسحب والتعديل، مثالية لأحواض الكوي والأسماك الكبيرة.',
        price: 5000,
        stock: 10,
        imageFolder: 'Aquarium Fish Tank Stainless Steel Telescopic Square Fishnet Three-section Fishing Net  MEDIAM',
    },
    {
        id: 'houyi-nylon-fishing-net',
        slug: 'houyi-nylon-fishing-net',
        name: 'شبكة صيد نايلون صغيرة',
        category: 'tools',
        subcategory: 'fishing-nets',
        description: 'شبكة صيد نايلون عالية الجودة للأسماك الصغيرة والمتوسطة.',
        price: 500,
        stock: 20,
        imageFolder: 'small Wholesale Aquarium Special Nylon Fishing Net',
    },
    {
        id: 'houyi-telescopic-fishnet',
        slug: 'houyi-telescopic-fishnet',
        name: 'شبكة صيد تلسكوبية ستانلس ستيل',
        category: 'tools',
        subcategory: 'fishing-nets',
        description: 'شبكة صيد من الستانلس ستيل مع عصا تلسكوبية ثلاثية الأقسام، طول 66-107 سم.',
        price: 1000,
        stock: 15,
        imageFolder: 'Aquarium Fish Tank Stainless Steel Telescopic Square Fishnet Three-section Fishing Net  MEDIAM',
    },
    {
        id: 'houyi-5-in-1-cleaning-tool',
        slug: 'houyi-5-in-1-cleaning-tool',
        name: 'أداة تنظيف 5 في 1',
        category: 'tools',
        subcategory: 'cleaning',
        description: 'مجموعة أدوات تنظيف 5 في 1 تشمل: شبكة صيد، مكشطة، سكين طحالب، ملقط نباتات.',
        price: 2000,
        stock: 15,
        imageFolder: 'Aquarium Fish Tank Five-in-one Cleaning Tool Fish Net Scraper Algae Knife Aquatic Clip',
    },
    {
        id: 'houyi-water-changer-siphon',
        slug: 'houyi-water-changer-siphon',
        name: 'سيفون تغيير مياه 3 في 1',
        category: 'tools',
        subcategory: 'cleaning',
        description: 'سيفون تغيير مياه سريع 3 في 1 مع مرشح حصى، طول 1.9 متر.',
        price: 1200,
        stock: 20,
        imageFolder: 'Aquarium Fish Tank Five-in-one Cleaning Tool Fish Net Scraper Algae Knife Aquatic Clip',
    },
    // === Thermometers ===
    {
        id: 'houyi-chubby-thermometer',
        slug: 'houyi-chubby-thermometer',
        name: 'ترمومتر بدين للحوض',
        category: 'measurement',
        subcategory: 'thermometers',
        description: 'ترمومتر حوض سمك سهل القراءة بتصميم بدين مميز.',
        price: 250,
        stock: 30,
        imageFolder: 'Chubby thermometer',
    },
    {
        id: 'houyi-suction-thermometer',
        slug: 'houyi-suction-thermometer',
        name: 'ترمومتر بماصة شفط',
        category: 'measurement',
        subcategory: 'thermometers',
        description: 'ترمومتر حوض سمك مع ماصة شفط للتثبيت على الزجاج.',
        price: 250,
        stock: 40,
        imageFolder: 'Suction cup thermometer',
    },
    // === Filters ===
    {
        id: 'houyi-dophin-skimmer',
        slug: 'houyi-dophin-electric-skimmer',
        name: 'DoPhin سكيمر كهربائي',
        category: 'filters',
        subcategory: 'skimmers',
        description: 'سكيمر كهربائي من DoPhin لإزالة الأغشية الزيتية من سطح الماء.',
        price: 4000,
        stock: 10,
        imageFolder: 'DoPhin Electric Skimmer',
    },
    // === Substrates ===
    {
        id: 'houyi-pumice',
        slug: 'houyi-pumice',
        name: 'حجر خفاف 3-6 ملم',
        category: 'substrates',
        subcategory: 'decorative',
        description: 'حجر خفاف طبيعي بحجم 3-6 ملم للديكور والترشيح البيولوجي.',
        price: 250,
        stock: 30,
        imageFolder: 'Pumice Small bag3-6mm',
    },
    {
        id: 'houyi-river-sand',
        slug: 'houyi-river-sand',
        name: 'رمل نهري ناعم 1-2 ملم',
        category: 'substrates',
        subcategory: 'sand',
        description: 'رمل نهري ناعم طبيعي بحجم 1-2 ملم، مثالي للنباتات.',
        price: 500,
        stock: 50,
        imageFolder: 'River sand 1-2mm',
    },
    {
        id: 'houyi-stream-sand',
        slug: 'houyi-stream-sand',
        name: 'رمل جداول 2-6 ملم',
        category: 'substrates',
        subcategory: 'sand',
        description: 'رمل جداول طبيعي لا يحتاج غسيل، بحجم 2-6 ملم.',
        price: 500,
        stock: 40,
        imageFolder: 'stream sand',
    },
    {
        id: 'houyi-south-american-sand',
        slug: 'houyi-south-american-sand',
        name: 'رمل أمريكي جنوبي 1-2 ملم',
        category: 'substrates',
        subcategory: 'sand',
        description: 'رمل أمريكي جنوبي جديد بحجم 1-2 ملم.',
        price: 500,
        stock: 30,
        imageFolder: 'South American Sands  BLACK & RED',
    },
    {
        id: 'houyi-white-sand',
        slug: 'houyi-white-sand',
        name: 'رمل أبيض',
        category: 'substrates',
        subcategory: 'sand',
        description: 'رمل أبيض طبيعي لديكور الأحواض.',
        price: 300,
        stock: 30,
        imageFolder: 'White sand',
    },
    {
        id: 'houyi-dutch-sand',
        slug: 'houyi-dutch-sand',
        name: 'رمل هولندي 1-2 ملم',
        category: 'substrates',
        subcategory: 'sand',
        description: 'رمل هولندي عالي الجودة بحجم 1-2 ملم.',
        price: 500,
        stock: 20,
        imageFolder: 'Dutch Sand',
    },
    // === Rocks ===
    {
        id: 'houyi-blue-dragon-stone',
        slug: 'houyi-blue-dragon-stone',
        name: 'حجر التنين الأزرق',
        category: 'decor',
        subcategory: 'rocks',
        description: 'حجر التنين الأزرق الطبيعي للمناظر الطبيعية.',
        price: 500,
        stock: 20,
        imageFolder: 'Blue Dragon – flake',
    },
    {
        id: 'houyi-volcanic-stone',
        slug: 'houyi-volcanic-stone',
        name: 'حجر بركاني 3-5 سم',
        category: 'decor',
        subcategory: 'rocks',
        description: 'حجر بركاني طبيعي للديكور والترشيح.',
        price: 300,
        stock: 50,
        imageFolder: 'Volcanic black & RED 3–5cm',
        variants: [
            { id: 'black', label: 'أسود', price: 300, stock: 25, isDefault: true },
            { id: 'red', label: 'أحمر', price: 300, stock: 25 },
        ],
        hasVariants: true,
    },
    {
        id: 'houyi-planting-ring',
        slug: 'houyi-planting-ring',
        name: 'حلقة زراعة 52×26 ملم',
        category: 'decor',
        subcategory: 'accessories',
        description: 'حلقة زراعة من الحجر البركاني بشكل باغودا.',
        price: 50,
        stock: 100,
        imageFolder: 'Planting ring 52×26mm',
    },
    // === Glue & Adhesives ===
    {
        id: 'houyi-moss-glue',
        slug: 'houyi-moss-glue',
        name: 'غراء موس',
        category: 'accessories',
        subcategory: 'glue',
        description: 'غراء آمن للأحواض لتثبيت الموس والنباتات.',
        price: 500,
        stock: 80,
        imageFolder: 'Moss glue 5g green&White Moss Glue 20g White& glue White 50g',
        variants: [
            { id: '5g-green', label: '5 جرام أخضر', price: 500, stock: 40, isDefault: true },
            { id: '20g-white', label: '20 جرام أبيض', price: 2500, stock: 40 },
        ],
        hasVariants: true,
    },
    {
        id: 'houyi-silicone-121',
        slug: 'houyi-silicone-121',
        name: 'سيليكون خاص للأحواض 121',
        category: 'accessories',
        subcategory: 'glue',
        description: 'سيليكون خاص للأحواض آمن للأسماك.',
        price: 6000,
        stock: 10,
        imageFolder: 'Silicone 121',
    },
    {
        id: 'houyi-foam-glue',
        slug: 'houyi-foam-glue',
        name: 'غراء فوم لون خشب 900 جرام',
        category: 'accessories',
        subcategory: 'glue',
        description: 'غراء فوم بلون الخشب للمناظر الطبيعية.',
        price: 45000,
        stock: 5,
        imageFolder: 'Foam Glue',
    },
    // === Filter Media ===
    {
        id: 'houyi-ceramic-ring',
        slug: 'houyi-ceramic-ring',
        name: 'حلقات سيراميك للترشيح',
        category: 'filters',
        subcategory: 'media',
        description: 'حلقات سيراميك عالية الجودة للترشيح البيولوجي.',
        price: 600,
        stock: 30,
        imageFolder: 'Ceramic ring',
    },
    {
        id: 'houyi-breathing-ring',
        slug: 'houyi-breathing-ring',
        name: 'حلقات تنفس بيضاء',
        category: 'filters',
        subcategory: 'media',
        description: 'حلقات تنفس بيضاء للترشيح البيولوجي المتقدم.',
        price: 1000,
        stock: 25,
        imageFolder: 'Breathing ring – white',
    },
    {
        id: 'houyi-activated-carbon',
        slug: 'houyi-activated-carbon',
        name: 'كربون منشط',
        category: 'filters',
        subcategory: 'media',
        description: 'كربون منشط لإزالة السموم والروائح من الماء.',
        price: 700,
        stock: 30,
        imageFolder: 'Activated carbon',
    },
    {
        id: 'houyi-white-cotton',
        slug: 'houyi-white-cotton',
        name: 'قطن أبيض للفلتر 30×50×2.5',
        category: 'filters',
        subcategory: 'media',
        description: 'قطن أبيض للترشيح الميكانيكي بقياس 30×50×2.5 سم.',
        price: 350,
        stock: 40,
        imageFolder: 'White cotton 30×50×2.5',
    },
    {
        id: 'houyi-terminalia-leaves',
        slug: 'houyi-terminalia-leaves',
        name: 'أوراق الترمنالية',
        category: 'accessories',
        subcategory: 'natural',
        description: 'أوراق الترمنالية الطبيعية لتحسين جودة المياه.',
        price: 50,
        stock: 80,
        imageFolder: 'Terminalia Leaves',
    },
    // === Air Pump Accessories ===
    {
        id: 'houyi-check-valve',
        slug: 'houyi-check-valve',
        name: 'صمام عدم رجوع دائري أحمر',
        category: 'air-pumps',
        subcategory: 'accessories',
        description: 'صمام عدم رجوع لمنع تسرب الماء للمضخة.',
        price: 50,
        stock: 60,
        imageFolder: 'Check valve round red',
    },
    {
        id: 'houyi-stainless-shunt',
        slug: 'houyi-stainless-shunt',
        name: 'موزع هواء ستانلس ستيل',
        category: 'air-pumps',
        subcategory: 'distributors',
        description: 'موزع هواء من الستانلس ستيل عالي الجودة.',
        price: 3500,
        stock: 20,
        imageFolder: 'Stainless steel shunt 4 & 6',
        variants: [
            { id: '4-port', label: '4 منافذ', price: 3500, stock: 10, isDefault: true },
            { id: '6-port', label: '6 منافذ', price: 5000, stock: 10 },
        ],
        hasVariants: true,
    },
    {
        id: 'houyi-tracheal-suction',
        slug: 'houyi-tracheal-suction',
        name: 'ماصة شفط للخراطيم',
        category: 'air-pumps',
        subcategory: 'accessories',
        description: 'ماصة شفط لتثبيت خراطيم الهواء.',
        price: 30,
        stock: 100,
        imageFolder: 'Tracheal suction cup',
    },
    {
        id: 'houyi-hose-brush',
        slug: 'houyi-hose-brush',
        name: 'فرشاة خراطيم 1.55 متر',
        category: 'tools',
        subcategory: 'cleaning',
        description: 'فرشاة تنظيف خراطيم بطول 1.55 متر مع رأسين.',
        price: 2000,
        stock: 20,
        imageFolder: '1.55m double-ended spring brush (blue)Hose brush',
    },
    {
        id: 'houyi-mesh',
        slug: 'houyi-mesh',
        name: 'شبكة 8×8 سم',
        category: 'accessories',
        subcategory: 'mesh',
        description: 'شبكة فلتر 8×8 سم.',
        price: 100,
        stock: 100,
        imageFolder: 'Mesh 8cm',
    },
    {
        id: 'houyi-net-bag',
        slug: 'houyi-net-bag',
        name: 'أكياس شبك للفلتر',
        category: 'filters',
        subcategory: 'media',
        description: 'أكياس شبك لوضع مواد الترشيح.',
        price: 350,
        stock: 120,
        imageFolder: 'Net bag BLACK & WHITE',
        variants: [
            { id: 'black-15x20', label: 'أسود 15×20', price: 350, stock: 20 },
            { id: 'black-20x30', label: 'أسود 20×30', price: 450, stock: 20 },
            { id: 'black-30x40', label: 'أسود 30×40', price: 550, stock: 20, isDefault: true },
            { id: 'white-15x20', label: 'أبيض 15×20', price: 350, stock: 20 },
            { id: 'white-20x30', label: 'أبيض 20×30', price: 450, stock: 20 },
            { id: 'white-30x40', label: 'أبيض 30×40', price: 550, stock: 20 },
        ],
        hasVariants: true,
    },
    {
        id: 'houyi-moss-line',
        slug: 'houyi-moss-line',
        name: 'خيط موس',
        category: 'accessories',
        subcategory: 'planting',
        description: 'خيط لتثبيت الموس على الأخشاب والصخور.',
        price: 200,
        stock: 80,
        imageFolder: 'Moss Line',
    },
    {
        id: 'houyi-cleaning-towel',
        slug: 'houyi-cleaning-towel',
        name: 'منشفة تنظيف الحوض',
        category: 'tools',
        subcategory: 'cleaning',
        description: 'منشفة خاصة لتنظيف أحواض السمك.',
        price: 600,
        stock: 40,
        imageFolder: 'fish tank cleaning towel',
    },
    {
        id: 'houyi-oxygenation-tube',
        slug: 'houyi-oxygenation-tube',
        name: 'أنبوب أكسجين ملون',
        category: 'air-pumps',
        subcategory: 'tubes',
        description: 'أنبوب أكسجين ملون عالي الجودة.',
        price: 1200,
        stock: 40,
        imageFolder: 'Color oxygenation tube  4M 5 PIC BLACK   5 PIC WHITE',
        variants: [
            { id: '4m-black', label: '4 متر أسود', price: 1200, stock: 10, isDefault: true },
            { id: '4m-white', label: '4 متر أبيض', price: 1200, stock: 10 },
            { id: '100m-black', label: '100 متر أسود', price: 12000, stock: 5 },
            { id: '100m-white', label: '100 متر أبيض', price: 12000, stock: 5 },
        ],
        hasVariants: true,
    },
    {
        id: 'houyi-hose-clamp',
        slug: 'houyi-hose-clamp',
        name: 'مشبك خراطيم أزرق',
        category: 'air-pumps',
        subcategory: 'accessories',
        description: 'مشبك خراطيم أزرق مع تغليف.',
        price: 500,
        stock: 40,
        imageFolder: 'Hose clamp    With packaging-blue',
    },
    {
        id: 'houyi-sucker-buckle',
        slug: 'houyi-sucker-buckle',
        name: 'ماصة شفط بإبزيم',
        category: 'accessories',
        subcategory: 'suction',
        description: 'ماصة شفط مع إبزيم للتثبيت.',
        price: 30,
        stock: 100,
        imageFolder: 'Tracheal suction cup',
    },
    {
        id: 'houyi-acrylic-pump-compartment',
        slug: 'houyi-acrylic-pump-compartment',
        name: 'حجرة مضخة أكريليك',
        category: 'accessories',
        subcategory: 'compartments',
        description: 'حجرة مضخة أكريليك جديدة قابلة للتوصيل.',
        price: 3000,
        stock: 20,
        imageFolder: 'Acrylic tool rack',
    },
    {
        id: 'houyi-acrylic-tool-rack',
        slug: 'houyi-acrylic-tool-rack',
        name: 'رف أدوات أكريليك',
        category: 'accessories',
        subcategory: 'storage',
        description: 'رف أدوات أكريليك لتنظيم أدوات الحوض.',
        price: 1000,
        stock: 20,
        imageFolder: 'Acrylic tool rack',
    },
    {
        id: 'houyi-gauze-isolation-net',
        slug: 'houyi-gauze-isolation-net',
        name: 'شبكة عزل شاش كبيرة',
        category: 'accessories',
        subcategory: 'isolation',
        description: 'شبكة عزل شاش كبيرة لفصل الأسماك.',
        price: 1200,
        stock: 20,
        imageFolder: 'Gauze isolation net',
    },
    {
        id: 'houyi-fat-injection',
        slug: 'houyi-fat-injection',
        name: 'محقنة تسميد',
        category: 'accessories',
        subcategory: 'fertilizer',
        description: 'محقنة لتسميد النباتات المائية.',
        price: 1800,
        stock: 20,
        imageFolder: 'Fat injection',
    },
    {
        id: 'houyi-feeding-cup',
        slug: 'houyi-feeding-cup',
        name: 'كوب تغذية',
        category: 'accessories',
        subcategory: 'feeding',
        description: 'كوب تغذية لأسماك الحوض.',
        price: 100,
        stock: 40,
        imageFolder: 'Feeding cup GREEN & WHITE',
        variants: [
            { id: 'green', label: 'أخضر', price: 100, stock: 20, isDefault: true },
            { id: 'white', label: 'أبيض', price: 100, stock: 20 },
        ],
        hasVariants: true,
    },
    {
        id: 'houyi-tool-kit',
        slug: 'houyi-tool-kit',
        name: 'طقم أدوات احترافي',
        category: 'tools',
        subcategory: 'kits',
        description: 'طقم أدوات احترافي يشمل: ملقط مستقيم 27سم، ملقط منحني 27سم، مقص مستقيم 24.5سم، مقص منحني 24.5سم، مجرفة رمل 31سم.',
        price: 12000,
        stock: 10,
        imageFolder: 'Acrylic tool rack',
    },
    {
        id: 'houyi-wave-pump',
        slug: 'houyi-wave-pump',
        name: 'مضخة موجات Songbao WP-50M',
        category: 'pumps',
        subcategory: 'wave',
        description: 'مضخة موجات Songbao موديل WP-50M.',
        price: 5500,
        stock: 10,
        imageFolder: 'DoPhin Electric Skimmer',
    },
    {
        id: 'houyi-inflatable-fish-bag',
        slug: 'houyi-inflatable-fish-bag',
        name: 'أكياس نقل سمك قابلة للنفخ',
        category: 'accessories',
        subcategory: 'transport',
        description: '100 قطعة أكياس نقل سمك 20×30×16.',
        price: 9000,
        stock: 5,
        imageFolder: 'Gauze isolation net',
    },
];

async function main() {
    console.log('=== Adding Missing Houyi Products ===\n');

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of productsToAdd) {
        try {
            // Check if product exists
            const existing = await db.execute(sql`
        SELECT id FROM products WHERE id = ${product.id} LIMIT 1
      `);

            if (existing.rows.length > 0) {
                console.log(`⏭️ SKIP: ${product.id} already exists`);
                skipped++;
                continue;
            }

            // Get images
            const images = getImages(product.imageFolder);
            const thumbnail = images[0] || '/images/placeholder.jpg';

            // Insert product
            await db.execute(sql`
        INSERT INTO products (
          id, slug, name, brand, category, subcategory, description,
          price, currency, images, thumbnail, stock, rating, review_count,
          is_new, is_best_seller, specifications, variants, has_variants,
          created_at, updated_at
        ) VALUES (
          ${product.id},
          ${product.slug},
          ${product.name},
          'Houyi',
          ${product.category},
          ${product.subcategory},
          ${product.description},
          ${product.price},
          'IQD',
          ${JSON.stringify(images)}::jsonb,
          ${thumbnail},
          ${product.stock},
          0,
          0,
          false,
          false,
          '{}'::jsonb,
          ${product.variants ? JSON.stringify(product.variants) : null}::jsonb,
          ${product.hasVariants || false},
          NOW(),
          NOW()
        )
      `);

            console.log(`✅ ADDED: ${product.id} (${images.length} images)`);
            added++;

        } catch (err: any) {
            console.error(`❌ ERROR: ${product.id} - ${err.message}`);
            errors++;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Added: ${added}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    // Get final count
    const count = await db.execute(sql`SELECT COUNT(*) as count FROM products WHERE brand = 'Houyi'`);
    console.log(`\nTotal Houyi products in DB: ${count.rows[0]?.count}`);

    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
