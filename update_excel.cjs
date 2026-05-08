const xlsx = require('xlsx');
const fs = require('fs');

const dbPrices = JSON.parse(fs.readFileSync('db_prices_full.json', 'utf8'));

const slugToPrice = {};
for (const p of dbPrices) {
  slugToPrice[p.slug] = p.price;
  if (p.variants) {
    for (const v of p.variants) {
      if (v.id) slugToPrice[v.id.toLowerCase()] = v.price;
    }
  }
}

const manualMap = {
  "100W pure steel heating rod YSH-100": 15000,
  "200W pure steel heating rod YSH-200": 15000,
  "Yee brand aquarium quartz heating rod, 100": 24850,
  "Xiaobai single-hole oxygen pump 3W (non-ad": 10600,
  "YEE 50mm Ball Mineral Bubble Diffuser": 8450,
  "Enhanced version 1.5 meters/thickened and ": 6300,
  "【Thickened airbag for durability】1.7 meter": 8300,
  "High configuration 30W low water level": 27600,
  "(Blue) New upgraded 6D filter cotton 50*40": 12597,
  "High energy culture bricks": 7595,
  "Yee three-color adjustable 3.5W double-row": 10845,
  "Aquarium magnetic cleaning brush, large si": 10000, 
  "1.0 meter of 16mm reinforced plastic tubin": 1480,
  "400x230x250mm 5mm thick": 37500,
  "500x270x300mm 5mm thick": 54464,
  "600x300x350mm 5mm thick": 65931,
  "35×35×35 6mm thick": 48400,
  "40X40X40cm 6mm thick": 55500,
  "60*40*40cm 8mm": 91767,
  "Bare side stream tank 60*15*15cm 6mm water": 75705, 
  "Goldfish Orchid Longevity Jade Fungus + Sp": 12500, 
  "Floating Grain - Competition Grade 45% Hig": 9500, 
  "【40% High Protein】Special Food for Ornamen": 6450, 
  "New Shelled Eggs (80g 150ml) White Bottle ": 8849, // added
  "Yee Aqua-Hermit Crab Freeze-Dried Feast 55": 10300,
  "【All-in-one】Microparticles/0.2mm/210g": 9500,
  "Ranchu goldfish formulated feed, 1.5mm dia": 12500,
  "Yee Aquarium Freeze-dried Brine Shrimp Chu": 6850,
  "Bactericidal/antibacterial/instant powder ": 10850, // added 
  "Yee Aquarium Cleansing Ammonia Series Acti760G": 16450,
  "Yee Aquarium Cleansing Ammonia Series Acti400G": 12450,
  "Yee Blue Classic-Chlorine Removal Water St": 10850,
  "Anti-stress water stabilizer 500ml New sty": 10850,
  "【Ammonia nitrogen tester】can test about 60": 12000,
  "【Nitrite test kit】can test about 100 times": 12000,
  "[Novice Level 50] 9-in-1/Bucket/With Compa": 10250,
  "Yee Aquarium Nitrifying Bacteria + Probiot 50": 8600,
  "Yee Aquarium Nitrifying Bacteria + Probiot 100": 12000,
  "Anti-stress water stabilizer 1000ml New st": 10850,
  "Yee Blue Classic-Methylene Blue Solution 2": 11249,
  "【Refill】9 in 1/Refill/50 pieces": 5850,
  "Water grass mud fertility upgrade fine gra 1.5K": 7650,
  "Water grass mud fertility upgrade coarse g 3K": 12300,
  "External electronic thermometer": 6900,
  "Cherlam slow-sinking fish food 1.5mm (130g": 12500
};

const yeeParsed = JSON.parse(fs.readFileSync('yee_parsed_products.json', 'utf8'));
const chineseToSlug = {};
for (const item of yeeParsed) {
  const slug = item.chineseName.toLowerCase();
  chineseToSlug[item.englishName] = slug; 
  chineseToSlug[item.englishName.trim()] = slug;
}

const wbPricing = xlsx.readFile('AQUAVO_Pricing_2026_FINAL.xlsx');
const sheetPricing = wbPricing.Sheets[wbPricing.SheetNames[0]];
const rowsPricing = xlsx.utils.sheet_to_json(sheetPricing, {header: 1});

const enToSlug = {};
for (let i = 1; i < rowsPricing.length; i++) {
  const enName = rowsPricing[i][1];
  const cnName = rowsPricing[i][2];
  if (enName && cnName) {
    const slug = chineseToSlug[cnName] || chineseToSlug[cnName.trim()];
    if (slug) {
      enToSlug[enName.trim()] = slug;
    } else {
      enToSlug[enName.trim()] = cnName.toLowerCase();
    }
  }
}

const wbFinal = xlsx.readFile('AQUAVO_FINAL_v9.xlsx');
const sheetFinalName = wbFinal.SheetNames[0];
const sheetFinal = wbFinal.Sheets[sheetFinalName];
const rowsFinal = xlsx.utils.sheet_to_json(sheetFinal, {header: 1});

let matched = 0;
let total = 0;

for (let i = 3; i < rowsFinal.length; i++) {
  const enName = rowsFinal[i][1];
  if (!enName) continue;
  total++;
  const slug = enToSlug[enName.trim()];
  let dbPrice = null;
  
  // Use trim() for matching manual map too!
  if (manualMap[enName] !== undefined) {
    dbPrice = manualMap[enName];
  } else if (manualMap[enName.trim()] !== undefined) {
    dbPrice = manualMap[enName.trim()];
  } else if (slug && slugToPrice[slug]) {
    dbPrice = slugToPrice[slug];
  } else if (slug) {
    const match = dbPrices.find(p => p.slug && p.slug.includes(slug));
    if (match) dbPrice = match.price;
  }
  
  if (dbPrice !== null) {
    matched++;
    rowsFinal[i][9] = dbPrice; // "سعر بيع" is column J (index 9)
  } else {
    console.log(`❌ Missing mapping for: "${enName}"`);
  }
}

console.log(`Matched ${matched} out of ${total}`);

const newSheet = xlsx.utils.aoa_to_sheet(rowsFinal);

if (sheetFinal['!cols']) newSheet['!cols'] = sheetFinal['!cols'];
if (sheetFinal['!merges']) newSheet['!merges'] = sheetFinal['!merges'];

wbFinal.Sheets[sheetFinalName] = newSheet;
const outputFile = 'AQUAVO_FINAL_v9_UPDATED_WITH_PRICES.xlsx';
xlsx.writeFile(wbFinal, outputFile);
console.log('Saved updated Excel to ' + outputFile);
