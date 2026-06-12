import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

async function checkPrices() {
    const sql = neon(DATABASE_URL);

    console.log("\n📊 فحص الأسعار في قاعدة البيانات\n");
    console.log("═".repeat(60));

    // Check products with zero price
    const zeroPriceProducts = await sql`
    SELECT id, name, price, is_best_seller, category 
    FROM products 
    WHERE price::numeric = 0 OR price IS NULL
    ORDER BY name
    LIMIT 50
  `;

    console.log(`\n❌ المنتجات بدون سعر (0 أو NULL): ${zeroPriceProducts.length}\n`);

    if (zeroPriceProducts.length > 0) {
        zeroPriceProducts.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   ID: ${p.id}`);
            console.log(`   السعر: ${p.price}`);
            console.log(`   الفئة: ${p.category}`);
            console.log(`   الأكثر مبيعاً: ${p.is_best_seller ? '✅' : '❌'}`);
            console.log("");
        });
    }

    // Check best sellers
    console.log("\n" + "═".repeat(60));
    console.log("\n🏆 المنتجات الأكثر مبيعاً:\n");

    const bestSellers = await sql`
    SELECT id, name, price, is_best_seller, rating 
    FROM products 
    WHERE is_best_seller = true
    ORDER BY rating DESC
    LIMIT 20
  `;

    console.log(`عدد المنتجات الأكثر مبيعاً: ${bestSellers.length}\n`);

    bestSellers.forEach((p, i) => {
        const priceStatus = Number(p.price) === 0 ? '⚠️ بدون سعر!' : `${p.price} د.ع`;
        console.log(`${i + 1}. ${p.name} - ${priceStatus}`);
    });

    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("\n📈 ملخص:");

    const priceStats = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE price::numeric = 0) as zero_price,
      COUNT(*) FILTER (WHERE price::numeric > 0) as has_price,
      COUNT(*) as total
    FROM products
    WHERE deleted_at IS NULL
  `;

    if (priceStats.length > 0) {
        const s = priceStats[0];
        console.log(`   منتجات بسعر صفر: ${s.zero_price}`);
        console.log(`   منتجات بسعر صحيح: ${s.has_price}`);
        console.log(`   إجمالي المنتجات: ${s.total}`);
    }

    console.log("\n" + "═".repeat(60) + "\n");
}

checkPrices().catch(console.error);
