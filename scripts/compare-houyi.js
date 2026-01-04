/**
 * Compare Houyi Excel products with database
 */

// Products from Excel (Binzhou_Houyi)
const excelProducts = [
    { name: 'Aquarium Aluminum Alloy Retractable Koi Fish Net', id: 'Aluminum alloy Fishing net 25*21' },
    { name: 'small Wholesale Aquarium Special Nylon Fishing Net', id: 'Hongyang high quality fishing net (S)' },
    { name: 'Aquarium Fish Tank Stainless Steel Telescopic Square Fishnet', id: '3 section fishnet Medium 25*20cm' },
    { name: 'Aquarium Fish Tank Five-in-one Cleaning Tool', id: 'Wanjie five-in-one suit' },
    { name: '3 in 1 Quick Water Changer Siphon', id: '1.9m' },
    { name: 'Chubby thermometer', id: 'Chubby thermometer' },
    { name: 'Suction cup thermometer', id: 'Suction cup thermometer' },
    { name: 'DoPhin Electric Skimmer', id: 'DoPhin Electric Skimmer' },
    { name: 'LED thermometer', id: 'led屏显温度计' },
    { name: 'Rhododendron Root 40-45cm', id: 'Rhododendron Root 40-45cm' },
    { name: 'Rhododendron Root 50-55cm', id: 'Rhododendron Root 50-55cm' },
    { name: 'Rhododendron Root 30-35cm', id: 'Rhododendron Root 30-35cm' },
    { name: 'Rhododendron Root with base', id: 'Rhododendron root+stone tablet base30-45cm' },
    { name: 'Moss Tree 20-30cm', id: 'Moss Tree 20-30cm' },
    { name: 'Polished Driftwood 5-8cm', id: 'Polished Driftwood5-8cm' },
    { name: 'Polished Driftwood 8-10cm', id: 'Polished Driftwood8-10cm' },
    { name: 'Polished Driftwood 10-15cm', id: 'Polished Driftwood10-15cm' },
    { name: 'Polished Driftwood 15-20cm', id: 'Polished Driftwood15-20cm' },
    { name: 'Mountain wood 20-50cm', id: 'Mountain wood 20-50cm' },
    { name: 'Large selected sinking wood', id: 'Large selected sinking wood 70-120cm' },
    { name: 'Thai branches Peeled', id: 'Thai branches Peeled' },
    { name: 'Pumice Small bag 3-6mm', id: 'Pumice 小号3-5cm' },
    { name: 'Aquatic plants base fertilizer 500g', id: 'base fertilizer 500g' },
    { name: 'River sand 1-2mm', id: 'Fine river sand' },
    { name: 'Stream sand 2-6mm', id: 'No need to clean, stream sand 2-6mm' },
    { name: 'South American Sands 1-2mm', id: 'South American Sands New 1-2mm' },
    { name: 'White sand', id: 'White sand' },
    { name: 'Dutch Sand 1-2mm', id: 'Dutch Sand1-2mm' },
    { name: 'Blue Dragon Stone flake', id: 'Blue Dragon Stone flake stone' },
    { name: 'Volcanic stone black 3-5cm', id: 'Volcanic stone 3-5cm' },
    { name: 'Volcanic stone red 3-5cm', id: 'Volcanic stone red 3-5cm' },
    { name: 'Planting ring 52x26mm', id: 'Volcanic stone planting ring' },
    { name: 'Moss glue 5g green', id: 'Moss glue 5g green' },
    { name: 'Moss Glue 20g White', id: 'Moss Glue 20g' },
    { name: 'Instant Glue 50g', id: 'Instant Glue 50g' },
    { name: 'Silicone 121', id: 'Special glue for fish tank 121' },
    { name: 'Ceramic ring', id: 'Ceramic ring' },
    { name: 'Breathing ring white', id: 'Breathing ring white' },
    { name: 'Activated carbon', id: 'Activated carbon' },
    { name: 'White cotton 30x50x2.5', id: 'White cotton 30×50×2.5' },
    { name: 'Terminalia Leaves', id: 'Terminalia Leaves' },
    { name: 'Foam Glue 900g', id: 'Driftwood color 900g' },
    { name: 'Medium cotton brown 50g', id: 'Medium cotton brown 50g' },
    { name: 'Medium cotton grey 50g', id: 'Medium cotton grey 50g' },
    { name: 'Check valve round red', id: 'Check valve round red' },
    { name: 'Control valve 4mm', id: 'Control valve 4mm' },
    { name: '4mm T connector', id: '4mm T通' },
    { name: '4mm I connector', id: '4mm I' },
    { name: '4mm Y connector', id: '4mm Y' },
    { name: '4 port blue air distributor', id: '4 port blue' },
    { name: '6 port blue air distributor', id: '6 port blue' },
    { name: 'Stainless steel shunt 4', id: 'Stainless steel shunt 4' },
    { name: 'Stainless steel shunt 6', id: 'Stainless steel shunt6头' },
    { name: 'Tracheal suction cup', id: 'Tracheal suction cup' },
    { name: '1.55m Hose brush', id: '1.55m double-ended spring brush' },
    { name: 'Mesh 8x8cm', id: 'Mesh 8*8cm' },
    { name: 'Net bag black 15x20', id: 'black 15*20' },
    { name: 'Net bag black 20x30', id: 'black 20*30' },
    { name: 'Net bag black 30x40', id: 'black 30*40' },
    { name: 'Net bag white 15x20', id: 'white 15*20' },
    { name: 'Net bag white 20x30', id: 'white 20*30' },
    { name: 'Net bag white 30x40', id: 'white 30*40' },
    { name: 'Moss Line', id: 'Moss Line *40 PIC' },
    { name: 'Fish tank cleaning towel', id: 'fish tank cleaning towel' },
    { name: 'Color oxygenation tube 4M', id: 'Color oxygenation tube 4M' },
    { name: 'Color oxygenation tube 100M', id: 'Color oxygenation tube 100M' },
    { name: 'Hose clamp blue', id: 'Hose clamp With packaging-blue' },
    { name: 'Sucker buckle', id: 'Buckle sucker' },
    { name: 'Acrylic pump compartment', id: 'New acrylic pump compartment' },
    { name: 'Acrylic tool rack', id: 'Acrylic tool rack' },
    { name: 'Gauze isolation net large', id: 'Gauze isolation net large' },
    { name: 'Fat injection', id: 'Fat injection' },
    { name: 'Feeding cup', id: 'Feeding cup' },
    { name: 'Aquarium glass tank set', id: '400*400*400/6' },
    { name: 'Tool kit (tweezers, scissors)', id: 'tool kit' },
    { name: 'Tool shelf', id: 'Acrylic tool rack' },
    { name: 'Songbao Wave Pump WP-50M', id: 'WP-50M' },
    { name: 'Inflatable fish bag', id: '100 pieces of 20*30*16' },
];

