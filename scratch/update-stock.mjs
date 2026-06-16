import { neon } from '@neondatabase/serverless';
import XLSX from 'xlsx';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Read Excel data
const filePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\1.xlsx';
const workbook = XLSX.readFile(filePath);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

// Extract product quantities from Excel
const excelProducts = [];
for (let i = 9; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 8) continue;
  const businessCode = String(row[2] || '').trim().toLowerCase();
  const qty = parseInt(row[7]) || 0;
  if (businessCode && qty > 0) {
    excelProducts.push({ businessCode, qty });
  }
}

async function main() {
  try {
    // Get all products from DB
    const dbProducts = await sql`
      SELECT id, name, stock FROM products WHERE deleted_at IS NULL ORDER BY id
    `;

    // Match and collect updates
    const updates = [];
    for (const ep of excelProducts) {
      const possibleIds = [
        `yee-${ep.businessCode}`,
        `yee-${ep.businessCode.replace(/a$/, '')}`,
        ep.businessCode,
      ];
      for (const possibleId of possibleIds) {
        const dbProduct = dbProducts.find(p => p.id.toLowerCase() === possibleId.toLowerCase());
        if (dbProduct && dbProduct.stock !== ep.qty) {
          updates.push({ dbId: dbProduct.id, dbName: dbProduct.name, oldStock: dbProduct.stock, newStock: ep.qty });
          break;
        }
      }
    }

    console.log(`\n🔄 Updating ${updates.length} products...\n`);

    // Execute updates one by one
    let successCount = 0;
    let failCount = 0;

    for (const u of updates) {
      try {
        await sql`
          UPDATE products 
          SET stock = ${u.newStock}, updated_at = NOW() 
          WHERE id = ${u.dbId}
        `;
        console.log(`✅ ${u.dbId.padEnd(25)} | "${u.dbName}" | ${u.oldStock} → ${u.newStock}`);
        successCount++;
      } catch (err) {
        console.log(`❌ FAILED: ${u.dbId} | Error: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n=== UPDATE COMPLETE ===`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);

    // Verify by querying updated products
    console.log(`\n=== VERIFICATION ===\n`);
    for (const u of updates) {
      const [result] = await sql`SELECT id, stock FROM products WHERE id = ${u.dbId}`;
      const status = result.stock === u.newStock ? '✅' : '❌';
      console.log(`${status} ${u.dbId}: stock = ${result.stock}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
