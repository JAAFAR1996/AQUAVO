import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // جلب كل منتجات Houyi مع تفاصيل كاملة
  const products = await sql`
    SELECT id, name, slug, price, stock, has_variants, variants, category, subcategory, images
    FROM products 
    WHERE deleted_at IS NULL AND brand = 'Houyi'
    ORDER BY category, subcategory, id
  `;

  // تحليل: البحث عن منتجات متشابهة بالاسم (نفس المنتج بأحجام مختلفة)
  const analysis: any = {};
  
  for (const p of products) {
    // استخراج الاسم الأساسي بدون الحجم
    const baseName = p.id.replace(/-sm$|-md$|-lg$|-xl$|-root$|-small$|-medium$|-large$/, '');
    
    if (!analysis[baseName]) {
      analysis[baseName] = [];
    }
    analysis[baseName].push({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      has_variants: p.has_variants,
      variantCount: Array.isArray(p.variants) ? p.variants.length : 0,
      category: `${p.category}/${p.subcategory}`,
      hasImages: Array.isArray(p.images) && p.images.length > 0
    });
  }

  // فصل: منتجات تحتاج دمج (أكثر من منتج بنفس الاسم الأساسي)
  const needMerge: any = {};
  const alreadyHasVariants: any = {};
  const standalone: string[] = [];

  for (const [base, items] of Object.entries(analysis) as any) {
    if (items.length > 1) {
      needMerge[base] = items;
    } else if (items[0].has_variants) {
      alreadyHasVariants[base] = items[0];
    } else {
      standalone.push(`${items[0].id}: ${items[0].name}`);
    }
  }

  const result = {
    "تحتاج_دمج": needMerge,
    "عندها_variants_بالفعل": alreadyHasVariants,
    "منتجات_مستقلة_عدد": standalone.length,
    "إجمالي_المنتجات": products.length
  };

  fs.writeFileSync('merge-analysis.json', JSON.stringify(result, null, 2));
  console.log("=== تحليل المنتجات ===\n");
  
  console.log("📦 تحتاج دمج:");
  for (const [base, items] of Object.entries(needMerge) as any) {
    console.log(`\n  ${base}:`);
    for (const item of items) {
      console.log(`    - ${item.id} | ${item.name} | ${item.price} د.ع | مخزون: ${item.stock} | صور: ${item.hasImages}`);
    }
  }

  console.log("\n✅ عندها variants بالفعل:");
  for (const [base, item] of Object.entries(alreadyHasVariants) as any) {
    console.log(`  ${item.id} | ${item.name} | variants: ${item.variantCount}`);
  }

  console.log(`\n📌 منتجات مستقلة: ${standalone.length}`);
  console.log(`📊 إجمالي: ${products.length}`);
}
main().catch(console.error);
