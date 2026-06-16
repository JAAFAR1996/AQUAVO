import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // 1. جلب كل مسارات الصور من كل المنتجات (بما فيها المحذوفة)
  const all = await sql`
    SELECT id, name, images
    FROM products WHERE brand = 'Houyi'
    ORDER BY id
  `;
  
  // استخراج كل المجلدات الفريدة
  const folders = new Set<string>();
  const productFolderMap: Record<string, string[]> = {};
  
  for (const p of all) {
    const imgs = Array.isArray(p.images) ? p.images as string[] : [];
    const productFolders: string[] = [];
    for (const img of imgs) {
      const parts = img.split('/');
      if (parts.length >= 5) {
        const folder = parts[4];
        folders.add(folder);
        productFolders.push(folder);
      }
    }
    productFolderMap[p.id] = [...new Set(productFolders)];
  }
  
  console.log("=== ALL image folders on server ===\n");
  const sortedFolders = [...folders].sort();
  for (const f of sortedFolders) {
    console.log(`  ${f}`);
  }
  
  // 2. Check: هل يوجد مجلد خاص بالـ wave pump?
  console.log("\n=== Looking for wave-pump folder ===");
  const waveFolders = sortedFolders.filter(f => f.includes('wave') || f.includes('pump') || f.includes('wp'));
  console.log(waveFolders.length ? waveFolders.join(', ') : "NOT FOUND");
  
  // 3. Check: هل يوجد مجلد خاص بالـ stainless shunt?
  console.log("\n=== Looking for stainless-shunt folder ===");
  const shuntFolders = sortedFolders.filter(f => f.includes('stainless') || f.includes('shunt') || f.includes('metal'));
  console.log(shuntFolders.length ? shuntFolders.join(', ') : "NOT FOUND");

  // 4. Check: هل يوجد مجلد خاص بالـ koi-fish-net بصور حقيقية؟
  console.log("\n=== Looking for koi/aluminum net folder ===");
  const koiFolders = sortedFolders.filter(f => f.includes('koi') || f.includes('aluminum') || f.includes('alloy'));
  console.log(koiFolders.length ? koiFolders.join(', ') : "  koi: " + koiFolders.join(', '));

  // 5. قائمة كل المنتجات المحذوفة وصورها (ممكن عندها صور صحيحة)
  console.log("\n=== Deleted products (might have correct images) ===");
  const deleted = await sql`
    SELECT id, name, images FROM products 
    WHERE deleted_at IS NOT NULL AND brand = 'Houyi'
    ORDER BY id
  `;
  for (const p of deleted) {
    const imgs = Array.isArray(p.images) ? p.images as string[] : [];
    if (imgs.length > 0) {
      const folderList = imgs.map((i: string) => i.split('/')[4] || '').filter(Boolean);
      console.log(`  ${p.id}: folders=[${[...new Set(folderList)].join(', ')}]`);
    }
  }

  // 6. المنتجات اللي تستخدم مجلد مختلف عن الـ ID
  console.log("\n=== Cross-reference: Product ID vs Image Folder ===");
  for (const p of all) {
    const imgs = Array.isArray(p.images) ? p.images as string[] : [];
    for (const img of imgs) {
      const folder = img.split('/')[4] || '';
      if (folder && folder !== p.id) {
        console.log(`  ${p.id} => folder: ${folder} ${folder.includes('wood-products') ? '(OK-shared)' : '(!MISMATCH!)'}`);
        break;
      }
    }
  }
}
main().catch(console.error);
