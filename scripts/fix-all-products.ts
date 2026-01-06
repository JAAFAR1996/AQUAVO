import { db } from './server/db';
import { products, productVariants } from './server/db/schema';
import { eq, sql } from 'drizzle-orm';

async function fixAllProducts() {
    console.log('🔧 Starting product fixes...\n');

    try {
        // 1. Update Pump Compartment name
        console.log('1️⃣ Updating Pump Compartment...');
        const pump = await db.update(products)
            .set({
                name: 'HOUYI حجرة مضخة أكريليك قابلة للتوصيل - حجم متوسط',
                description: 'حجرة مضخة أكريليك جديدة قابلة للتوصيل والربط. مثالية لتنظيم المضخات والفلاتر داخل الحوض. مقاس متوسط: 10.5 × 10.5 × 23.5 سم. تصميم شفاف يسمح برؤية المعدات بوضوح.'
            })
            .where(eq(products.slug, 'houyi-acrylic-pump-compartment'))
            .returning();
        console.log(`   ✅ Updated: ${pump.length > 0 ? pump[0].name : 'Not found'}\n`);

        // 2. Get instant glue product ID
        console.log('2️⃣ Adding variants to Instant Glue...');
        const glueProduct = await db.select({ id: products.id })
            .from(products)
            .where(eq(products.slug, 'houyi-instant-glue-50g'));

        if (glueProduct.length > 0) {
            const productId = glueProduct[0].id;

            // Check if variants already exist
            const existingVariants = await db.select()
                .from(productVariants)
                .where(eq(productVariants.productId, productId));

            if (existingVariants.length === 0) {
                // Add variants
                const variants = [
                    { productId, name: '5 جرام - أخضر وأبيض', price: 400, stock: 50, sku: 'houyi-glue-5g' },
                    { productId, name: '20 جرام - أبيض', price: 2500, stock: 30, sku: 'houyi-glue-20g' },
                    { productId, name: '50 جرام - سائل CA', price: 600, stock: 20, sku: 'houyi-glue-50g' }
                ];

                for (const variant of variants) {
                    await db.insert(productVariants).values(variant);
                    console.log(`   ✅ Added variant: ${variant.name}`);
                }
            } else {
                console.log(`   ⚠️ Variants already exist (${existingVariants.length} found)`);
            }
        } else {
            console.log('   ❌ Glue product not found');
        }

        // 3. Update White Sand product
        console.log('\n3️⃣ Updating White Sand...');
        const sand = await db.update(products)
            .set({
                name: 'HOUYI رمل سيليكا أبيض نقي - للأحواض المائية',
                description: 'رمل سيليكا أبيض نقي عالي الجودة للأحواض المائية. نعومة فائقة وآمن للأسماك. مثالي للأحواض ذات الطابع الطبيعي.'
            })
            .where(eq(products.slug, 'houyi-white-sand'))
            .returning();
        console.log(`   ✅ Updated: ${sand.length > 0 ? sand[0].name : 'Not found'}\n`);

        // 4. Add variants to Oxygen Tube
        console.log('4️⃣ Adding variants to Oxygen Tube...');
        const tubeProduct = await db.select({ id: products.id })
            .from(products)
            .where(eq(products.slug, 'houyi-silicone-oxygen-tube'));

        if (tubeProduct.length > 0) {
            const tubeId = tubeProduct[0].id;

            const existingTubeVariants = await db.select()
                .from(productVariants)
                .where(eq(productVariants.productId, tubeId));

            if (existingTubeVariants.length === 0) {
                const tubeVariants = [
                    { productId: tubeId, name: '1 متر', price: 500, stock: 100, sku: 'houyi-tube-1m' },
                    { productId: tubeId, name: '2 متر', price: 900, stock: 80, sku: 'houyi-tube-2m' },
                    { productId: tubeId, name: '5 متر', price: 2000, stock: 50, sku: 'houyi-tube-5m' }
                ];

                for (const variant of tubeVariants) {
                    await db.insert(productVariants).values(variant);
                    console.log(`   ✅ Added variant: ${variant.name}`);
                }
            } else {
                console.log(`   ⚠️ Variants already exist (${existingTubeVariants.length} found)`);
            }
        } else {
            console.log('   ❌ Oxygen tube product not found');
        }

        // 5. Add variants to Foam Glue
        console.log('\n5️⃣ Adding variants to Foam Glue...');
        const foamProduct = await db.select({ id: products.id })
            .from(products)
            .where(eq(products.slug, 'houyi-foam-glue'));

        if (foamProduct.length > 0) {
            const foamId = foamProduct[0].id;

            const existingFoamVariants = await db.select()
                .from(productVariants)
                .where(eq(productVariants.productId, foamId));

            if (existingFoamVariants.length === 0) {
                const foamVariants = [
                    { productId: foamId, name: 'رمادي', price: 3500, stock: 30, sku: 'houyi-foam-gray' },
                    { productId: foamId, name: 'بني', price: 3500, stock: 30, sku: 'houyi-foam-brown' }
                ];

                for (const variant of foamVariants) {
                    await db.insert(productVariants).values(variant);
                    console.log(`   ✅ Added variant: ${variant.name}`);
                }
            } else {
                console.log(`   ⚠️ Variants already exist (${existingFoamVariants.length} found)`);
            }
        } else {
            console.log('   ❌ Foam glue product not found');
        }

        console.log('\n✅ All product fixes completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixAllProducts();
