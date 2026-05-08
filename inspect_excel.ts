import xlsx from 'xlsx';
import fs from 'fs';

const workbook = xlsx.readFile('AQUAVO_FINAL_v9.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // read as array of arrays

console.log("Headers:", data[2]);

for (let i = 3; i < 15; i++) {
  console.log(`Row ${i}:`, data[i][1], " | Price:", data[i][9]);
}
