import XLSX from 'xlsx';
import fs from 'fs';

const csvPath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\Yee_Products_2026_UPDATED.csv';
const outPath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\Yee_Products_2026_UPDATED.xlsx';

try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse the CSV content
    const wb = XLSX.read(csvContent, { type: 'string', raw: true });
    
    // Write to Excel file
    XLSX.writeFile(wb, outPath);

    console.log('Successfully generated Excel file: ' + outPath);
} catch (error) {
    console.error('Error generating Excel file:', error);
}
