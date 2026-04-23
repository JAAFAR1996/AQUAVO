import XLSX from 'xlsx';
import fs from 'fs';

const EXCHANGE_RATE = 1520; // 1 USD = 1520 IQD
const TOTAL_SHIPPING_COST = 1100; // USD

// Costs in USD
const BROCHURE_COST = 375 / EXCHANGE_RATE;
const UGC_CARD_COST = 260 / EXCHANGE_RATE;
const BOX_S_COST = 550 / EXCHANGE_RATE;
const BOX_M_COST = 800 / EXCHANGE_RATE;
const BOX_L_COST = 1000 / EXCHANGE_RATE;

// File paths
const pricesFile = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\客户伊拉克-Jaafar-1.5 (1).xlsx';
const packingOrdinary = 'C:\\Users\\jaafa\\Downloads\\ros\\伊拉克-Jaafar-1.9 - packing list（普货）.xlsx';
const packingSensitive = 'C:\\Users\\jaafa\\Downloads\\ros\\伊拉克-Jaafar-1.9 - packing list（敏货）.xlsx';

// Read data
const pricesWb = XLSX.readFile(pricesFile);
const pricesData = XLSX.utils.sheet_to_json(pricesWb.Sheets[pricesWb.SheetNames[0]], {header: 1});

const packOrdWb = XLSX.readFile(packingOrdinary);
const packOrdData = XLSX.utils.sheet_to_json(packOrdWb.Sheets[packOrdWb.SheetNames[0]], {header: 1});

const packSenWb = XLSX.readFile(packingSensitive);
const packSenData = XLSX.utils.sheet_to_json(packSenWb.Sheets[packSenWb.SheetNames[0]], {header: 1});

const productsMap = {}; // Key: Business Code
let totalCBM = 0;

// Helper to parse packing lists
function parsePackingList(data) {
    let start = false;
    for (let row of data) {
        if (!row || row.length < 3) continue;
        if (JSON.stringify(row).toLowerCase().includes('english name')) {
            start = true;
            continue;
        }
        if (start) {
            const code = row[2]; // Business Code
            const qty = row[5];  // QTY
            const length = row[11];
            const width = row[12];
            const height = row[13];
            const cbm = row[15]; // CBM

            if (code && typeof qty === 'number') {
                const numCbm = parseFloat(cbm) || 0;
                totalCBM += numCbm;
                
                let boxCost = BOX_S_COST;
                if (length > 35 || width > 20 || height > 15) boxCost = BOX_L_COST;
                else if (length > 20 || width > 15 || height > 12) boxCost = BOX_M_COST;

                productsMap[code.toString().trim()] = {
                    cbm: numCbm,
                    qty: qty,
                    boxCost: boxCost,
                    length: length,
                    width: width,
                    height: height
                };
            }
        }
    }
}

parsePackingList(packOrdData);
parsePackingList(packSenData);

const finalProducts = [];
let totalItemsCalculated = 0;

let startPrice = false;
for (let row of pricesData) {
    if (!row || row.length < 3) continue;
    if (JSON.stringify(row).toLowerCase().includes('qty')) {
        startPrice = true;
        continue;
    }
    if (startPrice) {
        const code = row[2]; // Business Code
        if (!code) continue;
        const codeStr = code.toString().trim();
        
        const cname = row[4];
        const ename = row[5];
        const price = parseFloat(row[6]) || 0;
        const qty = parseInt(row[7]) || 0;
        
        if (qty > 0 && price > 0) {
            let packingInfo = productsMap[codeStr];
            
            // If packing info missing, estimate CBM based on price
            let itemCbm = 0;
            let boxCost = BOX_S_COST;
            
            if (packingInfo) {
                // Packing list CBM is TOTAL for that item, so unit CBM is:
                itemCbm = packingInfo.cbm / packingInfo.qty;
                boxCost = packingInfo.boxCost;
            } else {
                // Estimate tiny CBM for missing items
                itemCbm = 0.001; 
            }
            
            finalProducts.push({
                Code: codeStr,
                Name_EN: ename,
                Name_ZH: cname,
                Qty: qty,
                Unit_Price: price,
                Unit_CBM: itemCbm,
                BoxCost: boxCost
            });
            
            totalItemsCalculated++;
        }
    }
}

// Calculate Shipping Cost per CBM
// Re-calculate Total CBM based on final products (to be exact with invoice qty)
let preciseTotalCBM = 0;
finalProducts.forEach(p => {
    preciseTotalCBM += (p.Unit_CBM * p.Qty);
});

const shippingPerCBM = TOTAL_SHIPPING_COST / preciseTotalCBM;

const outputData = [];

finalProducts.forEach(p => {
    const unitShippingCost = p.Unit_CBM * shippingPerCBM;
    const unitExtraCosts = BROCHURE_COST + UGC_CARD_COST + p.BoxCost;
    
    const landedCost = p.Unit_Price + unitShippingCost + unitExtraCosts;
    
    // Profit margin calculation (E-commerce 2026 standards)
    // Formula: Selling Price = Cost / (1 - Margin)
    const targetMargin = 0.40; // 40%
    let sellingPriceUSD = landedCost / (1 - targetMargin);
    
    // Round selling price to nearest nice number (e.g. 0.99)
    sellingPriceUSD = Math.ceil(sellingPriceUSD) - 0.01;
    
    const sellingPriceIQD = Math.ceil((sellingPriceUSD * EXCHANGE_RATE) / 250) * 250; // Round to nearest 250 IQD
    
    const profitUSD = sellingPriceUSD - landedCost;
    
    outputData.push({
        'رمز المنتج': p.Code,
        'اسم المنتج': p.Name_EN,
        'الكمية': p.Qty,
        'سعر الشراء ($)': Number(p.Unit_Price.toFixed(2)),
        'تكلفة الشحن للقطعة ($)': Number(unitShippingCost.toFixed(3)),
        'التغليف والمطبوعات ($)': Number(unitExtraCosts.toFixed(3)),
        'التكلفة الإجمالية الواصلة ($)': Number(landedCost.toFixed(2)),
        'سعر البيع المقترح ($)': Number(sellingPriceUSD.toFixed(2)),
        'سعر البيع بالعراقي (دينار)': sellingPriceIQD,
        'الربح الصافي للقطعة ($)': Number(profitUSD.toFixed(2)),
        'هامش الربح (%)': Number(((profitUSD / sellingPriceUSD) * 100).toFixed(1)) + '%'
    });
});

const ws = XLSX.utils.json_to_sheet(outputData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "التسعير النهائي 2026");

const outPath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\AQUAVO_Final_Pricing_2026.xlsx';
XLSX.writeFile(wb, outPath);

console.log('Successfully generated pricing file: ' + outPath);
