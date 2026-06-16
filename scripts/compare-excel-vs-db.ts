/**
 * يقارن منتجات Excel مع قاعدة البيانات ومجلد الصور
 */
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);
const HOUYI_DIR = "./client/public/images/products/houyi";
const EXCEL_FILE = "./Binzhou_Houyi (1) (1).xlsx";

// قراءة مجلدات الصور
function getImageFolders(): Set<string> {
    return new Set(
        fs.readdirSync(HOUYI_DIR)
            .filter(f => fs.statSync(path.join(HOUYI_DIR, f)).isDirectory())
            .map(f => f.toLowerCase())
    );
}

// تطبيع الاسم للمقارنة
function normalize(s: string): string {
    return s.toLowerCase().replace(/[-_\s]+/g, " ").trim();
}

// تحويل اسم Excel إلى slug محتمل
function toSlug(name: string): string {
    return "houyi-" + name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function main() {
    // قراءة Excel
    const wb = XLSX.readFile(EXCEL_FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    const excelProducts = rows.slice(1)
        .filter(r => r[1])
        .map(r => ({
            num: r[0],
            name: String(r[1]).trim(),
            category: String(r[2] || "").trim(),
            productId: String(r[3] || "").trim(),
        }));

    console.log(`📊 Excel: ${excelProducts.length} منتج\n`);

    // جلب DB
    const dbProducts = await sql`SELECT slug, name FROM products WHERE slug LIKE 'houyi-%' ORDER BY slug`;
    const dbSlugs = new Set(dbProducts.map((p: any) => p.slug));
    const dbNormNames = new Map(dbProducts.map((p: any) => [normalize(p.name), p.slug]));

    console.log(`🗄️  DB: ${dbProducts.length} منتج\n`);

    // مجلدات الصور
    const imageFolders = getImageFolders();
    console.log(`🖼️  مجلدات الصور: ${imageFolders.size}\n`);

    const missing_db: typeof excelProducts = [];
    const missing_img: typeof excelProducts = [];
    const ok: { excel: string; slug: string }[] = [];

    for (const p of excelProducts) {
        const possibleSlug = toSlug(p.name);
        const normalName = normalize(p.name);

        // بحث في DB — بالـ slug أو الاسم المطابق
        let foundSlug = "";
        if (dbSlugs.has(possibleSlug)) {
            foundSlug = possibleSlug;
        } else {
            // بحث جزئي بالاسم
            for (const [dbName, dbSlug] of dbNormNames) {
                const words = normalName.split(" ").filter(w => w.length > 3);
                const matchCount = words.filter(w => dbName.includes(w)).length;
                if (matchCount >= Math.max(2, Math.floor(words.length * 0.5))) {
                    foundSlug = dbSlug;
                    break;
                }
            }
        }

        // بحث في الصور
        const folderGuess = possibleSlug.replace("houyi-", "houyi-");
        const hasImage = imageFolders.has(folderGuess) || imageFolders.has(possibleSlug);

        if (!foundSlug) missing_db.push(p);
        if (!hasImage) missing_img.push(p);
        if (foundSlug && hasImage) ok.push({ excel: p.name, slug: foundSlug });
    }

    // ═══ تقرير ═══
    console.log("═══════════════════════════════════════════════════════");
    console.log(`✅ موجود في DB + مجلد صور:  ${ok.length}`);
    console.log(`❌ غائب عن قاعدة البيانات: ${missing_db.length}`);
    console.log(`🖼️  غائب عن مجلد الصور:     ${missing_img.length}`);
    console.log("═══════════════════════════════════════════════════════");

    if (missing_db.length > 0) {
        console.log(`\n❌ منتجات Excel غير موجودة في DB (${missing_db.length}):`);
        for (const p of missing_db) {
            console.log(`   ${p.num}. [${p.category}] ${p.name}`);
        }
    }

    if (missing_img.length > 0) {
        console.log(`\n🖼️  منتجات Excel بدون مجلد صور (${missing_img.length}):`);
        for (const p of missing_img) {
            console.log(`   ${p.num}. [${p.category}] ${p.name}`);
        }
    }

    // منتجات DB ليست في Excel
    const excelSlugs = new Set(excelProducts.map(p => toSlug(p.name)));
    const dbOnlyProducts = dbProducts.filter((p: any) => {
        const inExcel = excelProducts.some(ep => {
            const possible = toSlug(ep.name);
            if (p.slug === possible) return true;
            const words = normalize(ep.name).split(" ").filter((w: string) => w.length > 3);
            const matchCount = words.filter((w: string) => normalize(p.name).includes(w)).length;
            return matchCount >= Math.max(2, Math.floor(words.length * 0.5));
        });
        return !inExcel;
    });

    if (dbOnlyProducts.length > 0) {
        console.log(`\n⚠️  منتجات في DB ليست في Excel (${dbOnlyProducts.length}):`);
        for (const p of dbOnlyProducts) {
            console.log(`   ${p.slug}: ${p.name}`);
        }
    }

    process.exit(0);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
