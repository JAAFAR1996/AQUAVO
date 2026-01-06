/**
 * استخدام API لإضافة الخيارات للصق
 */

const API_URL = 'http://localhost:5000';

async function updateViaAPI() {
    console.log("🔍 جلب منتجات اللصق من API...\n");

    // جلب كل المنتجات
    const response = await fetch(`${API_URL}/api/products?limit=200`);
    if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const products: any[] = await response.json();
    console.log(`✅ تم جلب ${products.length} منتج\n`);

    // البحث عن منتجات اللصق
    const glueProducts = products.filter(p =>
        p.name.toLowerCase().includes('glue') ||
        p.name.toLowerCase().includes('لصق') ||
        p.slug.includes('instant') ||
        p.slug.includes('glue')
    );

    console.log(`📦 منتجات اللصق الموجودة (${glueProducts.length}):`);
    glueProducts.forEach(p => {
        console.log(`   - ${p.id}: ${p.name}`);
        console.log(`     has_variants: ${p.hasVariants}`);
    });

    if (glueProducts.length === 0) {
        console.log("\n❌ لم يتم العثور على منتجات لصق!");
        console.log("\n📋 أول 10 منتجات للمراجعة:");
        products.slice(0, 10).forEach(p => {
            console.log(`   - ${p.id}: ${p.name}`);
        });
        process.exit(1);
    }

    // الخيارات
    const variants = [
        { id: "5g-green", label: "5 جرام - أخضر", price: 0, stock: 50, isDefault: false },
        { id: "5g-white", label: "5 جرام - أبيض", price: 0, stock: 50, isDefault: false },
        { id: "20g-white", label: "20 جرام - أبيض", price: 0, stock: 50, isDefault: false },
        { id: "50g-clear", label: "50 جرام - شفاف", price: 0, stock: 50, isDefault: true }
    ];

    // تحديث كل منتج لصق
    for (const product of glueProducts) {
        console.log(`\n🔄 تحديث: ${product.name}...`);

        const updateResponse = await fetch(`${API_URL}/api/products/${product.id}/variants`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hasVariants: true,
                variants: variants
            })
        });

        if (updateResponse.ok) {
            console.log(`   ✅ تم إضافة ${variants.length} خيارات!`);
        } else {
            console.log(`   ❌ فشل: ${updateResponse.statusText}`);
        }
    }

    console.log("\n═══════════════════════════════════════");
    console.log("✅ تم الانتهاء!");
    console.log("═══════════════════════════════════════");
}

updateViaAPI().catch(e => {
    console.error("Error:", e.message);
    process.exit(1);
});
