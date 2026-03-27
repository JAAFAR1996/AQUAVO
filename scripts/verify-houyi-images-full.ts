import { neon } from "@neondatabase/serverless";
import { readdirSync, existsSync, statSync } from "fs";
import { join } from "path";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function main() {
  // 1. Get all HOUYI products from DB
  const rows = await sql`
    SELECT id, name, slug, category, brand, images, price 
    FROM products 
    WHERE (brand = 'Houyi' OR brand = 'HOUYI' OR name ILIKE '%HOUYI%' OR name ILIKE '%houyi%') 
      AND (deleted_at IS NULL) 
    ORDER BY category, name
  `;

  console.log(`\n${"=".repeat(80)}`);
  console.log(`  فحص شامل لمنتجات HOUYI - الصور والملفات`);
  console.log(`${"=".repeat(80)}`);
  console.log(`\nعدد المنتجات في قاعدة البيانات: ${rows.length}\n`);

  // 2. Check Houyi image folders on disk
  const houyiImagesDir = join(process.cwd(), "client", "public", "images", "products", "houyi");
  let diskFolders: string[] = [];
  
  if (existsSync(houyiImagesDir)) {
    diskFolders = readdirSync(houyiImagesDir).filter(f => {
      const fullPath = join(houyiImagesDir, f);
      return statSync(fullPath).isDirectory();
    });
    console.log(`عدد مجلدات الصور على الديسك: ${diskFolders.length}\n`);
  } else {
    console.log("⚠️ مجلد الصور غير موجود!\n");
  }

  // 3. Also check the original Houyi source folder
  const houyiSourceDir = join(process.cwd(), "Houyi");
  let sourceFolders: string[] = [];
  if (existsSync(houyiSourceDir)) {
    sourceFolders = readdirSync(houyiSourceDir).filter(f => {
      const fullPath = join(houyiSourceDir, f);
      return statSync(fullPath).isDirectory();
    });
    console.log(`عدد مجلدات المصدر (Houyi/): ${sourceFolders.length}\n`);
  }

  // 4. Check each product's images
  let okCount = 0;
  let brokenCount = 0;
  let noImageCount = 0;
  const brokenProducts: any[] = [];
  const duplicateImageProducts: any[] = [];

  console.log(`${"─".repeat(80)}`);
  console.log(`  تفاصيل فحص الصور لكل منتج`);
  console.log(`${"─".repeat(80)}\n`);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rawImages = r.images;
    let imagePaths: string[] = [];
    if (Array.isArray(rawImages)) {
      imagePaths = rawImages;
    } else if (typeof rawImages === "string" && rawImages) {
      imagePaths = rawImages.split(",").map((s: string) => s.trim());
    }
    
    if (imagePaths.length === 0) {
      noImageCount++;
      console.log(`❌ ${i + 1}. [${r.slug}] ${r.name}`);
      console.log(`   ⚠️ لا توجد صور!\n`);
      brokenProducts.push({ slug: r.slug, name: r.name, issue: "لا توجد صور" });
      continue;
    }

    let allExist = true;
    let brokenFiles: string[] = [];
    
    for (const imgPath of imagePaths) {
      const fullPath = join(process.cwd(), "client", "public", imgPath);
      if (!existsSync(fullPath)) {
        allExist = false;
        brokenFiles.push(imgPath);
      }
    }

    if (allExist) {
      okCount++;
      console.log(`✅ ${i + 1}. [${r.slug}] ${r.name} (${imagePaths.length} صور)`);
    } else {
      brokenCount++;
      console.log(`❌ ${i + 1}. [${r.slug}] ${r.name}`);
      for (const bf of brokenFiles) {
        console.log(`   ⛔ ملف مفقود: ${bf}`);
      }
      brokenProducts.push({ slug: r.slug, name: r.name, issue: "ملفات مفقودة", brokenFiles });
    }
  }

  // 5. Check for duplicate images (same images used by multiple products)
  const imageToProducts: Record<string, string[]> = {};
  for (const r of rows) {
    const rawImg = r.images;
    let imagePaths: string[] = [];
    if (Array.isArray(rawImg)) {
      imagePaths = rawImg;
    } else if (typeof rawImg === "string" && rawImg) {
      imagePaths = rawImg.split(",").map((s: string) => s.trim());
    }
    // Get the folder name from the first image
    if (imagePaths.length > 0) {
      const firstImg = imagePaths[0];
      // Extract folder: /images/products/houyi/FOLDER_NAME/file.jpg
      const match = firstImg.match(/\/images\/products\/houyi\/([^/]+)\//);
      if (match) {
        const folder = match[1];
        if (!imageToProducts[folder]) imageToProducts[folder] = [];
        imageToProducts[folder].push(r.slug);
      }
    }
  }

  console.log(`\n${"─".repeat(80)}`);
  console.log(`  مجلدات صور مستخدمة من أكثر من منتج (تكرار)`);
  console.log(`${"─".repeat(80)}\n`);
  
  let hasDuplicates = false;
  for (const [folder, slugs] of Object.entries(imageToProducts)) {
    if (slugs.length > 1) {
      hasDuplicates = true;
      console.log(`⚠️ مجلد "${folder}" يستخدمه:`);
      for (const s of slugs) {
        console.log(`   - ${s}`);
      }
    }
  }
  if (!hasDuplicates) {
    console.log("✅ لا توجد مجلدات مكررة بين المنتجات");
  }

  // 6. Check for disk folders that don't have DB products  
  console.log(`\n${"─".repeat(80)}`);
  console.log(`  مجلدات صور على الديسك بدون منتج في قاعدة البيانات`);
  console.log(`${"─".repeat(80)}\n`);

  const usedFolders = new Set(Object.keys(imageToProducts));
  let orphanCount = 0;
  for (const folder of diskFolders) {
    if (!usedFolders.has(folder)) {
      orphanCount++;
      // Count images in the folder
      const folderPath = join(houyiImagesDir, folder);
      const files = readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
      console.log(`📁 ${folder} (${files.length} صور) - غير مرتبط بأي منتج`);
    }
  }
  if (orphanCount === 0) {
    console.log("✅ جميع المجلدات مرتبطة بمنتجات");
  }

  // 7. Source folders not matched
  console.log(`\n${"─".repeat(80)}`);
  console.log(`  ملخص النتائج`);
  console.log(`${"─".repeat(80)}\n`);
  
  console.log(`📊 إجمالي المنتجات: ${rows.length}`);
  console.log(`✅ صور صحيحة: ${okCount}`);
  console.log(`❌ صور مكسورة/مفقودة: ${brokenCount}`);
  console.log(`⚠️ بدون صور: ${noImageCount}`);
  console.log(`📁 مجلدات على الديسك: ${diskFolders.length}`);
  console.log(`📁 مجلدات يتيمة (بدون منتج): ${orphanCount}`);

  // 8. List source folders for reference
  console.log(`\n${"─".repeat(80)}`);
  console.log(`  مجلدات المصدر الأصلية (Houyi/) - ${sourceFolders.length} مجلد`);
  console.log(`${"─".repeat(80)}\n`);
  for (let i = 0; i < sourceFolders.length; i++) {
    console.log(`${i + 1}. ${sourceFolders[i]}`);
  }
}

main().catch(console.error);
