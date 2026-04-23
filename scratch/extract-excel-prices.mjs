import XLSX from 'xlsx';

const filePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\客户伊拉克-Jaafar-1.5 (1).xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== أسعار وكميات المنتجات من ملف الإكسل ===\n');

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

let start = false;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;
    
    if (JSON.stringify(row).toLowerCase().includes('qty')) {
        start = true;
        continue;
    }
    
    if (start) {
        const code = row[2]; // Business Code
        const name = row[5]; // English Name
        const price = row[6]; // Price
        const qty = row[7]; // QTY
        
        if (code && name && typeof qty === 'number') {
            console.log(`[${code}] ${name.toString().substring(0, 50).padEnd(50)} | السعر: $${Number(price).toFixed(2)} | الكمية: ${qty}`);
        }
    }
}
