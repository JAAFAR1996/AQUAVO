import { neon } from '@neondatabase/serverless';
import XLSX from 'xlsx';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Read Excel data
const filePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\1.xlsx';
const workbook = XLSX.readFile(filePath);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

// Extract product quantities from Excel
// Format: { businessCode: qty }
const excelProducts = [];
for (let i = 9; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 8) continue;
  
  const businessCode = String(row[2] || '').trim().toLowerCase();
  const qty = parseInt(row[7]) || 0;
  const englishName = row[5] || '';
  const chineseName = row[4] || '';
  
  if (businessCode && qty > 0) {
    excelProducts.push({ businessCode, qty, englishName, chineseName });
  }
}

console.log(`\n=== Excel Products: ${excelProducts.length} items ===\n`);

async function main() {
  try {
    // Get all products from DB
    const dbProducts = await sql`
      SELECT id, name, stock, brand
      FROM products 
      WHERE deleted_at IS NULL 
      ORDER BY id
    `;
    
    console.log(`Database Products: ${dbProducts.length}\n`);
    
    // Create mapping: Excel business code → DB product ID
    // DB product IDs follow pattern: yee-{code} where code matches business code
    const updates = [];
    const unmatched = [];
    
    for (const ep of excelProducts) {
      // Try to match by converting business code to DB ID format
      // e.g. "C1-1113-2" → "yee-c1-1113-2"
      // e.g. "03326" → "yee-03326"
      // e.g. "c2-1016-2" → "yee-c2-1016-2"
      // e.g. "12420" → "yee-12420"
      // e.g. "D4-1005-4" → "yee-d4-1005-4" or "hygger-..."
      
      const possibleIds = [
        `yee-${ep.businessCode}`,
        `yee-${ep.businessCode.replace(/a$/, '')}`, // remove trailing 'a'
        ep.businessCode,
      ];
      
      let matched = false;
      for (const possibleId of possibleIds) {
        const dbProduct = dbProducts.find(p => p.id.toLowerCase() === possibleId.toLowerCase());
        if (dbProduct) {
          updates.push({
            dbId: dbProduct.id,
            dbName: dbProduct.name,
            currentStock: dbProduct.stock,
            newStock: ep.qty,
            excelCode: ep.businessCode,
          });
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        unmatched.push({
          excelCode: ep.businessCode,
          qty: ep.qty,
          name: ep.englishName || ep.chineseName,
        });
      }
    }
    
    console.log(`=== MATCHED PRODUCTS (${updates.length}) ===\n`);
    for (const u of updates) {
      const change = u.currentStock !== u.newStock ? '⚡ CHANGE' : '✓ SAME';
      console.log(`${change} | ${u.dbId.padEnd(25)} | "${u.dbName}" | Stock: ${u.currentStock} → ${u.newStock}`);
    }
    
    console.log(`\n=== UNMATCHED FROM EXCEL (${unmatched.length}) ===\n`);
    for (const u of unmatched) {
      console.log(`❌ Code: ${u.excelCode.padEnd(15)} | QTY: ${u.qty} | ${u.name}`);
    }
    
    // Show summary
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Excel products: ${excelProducts.length}`);
    console.log(`Matched to DB: ${updates.length}`);
    console.log(`Unmatched: ${unmatched.length}`);
    console.log(`Stock changes needed: ${updates.filter(u => u.currentStock !== u.newStock).length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
