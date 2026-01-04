import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const YEE_IMAGES_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';

// Manual mapping: slug -> image folder name
const IMAGE_MAPPING: { [slug: string]: string } = {
  // Foods
  'c1-1113': 'Yee Small Fish Feed All-in-One 0.6mm 75g',
  'c1-1127': 'Goldfish Orchid Longevity Jade Fungus + Spirulina Color Yang Compound Feed 290g Slow Sinking 3.0mm',
  'c1-1073': 'Betta fish food 0.8mm 130g New',
  'c1-1082': 'Imitation red worm feed 0.5mm 115g',
  'c1-1065': 'Floating Grain - Competition Grade 45% High Protein [1.5mm Small Particles] 300g Bag',
  'c1-1086': 'Yee Aquarium Freeze-dried Brine Shrimp Chunks 18g 225ml',
  'c1-1124': 'Yee Brand 3-in-1 Betta Fish Food 15g',
  'c1-1125': 'Yee Aqua-Hermit Crab Freeze-Dried Feast 55g',
  'yee-all-in-onemicroparticles02mm210g': '【All-in-one】Microparticles0.2mm210g',
  'yee-new-shelled-eggs-140g-200ml-white-bottle-feeder': 'New Shelled Eggs (140g 200ml) White Bottle + Feeder',

  // Treatments
  'yyh-125': 'White Spot Cleaner 300ml',
  'yyh-207': 'Methylene blue solution 600ml',
  'c2-1016': 'Yee Aquarium Cleansing Ammonia Series Active Probiotics 760ml',
  'yyh-039': 'Yee Blue Classic-Chlorine Removal Water Stabilizer 535ml',
  'yyh-173': 'Anti-stress water stabilizer 500ml New style',
  'yyh-216': 'Anti-stress water stabilizer 1000ml New style',
  'yyh-189': 'Algaecide 500ml New Style',
  'yyh-053': 'Yee Blue Classic-Methylene Blue Solution 235ml',
  'c2-1005': 'Yee Aquarium Nitrifying Bacteria + Probiotics Capsules 50 capsules',
  'yan-804': 'Multivitamin mineral salt 500g',
  'yan-915': '500G Multivitamin Salt Box YAN-915',
  'pyd-200': 'Fish tank descaling agent 200ml',

  // Testing
  'c3-1010': '【Ammonia nitrogen tester】can test about 60 timesaccurate and fast & 【Nitrite test kit】can test about 100 timesaccurate and fast',
  'c4-1123': '[Novice Level 50] 9-in-1BucketWith Comparison Chart',
  'yee-refill9-in-1refill50-pieces': '【Refill】9 in 1Refill50 pieces',

  // Heaters
  'yee-3006': '50W  & 100W&  200Wpure steel heating rod YSH-50',
  'yee-3007': '50W  & 100W&  200Wpure steel heating rod YSH-50',
  'yee-3008': '50W  & 100W&  200Wpure steel heating rod YSH-50',
  'c4-1432': 'Yee brand aquarium quartz heating rod, 100W',
  'c4-1103': 'YEE Black Warrior Heater 100W',

  // Substrate & Decor
  'yff-049': 'Water grass mud fertility upgrade fine grain 1.5L & 3L',
  'yff-052': 'Water grass mud fertility upgrade fine grain 1.5L & 3L',
  'yff-042': 'Nano Culture Ring Mixed Pack',
  'yaa-009': 'High energy culture bricks',
  'nyh-006': '3D filter material',
  'ylc-410': '16-in-1 filter material 2.5kg',
  'ylc-409': 'Six-in-one filter material 500g',

  // Equipment
  'ytz-300': 'Xiaobai single-hole oxygen pump 3W (non-adjustable) YTZ-300',
  'ygg-135': 'YEE 50mm Ball Mineral Bubble Diffuser',
  'c5-1144': '【Thickened airbag for durability】1.7 meters & 1.5 metersthickened and lengthened',
  'yee-3621': '【Thickened airbag for durability】1.7 meters & 1.5 metersthickened and lengthened',
  'c4-1117': 'High configuration 30W low water level',
  'c4-1008': 'Large suspended isolation box',
  'ysl-506': 'Large pneumatic incubator (double room)',
  'ykl-018': 'Acrylic incubator 201010',
  'yll-087': '(Blue) New upgraded 6D filter cotton 5040 two pieces',
  'c4-1067': '3W oil film processor',
  'yee-3606': 'External electronic thermometer',

  // Tanks
  'yee-1090': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'ycg-40': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'yxl-003': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'ykk-50': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'ykk-60': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'c5-1062': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
};

