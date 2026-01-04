import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const jaafarProducts = JSON.parse(fs.readFileSync('jaafar_products_clean.json', 'utf-8'));

// Manual definitive mapping: Excel Model -> Database ID
const productMapping: { [excelModel: string]: { dbId: string, newSlug: string } } = {
  // Fish Food
  'C1-1113': { dbId: 'yee-yee-small-fish-feed-all-in-one-06mm-75g', newSlug: 'C1-1113' },
  'C1-1073': { dbId: 'yee-betta-fish-food-08mm-130g-new', newSlug: 'C1-1073' },
  'C1-1082': { dbId: 'yee-imitation-red-worm-feed-05mm-115g', newSlug: 'C1-1082' }, // Item 4
  'C1-1065': { dbId: 'yee-floating-grain-competition-grade-45-high-protein-15mm-small-particles-300g-bag', newSlug: 'C1-1065' },
  'C1-1125': { dbId: 'yee-yee-aqua-hermit-crab-freeze-dried-feast-55g', newSlug: 'C1-1125' },
  'C1-1086': { dbId: 'yee-yee-aquarium-freeze-dried-brine-shrimp-chunks-18g-225ml', newSlug: 'C1-1086' },
  'C1-1124': { dbId: 'yee-yee-brand-3-in-1-betta-fish-food-15g', newSlug: 'C1-1124' },

  // Water Treatment
  'YYH-125': { dbId: 'yee-white-spot-cleaner-300ml', newSlug: 'YYH-125' },
  'YYH-207': { dbId: 'yee-methylene-blue-solution-600ml', newSlug: 'YYH-207' },
  'c2-1016': { dbId: 'yee-yee-aquarium-cleansing-ammonia-series-active-probiotics-760ml', newSlug: 'C2-1016' },
  'YYH-039': { dbId: 'yee-yee-blue-classic-chlorine-removal-water-stabilizer-535ml', newSlug: 'YYH-039' },
  'YYH-173': { dbId: 'yee-anti-stress-water-stabilizer-500ml-new-style', newSlug: 'YYH-173' },
  'YYH-189': { dbId: 'yee-algaecide-500ml-new-style', newSlug: 'YYH-189' },
  'YYH-216': { dbId: 'yee-anti-stress-water-stabilizer-1000ml-new-style', newSlug: 'YYH-216' },
  'YYH-053': { dbId: 'yee-yee-blue-classic-methylene-blue-solution-235ml', newSlug: 'YYH-053' },

  // Salts
  'YAN-804': { dbId: 'yee-multivitamin-mineral-salt-500g', newSlug: 'YAN-804' },
  'YAN-915': { dbId: 'yee-500g-multivitamin-salt-box-yan-915', newSlug: 'YAN-915' },

  // Test Kits
  'C3-1010': { dbId: 'yee-ammonia-nitrogen-testercan-test-about-60-timesaccurate-and-fast-nitrite-test-kitcan-test-about-100-timesaccurate-and-fast', newSlug: 'C3-1010' },
  'C4-1123': { dbId: 'yee-novice-level-50-9-in-1bucketwith-comparison-chart', newSlug: 'C4-1123' },

  // Bacteria
  'C2-1005': { dbId: 'yee-yee-aquarium-nitrifying-bacteria-probiotics-capsules-50-capsules', newSlug: 'C2-1005' },

  // Heaters
  'YEE-3006': { dbId: 'yee-50w-100w-200wpure-steel-heating-rod-ysh-50', newSlug: 'YEE-3006' },
  'C4-1432': { dbId: 'yee-yee-brand-aquarium-quartz-heating-rod-100w', newSlug: 'C4-1432' },
  'C4-1103': { dbId: 'yee-yee-black-warrior-heater-100w', newSlug: 'C4-1103' },

  // Substrate
  'YFF-049': { dbId: 'yee-water-grass-mud-fertility-upgrade-fine-grain-15l-3l', newSlug: 'YFF-049' },

  // Air Pumps
  'YTZ-300': { dbId: 'yee-xiaobai-single-hole-oxygen-pump-3w-non-adjustable-ytz-300', newSlug: 'YTZ-300' },
  'YGG-135': { dbId: 'yee-yee-50mm-ball-mineral-bubble-diffuser', newSlug: 'YGG-135' },
  'YEE-3621': { dbId: 'yee-thickened-airbag-for-durability17-meters-15-metersthickened-and-lengthened', newSlug: 'YEE-3621' },

  // Accessories
  'C4-1117': { dbId: 'yee-high-configuration-30w-low-water-level', newSlug: 'C4-1117' },
  'C4-1008': { dbId: 'yee-large-suspended-isolation-box', newSlug: 'C4-1008' },
  'YSL-506': { dbId: 'yee-large-pneumatic-incubator-double-room', newSlug: 'YSL-506' },
  'YKL-018': { dbId: 'yee-acrylic-incubator-201010', newSlug: 'YKL-018' },
  'YLL-087': { dbId: 'yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces', newSlug: 'YLL-087' },
  'PYD-200': { dbId: 'yee-fish-tank-descaling-agent-200ml', newSlug: 'PYD-200' },

  // Filter Media
  'YFF-042': { dbId: 'yee-nano-culture-ring-mixed-pack', newSlug: 'YFF-042' },
  'YAA-009.': { dbId: 'yee-high-energy-culture-bricks', newSlug: 'YAA-009' },
  'NYH-006': { dbId: 'yee-3d-filter-material', newSlug: 'NYH-006' },
  'YLC-410': { dbId: 'yee-16-in-1-filter-material-25kg', newSlug: 'YLC-410' },
  'YLC-409': { dbId: 'yee-six-in-one-filter-material-500g', newSlug: 'YLC-409' },
  'C4-1067': { dbId: 'yee-3w-oil-film-processor', newSlug: 'C4-1067' },
  'YEE-3606': { dbId: 'yee-external-electronic-thermometer', newSlug: 'YEE-3606' },

  // Tanks
  'C5-1123': { dbId: 'yee-tank-601515', newSlug: 'C5-1123' },
  'C5-1062': { dbId: 'yee-yee-ultra-clear-glass-tank', newSlug: 'C5-1062' },
};

