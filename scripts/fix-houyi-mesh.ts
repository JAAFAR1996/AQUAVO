/**
 * Fix houyi-mesh product: it's a MOSS MESH (for attaching moss to surfaces),
 * NOT a filter mesh or isolation mesh.
 * 
 * Run with: npx tsx scripts/fix-houyi-mesh.ts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function fixHouyiMesh() {
    console.log("🔧 Fixing houyi-mesh product (Moss Mesh, NOT filter mesh)...\n");

    // Check current state
    const existing = await sql`SELECT id, name, description, category, subcategory FROM products WHERE id = 'houyi-mesh' LIMIT 1`;

    if (existing.length === 0) {
        console.error("❌ Product houyi-mesh not found in database!");
        process.exit(1);
    }

    const current = existing[0];
    console.log("📋 Current product state:");
    console.log(`   Name: ${current.name}`);
    console.log(`   Category: ${current.category}`);
    console.log(`   Subcategory: ${current.subcategory}`);
    console.log();

    // New correct data
    const updatedName = "HOUYI شبكة موس ستانلس ستيل 8×8 سم (Moss Mesh)";
    const updatedDescription = `هل تحلم بسجادة موس خضراء في قاع حوضك؟ شبكة الموس من HOUYI هي **"قاعدة السجادة الخضراء"**. شبكة ستانلس ستيل 304 بقياس 8×8 سم مصممة خصيصاً لتثبيت الموس (Java Moss, Christmas Moss, وغيرها) وإنشاء سجادات خضراء جميلة في قاع الحوض. 🌿

**"الحقيقة":** الموس بطبيعته يطفو ولا يثبت بسهولة. الشبكات البلاستيكية تطفو أيضاً! شبكة الستانلس تغرق بثقلها الطبيعي وتثبت الموس في القاع بدون أي إضافات. 💎

**"الفائدة":** سجادات موس خضراء كثيفة ومستقرة تغطي قاع الحوض، مظهر طبيعي خلاب يحاكي غابات الأمازون المائية.

**طريقة الاستخدام:**
1. ضع طبقة رقيقة من الموس على الشبكة
2. غطّها بشبكة ثانية (اختياري) أو اربطها بخيط صيد شفاف
3. ضع الشبكة في قاع الحوض - ستغرق تلقائياً
4. خلال 2-4 أسابيع سينمو الموس ويغطي الشبكة بالكامل`;

    const updatedSpecs = {
        brand: "Houyi",
        model: "Moss Mesh 8cm",
        benefits: [
            "ستانلس ستيل 304 مقاوم للصدأ",
            "تغرق تلقائياً بدون أوزان إضافية",
            "فتحات دقيقة مثالية لتثبيت الموس",
            "سهلة التشكيل والقص",
            "آمنة كيميائياً للأسماك والنباتات",
            "تدوم للأبد ولا تتحلل"
        ],
        "القياس": "8 × 8 سم",
        "المادة": "ستانلس ستيل 304 (SS304)",
        "الفتحات": "دقيقة (Fine Mesh)",
        "الاستخدام": "تثبيت الموس (Java Moss, Christmas Moss, Flame Moss)",
        "مناسب لـ": "إنشاء سجادات موس، تغطية الأسطح، تزيين الصخور والأخشاب",
        "طريقة الاستخدام": "وزّع الموس على الشبكة بالتساوي واربطه بخيط شفاف أو شبكة ثانية. ضع في القاع وانتظر 2-4 أسابيع للنمو الكامل.",
        "تحذيرات": "لا تضع طبقة موس سميكة جداً - الطبقة الرقيقة تنمو أسرع وأجمل. تأكد من وجود إضاءة كافية للنمو."
    };

    const updatedCategory = "التربة والديكور";
    const updatedSubcategory = "إكسسوارات النباتات";

    // Update the product
    await sql`
        UPDATE products 
        SET 
            name = ${updatedName},
            description = ${updatedDescription},
            category = ${updatedCategory},
            subcategory = ${updatedSubcategory},
            specifications = ${JSON.stringify(updatedSpecs)}::jsonb,
            brand = 'Houyi',
            updated_at = NOW()
        WHERE id = 'houyi-mesh'
    `;

    console.log("✅ Product updated successfully!\n");

    // Verify the update
    const updated = await sql`SELECT id, name, category, subcategory FROM products WHERE id = 'houyi-mesh' LIMIT 1`;

    if (updated.length > 0) {
        console.log("🔍 Verification:");
        console.log(`   Name: ${updated[0].name}`);
        console.log(`   Category: ${updated[0].category}`);
        console.log(`   Subcategory: ${updated[0].subcategory}`);
    }

    console.log("\n🎉 Done! houyi-mesh is now correctly labeled as a Moss Mesh.");
}

fixHouyiMesh().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
