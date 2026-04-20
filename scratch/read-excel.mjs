import XLSX from 'xlsx';

const filePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\客户伊拉克-Jaafar-1.5 (1).xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== Sheet Names ===');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`\n=== Sheet: "${sheetName}" — ${data.length} rows ===\n`);
  
  // Find header row and print all data rows
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      const rowStr = JSON.stringify(row);
      if (rowStr.includes('QTY') || rowStr.includes('qty') || rowStr.includes('数量')) {
        headerRowIdx = i;
        console.log(`HEADER ROW ${i}: ${rowStr}`);
        break;
      }
    }
  }
  
  // Print first 15 rows to understand structure
  console.log('\n--- First 15 rows ---');
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      console.log(`Row ${i}: ${JSON.stringify(row).substring(0, 200)}`);
    }
  }
  
  // Print all data rows after header
  if (headerRowIdx >= 0) {
    console.log(`\n--- Data rows (after header at row ${headerRowIdx}) ---`);
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;
      // Skip empty/summary rows
      if (!row[2] && !row[3]) continue;
      console.log(`Row ${i}: ${JSON.stringify(row).substring(0, 300)}`);
    }
  }
}
