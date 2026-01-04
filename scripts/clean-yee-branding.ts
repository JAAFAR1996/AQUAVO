import { getDb } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function cleanYEEBranding() {
    console.log('🧹 Cleaning YEE branding from products...\n');

    const db = getDb();
    if (!db) {
        console.error('❌ Database not configured!');
        return;
    }

    // Products to update
    const updates = [
        {
            slug: 'yee-cylinder-air-stone',
            changes: {
                brand: 'عام',
                description: 'حجر هواء أسطواني عالي الجودة. ينتج فقاعات دقيقة وموزعة بشكل متساوي لتحسين تبادل الأكسجين في الحوض. متوفر بأحجام متعددة من 10 ملم إلى 50 ملم لتناسب جميع أحجام الأحواض. متوفر باللون الرمادي والأزرق. قطر التوصيل 4 ملم للمقاسات الصغيرة و 4/8 ملم للمقاسات الكبيرة.',
            }
        },
        {
            slug: 'yee-uk-plug-adapter',
            changes: {
                brand: 'عام',
                // Update specifications to remove YEE from benefits
            }
        },
        {
            slug: 'yee-sponge-filter',
            changes: {
                brand: 'عام',
            }
        },
    ];

    for (const update of updates) {
        try {
            // Get the current product first
            const [currentProduct] = await db
                .select()
                .from(products)
                .where(eq(products.slug, update.slug))
                .limit(1);

            if (!currentProduct) {
                console.log(`⚠️ Product not found: ${update.slug}`);
                continue;
            }

            // Build update object
            const updateData: Record<string, unknown> = {
                ...update.changes,
                updatedAt: new Date(),
            };

            // If it's the UK plug adapter, update specifications to remove YEE from benefits
            if (update.slug === 'yee-uk-plug-adapter' && currentProduct.specifications) {
                const specs = currentProduct.specifications as Record<string, unknown>;
                if (Array.isArray(specs.benefits)) {
                    specs.benefits = (specs.benefits as string[]).map((benefit: string) =>
                        benefit.replace(/من YEE|YEE/gi, '').trim()
                    ).filter((b: string) => b.length > 0);

                    // Remove brand from specifications too
                    if (specs['العلامة التجارية']) {
                        delete specs['العلامة التجارية'];
                    }

                    updateData.specifications = specs;
                }
            }

            // If it's cylinder air stone, update specifications
            if (update.slug === 'yee-cylinder-air-stone' && currentProduct.specifications) {
                const specs = currentProduct.specifications as Record<string, unknown>;
                if (specs['العلامة التجارية']) {
                    delete specs['العلامة التجارية'];
                }
                updateData.specifications = specs;
            }

            // If it's sponge filter, update specifications
            if (update.slug === 'yee-sponge-filter' && currentProduct.specifications) {
                const specs = currentProduct.specifications as Record<string, unknown>;
                if (specs['العلامة التجارية']) {
                    delete specs['العلامة التجارية'];
                }
                updateData.specifications = specs;
            }

            await db
                .update(products)
                .set(updateData)
                .where(eq(products.slug, update.slug));

            console.log(`✅ Updated: ${update.slug}`);
            console.log(`   - Brand: ${update.changes.brand || '(unchanged)'}`);
            if (update.changes.description) {
                console.log(`   - Description updated`);
            }
        } catch (error) {
            console.error(`❌ Error updating ${update.slug}:`, error);
        }
    }

    console.log('\n🎉 Done!');
}

cleanYEEBranding()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
