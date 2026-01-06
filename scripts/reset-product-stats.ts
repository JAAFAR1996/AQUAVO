/**
 * Reset All Product Statistics Script
 * تصفير جميع إحصائيات المنتجات والطلبات والتقييمات
 * 
 * يُنفذ بأمر: npx tsx scripts/reset-product-stats.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment variables");
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function resetAllStats() {
    console.log("🚀 بدء تصفير جميع الإحصائيات...\n");

    try {
        // 1. تصفير أسعار وتقييمات المنتجات
        console.log("📦 تصفير المنتجات (السعر، التقييم، عدد التقييمات)...");
        await sql`
            UPDATE products 
            SET 
                price = '0',
                original_price = NULL,
                rating = '0',
                review_count = 0,
                is_best_seller = false,
                is_product_of_week = false
        `;
        const [productCount] = await sql`SELECT COUNT(*) as count FROM products`;
        console.log(`   ✅ تم تصفير ${productCount.count} منتج\n`);

        // 2. حذف جميع التقييمات
        console.log("⭐ حذف جميع التقييمات...");
        const [reviewCount] = await sql`SELECT COUNT(*) as count FROM reviews`;
        await sql`DELETE FROM review_ratings`;
        await sql`DELETE FROM reviews`;
        console.log(`   ✅ تم حذف ${reviewCount.count} تقييم\n`);

        // 3. حذف عناصر الطلبات أولاً
        console.log("📋 حذف عناصر الطلبات...");
        const [orderItemCount] = await sql`SELECT COUNT(*) as count FROM order_items_relational`;
        await sql`DELETE FROM order_items_relational`;
        console.log(`   ✅ تم حذف ${orderItemCount.count} عنصر\n`);

        // 4. حذف المدفوعات
        console.log("💳 حذف المدفوعات...");
        const [paymentCount] = await sql`SELECT COUNT(*) as count FROM payments`;
        await sql`DELETE FROM payments`;
        console.log(`   ✅ تم حذف ${paymentCount.count} دفعة\n`);

        // 5. حذف جميع الطلبات
        console.log("🛒 حذف جميع الطلبات...");
        const [orderCount] = await sql`SELECT COUNT(*) as count FROM orders`;
        await sql`DELETE FROM orders`;
        console.log(`   ✅ تم حذف ${orderCount.count} طلب\n`);

        // 6. حذف السلات
        console.log("🛍️ حذف جميع السلات...");
        const [cartCount] = await sql`SELECT COUNT(*) as count FROM cart_items`;
        await sql`DELETE FROM cart_items`;
        console.log(`   ✅ تم حذف ${cartCount.count} سلة\n`);

        // 7. حذف الزيارات
        console.log("👁️ حذف سجل الزيارات...");
        const [pageViewCount] = await sql`SELECT COUNT(*) as count FROM page_views`;
        await sql`DELETE FROM page_views`;
        console.log(`   ✅ تم حذف ${pageViewCount.count} زيارة\n`);

        // 8. حذف إحصائيات المبيعات
        console.log("📊 حذف إحصائيات المبيعات...");
        const [salesStatCount] = await sql`SELECT COUNT(*) as count FROM sales_stats`;
        await sql`DELETE FROM sales_stats`;
        console.log(`   ✅ تم حذف ${salesStatCount.count} سجل\n`);

        // 9. تصفير نقاط الولاء للمستخدمين
        console.log("🎁 تصفير نقاط الولاء...");
        await sql`
            UPDATE users 
            SET 
                loyalty_points = 0,
                loyalty_tier = 'bronze',
                cashback_balance = 0
        `;
        console.log(`   ✅ تم تصفير نقاط الولاء\n`);

        // 10. حذف حملات البريد
        console.log("📧 حذف حملات البريد...");
        const [emailCampaignCount] = await sql`SELECT COUNT(*) as count FROM email_campaigns`;
        await sql`DELETE FROM email_campaigns`;
        console.log(`   ✅ تم حذف ${emailCampaignCount.count} حملة\n`);

        // 11. حذف سجلات الإحالات (referrals)
        console.log("👥 حذف سجلات الإحالات...");
        await sql`DELETE FROM referrals`;
        await sql`UPDATE referral_codes SET total_referrals = 0, total_points_earned = 0`;
        console.log(`   ✅ تم تصفير الإحالات\n`);

        console.log("═".repeat(50));
        console.log("✅ تم تصفير جميع الإحصائيات بنجاح!");
        console.log("═".repeat(50));
        console.log("\n📋 ملخص:");
        console.log(`   - المنتجات: ${productCount.count} (تم تصفير السعر والتقييم)`);
        console.log(`   - التقييمات المحذوفة: ${reviewCount.count}`);
        console.log(`   - الطلبات المحذوفة: ${orderCount.count}`);
        console.log(`   - الزيارات المحذوفة: ${pageViewCount.count}`);
        console.log("\n🎉 الموقع جاهز بالمنتجات فقط!");

    } catch (error) {
        console.error("❌ حدث خطأ:", error);
        process.exit(1);
    }

    process.exit(0);
}

// تنفيذ
resetAllStats();
