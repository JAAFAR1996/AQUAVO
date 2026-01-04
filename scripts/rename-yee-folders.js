/**
 * Script to rename YEE product image folders to match Model numbers from Excel
 * Excel: 客户伊拉克Jaafar-1.3 (1).xlsx
 */

import fs from 'fs';
import path from 'path';

const YEE_FOLDER = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\client\\public\\images\\products\\yee';

// Direct folder name -> Model mapping based on Excel data
const folderToModel = {
    'Yee Small Fish Feed All-in-One 0.6mm 75g': 'C1-1113',
    'Goldfish Orchid Longevity Jade Fungus + Spirulina Color Yang Compound Feed 290g Slow Sinking 3.0mm': 'C1-1127',
    'Betta fish food 0.8mm 130g New': 'C1-1073',
    'Imitation red worm feed 0.5mm 115g': 'C1-1082-5',
    'Floating Grain - Competition Grade 45% High Protein [1.5mm Small Particles] 300g Bag': 'C1-1065',
    'New Shelled Eggs (140g 200ml) White Bottle + Feeder': 'YYY-078',
    'Yee Aqua-Hermit Crab Freeze-Dried Feast 55g': 'C1-1125',
    '【All-in-one】Microparticles0.2mm210g': 'C1-1082-2a',
    'Yee Aquarium Freeze-dried Brine Shrimp Chunks 18g 225ml': 'C1-1086',
    'Yee Brand 3-in-1 Betta Fish Food 15g': 'C1-1124',
    'White Spot Cleaner 300ml': 'YYH-125',
    'Methylene blue solution 600ml': 'YYH-207',
    'Yee Aquarium Cleansing Ammonia Series Active Probiotics 760ml': 'C2-1016',
    'Yee Blue Classic-Chlorine Removal Water Stabilizer 535ml': 'YYH-039',
    'Anti-stress water stabilizer 500ml New style': 'YYH-173',
    '【Ammonia nitrogen tester】can test about 60 timesaccurate and fast & 【Nitrite test kit】can test about 100 timesaccurate and fast': 'C3-1010',
    '[Novice Level 50] 9-in-1BucketWith Comparison Chart': 'C4-1123-1a',
    'Yee Aquarium Nitrifying Bacteria + Probiotics Capsules 50 capsules': 'C2-1005',
    'Algaecide 500ml New Style': 'YYH-189',
    'Anti-stress water stabilizer 1000ml New style': 'YYH-216',
    'Multivitamin mineral salt 500g': 'YAN-804',
    '500G Multivitamin Salt Box YAN-915': 'YAN-915',
    'Yee Blue Classic-Methylene Blue Solution 235ml': 'YYH-053',
    '【Refill】9 in 1Refill50 pieces': 'C4-1123-2a',
    '50W  & 100W&  200Wpure steel heating rod YSH-50': 'YEE-3006',
    'Yee brand aquarium quartz heating rod, 100W': 'C4-1432',
    'YEE Black Warrior Heater 100W': 'C4-1103',
    'Water grass mud fertility upgrade fine grain 1.5L & 3L': 'YFF-049',
    'Xiaobai single-hole oxygen pump 3W (non-adjustable) YTZ-300': 'YTZ-300',
    'YEE 50mm Ball Mineral Bubble Diffuser': 'YGG-135',
    '【Thickened airbag for durability】1.7 meters & 1.5 metersthickened and lengthened': 'YEE-3621',
    'High configuration 30W low water level': 'C4-1117',
    'Large suspended isolation box': 'C4-1008',
    'Large pneumatic incubator (double room)': 'YSL-506',
    'Acrylic incubator 201010': 'YKL-018',
    '(Blue) New upgraded 6D filter cotton 5040 two pieces': 'YLL-087',
    'Fish tank descaling agent 200ml': 'PYD-200',
    'Nano Culture Ring Mixed Pack': 'YFF-042',
    'High energy culture bricks': 'YAA-009',
    '3D filter material': 'NYH-006',
    '16-in-1 filter material 2.5kg': 'YLC-410',
    'Six-in-one filter material 500g': 'YLC-409',
    '3W oil film processor': 'C4-1067',
    'External electronic thermometer': 'YEE-3606',
    '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick': 'AQUARIUMS',
    'Bare side stream tank 601515cm 6mm water pump': 'C5-1123',
};

// Read current folders
const items = fs.readdirSync(YEE_FOLDER);
const folders = items.filter(f => {
    try {
        const stat = fs.statSync(path.join(YEE_FOLDER, f));
        return stat.isDirectory();
    } catch { return false; }
});

console.log('=== YEE Folder Rename Report ===\n');
console.log(`Found ${folders.length} folders in yee directory\n`);

const renameOperations = [];
const unmatched = [];

folders.forEach(folder => {
    if (folderToModel[folder]) {
        renameOperations.push({
            from: folder,
            to: folderToModel[folder]
        });
    } else {
        unmatched.push(folder);
    }
});

// Print rename operations
console.log('=== Matched Folders for Rename ===\n');
renameOperations.forEach(op => {
    console.log(`FROM: ${op.from}`);
    console.log(`TO:   ${op.to}`);
    console.log('---');
});

console.log(`\n=== Unmatched Folders (${unmatched.length}) ===\n`);
unmatched.forEach(f => console.log(`  - ${f}`));

console.log('\n\n=== Run with --execute to perform rename ===');

if (process.argv.includes('--execute')) {
    console.log('\n=== Executing Renames ===\n');
    let success = 0;
    let skipped = 0;
    let errors = 0;

    renameOperations.forEach(op => {
        const oldPath = path.join(YEE_FOLDER, op.from);
        const newPath = path.join(YEE_FOLDER, op.to);

        try {
            if (fs.existsSync(newPath)) {
                console.log(`SKIP: ${op.to} already exists`);
                skipped++;
            } else {
                fs.renameSync(oldPath, newPath);
                console.log(`RENAMED: ${op.from} -> ${op.to}`);
                success++;
            }
        } catch (err) {
            console.error(`ERROR: ${op.from} -> ${err.message}`);
            errors++;
        }
    });

    console.log(`\n=== Summary ===`);
    console.log(`Success: ${success}, Skipped: ${skipped}, Errors: ${errors}`);
}
