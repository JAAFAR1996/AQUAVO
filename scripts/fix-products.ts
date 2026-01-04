import { getDb } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixProducts() {
    console.log('🔧 Fixing product specifications...\n');

    const db = getDb();
    if (!db) {
        console.error('❌ Database not configured!');
        return;
    }

    // 1. Fix Water Grass Mud
    console.log('1️⃣ Updating Water Grass Mud...');
    await db
        .update(products)
        .set({
            name: 'تربة نباتات مائية مطورة حبيبات ناعمة 1.5 لتر',
            description: `تربة نباتات مائية فاخرة بحبيبات ناعمة (1-2 ملم). غنية بالأحماض العضوية والمغذيات الأساسية لنمو النباتات المائية. تخفض pH إلى 6.5-7.5 وتلين الماء لخلق بيئة مثالية للنباتات والروبيان.

⚠️ تعليمات الاستخدام:
• لا تغسل التربة قبل الاستخدام
• ضع طبقة بسماكة 6-8 سم
• أضف الماء ببطء لتجنب التعكر`,
            brand: 'عام',
            specifications: {
                'الحجم': '1.5 لتر',
                'حجم الحبيبات': '1-2 ملم (ناعمة)',
                'تأثير pH': 'يخفض إلى 6.5-7.5',
                'تأثير الماء': 'يلين الماء ويقلل القساوة',
                'الغسل': 'لا يحتاج - استخدم مباشرة',
                'السماكة الموصى بها': '6-8 سم',
                benefits: [
                    'غني بالمغذيات الأساسية لنمو النباتات',
                    'يخفض pH ويلين الماء للبيئة المثالية',
                    'بنية مسامية تدعم البكتيريا النافعة',
                    'لا يحتاج غسل - جاهز للاستخدام',
                    'مقاوم للتحلل ولا يعكر الماء'
                ]
            },
            updatedAt: new Date(),
        })
        .where(eq(products.slug, 'yee-water-grass-mud-fertility-upgrade'));
    console.log('   ✅ Done');

    // 2. Fix Brine Shrimp (restore original then update correctly)
    console.log('2️⃣ Fixing Brine Shrimp (restoring original)...');
    await db
        .update(products)
        .set({
            name: 'YEE روبيان ملحي مجفف قطع 18 جرام',
            description: `روبيان ملحي (أرتيميا) مجفف بالتبريد على شكل قطع. طعام طبيعي غني بالبروتين مناسب لجميع أنواع الأسماك الاستوائية.`,
            specifications: {
                'الوزن': '18 جرام',
                'الحجم': '225 مل',
                'النوع': 'أرتيميا مجففة بالتبريد',
                'مناسب لـ': 'جميع الأسماك الاستوائية',
                benefits: [
                    'بروتين طبيعي 100%',
                    'مجفف بالتبريد للحفاظ على القيمة الغذائية',
                    'غني بالأحماض الدهنية',
                    'مناسب لجميع أحجام الأسماك'
                ]
            },
            updatedAt: new Date(),
        })
        .where(eq(products.slug, 'yee-yee-aquarium-freeze-dried-brine-shrimp-chunks-18g-225ml'));
    console.log('   ✅ Done');

    // 3. Fix Betta 3-in-1 15g (was wrongly updated)
    console.log('3️⃣ Fixing Betta 3-in-1 15g...');
    await db
        .update(products)
        .set({
            name: 'YEE طعام بيتا 3 في 1 فاخر 15 جرام',
            description: `طعام بيتا فاخر 3 في 1: غذاء + تلوين + مناعة. تركيبة مركزة في عبوة صغيرة مثالية لحوض بيتا واحد أو اثنين.`,
            specifications: {
                'الوزن': '15 جرام',
                'المميزات': '3 في 1 (غذاء + تلوين + مناعة)',
                'مناسب لـ': 'أسماك البيتا',
                benefits: [
                    'تركيبة 3 في 1 شاملة',
                    'يعزز الألوان الزاهية',
                    'يدعم جهاز المناعة',
                    'عبوة صغيرة مثالية للبيتا'
                ]
            },
            updatedAt: new Date(),
        })
        .where(eq(products.slug, 'yee-yee-brand-3-in-1-betta-fish-food-15g'));
    console.log('   ✅ Done');

    console.log('\n🎉 All fixes applied!');
}

fixProducts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