// Products in Database (23)
const dbProducts = [
    'houyi-air-distributor-4port',
    'houyi-air-distributor-6port',
    'houyi-base-fertilizer',
    'houyi-connector-i-4mm',
    'houyi-connector-t-4mm',
    'houyi-connector-y-4mm',
    'houyi-control-valve-4mm',
    'houyi-instant-glue-50g',
    'houyi-led-thermometer',
    'houyi-medium-cotton-brown',
    'houyi-medium-cotton-grey',
    'houyi-moss-tree',
    'houyi-mountain-wood',
    'houyi-polished-driftwood-10-15cm',
    'houyi-polished-driftwood-15-20cm',
    'houyi-polished-driftwood-5-8cm',
    'houyi-polished-driftwood-8-10cm',
    'houyi-rhododendron-30-35cm',
    'houyi-rhododendron-40-45cm',
    'houyi-rhododendron-50-55cm',
    'houyi-rhododendron-with-base',
    'houyi-sinking-wood-large',
    'houyi-thai-branches',
];

console.log('=== Houyi Products Comparison ===\n');
console.log(`Excel products: ${excelProducts.length}`);
console.log(`Database products: ${dbProducts.length}`);
console.log(`Missing: ${excelProducts.length - dbProducts.length} products\n`);

console.log('=== Missing Products (need to be added) ===\n');

const missing = excelProducts.filter(ep => {
    const slug = `houyi-${ep.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
    return !dbProducts.some(db =>
        db.includes(slug.substring(0, 15)) ||
        slug.includes(db.substring(6, 20))
    );
});

missing.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
});

console.log(`\nTotal missing: ${missing.length}`);
