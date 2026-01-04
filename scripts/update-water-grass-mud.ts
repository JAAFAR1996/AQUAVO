import { getDb } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq, or } from 'drizzle-orm';

async function updateWaterGrassMud() {
    console.log('🌱 Updating Water Grass Mud products with accurate specifications...\n');

    const db = getDb();
    if (!db) {
        console.error('❌ Database not configured!');
        return;
    }

    // Updated specifications based on research
    const updates = [
        {
            slugPattern: 'water-grass-mud',
            size: '1.5',
            changes: {
                name: 'تربة نباتات مائية مطورة حبيبات ناعمة 1.5 لتر',
                description: `تربة نباتات مائية فاخرة بحبيبات ناعمة (1-2 ملم). غنية بالأحماض العضوية والمغذيات الأساسية لنمو النباتات المائية. تخفض pH إلى 6.5-7.5 وتلين الماء لخلق بيئة مثالية للنباتات والروبيان. بنية مسامية تشجع نمو البكتيريا النافعة. مقاومة للتحلل ولا تعكر الماء.

⚠️ تعليمات الاستخدام:
• لا تغسل التربة قبل الاستخدام
• ضع طبقة بسماكة 6-8 سم
• أضف الماء ببطء لتجنب التعكر
• مثالية لأحواض النباتات والروبيان`,
                specifications: {
                    'الحجم': '1.5 لتر',
                    'حجم الحبيبات': '1-2 ملم (ناعمة)',
                    'تأثير pH': 'يخفض إلى 6.5-7.5',
                    'تأثير الماء': 'يلين الماء ويقلل القساوة',
                    'المحتوى': 'أحماض عضوية + مغذيات',
                    'الغسل': 'لا يحتاج - استخدم مباشرة',
                    'السماكة الموصى بها': '6-8 سم',
                    'مقاوم للتحلل': 'نعم',
                    'مناسب لـ': 'النباتات المائية والروبيان',
                    benefits: [
                        'غني بالمغذيات الأساسية لنمو النباتات',
                        'يخفض pH ويلين الماء للبيئة المثالية',
                        'بنية مسامية تدعم البكتيريا النافعة',
                        'لا يحتاج غسل - جاهز للاستخدام',
                        'مقاوم للتحلل ولا يعكر الماء',
                        'آمن للأسماك والروبيان'
                    ]
                }
            }
        },
        {
            slugPattern: 'water-grass-mud',
            size: '3',
            changes: {
                name: 'تربة نباتات مائية مطورة حبيبات خشنة 3 لتر',
                description: `تربة نباتات مائية فاخرة بحبيبات خشنة (2-3 ملم). حجم اقتصادي للأحواض الكبيرة. غنية بالأحماض العضوية والمغذيات الأساسية. تخفض pH إلى 6.5-7.5 وتلين الماء. بنية مسامية فائقة لنمو البكتيريا النافعة. مثالية للنباتات ذات الجذور القوية.

⚠️ تعليمات الاستخدام:
• لا تغسل التربة قبل الاستخدام
• ضع طبقة بسماكة 6-8 سم
• أضف الماء ببطء لتجنب التعكر
• مثالية للأحواض المزروعة الكبيرة`,
                specifications: {
                    'الحجم': '3 لتر',
                    'حجم الحبيبات': '2-3 ملم (خشنة)',
                    'تأثير pH': 'يخفض إلى 6.5-7.5',
                    'تأثير الماء': 'يلين الماء ويقلل القساوة',
                    'المحتوى': 'أحماض عضوية + مغذيات',
                    'الغسل': 'لا يحتاج - استخدم مباشرة',
                    'السماكة الموصى بها': '6-8 سم',
                    'مقاوم للتحلل': 'نعم',
                    'مناسب لـ': 'الأحواض الكبيرة والنباتات ذات الجذور القوية',
                    benefits: [
                        'حجم اقتصادي للأحواض الكبيرة',
                        'حبيبات خشنة مثالية للنباتات ذات الجذور القوية',
                        'يخفض pH ويلين الماء طبيعياً',
                        'بنية مسامية فائقة للبكتيريا النافعة',
                        'لا يتحلل ويدوم لسنوات',
                        'آمن للأسماك والروبيان والنباتات'
                    ]
                }
            }
        }
    ];

    // Find products containing 'water-grass-mud' in slug
    const existingProducts = await db
        .select()
        .from(products)
        .where(
            or(
                eq(products.slug, 'yee-water-grass-mud-fertility-upgrade-fine-grain-15l-3l'),
                eq(products.slug, 'yee-water-grass-mud-fertility-upgrade-fine-grain-15l-3l-3l')
            )
        );

    console.log(`Found ${existingProducts.length} products to update`);

    for (const product of existingProducts) {
        // Determine which update to apply based on slug
        const is3L = product.slug.endsWith('-3l');
        const update = is3L ? updates[1] : updates[0];

        try {
            await db
                .update(products)
                .set({
                    name: update.changes.name,
                    description: update.changes.description,
                    specifications: update.changes.specifications,
                    brand: 'YEE', // Keep YEE brand for this product
                    updatedAt: new Date(),
                })
                .where(eq(products.id, product.id));

            console.log(`✅ Updated: ${product.slug}`);
            console.log(`   - Name: ${update.changes.name}`);
        } catch (error) {
            console.error(`❌ Error updating ${product.slug}:`, error);
        }
    }

    console.log('\n🎉 Done!');
}

updateWaterGrassMud()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
