import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { products } from "../shared/schema";
import { like, eq } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

const databaseUrl = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

// Benefits by category - researched from YEE official sources
const benefitsByCategory: Record<string, string[]> = {
    "التحكم بالحرارة": [
        "تحكم دقيق بالحرارة (18-32°C) مع ثيرموستات أوتوماتيكي",
        "حماية من الانفجار والسخونة الزائدة - ضمان أمان 100%",
        "مصنوع من زجاج كوارتز/ستانلس ستيل 304 مقاوم للصدمات",
        "يحافظ على صحة أسماكك بتوفير بيئة مستقرة",
        "موفر للطاقة مع تقنية PTC المتقدمة"
    ],
    "الفلترة والتنقية": [
        "مساحة سطح ضخمة لنمو البكتيريا النافعة",
        "يحول الأمونيا والنيتريت السامة إلى نيترات آمنة",
        "يحسن جودة المياه ويمنع الأمراض",
        "يدوم لسنوات طويلة بدون استبدال",
        "مناسب للمياه العذبة والمالحة"
    ],
    "طعام الأسماك": [
        "بروتين عالي الجودة من مصادر بحرية طبيعية",
        "يعزز نمو العضلات ويحسن الصحة العامة",
        "يكثف الألوان الطبيعية بفضل السبيرولينا والأستازانتين",
        "سهل الهضم ولا يعكر المياه",
        "يقوي المناعة ويحمي من الأمراض"
    ],
    "التهوية والأكسجين": [
        "فقاعات دقيقة ومتجانسة لأكسجة مثالية",
        "يزيد تبادل الأكسجين في الماء",
        "تشغيل هادئ لا يزعج الأسماك",
        "متين ويدوم طويلاً",
        "مناسب لجميع أحجام الأحواض"
    ],
    "معالجة المياه": [
        "يزيل الكلور والكلورامين فوراً",
        "يحمي الأسماك من الإجهاد والتوتر",
        "تركيبة آمنة 100% على الأسماك والنباتات",
        "يعالج الأمراض الشائعة بفعالية",
        "نتائج سريعة ومرئية خلال ساعات"
    ],
    "الفحص والمراقبة": [
        "قراءات دقيقة وسريعة",
        "سهل الاستخدام حتى للمبتدئين",
        "يساعد في منع المشاكل قبل حدوثها",
        "يوفر لك تحكماً كاملاً ببيئة حوضك",
        "اقتصادي ويكفي لفترة طويلة"
    ],
    "الصيانة والتنظيف": [
        "ينظف بعمق وفعالية",
        "يوفر عليك الوقت والجهد",
        "آمن على الأسماك والنباتات",
        "سهل الاستخدام",
        "يحافظ على مظهر حوضك جميلاً"
    ],
    "التفريخ والعزل": [
        "يحمي الصغار من الأسماك الكبيرة",
        "تدفق مياه مثالي للتفريخ",
        "شفاف للمراقبة السهلة",
        "سهل التركيب والتنظيف",
        "مناسب للتربية الاحترافية"
    ],
    "التربة والديكور": [
        "غني بالمغذيات للنباتات المائية",
        "لا يعكر الماء بعد التثبيت",
        "يحافظ على pH مستقر",
        "مظهر طبيعي وجميل",
        "يدوم لسنوات بدون تجديد"
    ],
    "ملحقات ومستلزمات": [
        "جودة عالية ومتانة",
        "سهل الاستخدام والتركيب",
        "مناسب لجميع أنواع الأحواض",
        "سعر اقتصادي",
        "ضمان الجودة من YEE"
    ]
};

async function addBenefitsToProducts() {
    try {
        const yeeProducts = await db.select().from(products).where(like(products.brand, '%YEE%'));

        console.log(`Found ${yeeProducts.length} YEE products\n`);

        let updatedCount = 0;

        for (const product of yeeProducts) {
            const category = product.category || "";
            const benefits = benefitsByCategory[category] || benefitsByCategory["ملحقات ومستلزمات"];

            // Get current specifications or empty object
            const currentSpecs = (product.specifications as Record<string, any>) || {};

            // Add benefits to specifications
            const updatedSpecs = {
                ...currentSpecs,
                benefits: benefits
            };

            // Update the product
            await db.update(products)
                .set({ specifications: updatedSpecs })
                .where(eq(products.id, product.id));

            console.log(`✅ ${product.name} (${category})`);
            updatedCount++;
        }

        console.log(`\n✨ Updated ${updatedCount} products with benefits!`);
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        await pool.end();
        process.exit(1);
    }
}

addBenefitsToProducts();
