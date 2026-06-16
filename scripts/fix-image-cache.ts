import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

const BASE = 'client/public/images/products';

// 1. Rename files locally
const renameMap = [
  {
    dir: 'sunsun/sunsun-air-pump',
    oldFile: 'sunsun-air-pump-1.jpeg',
    newFile: 'sunsun-air-pump-1-v2.jpeg'
  },
  {
    dir: 'general/general-air-stone',
    oldFile: 'general-air-stone-1.jpeg',
    newFile: 'general-air-stone-1-v2.jpeg'
  },
  {
    dir: 'general/general-sponge-filter-xy180',
    oldFile: 'general-sponge-filter-xy180-1.jpeg',
    newFile: 'general-sponge-filter-xy180-1-v2.jpeg'
  }
];

for (const rm of renameMap) {
  const oldPath = path.join(BASE, rm.dir, rm.oldFile);
  const newPath = path.join(BASE, rm.dir, rm.newFile);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`✅ Renamed: ${rm.oldFile} -> ${rm.newFile}`);
  } else {
    console.log(`⚠️ Not found (already renamed?): ${rm.oldFile}`);
  }
}

// 2. Update DB
async function updateDB() {
  console.log('\nUpdating Database...');
  
  // SUNSUN
  await sql`UPDATE products 
    SET thumbnail = '/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-1-v2.jpeg',
        images = '["/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-1-v2.jpeg", "/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-2.jpeg"]'::jsonb
    WHERE slug = 'sunsun-air-pump'`;
  
  // Air Stone
  await sql`UPDATE products 
    SET thumbnail = '/images/products/general/general-air-stone/general-air-stone-1-v2.jpeg',
        images = '["/images/products/general/general-air-stone/general-air-stone-1-v2.jpeg", "/images/products/general/general-air-stone/general-air-stone-2.jpeg"]'::jsonb
    WHERE slug = 'general-air-stone'`;
    
  // Sponge Filter
  await sql`UPDATE products 
    SET thumbnail = '/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-1-v2.jpeg',
        images = '["/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-1-v2.jpeg", "/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-2.jpeg"]'::jsonb
    WHERE slug = 'general-sponge-filter-xy180'`;

  console.log('✅ DB Updated successfully!');
  
  const check = await sql`SELECT slug, thumbnail FROM products WHERE slug IN ('sunsun-air-pump', 'general-air-stone', 'general-sponge-filter-xy180')`;
  console.log(check);
}

updateDB().catch(console.error);
