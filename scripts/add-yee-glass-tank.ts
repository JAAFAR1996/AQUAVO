import { getDb } from '../server/db.js';
import { products as productsTable, type ProductVariant } from '../shared/schema.js';

// التحويل: 1 USD = 1310 IQD
const USD_TO_IQD = 1310;

// وظيفة لإنشاء slug
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// الدالة الرئيسية
async function addYEEGlassTank() {
    console.log('🚀 Starting YEE Ultra-Clear Glass Tank import...\n');

    // الحصول على قاعدة البيانات
    const db = getDb();
    if (!db) {
        console.error('❌ Database not configured!');
        return;
    }

    const productName = 'YEE حوض سمك زجاجي فائق الصفاء';
    const slug = 'yee-ultra-clear-glass-tank';
    const id = `yee-${slug}`;

    // تعريف الأحجام المختلفة مع الأسعار (تقديرية بناءً على الحجم)
    const variants: ProductVariant[] = [
        {
            id: '35x35x35-6mm',
            label: '35×35×35 سم - 6 ملم سماكة',
            price: Math.round(25 * USD_TO_IQD), // ~32,750 IQD
            stock: 10,
            sku: 'YEE-TANK-35-6MM',
            isDefault: true,
            specifications: {
                dimensions: '35×35×35 سم',
                thickness: '6 ملم',
                volume: '~43 لتر',
            },
        },
        {
            id: '40x40x40-6mm',
            label: '40×40×40 سم - 6 ملم سماكة',
            price: Math.round(35 * USD_TO_IQD), // ~45,850 IQD
            stock: 10,
            sku: 'YEE-TANK-40-6MM',
            specifications: {
                dimensions: '40×40×40 سم',
                thickness: '6 ملم',
                volume: '~64 لتر',
            },
        },
        {
            id: '60x40x40-8mm',
            label: '60×40×40 سم - 8 ملم سماكة',
            price: Math.round(55 * USD_TO_IQD), // ~72,050 IQD
            stock: 8,
            sku: 'YEE-TANK-60x40-8MM',
            specifications: {
                dimensions: '60×40×40 سم',
                thickness: '8 ملم',
                volume: '~96 لتر',
            },
        },
        {
            id: '40x23x25-5mm',
            label: '40×23×25 سم - 5 ملم سماكة',
            price: Math.round(18 * USD_TO_IQD), // ~23,580 IQD
            stock: 15,
            sku: 'YEE-TANK-40x23-5MM',
            specifications: {
                dimensions: '40×23×25 سم (400×230×250 ملم)',
                thickness: '5 ملم',
                volume: '~23 لتر',
            },
        },
        {
            id: '50x27x30-5mm',
            label: '50×27×30 سم - 5 ملم سماكة',
            price: Math.round(25 * USD_TO_IQD), // ~32,750 IQD
            stock: 12,
            sku: 'YEE-TANK-50x27-5MM',
            specifications: {
                dimensions: '50×27×30 سم (500×270×300 ملم)',
                thickness: '5 ملم',
                volume: '~40 لتر',
            },
        },
        {
            id: '60x30x35-5mm',
            label: '60×30×35 سم - 5 ملم سماكة',
            price: Math.round(35 * USD_TO_IQD), // ~45,850 IQD
            stock: 10,
            sku: 'YEE-TANK-60x30-5MM',
            specifications: {
                dimensions: '60×30×35 سم (600×300×350 ملم)',
                thickness: '5 ملم',
                volume: '~63 لتر',
            },
        },
    ];

    // صور المنتج - كل حجم له صورة
    const images = [
        '/images/products/yee/YEE Ultra-Clear Glass Tank/main.webp',
        '/images/products/yee/YEE Ultra-Clear Glass Tank/yee_tank_35cm.webp',
        '/images/products/yee/YEE Ultra-Clear Glass Tank/yee_tank_40cm.webp',
        '/images/products/yee/YEE Ultra-Clear Glass Tank/yee_tank_60x40cm.webp',
        '/images/products/yee/YEE Ultra-Clear Glass Tank/yee_tank_40x23cm.webp',
        '/images/products/yee/YEE Ultra-Clear Glass Tank/yee_tank_50x27cm.webp',
        '/images/products/yee/YEE Ultra-Clear Glass Tank/yee_tank_60x30cm.webp',
    ];

    const thumbnail = images[0];

    // المواصفات العامة
    const specifications = {
        'العلامة التجارية': 'YEE',
        'المادة': 'زجاج فائق الصفاء',
        'نفاذية الضوء': '>93%',
        'الاستخدام': 'حوض أسماك زينة',
        'المنشأ': 'الصين - شاندونغ',
        'رقم الموديل': 'YEE',
        'الميزات': 'مستدام، عالي الجودة',
        'اللون': 'شفاف/أبيض',
        'التطبيق': 'ديكور حوض السمك',
        benefits: [
            'زجاج فائق الصفاء مع نفاذية ضوء تتجاوز 91%',
            'حواف نظيفة وتصميم عصري أنيق',
            'مناسب للاستخدام المنزلي والتجاري',
            'متوفر بأحجام متعددة تناسب جميع المساحات',
            'زجاج سميك ومتين يضمن السلامة',
            'مثالي لأسماك الزينة والنباتات المائية',
        ],
    };

    // السعر الافتراضي (أصغر حجم)
    const defaultPrice = variants.find(v => v.isDefault)?.price || variants[0].price;

    // الوصف
    const description = `حوض سمك زجاجي فائق الصفاء من YEE بنفاذية ضوء تتجاوز 93%، تم اختباره من قبل منظمة مهنية. يتميز بحواف نظيفة وتصميم عصري أنيق يناسب جميع الديكورات. متوفر بأحجام متعددة من 23 لتر إلى 96 لتر مع سماكات زجاج مختلفة (5 ملم، 6 ملم، 8 ملم) لضمان المتانة والسلامة. مثالي لأسماك الزينة والنباتات المائية.`;

    try {
        // إضافة للداتابيز
        await db.insert(productsTable).values({
            id,
            slug,
            name: productName,
            brand: 'YEE',
            category: 'أحواض',
            subcategory: 'أحواض زجاجية',
            description,
            price: defaultPrice.toString(),
            currency: 'IQD',
            images,
            thumbnail,
            rating: '4.8',
            reviewCount: 0,
            stock: variants.reduce((sum, v) => sum + v.stock, 0), // إجمالي المخزون
            lowStockThreshold: 5,
            isNew: true,
            isBestSeller: false,
            isProductOfWeek: false,
            specifications,
            hasVariants: true,
            variants,
        }).onConflictDoUpdate({
            target: productsTable.id,
            set: {
                name: productName,
                price: defaultPrice.toString(),
                stock: variants.reduce((sum, v) => sum + v.stock, 0),
                images,
                thumbnail,
                specifications,
                hasVariants: true,
                variants,
                updatedAt: new Date(),
            },
        });

        console.log(`✅ Successfully added: ${productName}`);
        console.log(`   📦 ${variants.length} size variants`);
        console.log(`   🖼️  ${images.length} images`);
        console.log(`   💰 Price range: ${Math.min(...variants.map(v => v.price))} - ${Math.max(...variants.map(v => v.price))} IQD`);

        // عرض تفاصيل الأحجام
        console.log('\n📐 Size variants:');
        for (const variant of variants) {
            console.log(`   - ${variant.label}: ${variant.price.toLocaleString()} IQD (${variant.stock} في المخزون)`);
        }

    } catch (error) {
        console.error('❌ Error adding product:', error);
        throw error;
    }
}

// تشغيل
addYEEGlassTank()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    });
