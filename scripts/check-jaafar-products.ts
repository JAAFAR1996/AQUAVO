import { neon } from "@neondatabase/serverless";
import fs from "fs";

const DATABASE_URL = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

// Products from Jaafar Excel file
const jaafarProducts = JSON.parse(fs.readFileSync('jaafar_products_clean.json', 'utf-8'));

async function main() {
  console.log("=== Checking Jaafar Products in Database ===\n");

  // Get all products from database
  const dbProducts = await sql`SELECT id, name, slug, category_id, description FROM products ORDER BY name`;
  console.log("Total products in database:", dbProducts.length);

  // Get unique models from Jaafar file
  const jaafarModels = [...new Set(jaafarProducts.map((p: any) => p.model.toLowerCase()))];
  console.log("Unique products in Jaafar file:", jaafarModels.length);
  console.log("\n=== Jaafar Products Models ===");
  jaafarModels.forEach((m: string, i: number) => console.log(`${i+1}. ${m}`));

  // Find matching products
  console.log("\n=== Matching Products in Database ===");
  const matchedProducts: any[] = [];
  const missingProducts: any[] = [];

  for (const jp of jaafarProducts) {
    const model = jp.model.toLowerCase();
    const matched = dbProducts.find((dp: any) =>
      dp.slug?.toLowerCase().includes(model) ||
      dp.name?.toLowerCase().includes(model)
    );

    if (matched) {
      matchedProducts.push({ ...jp, dbProduct: matched });
    } else {
      missingProducts.push(jp);
    }
  }

  console.log(`\nMatched: ${matchedProducts.length}/${jaafarProducts.length}`);
  console.log(`Missing: ${missingProducts.length}/${jaafarProducts.length}`);

  // Show matched products
  console.log("\n=== MATCHED PRODUCTS ===");
  matchedProducts.forEach((p, i) => {
    console.log(`${i+1}. Model: ${p.model} => slug: ${p.dbProduct.slug}`);
  });

  // Show missing products
  console.log("\n=== MISSING PRODUCTS ===");
  missingProducts.forEach((p, i) => {
    console.log(`${i+1}. Model: ${p.model} | ${p.english_name}`);
  });

  // Save results
  const results = {
    totalInExcel: jaafarProducts.length,
    totalInDatabase: dbProducts.length,
    matched: matchedProducts.length,
    missing: missingProducts.length,
    matchedProducts: matchedProducts.map(p => ({
      model: p.model,
      excelName: p.english_name,
      dbSlug: p.dbProduct.slug,
      dbId: p.dbProduct.id
    })),
    missingProducts: missingProducts.map(p => ({
      model: p.model,
      businessCode: p.business_code,
      englishName: p.english_name,
      chineseName: p.chinese_name,
      price: p.price
    }))
  };

  fs.writeFileSync('jaafar_comparison_results.json', JSON.stringify(results, null, 2));
  console.log("\n\nResults saved to jaafar_comparison_results.json");
}

main().catch(console.error);