// Products that have variants (same model, different specs)
const variantProducts = [
  { baseModel: 'C1-1082', variants: [
    { business_code: 'C1-1082-5', name: 'Imitation red worm feed 0.5mm 115g', size: '0.5mm 115g' },
    { business_code: 'C1-1082-2a', name: 'All-in-one Microparticles 0.2mm 210g', size: '0.2mm 210g' }
  ]},
  { baseModel: 'C2-1016', variants: [
    { business_code: 'c2-1016-2', name: 'Active Probiotics 760ml', size: '760ml' },
    { business_code: 'c2-1016-1a', name: 'Active Probiotics 400ml', size: '400ml' }
  ]},
  { baseModel: 'C3-1010', variants: [
    { business_code: 'C3-1010-3', name: 'Ammonia nitrogen tester', type: 'ammonia' },
    { business_code: 'C3-1010-1', name: 'Nitrite test kit', type: 'nitrite' }
  ]},
  { baseModel: 'C2-1005', variants: [
    { business_code: 'C2-1005-1', name: 'Nitrifying Bacteria Capsules 50pcs', count: '50' },
    { business_code: 'C2-1005-2', name: 'Nitrifying Bacteria Capsules 100pcs', count: '100' }
  ]},
  { baseModel: 'C4-1123', variants: [
    { business_code: 'C4-1123-1a', name: '9-in-1 Test Strips Bucket 50pcs', type: 'bucket' },
    { business_code: 'C4-1123-2a', name: '9-in-1 Test Strips Refill 50pcs', type: 'refill' }
  ]},
  { baseModel: 'YEE-3006', variants: [
    { business_code: '1.5.1.7', name: '50W Pure Steel Heating Rod', wattage: '50W' },
    { business_code: '1.5.1.8', name: '100W Pure Steel Heating Rod', wattage: '100W' },
    { business_code: '1.5.1.9', name: '200W Pure Steel Heating Rod', wattage: '200W' }
  ]},
  { baseModel: 'YFF-049', variants: [
    { business_code: '07509', name: 'Water Grass Mud Fine Grain 1.5L', size: '1.5L fine' },
    { business_code: '07512', name: 'Water Grass Mud Coarse Grain 3L', size: '3L coarse' }
  ]},
  { baseModel: 'YEE-3621', variants: [
    { business_code: 'C5-1144-1a', name: 'Air Tube 1.5m Enhanced', length: '1.5m' },
    { business_code: '1.8.3.2', name: 'Air Tube 1.7m Thickened', length: '1.7m' }
  ]},
];

