import xlsx from 'xlsx';
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("=== ADDING MODELS TO PRODUCTS ===");
  
  // 1. Read Excel to get exact mapping Code -> Model
  const workbook = xlsx.readFile('C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\客户伊拉克-Jaafar-1.5 (1).xlsx');
  const sheet = workbook.Sheets['ordinary普货'];
  const data = xlsx.utils.sheet_to_json<any>(sheet, { header: 1 });

  const codeToModel: Record<string, string> = {};
  
  for (let i = 8; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue; 
    
    const safeString = (val: any) => (val != null ? String(val).trim() : '');
    const bCode = safeString(row[2]);
    const model = safeString(row[3]);
    
    if (bCode && model) {
      codeToModel[bCode] = model;
    }
  }

  // Define how merged DB slugs map to the original Excel codes
  const slugToCodes: Record<string, string[]> = {
    '1-5-1-7': ['1.5.1.7', '1.5.1.8', '1.5.1.9'],
    '06255': ['06255', '05380', '05381', '16932', '05662', 'C5-1062-1'],
    'c1-1082-5': ['C1-1082-5', 'C1-1082-2a'],
    'c2-1016-2': ['c2-1016-2', 'c2-1016-1a'],
    'c2-1005-1': ['C2-1005-1', 'C2-1005-2'],
    'c3-1010-3': ['C3-1010-3', 'C3-1010-1'],
    'c4-1123-1a': ['C4-1123-1a', 'C4-1123-2a'],
    '07509': ['07509', '07512'],
    'c5-1144-1a': ['C5-1144-1a', '1.8.3.2'],
  };

  // 2. Fetch all products
  const products = await sql`SELECT id, slug, has_variants, variants, specifications FROM products WHERE brand = 'YEE'`;
  let updatedCount = 0;

  for (const product of products) {
    let specUpdated = false;
    let specifications = typeof product.specifications === 'string' 
      ? JSON.parse(product.specifications) 
      : (product.specifications || {});

    // Base logic: find the primary model code
    let codes = slugToCodes[product.slug];
    if (!codes) {
      const originalCodeKey = Object.keys(codeToModel).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === product.slug.replace(/-/g, ''));
      if (originalCodeKey) {
        codes = [originalCodeKey];
      }
    }

    if (codes && codes.length > 0) {
      // Set the main model attribute for the base product
      const primaryModel = codeToModel[codes[0]];
      if (primaryModel && specifications['الموديل'] !== primaryModel) {
        specifications['الموديل'] = primaryModel;
        specUpdated = true;
      }

      // If it has variants, map the exact model to each variant
      let variants = typeof product.variants === 'string' 
        ? JSON.parse(product.variants) 
        : (product.variants || []);
        
      if (product.has_variants && variants.length > 0 && variants.length === codes.length) {
        for (let i = 0; i < variants.length; i++) {
          const variantModel = codeToModel[codes[i]];
          if (variantModel) {
            variants[i].specifications = variants[i].specifications || {};
            variants[i].specifications['الموديل'] = variantModel;
            specUpdated = true;
          }
        }
      }

      if (specUpdated) {
        await sql`
          UPDATE products 
          SET specifications = ${JSON.stringify(specifications)}::jsonb,
              variants = ${JSON.stringify(variants)}::jsonb
          WHERE id = ${product.id}
        `;
        console.log(`✅ ${product.slug} -> Model: ${primaryModel}`);
        updatedCount++;
      }
    } else {
      console.log(`⚠ ${product.slug} -> No code mapping found.`);
    }
  }

  console.log(`\n🎉 Updated models for ${updatedCount} products.`);
}

main().catch(console.error);
