import { db } from './server/db';
import { products } from './server/db/schema';
import { eq } from 'drizzle-orm';

async function updateProduct() {
    try {
        const result = await db.update(products)
            .set({
                name: 'HOUYI حجرة مضخة أكريليك قابلة للتوصيل - حجم متوسط',
                description: 'حجرة مضخة أكريليك جديدة قابلة للتوصيل والربط. مثالية لتنظيم المضخات والفلاتر داخل الحوض. مقاس متوسط: 10.5 × 10.5 × 23.5 سم. تصميم شفاف يسمح برؤية المعدات بوضوح.',
                specifications: JSON.stringify({
                    'المقاس': '10.5 × 10.5 × 23.5 سم',
                    'المادة': 'أكريليك شفاف',
                    'النوع': 'قابل للتوصيل (Spliceable)',
                    'الحجم': 'متوسط'
                })
            })
            .where(eq(products.slug, 'houyi-acrylic-pump-compartment'))
            .returning();

        if (result.length > 0) {
            console.log('✅ Updated:', result[0].name);
        } else {
            console.log('❌ Product not found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateProduct();