// Truly missing products (need to be added)
const missingProducts = [
  { model: 'C1-1127', name: 'Goldfish Ranchu Spirulina Color Feed 290g 3.0mm', business_code: 'C1-1127-1' },
  { model: 'C1-1066', name: 'Ornamental Shrimp Special Food 260g 40% Protein', business_code: 'C1-1066-2' },
  { model: 'YYY-078', name: 'Decapsulated Brine Shrimp Eggs 80g with Feeder', business_code: '03446a' },
  { model: 'C1-1069', name: 'Fish Feed Sample Pack with Hanger', business_code: 'C1-1069-1' },
  { model: 'C1-1134', name: 'Ranchu Goldfish Sinking Feed 1.5mm 500g', business_code: 'C1-1134-6' },
  { model: 'YYH-006', name: 'Bactericidal Powder 2g × 10 bags', business_code: '02856a' },
  { model: 'LED-318', name: 'Three-color Adjustable LED Light 3.5W 27cm', business_code: '08116' },
  { model: 'CLS-107', name: 'Magnetic Algae Cleaning Brush Large Blue', business_code: '07140' },
  { model: 'YEE-3656', name: '16mm Reinforced Plastic Tubing 1.0m', business_code: '1.15.60' },
  { model: 'YXL-003', name: 'Glass Tank 400x230x250mm 5mm', business_code: '06255' },
  { model: 'YKK-50', name: 'Glass Tank 500x270x300mm 5mm', business_code: '05380' },
  { model: 'YKK-60', name: 'Glass Tank 600x300x350mm 5mm', business_code: '05381' },
  { model: 'YEE-1090', name: 'Cube Tank 35×35×35cm 6mm', business_code: '16932' },
  { model: 'YCG-40', name: 'Cube Tank 40×40×40cm 6mm', business_code: '05662' },
];

async function main() {
  console.log('=== UPDATE SLUGS TO COMPANY MODEL NUMBERS ===\n');

  let updatedCount = 0;
  let errorCount = 0;

  // Update slugs for mapped products
  for (const [model, mapping] of Object.entries(productMapping)) {
    try {
      const result = await sql`
        UPDATE products
        SET slug = ${mapping.newSlug.toLowerCase()}
        WHERE id = ${mapping.dbId}
        RETURNING id, slug, name
      `;

      if (result.length > 0) {
        console.log(`✓ Updated: ${mapping.dbId} -> slug: ${mapping.newSlug.toLowerCase()}`);
        updatedCount++;
      } else {
        console.log(`⚠ Not found: ${mapping.dbId}`);
      }
    } catch (error: any) {
      console.log(`✗ Error updating ${model}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);

  console.log('\n=== PRODUCTS THAT NEED TO BE ADDED ===');
  missingProducts.forEach((p, i) => {
    console.log(`${i+1}. Model: ${p.model} | ${p.name} (${p.business_code})`);
  });

  // Save missing products for later addition
  fs.writeFileSync('missing_products_final.json', JSON.stringify(missingProducts, null, 2));
  console.log('\nMissing products saved to missing_products_final.json');
}

main().catch(console.error);
