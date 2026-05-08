const xlsx = require('xlsx');
const fs = require('fs');

// 1. Get DB prices
const dbPrices = JSON.parse(fs.readFileSync('db_prices_full.json', 'utf8'));
const slugToPrice = {};
for (const p of dbPrices) {
  slugToPrice[p.slug] = p.price;
  // some products might have default variants with same price, or different price
  // let's just use the main price for now. 
  // Wait, YEE-3006 has variants 50W, 100W, 200W, all have same price 15000.
  // We'll just map the slug.
}

// 2. Load Yee parsed products to get Chinese -> Slug mapping
const yeeParsed = JSON.parse(fs.readFileSync('yee_parsed_products.json', 'utf8'));
const chineseToSlug = {};
for (const item of yeeParsed) {
  const slug = item.chineseName.toLowerCase();
  chineseToSlug[item.englishName] = slug; 
  chineseToSlug[item.englishName.trim()] = slug;
}

// 3. Load AQUAVO_Pricing_2026_FINAL.xlsx to get EN -> Chinese mapping
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
      // maybe slug is the cnName itself?
      enToSlug[enName.trim()] = cnName.toLowerCase();
    }
  }
}

// 4. Test mapping on AQUAVO_FINAL_v9.xlsx
const wbFinal = xlsx.readFile('AQUAVO_FINAL_v9.xlsx');
const sheetFinal = wbFinal.Sheets[wbFinal.SheetNames[0]];
const rowsFinal = xlsx.utils.sheet_to_json(sheetFinal, {header: 1});

let matched = 0;
let total = 0;

for (let i = 3; i < rowsFinal.length; i++) {
  const enName = rowsFinal[i][1];
  if (!enName) continue;
  total++;
  const slug = enToSlug[enName.trim()];
  let dbPrice = null;
  if (slug && slugToPrice[slug]) {
    dbPrice = slugToPrice[slug];
  } else if (slug) {
    // try exact match or substring match on dbPrices
    const match = dbPrices.find(p => p.slug && p.slug.includes(slug));
    if (match) dbPrice = match.price;
  }
  
  if (dbPrice !== null) {
    matched++;
    console.log(`✅ ${enName} -> ${slug} -> Price: ${dbPrice}`);
  } else {
    console.log(`❌ ${enName} -> slug: ${slug}`);
  }
}

console.log(`Matched ${matched} out of ${total}`);
