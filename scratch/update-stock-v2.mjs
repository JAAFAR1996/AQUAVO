import { neon } from '@neondatabase/serverless';
import XLSX from 'xlsx';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Read the CORRECT Excel file
const filePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\客户伊拉克-Jaafar-1.5 (1).xlsx';
const workbook = XLSX.readFile(filePath);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

// Extract ALL product quantities from ALL rows
const productMap = new Map(); // businessCode -> { qty, name }

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 8) continue;
  
  const itemNo = row[0];
  const businessCode = String(row[2] || '').trim().toLowerCase();
  const model = String(row[3] || '').trim();
  const chineseName = row[4] || '';
  const englishName = row[5] || '';
  const price = row[6];
  const qty = parseInt(row[7]);
  const remark = row[9] || '';
  
  // Skip header/summary rows
  if (!businessCode || isNaN(qty) || qty < 0) continue;
  if (businessCode === 'business\ncode' || businessCode.includes('item')) continue;
  
  const name = englishName || chineseName;
  
  // If product already exists in map, keep the latest (ORDER 2 overwrites ORDER 1 for same product)
  // But if different product codes, add both
  if (productMap.has(businessCode)) {
    // If same code appears again, use the ORDER 2 quantity
    console.log(`⚠️ Duplicate code: ${businessCode} — OLD: ${productMap.get(businessCode).qty}, NEW: ${qty} (using ${qty})`);
  }
  productMap.set(businessCode, { qty, name, remark: String(remark) });
}

console.log(`\n=== Total unique products from Excel: ${productMap.size} ===\n`);

async function main() {
  try {
    // Get all products from DB
    const dbProducts = await sql`
      SELECT id, name, stock FROM products WHERE deleted_at IS NULL ORDER BY id
    `;
    
    console.log(`Database Products: ${dbProducts.length}\n`);
    
    const updates = [];
    const unmatched = [];
    
    for (const [code, { qty, name, remark }] of productMap) {
      // Try multiple ID patterns
      const possibleIds = [
        `yee-${code}`,
        `yee-${code.replace(/a$/, '')}`,
        `general-${code}`,
        `hygger-${code}`,
        code,
      ];
      
      let matched = false;
      for (const possibleId of possibleIds) {
        const dbProduct = dbProducts.find(p => p.id.toLowerCase() === possibleId.toLowerCase());
        if (dbProduct) {
          if (dbProduct.stock !== qty) {
            updates.push({
              dbId: dbProduct.id,
              dbName: dbProduct.name,
              oldStock: dbProduct.stock,
              newStock: qty,
              excelCode: code,
              remark,
            });
          } else {
            console.log(`✓ SAME | ${dbProduct.id.padEnd(25)} | Stock: ${qty} | "${dbProduct.name}"`);
          }
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        unmatched.push({ code, qty, name, remark });
      }
    }
    
    console.log(`\n=== STOCK CHANGES TO APPLY (${updates.length}) ===\n`);
    for (const u of updates) {
      console.log(`⚡ ${u.dbId.padEnd(25)} | ${u.oldStock} → ${u.newStock} | "${u.dbName}" ${u.remark ? `[${u.remark}]` : ''}`);
    }
    
    // Apply updates
    console.log(`\n🔄 Applying ${updates.length} stock updates...\n`);
    let success = 0, fail = 0;
    
    for (const u of updates) {
      try {
        await sql`UPDATE products SET stock = ${u.newStock}, updated_at = NOW() WHERE id = ${u.dbId}`;
        console.log(`✅ ${u.dbId}: ${u.oldStock} → ${u.newStock}`);
        success++;
      } catch (err) {
        console.log(`❌ ${u.dbId}: ${err.message}`);
        fail++;
      }
    }
    
    console.log(`\n=== UNMATCHED (${unmatched.length}) ===\n`);
    for (const u of unmatched) {
      console.log(`❌ ${u.code.padEnd(15)} | QTY: ${u.qty} | ${u.name} ${u.remark ? `[${u.remark}]` : ''}`);
    }
    
    console.log(`\n=== FINAL RESULT ===`);
    console.log(`✅ Updated: ${success}`);
    console.log(`❌ Failed: ${fail}`);
    console.log(`✓ Already correct: ${productMap.size - updates.length - unmatched.length}`);
    console.log(`⚠️ Not in DB: ${unmatched.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
