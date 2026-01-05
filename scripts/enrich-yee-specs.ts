import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

// Technical Specs Helper Types
type TechSpecs = Record<string, string | number | boolean>;

// Map of ID -> Additional Technical Specs
const techSpecsUpdates: Record<string, TechSpecs> = {
    // --- Heaters ---
    "yee-yee-black-warrior-heater-100w": {
        "القدرة": "100 واط",
        "نطاق الحرارة": "18°C - 34°C",
        "طول السلك": "1.5 متر",
        "مادة الجسم": "زجاج كوارتز",
        "الحماية": "فصل تلقائي عند الجفاف IP68",
        "الجهد الكهربائي": "220V-240V / 50Hz",
        "دقة الحرارة": "±1°C",
        "مناسب لحوض": "50-100 لتر"
    },
    "yee-yee-brand-aquarium-quartz-heating-rod-100w": {
        "القدرة": "100 واط",
        "المادة": "زجاج كوارتز نقي",
        "التحكم": "ترموستات أوتوماتيكي",
        "نطاق الحرارة": "20°C - 34°C",
        "طول السخان": "25 سم",
        "مقاومة الانفجار": "نعم",
        "طول السلك": "1.2 متر"
    },
    "yee-steel-heater": {
        "المادة": "ستيل 304 غير قابل للصدأ",
        "النوع": "غاطس بالكامل",
        "مقاومة الكسر": "عالية جداً",
        "التحكم": "مقبض علوي للحرارة",
        "الجهد": "220V"
    },

    // --- Foods ---
    "yee-imitation-red-worm-feed-05mm-115g": {
        "نسبة البروتين": "60% (عالي)",
        "الدهون الخام": "≥6%",
        "الألياف": "≤5%",
        "الرطوبة": "≤10%",
        "فترة الصلاحية": "24 شهر",
        "شكل العلف": "حبيبات دقيقة (0.5 ملم)"
    },
    "yee-yee-small-fish-feed-all-in-one-06mm-75g": {
        "حجم الحبيبات": "0.6 ملم",
        "النوع": "بطيء الغرق",
        "المكونات الرئيسية": "مسحوق سمك، سبيرولينا، جمبري",
        "مناسب لـ": "النيون، الجوبي، التترا",
        "فترة الصلاحية": "24 شهر"
    },
    "yee-betta-fish-food-08mm-130g-new": {
        "حجم الحبيبات": "0.8 ملم",
        "النوع": "عائم",
        "بروتين": "≥45%",
        "إضافات": "فيتامينات تعزيز اللون",
        "منع التلوث": "لا يعكر الماء"
    },
    "yee-c1-1127-ranchu-feed": {
        "حجم الحبيبات": "3.0 ملم",
        "النوع": "غارق",
        "الوظيفة": "تعزيز نمو الرأس (Wen)",
        "بروتين": "≥43%",
        "دهون": "≥6%"
    },

    // --- Filters & Pumps ---
    "yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces": {
        "الأبعاد": "50 × 40 سم",
        "عدد الطبقات": "6 طبقات (6D)",
        "السماكة": "~2 سم (تقريبي)",
        "قابلية الغسل": "نعم، حتى 200 مرة",
        "النوع": "بدون صمغ (Non-glue technology)",
        "الاستخدام": "أحواض المياه العذبة والبحرية"
    },
    "yee-high-energy-culture-bricks": {
        "المادة": "سيراميك مسامي معالج",
        "المساحة السطحية": "2100 متر مربع / لتر",
        "نفاذية الماء": "عالية جداً",
        "العناصر النزرة": "K, Mg, Fe, Zn, Na, Ca",
        "العمر الافتراضي": "طويل الأمد"
    },
    "yee-xiaobai-single-hole-oxygen-pump-3w-non-adjustable-ytz-300": {
        "الموديل": "YTZ-300",
        "القدرة": "3 واط",
        "معدل التدفق": "1.5 لتر/دقيقة",
        "المخارج": "1",
        "الضوضاء": "<30 ديسيبل (هادئ جداً)",
        "الجهد": "220-240V",
        "حجم الحوض المناسب": "30-60 لتر"
    },
    "yee-3w-oil-film-processor": {
        "القدرة": "3 واط",
        "التدفق": "300 لتر/ساعة",
        "الوظيفة": "إزالة الطبقة الزيتية",
        "طول السلك": "1.4 متر",
        "ذاتي الطفو": "نعم (رأس عائم أوتوماتيكي)"
    },
    "yee-high-configuration-30w-low-water-level": {
        "القدرة": "30 واط",
        "أدنى مستوى ماء": "1.5 سم",
        "أقصى رفع (H-max)": "1.8 متر",
        "التدفق (Q-max)": "1800 لتر/ساعة",
        "طول السلك": "1.5 متر"
    },

    // --- Water Care ---
    "yee-yee-aquarium-nitrifying-bacteria-probiotics-capsules-50-capsules": {
        "العدد": "50 كبسولة",
        "التركيز": "50 مليار بكتيريا/كبسولة",
        "النوع": "مسحوق داخل كبسولة",
        "مدة الفعالية": "تنشط فوراً في الماء",
        "الجرعة": "كبسولة لكل 100 لتر (للتأسيس)"
    },
    "yee-yee-blue-classic-chlorine-removal-water-stabilizer-535ml": {
        "الحجم": "535 مل",
        "المادة الفعالة": "ثيوكبريتات الصوديوم + فيتامين B",
        "الجرعة": "10 مل لكل 100 لتر",
        "الوقت اللازم": "فوري (خلال دقائق)"
    },
    "yee-novice-level-50-9-in-1bucketwith-comparison-chart": {
        "عدد الشرائط": "50 شريط",
        "المعايير (9)": "pH, GH, KH, NO2, NO3, Cl2, CO3, TC, Alk",
        "وقت القراءة": "60 ثانية",
        "التخزين": "مكان جاف ومظلم"
    },
    "yee-large-suspended-isolation-box": {
        "النوع": "تعليق خارجي/داخلي",
        "المادة": "أكريليك عالي الشفافية",
        "الفتحات": "0.5 ملم (دقيقة لتدوير الماء)",
        "الملحقات": "غطاء + فواصل قابلة للإزالة"
    }

}

async function enrichSpecs() {
    console.log("🚀 Starting YEE Specs Enrichment...");

    const db = getDb();
    if (!db) process.exit(1);

    let successCount = 0;

    for (const [id, newSpecs] of Object.entries(techSpecsUpdates)) {
        try {
            // 1. Fetch current product to preserve 'benefits'
            const existingProduct = await db.query.products.findFirst({
                where: eq(products.id, id)
            });

            if (!existingProduct) {
                console.warn(`⚠️ Product not found: ${id}`);
                continue;
            }

            const currentSpecs = existingProduct.specifications as any || {};

            // 2. Merge logic: Keep benefits, keep brand, ADD new tech specs
            const mergedSpecs = {
                ...newSpecs, // Add new technical specs (Wattage, Dimensions, etc.)
                benefits: currentSpecs.benefits || [], // Preserve benefits list
                brand: "YEE" // Ensure brand is set
            };

            // 3. Update DB
            await db.update(products)
                .set({
                    specifications: mergedSpecs
                })
                .where(eq(products.id, id));

            console.log(`✅ Enriched: ${existingProduct.name}`);
            successCount++;

        } catch (e) {
            console.error(`❌ Error updating ${id}:`, e);
        }
    }

    console.log(`\n🎉 Finished enriching ${successCount} products!`);
    process.exit(0);
}

enrichSpecs().catch(console.error);
