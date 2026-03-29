/**
 * يتحقق من أن كل منتجات houyi لها صور صحيحة في قاعدة البيانات
 * ويقارن مع المجلدات الموجودة فعلياً
 */
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

const DATABASE_URL = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

const HOUYI_DIR = "./client/public/images/products/houyi";

// جمع كل الصور المتاحة (مجلدات وملفات مباشرة)
function getAllImages(dir: string): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(fullPath)
                .filter(f => /\.(png|jpg|jpeg|webp|avif)$/i.test(f))
                .map(f => `/images/products/houyi/${entry}/${f}`);
            if (files.length > 0) result[entry] = files;
        } else if (/\.(png|jpg|jpeg|webp|avif)$/i.test(entry)) {
            result[entry] = [`/images/products/houyi/${entry}`];
        }
    }
    return result;
}

async function main() {
    // جلب كل منتجات houyi من قاعدة البيانات
    const products = await sql`
        SELECT id, slug, name, thumbnail, images
        FROM products
        WHERE slug LIKE 'houyi-%'
        ORDER BY slug
    `;

    const availableImages = getAllImages(HOUYI_DIR);

    console.log(`\n📦 منتجات houyi في DB: ${products.length}`);
    console.log(`🖼️  مجلدات/ملفات متاحة: ${Object.keys(availableImages).length}\n`);

    const broken: { id: string; slug: string; name: string; thumbnail: string; reason: string; suggestion: string }[] = [];
    const ok: string[] = [];

    for (const p of products) {
        const thumb: string = p.thumbnail || "";
        // تحقق هل المسار يشير لملف موجود فعلاً
        const relativePath = thumb.replace(/^\/images\/products\/houyi\//, "");
        const parts = relativePath.split("/");

        let exists = false;
        if (parts.length >= 2) {
            // مسار من نوع folder/file.png
            const folderName = decodeURIComponent(parts[0]);
            const fileName = parts[1];
            const filePath = path.join(HOUYI_DIR, folderName, fileName);
            exists = fs.existsSync(filePath);
        } else if (parts.length === 1) {
            // ملف مباشر
            exists = fs.existsSync(path.join(HOUYI_DIR, parts[0]));
        }

        if (!thumb || !exists) {
            // حاول تخمين المجلد الصحيح بناءً على slug
            const slugFolder = p.slug; // e.g. houyi-thai-branches
            let suggestion = "";

            // بحث مباشر بالاسم
            if (availableImages[slugFolder]) {
                suggestion = availableImages[slugFolder][0];
            } else {
                // بحث جزئي
                const slugKey = p.slug.replace("houyi-", "").replace(/-/g, "");
                const match = Object.keys(availableImages).find(folder => {
                    const folderKey = folder.replace("houyi-", "").replace(/-/g, "").toLowerCase();
                    return folderKey.includes(slugKey.toLowerCase()) || slugKey.includes(folderKey.toLowerCase());
                });
                if (match) suggestion = availableImages[match][0];
            }

            broken.push({
                id: p.id,
                slug: p.slug,
                name: p.name,
                thumbnail: thumb,
                reason: !thumb ? "فارغ" : "ملف غير موجود",
                suggestion,
            });
        } else {
            ok.push(p.slug);
        }
    }

    console.log(`✅ سليمة: ${ok.length}`);
    console.log(`❌ مكسورة: ${broken.length}\n`);

    if (broken.length > 0) {
        console.log("═══════════════════════════════════════════════════");
        console.log("المنتجات ذات الصور المكسورة:");
        console.log("═══════════════════════════════════════════════════");
        for (const b of broken) {
            console.log(`\n📦 ${b.slug}`);
            console.log(`   الاسم:    ${b.name}`);
            console.log(`   السبب:    ${b.reason}`);
            console.log(`   DB thumb: ${b.thumbnail || "(فارغ)"}`);
            console.log(`   اقتراح:   ${b.suggestion || "❓ لا يوجد تطابق"}`);
        }
    }

    // عرض مجلدات لا يوجد لها منتج في DB
    const slugsInDB = new Set(products.map((p: any) => p.slug));
    const orphanFolders = Object.keys(availableImages).filter(folder => {
        const folderSlug = folder.startsWith("houyi-") ? folder : `houyi-${folder}`;
        return !slugsInDB.has(folder) && !slugsInDB.has(folderSlug);
    });

    if (orphanFolders.length > 0) {
        console.log(`\n⚠️  مجلدات بدون منتج في DB (${orphanFolders.length}):`);
        for (const f of orphanFolders) console.log(`   📁 ${f}`);
    }

    process.exit(0);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
