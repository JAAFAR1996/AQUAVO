import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

interface Product {
    id: number;
    name: string;
    brand: string;
    category: string;
    price: number;
    stock: number;
    slug: string;
    variants: any;
}

async function main() {
    console.log('='.repeat(80));
    console.log('تحليل المنتجات في قاعدة البيانات - FIST-LIVE');
    console.log('='.repeat(80));
    console.log();

    // Get all products ordered by brand and name
    const products = await sql`
    SELECT id, name, brand, category, price, stock, slug, variants
    FROM products 
    ORDER BY brand, category, name
  ` as Product[];

    console.log(`إجمالي المنتجات: ${products.length}`);
    console.log();

    // Group products by brand
    const byBrand: Record<string, Product[]> = {};
    for (const p of products) {
        const brand = p.brand || 'بدون ماركة';
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
    }

    // Show products by brand
    console.log('='.repeat(80));
    console.log('المنتجات حسب الماركة:');
    console.log('='.repeat(80));

    for (const [brand, prods] of Object.entries(byBrand)) {
        console.log();
        console.log(`\n### ${brand} (${prods.length} منتج) ###`);
        console.log('-'.repeat(60));

        // Group by category within brand
        const byCategory: Record<string, Product[]> = {};
        for (const p of prods) {
            const cat = p.category || 'بدون فئة';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(p);
        }

        for (const [cat, catProds] of Object.entries(byCategory)) {
            console.log(`\n  📁 ${cat}:`);
            for (const p of catProds) {
                const hasVariants = p.variants && (Array.isArray(p.variants) ? p.variants.length > 0 : Object.keys(p.variants).length > 0);
                console.log(`    - [${p.id}] ${p.name} | السعر: ${p.price} | المخزون: ${p.stock}${hasVariants ? ' ⚡(له متغيرات)' : ''}`);
            }
        }
    }

    // Find potential merge candidates (products with similar names)
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🔍 منتجات يُحتمل أنها تحتاج دمج (أسماء متشابهة):');
    console.log('='.repeat(80));

    const potentialMerges: { group: string; products: Product[] }[] = [];

    // Check for heater products
    const heaters = products.filter(p =>
        p.name.includes('سخان') || p.name.includes('هيتر') ||
        p.name.toLowerCase().includes('heater')
    );
    if (heaters.length > 1) {
        potentialMerges.push({ group: 'سخانات / Heaters', products: heaters });
    }

    // Check for filter products
    const filters = products.filter(p =>
        p.name.includes('فلتر') || p.name.toLowerCase().includes('filter')
    );
    if (filters.length > 1) {
        potentialMerges.push({ group: 'فلاتر / Filters', products: filters });
    }

    // Check for pump products
    const pumps = products.filter(p =>
        p.name.includes('مضخة') || p.name.includes('هواء') ||
        p.name.toLowerCase().includes('pump') || p.name.toLowerCase().includes('air')
    );
    if (pumps.length > 1) {
        potentialMerges.push({ group: 'مضخات / Pumps', products: pumps });
    }

    // Check for light products
    const lights = products.filter(p =>
        p.name.includes('إضاءة') || p.name.includes('ضوء') || p.name.includes('LED') ||
        p.name.toLowerCase().includes('light') || p.name.toLowerCase().includes('led')
    );
    if (lights.length > 1) {
        potentialMerges.push({ group: 'إضاءة / Lights', products: lights });
    }

    // Check for food products
    const food = products.filter(p =>
        p.name.includes('طعام') || p.name.includes('غذاء') ||
        p.name.toLowerCase().includes('food') || p.name.toLowerCase().includes('feed')
    );
    if (food.length > 1) {
        potentialMerges.push({ group: 'أطعمة / Food', products: food });
    }

    // Check for tank/aquarium products
    const tanks = products.filter(p =>
        p.name.includes('حوض') || p.name.includes('أكواريوم') ||
        p.name.toLowerCase().includes('tank') || p.name.toLowerCase().includes('aquarium')
    );
    if (tanks.length > 1) {
        potentialMerges.push({ group: 'أحواض / Tanks', products: tanks });
    }

    // Check for net products
    const nets = products.filter(p =>
        p.name.includes('شبكة') || p.name.includes('صيد') ||
        p.name.toLowerCase().includes('net') || p.name.toLowerCase().includes('fishing')
    );
    if (nets.length > 1) {
        potentialMerges.push({ group: 'شبكات / Nets', products: nets });
    }

    // Check for thermometer products
    const thermometers = products.filter(p =>
        p.name.includes('ميزان') || p.name.includes('حرارة') ||
        p.name.toLowerCase().includes('thermometer') || p.name.toLowerCase().includes('temperature')
    );
    if (thermometers.length > 1) {
        potentialMerges.push({ group: 'موازين الحرارة / Thermometers', products: thermometers });
    }

    // Check for stone products (decoration/air stones)
    const stones = products.filter(p =>
        p.name.includes('حجر') || p.name.includes('ديكور') ||
        p.name.toLowerCase().includes('stone') || p.name.toLowerCase().includes('decor')
    );
    if (stones.length > 1) {
        potentialMerges.push({ group: 'أحجار / Stones', products: stones });
    }

    // Check for brush/cleaning products
    const cleaning = products.filter(p =>
        p.name.includes('فرشاة') || p.name.includes('تنظيف') ||
        p.name.toLowerCase().includes('brush') || p.name.toLowerCase().includes('clean')
    );
    if (cleaning.length > 1) {
        potentialMerges.push({ group: 'تنظيف / Cleaning', products: cleaning });
    }

    // Print potential merges
    for (const { group, products: groupProducts } of potentialMerges) {
        console.log(`\n📦 ${group}:`);
        for (const p of groupProducts) {
            console.log(`   [${p.id}] ${p.name}`);
            console.log(`        الماركة: ${p.brand} | الفئة: ${p.category} | السعر: ${p.price}`);
        }
    }

    // Find products that already have variants
    console.log('\n');
    console.log('='.repeat(80));
    console.log('✅ منتجات لديها متغيرات بالفعل:');
    console.log('='.repeat(80));

    const withVariants = products.filter(p =>
        p.variants && (Array.isArray(p.variants) ? p.variants.length > 0 : Object.keys(p.variants).length > 0)
    );

    for (const p of withVariants) {
        console.log(`\n[${p.id}] ${p.name}`);
        console.log(`   الماركة: ${p.brand} | الفئة: ${p.category}`);
        console.log(`   المتغيرات: ${JSON.stringify(p.variants, null, 2)}`);
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('📊 ملخص:');
    console.log('='.repeat(80));
    console.log(`إجمالي المنتجات: ${products.length}`);
    console.log(`عدد الماركات: ${Object.keys(byBrand).length}`);
    console.log(`منتجات لها متغيرات: ${withVariants.length}`);
    console.log(`مجموعات محتملة للدمج: ${potentialMerges.length}`);
}

main().catch(console.error);
