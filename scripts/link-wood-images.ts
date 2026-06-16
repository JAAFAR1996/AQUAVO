/**
 * ربط صور الخشب بالمنتجات في قاعدة البيانات مع المقاسات
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

const BASE_URL = "/images/products/houyi/houyi-wood-products";

// بيانات المنتجات مع الصور والمقاسات
const woodProducts = [
    {
        searchTerms: ['أغصان', 'تايلندية', 'rhododendron', 'spider'],
        name: "HOUYI الأغصان التايلندية المتشابكة - جذور طبيعية",
        image: `${BASE_URL}/thai-spider-wood.png`,
        description: `🌿 **جذور الرودودندرون الطبيعية (Spider Wood)**

خشب طبيعي 100% من جذور شجرة الرودودندرون التايلندية.

## 📏 **المقاسات المتوفرة:**
- 30-35 سم
- 30-45 سم  
- 40-45 سم (الأكثر طلباً)
- 50-55 سم
- مع قاعدة حجرية

## ✨ **المميزات:**
- 🌿 فروع ذهبية متشابكة بشكل طبيعي
- 🦐 آمن للأسماك والجمبري
- 🌱 مثالي لتثبيت الموس والنباتات
- 💧 تانين منخفض - لا يغير لون الماء كثيراً`,
        hasVariants: true,
        variants: [
            { id: "30-35cm", label: "30-35 سم", price: 0, stock: 28, isDefault: false },
            { id: "30-45cm", label: "30-45 سم", price: 0, stock: 32, isDefault: false },
            { id: "40-45cm", label: "40-45 سم", price: 0, stock: 32, isDefault: true },
            { id: "50-55cm", label: "50-55 سم", price: 0, stock: 50, isDefault: false },
            { id: "stone-base", label: "30-45 سم + قاعدة حجرية", price: 0, stock: 36, isDefault: false }
        ]
    },
    {
        searchTerms: ['جبل', 'صخري', 'mountain'],
        name: "HOUYI خشب الجبل الصخري - تفاصيل دقيقة",
        image: `${BASE_URL}/mountain-wood.png`,
        description: `🪨 **خشب الجبل الصخري الطبيعي (Mountain Wood)**

قطع خشب طبيعية بتفاصيل صخرية فريدة.

## 📏 **المقاس:**
- 20-50 سم (يُباع بالكيلو)

## ✨ **المميزات:**
- 🪨 تفاصيل صخرية طبيعية
- 🎨 لون بني داكن جذاب
- 🌊 يغرق طبيعياً بسرعة
- 🐠 آمن لجميع أنواع الأحواض`,
        hasVariants: false
    },
    {
        searchTerms: ['موس', 'شجرة', 'moss', 'tree'],
        name: "HOUYI شجرة الموس الجاهزة - هيكل طبيعي",
        image: `${BASE_URL}/moss-tree.png`,
        description: `🌲 **شجرة الموس الجاهزة (Moss Tree)**

هيكل شجري جاهز لتثبيت الموس وإنشاء مظهر غابة تحت الماء.

## 📏 **المقاس:**
- 20-30 سم

## ✨ **المميزات:**
- 🌿 هيكل شجري جاهز للموس
- 🪨 قاعدة حجرية ثابتة
- 🌱 مثالي لـ Java Moss و Christmas Moss
- 🎨 مظهر غابة طبيعي`,
        hasVariants: false
    },
    {
        searchTerms: ['غارق', 'عملاق', 'xl', 'sinking', 'large'],
        name: "HOUYI الخشب الغارق العملاق XL",
        image: `${BASE_URL}/sinking-wood.png`,
        description: `🪵 **الخشب الغارق العملاق (Large Sinking Wood)**

قطع خشب كبيرة للأحواض العملاقة والمشاريع الكبيرة.

## 📏 **المقاس:**
- 70-120 سم (يُباع بالكيلو)

## ✨ **المميزات:**
- 📏 حجم عملاق مناسب للأحواض الكبيرة
- 🌊 يغرق طبيعياً - لا حاجة للنقع
- 🎨 منحنيات وأشكال دراماتيكية
- 🐟 يوفر مخابئ للأسماك الكبيرة`,
        hasVariants: false
    },
    {
        searchTerms: ['مصقول', 'ناعم', 'polished', 'small'],
        name: "HOUYI خشب مصقول ناعم - قطع صغيرة للديكور",
        image: `${BASE_URL}/polished-driftwood.png`,
        description: `✨ **خشب مصقول ناعم (Polished Driftwood)**

قطع صغيرة مصقولة للديكور الدقيق والأحواض الصغيرة.

## 📏 **المقاسات المتوفرة:**
- 5-8 سم (صغير)
- 8-10 سم
- 10-15 سم (الأكثر طلباً)
- 15-20 سم (كبير)

## ✨ **المميزات:**
- ✨ سطح ناعم ومصقول
- 🎨 أشكال أنيقة متنوعة
- 🦐 مثالي لأحواض الجمبري
- 🌿 سهل التنظيف`,
        hasVariants: true,
        variants: [
            { id: "5-8cm", label: "5-8 سم (صغير)", price: 0, stock: 100, isDefault: false },
            { id: "8-10cm", label: "8-10 سم", price: 0, stock: 150, isDefault: false },
            { id: "10-15cm", label: "10-15 سم", price: 0, stock: 100, isDefault: true },
            { id: "15-20cm", label: "15-20 سم (كبير)", price: 0, stock: 65, isDefault: false }
        ]
    }
];

async function updateWoodProducts() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🌿 ربط صور الخشب بالمنتجات...");
    console.log("═══════════════════════════════════════════════════\n");

    for (const product of woodProducts) {
        // البحث عن المنتج
        let found = null;
        for (const term of product.searchTerms) {
            const result = await sql`
                SELECT id, name FROM products 
                WHERE LOWER(name) LIKE ${'%' + term + '%'}
                LIMIT 1
            `;
            if (result.length > 0) {
                found = result[0];
                break;
            }
        }

        if (found) {
            console.log(`📦 تحديث: ${found.name}`);

            const updateData: any = {
                images: [product.image],
                thumbnail: product.image,
                description: product.description
            };

            if (product.hasVariants && product.variants) {
                await sql`
                    UPDATE products 
                    SET 
                        images = ${JSON.stringify([product.image])}::jsonb,
                        thumbnail = ${product.image},
                        description = ${product.description},
                        has_variants = true,
                        variants = ${JSON.stringify(product.variants)}::jsonb
                    WHERE id = ${found.id}
                `;
            } else {
                await sql`
                    UPDATE products 
                    SET 
                        images = ${JSON.stringify([product.image])}::jsonb,
                        thumbnail = ${product.image},
                        description = ${product.description}
                    WHERE id = ${found.id}
                `;
            }

            console.log(`   ✅ تم ربط الصورة: ${product.image}`);
            if (product.hasVariants) {
                console.log(`   📏 المقاسات: ${product.variants?.map(v => v.label).join(', ')}`);
            }
            console.log("");
        } else {
            console.log(`⚠️ لم يتم العثور على: ${product.name}\n`);
        }
    }

    console.log("═══════════════════════════════════════════════════");
    console.log("✅ تم بنجاح! أعد تحميل الموقع لترى التغييرات.");
    console.log("═══════════════════════════════════════════════════");

    process.exit(0);
}

updateWoodProducts().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
