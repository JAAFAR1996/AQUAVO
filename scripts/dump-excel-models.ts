import xlsx from 'xlsx';

try {
  const workbook = xlsx.readFile('C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\客户伊拉克-Jaafar-1.5 (1).xlsx');
  const sheet = workbook.Sheets['ordinary普货'];
  const data = xlsx.utils.sheet_to_json<any>(sheet, { header: 1 });

  console.log("=== EXACT EXCEL MODELS ===");
  // Data starts around row 9
  for (let i = 8; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue; // Skip empty
    
    // Convert to string and safely trim
    const safeString = (val: any) => (val != null ? String(val).trim() : '');
    
    const bCode = safeString(row[2]);
    const model = safeString(row[3]);
    const cName = safeString(row[4]);
    const eName = safeString(row[5]);
    
    if (bCode && (model || eName)) {
      console.log(`CODE: ${bCode} | MODEL: ${model} | NAME: ${cName}`);
    }
  }
} catch (e) {
  console.error("Error reading excel:", e);
}
