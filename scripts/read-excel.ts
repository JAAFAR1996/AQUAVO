import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Excel
const workbookPath = path.resolve(__dirname, "../客户伊拉克-Jaafar-1.5 (1).xlsx");
const workbook = XLSX.readFile(workbookPath, { cellDates: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const range = XLSX.utils.decode_range(sheet['!ref']);

// Image folders
const yeeImagesDir = path.resolve(__dirname, "../client/public/images/products/yee");
const imageFolders = fs.readdirSync(yeeImagesDir).filter(f =>
  fs.statSync(path.join(yeeImagesDir, f)).isDirectory()
);

// Build detailed mapping: model code -> image folder
// Image folders use format: yee-{model} or yee-{slug}
// Excel model codes have suffixes like -1, -2, -1a etc that need stripping

function findImageFolder(model: string, chineseName: string): { folder: string; images: string[] } | null {
  const modelClean = model.toLowerCase()
    .replace(/-\d+[a-z]?$/, '')  // Remove trailing suffix like -1, -2, -1a
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
  
  // Try multiple matching strategies
  for (const folder of imageFolders) {
    const fLower = folder.toLowerCase();
    
    // Direct match: yee-c4-1432 matches C4-1432
    if (fLower === `yee-${modelClean}`) {
      return getImages(folder);
    }
    
    // Partial match: folder contains the model
    if (fLower.includes(modelClean) && modelClean.length >= 4) {
      return getImages(folder);
    }
  }

  // Special mappings for known products
  const specialMap: Record<string, string> = {
    '1.5.1.7': 'YEE-3006',        // 50W heater
    '1.5.1.8': 'YEE-3006',        // 100W heater (same images)
    '1.5.1.9': 'YEE-3006',        // 200W heater
    '03326': 'yee-ytz-300',        // Oxygen pump YTZ-300
    '07154': 'yee-ygg-135',        // Bubble diffuser YGG-135
    '07116': 'yee-nyh-006',        // Nano culture ring
    '17699a': 'yee-high-energy-culture-bricks',
    '11578': 'yee-nyh-006',        // 3D cookie filter
    '71934': 'yee-ylc-410',        // 16-in-1 filter
    '17831': 'yee-ylc-409',        // 6-in-1 filter  
    '08116': 'yee-led-318-light',  // LED light
    '07140': 'yee-cls-107-magnetic-brush',
    '1.15.60': 'yee-reinforced-tube',
    '06255': 'YEE Ultra-Clear Glass Tank',
    '05380': 'YEE Ultra-Clear Glass Tank',
    '05381': 'YEE Ultra-Clear Glass Tank',
    '16932': 'YEE Ultra-Clear Glass Tank',
    '05662': 'YEE Ultra-Clear Glass Tank',
    'c5-1062-1': 'YEE Ultra-Clear Glass Tank',
    '02517': 'yee-ysl-506',        // Incubation box
    '02771': 'yee-acrylic-incubator-201010',
    '05617a': 'yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces',
    'c5-1144-1a': 'yee-reinforced-tube',
    '1.8.3.2': 'yee-reinforced-tube',
    'c1-1127-1': 'yee-c1-1127-ranchu-feed',
    'c1-1066-2': 'yee-c1-1066-shrimp-food',
    '03446a': 'yee-yyy-078-brine-shrimp-eggs',
    'c1-1069-1': 'yee-c1-1069-sample-pack',
    'c1-1134-6': 'yee-c1-1134-ranchu-sinking',
    '12420': 'yee-yyh-125',        // White spot treatment
    '19768a': 'yee-yyh-207',       // Methylene blue  
    '02856a': 'yee-yyh-006-antibacterial',
    '02924': 'yee-yyh-173',        // Water stabilizer
    '16940': 'yee-yyh-173',        
    '19429': 'yee-yyh-039',        // Anti-algae
    '19939': 'yee-yyh-173',        
    '06834': 'yee-yan-915',        // Mineral salt
    '01831': 'yee-yan-915',        
    '02938a': 'yee-yyh-053',       // Methylene blue classic
    '07509': 'yee-yff-049',        // Plant soil
    '07512': 'yee-yff-049',        
    '13343': 'yee-pyd-200',        // Descaler
    '00340': 'yee-c4-1103',        // Thermometer
  };

  const mapKey = model.toLowerCase().replace(/-\d+[a-z]?$/, '');
  const mapped = specialMap[mapKey] || specialMap[model.toLowerCase()];
  if (mapped) {
    const matchedFolder = imageFolders.find(f => f.toLowerCase() === mapped.toLowerCase());
    if (matchedFolder) return getImages(matchedFolder);
  }

  return null;
}

function getImages(folder: string): { folder: string; images: string[] } {
  const folderPath = path.join(yeeImagesDir, folder);
  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map(f => `/images/products/yee/${folder}/${f}`);
  return { folder, images: files };
}

// Parse products
const products: any[] = [];
for (let r = 9; r <= range.e.r; r++) {
  const getCell = (c: number) => {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    return cell ? String(cell.v).trim() : '';
  };

  const itemNo = getCell(0);
  if (!itemNo || isNaN(Number(itemNo))) continue;

  const model = getCell(2);
  const chineseName = getCell(3);
  const englishName = getCell(4);
  const priceUSD = parseFloat(getCell(5)) || 0;
  const qty = parseInt(getCell(6)) || 0;

  const imageResult = findImageFolder(getCell(1) || model, chineseName);

  products.push({
    itemNo: Number(itemNo),
    pictureCode: getCell(1),
    model,
    chineseName,
    englishName,
    priceUSD: Math.round(priceUSD * 100) / 100,
    qty,
    imageFolder: imageResult?.folder || null,
    images: imageResult?.images || [],
  });
}

// Summary
let matched = 0, unmatched = 0;
for (const p of products) {
  if (p.images.length > 0) {
    matched++;
    console.log(`✅ [${p.model}] ${p.englishName} → ${p.images.length} images`);
  } else {
    unmatched++;
    console.log(`⚠ [${p.model}] ${p.englishName} → NO IMAGES`);
  }
}

console.log(`\n📊 Improved matching: ${matched}/${products.length} products have images`);
fs.writeFileSync('yee_parsed_products.json', JSON.stringify(products, null, 2), 'utf-8');
console.log("💾 Saved to yee_parsed_products.json");
