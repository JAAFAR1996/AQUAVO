const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('AQUAVO_FINAL_v9.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, {header: 1});

const excelProducts = [];
for (let i = 2; i < rows.length; i++) {
  if (rows[i][1]) {
    excelProducts.push({ rowIndex: i, name: rows[i][1], price: rows[i][9] });
  }
}

const dbPricesFull = JSON.parse(fs.readFileSync('db_prices_full.json', 'utf8'));

fs.writeFileSync('mapping_check.json', JSON.stringify({
  excelLength: excelProducts.length,
  dbLength: dbPricesFull.length,
  excelFirst20: excelProducts.slice(0, 20),
  dbFirst20: dbPricesFull.slice(0, 20).map(p => ({name: p.name, price: p.price, variants: p.variants ? p.variants.length : 0}))
}, null, 2));
