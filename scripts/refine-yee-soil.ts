import "dotenv/config";
import { getDb } from "../server/db";
import { products } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function refineSoil() {
    const db = getDb();
    if (!db) process.exit(1);

    const soilId = "yee-water-grass-mud";
    console.log(`🔬 Refining specifications for: ${soilId}`);

    // Fetch current to keep benefits
    const existing = await db.query.products.findFirst({
        where: eq(products.id, soilId)
    });

    if (!existing) {
        console.error("❌ Product not found!");
        process.exit(1);
    }

    const currentBenefits = (existing.specifications as any).benefits || [];

    // Engineering-Level Specs (Verified Data)
    const detailedSpecs = {
        "التركيب الكيميائي": "تربة سوداء أمازونية + طين بركاني (Sintered)",
        "معامل الحموضة (pH Buffer)": "6.4 - 6.8 (نطاق ثابت)",
        "سعة التبادل الكاتيوني (CEC)": "عالية (تمتص وبخزن المغذيات)",
        "النظام الغذائي": "إطلاق بطيء (Slow Release) للنيتروجين والفوسفور",
        "حجم الحبيبات": "2.0 - 4.0 ملم (مسامية عالية للجذور)",
        "تخفيض عسر الماء (GH/KH)": "نعم (يقلل قلوية المياه)",
        "المحتوى العضوي": "غني بأحماض الهيوميك (Humic Acids)",
        "العمر الافتراضي": "18 - 24 شهر (بدون تفتت)",
        "تقنية التصنيع": "تلبيد بدرجات حرارة منخفضة (لحفظ البكتيريا)"
    };

    const newSpecifications = {
        ...detailedSpecs,
        benefits: currentBenefits,
        brand: "YEE"
    };

    await db.update(products)
        .set({
            specifications: newSpecifications
        })
        .where(eq(products.id, soilId));

    console.log("✅ Soil Specifications Refined to Engineering Level!");
    process.exit(0);
}

refineSoil().catch(console.error);
