import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
    // Get all products grouped by brand
    const products = await sql`
    SELECT id, slug, name, brand, category, price, variants
    FROM products 
    ORDER BY brand, name
  `;

    console.log('='.repeat(70));
    console.log(`إجمالي المنتجات في قاعدة البيانات: ${products.length}`);
    console.log('='.repeat(70));

    // Group by brand
    const byBrand: Record<string, any[]> = {};
    for (const p of products) {
        const brand = p.brand || 'بدون ماركة';
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
    }

    // Show count per brand
    console.log('\nعدد المنتجات حسب الماركة:');
    for (const [brand, prods] of Object.entries(byBrand)) {
        console.log(`  ${brand}: ${prods.length} منتج`);
    }

    // Show all product slugs
    console.log('\n' + '='.repeat(70));
    console.log('جميع المنتجات:');
    console.log('='.repeat(70));

    let counter = 1;
    for (const [brand, prods] of Object.entries(byBrand)) {
        console.log(`\n### ${brand} ###`);
        for (const p of prods) {
            const hasVariants = p.variants && (Array.isArray(p.variants) ? p.variants.length > 0 : false);
            const variantInfo = hasVariants ? ` [${p.variants.length} متغيرات]` : '';
            console.log(`${counter}. ${p.slug}${variantInfo}`);
            console.log(`   ${p.name} | ${p.price} IQD`);
            counter++;
        }
    }

    // Find products that might be duplicates (same base name different sizes)
    console.log('\n' + '='.repeat(70));
    console.log('منتجات قد تحتاج دمج (أسماء متشابهة):');
    console.log('='.repeat(70));

    // Check for similar names within same brand
    for (const [brand, prods] of Object.entries(byBrand)) {
        const groups: Record<string, any[]> = {};

        for (const p of prods) {
            // Remove size indicators to find base name
            const baseName = p.name
                .replace(/\d+\s*(واط|W|سم|cm|ملم|mm|لتر|L|جم|g|كجم|kg)/gi, '')
                .replace(/\s+(صغير|كبير|وسط|متوسط|S|M|L|XL|XXL)/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (!groups[baseName]) groups[baseName] = [];
            groups[baseName].push(p);
        }

        // Show groups with more than 1 product
        for (const [baseName, groupProds] of Object.entries(groups)) {
            if (groupProds.length > 1) {
                const hasAnyVariants = groupProds.some(p => p.variants && p.variants.length > 0);
                if (!hasAnyVariants) {
                    console.log(`\n📦 ${brand} - "${baseName}":`);
                    for (const p of groupProds) {
                        console.log(`   - ${p.slug}: ${p.name}`);
                    }
                }
            }
        }
    }
}

main().catch(console.error);