// Products to merge as variants
const VARIANT_MERGES = [
  {
    keepSlug: 'yee-steel-heater',
    deleteSlug: ['yee-3006', 'yee-3007', 'yee-3008'],
    name: 'YEE سخان ستيل نقي 304',
    variants: [
      { id: '50W', label: '50 واط', price: 3500, stock: 20 },
      { id: '100W', label: '100 واط', price: 3840, stock: 20 },
      { id: '200W', label: '200 واط', price: 3870, stock: 20 },
    ]
  },
  {
    keepSlug: 'yee-water-grass-mud',
    deleteSlug: ['yff-049', 'yff-052'],
    name: 'YEE تربة نباتات مائية مطورة',
    variants: [
      { id: '1.5L', label: 'حبيبات ناعمة 1.5 لتر', price: 3200, stock: 30 },
      { id: '3L', label: 'حبيبات خشنة 3 لتر', price: 3585, stock: 30 },
    ]
  },
  {
    keepSlug: 'yee-air-tube-reinforced',
    deleteSlug: ['c5-1144', 'yee-3621'],
    name: 'YEE خرطوم هواء مقوى سميك',
    variants: [
      { id: '1.5m', label: '1.5 متر', price: 550, stock: 50 },
      { id: '1.7m', label: '1.7 متر', price: 650, stock: 50 },
    ]
  },
  {
    keepSlug: 'yee-anti-stress-water-stabilizer',
    deleteSlug: ['yyh-173', 'yyh-216'],
    name: 'YEE مثبت المياه المضاد للإجهاد',
    variants: [
      { id: '500ml', label: '500 مل', price: 2100, stock: 25 },
      { id: '1000ml', label: '1000 مل', price: 3200, stock: 25 },
    ]
  },
  {
    keepSlug: 'yee-glass-tank',
    deleteSlug: ['yee-1090', 'ycg-40', 'yxl-003', 'ykk-50', 'ykk-60', 'c5-1062'],
    name: 'YEE حوض زجاجي شفاف فائق الوضوح',
    variants: [
      { id: '35cm', label: '35×35×35 سم (6 مم)', price: 15000, stock: 10 },
      { id: '40cm', label: '40×40×40 سم (6 مم)', price: 20000, stock: 10 },
      { id: '40x23', label: '40×23×25 سم (5 مم)', price: 12000, stock: 10 },
      { id: '50cm', label: '50×27×30 سم (5 مم)', price: 18000, stock: 10 },
      { id: '60cm', label: '60×30×35 سم (5 مم)', price: 25000, stock: 10 },
      { id: '60x40', label: '60×40×40 سم (8 مم)', price: 35000, stock: 5 },
    ]
  },
];

function getImagesFromFolder(folderName: string): string[] {
  const folderPath = path.join(YEE_IMAGES_PATH, folderName);
  try {
    if (!fs.existsSync(folderPath)) return [];
    const files = fs.readdirSync(folderPath);
    return files
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .slice(0, 6) // Max 6 images
      .map(f => `/images/products/yee/${encodeURIComponent(folderName)}/${encodeURIComponent(f)}`);
  } catch {
    return [];
  }
}

async function main() {
  console.log('=== UPDATING YEE PRODUCT IMAGES ===\n');

  let updated = 0;
  let failed = 0;

  // Update images for each mapped product
  for (const [slug, folderName] of Object.entries(IMAGE_MAPPING)) {
    const images = getImagesFromFolder(folderName);

    if (images.length === 0) {
      console.log(`⚠ No images: ${slug} -> ${folderName.substring(0, 40)}`);
      continue;
    }

    try {
      const result = await sql`
        UPDATE products
        SET
          images = ${JSON.stringify(images)}::jsonb,
          thumbnail = ${images[0]}
        WHERE slug = ${slug}
        RETURNING id
      `;

      if (result.length > 0) {
        console.log(`✓ ${slug} (${images.length} images)`);
        updated++;
      } else {
        console.log(`⚠ Not found: ${slug}`);
      }
    } catch (error: any) {
      console.log(`✗ Error: ${slug} - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n=== IMAGE UPDATE SUMMARY ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  // Now handle variant merges
  console.log('\n=== MERGING VARIANT PRODUCTS ===\n');

  for (const merge of VARIANT_MERGES) {
    try {
      // Get images for the merged product
      const firstSlug = merge.deleteSlug[0];
      const folderName = IMAGE_MAPPING[firstSlug];
      const images = folderName ? getImagesFromFolder(folderName) : [];

      // Check if main product exists
      const existing = await sql`SELECT id FROM products WHERE slug = ${merge.keepSlug}`;

      if (existing.length > 0) {
        // Update existing
        await sql`
          UPDATE products
          SET
            name = ${merge.name},
            has_variants = true,
            variants = ${JSON.stringify(merge.variants)}::jsonb,
            images = ${JSON.stringify(images.length > 0 ? images : ['/images/products/placeholder.jpg'])}::jsonb,
            thumbnail = ${images.length > 0 ? images[0] : '/images/products/placeholder.jpg'}
          WHERE slug = ${merge.keepSlug}
        `;
        console.log(`✓ Updated: ${merge.keepSlug} with ${merge.variants.length} variants`);
      } else {
        // Get category from first product to delete
        const firstProduct = await sql`SELECT category_id, category, brand FROM products WHERE slug = ${firstSlug}`;
        if (firstProduct.length > 0) {
          await sql`
            INSERT INTO products (
              id, slug, name, brand, category, subcategory, description,
              price, category_id, specifications, stock, is_new, has_variants, variants,
              images, thumbnail, currency
            )
            VALUES (
              ${merge.keepSlug},
              ${merge.keepSlug},
              ${merge.name},
              'YEE',
              ${firstProduct[0].category},
              'متنوع',
              ${merge.name + ' - متوفر بأحجام متعددة'},
              ${merge.variants[0].price},
              ${firstProduct[0].category_id},
              '{}'::jsonb,
              50,
              false,
              true,
              ${JSON.stringify(merge.variants)}::jsonb,
              ${JSON.stringify(images.length > 0 ? images : ['/images/products/placeholder.jpg'])}::jsonb,
              ${images.length > 0 ? images[0] : '/images/products/placeholder.jpg'},
              'IQD'
            )
          `;
          console.log(`✓ Created: ${merge.keepSlug} with ${merge.variants.length} variants`);
        }
      }

      // Delete old products
      for (const delSlug of merge.deleteSlug) {
        await sql`DELETE FROM products WHERE slug = ${delSlug}`;
        console.log(`  🗑 Deleted: ${delSlug}`);
      }

    } catch (error: any) {
      console.log(`✗ Error merging ${merge.keepSlug}: ${error.message}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
