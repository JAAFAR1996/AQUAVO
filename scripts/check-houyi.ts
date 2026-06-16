import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
const HOUYI = './client/public/images/products/houyi';

function getImages(folder: string): string[] {
  const p = path.join(HOUYI, folder);
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p)
    .filter(f => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(f))
    .sort()
    .map(f => `/images/products/houyi/${encodeURIComponent(folder)}/${f}`);
}

// Get all folders on disk
const allFolders = fs.readdirSync(HOUYI, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

async function main() {
  const rows = await sql`SELECT id, name, images, thumbnail FROM products WHERE brand = 'Houyi' ORDER BY id`;
  
  console.log('=== Checking each product\'s image folder ===\n');

  for (const p of rows) {
    const imgs: string[] = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
    
    // What folder is it currently using?
    let currentFolder = 'NONE';
    if (imgs.length > 0) {
      const parts = imgs[0].split('/');
      const idx = parts.indexOf('houyi');
      if (idx >= 0) currentFolder = decodeURIComponent(parts[idx + 1]);
    }
    
    // What folder SHOULD it use? (match by product id)
    const expectedFolder = allFolders.find(f => f === p.id) 
      || allFolders.find(f => f === p.id.replace('houyi-', 'houyi-'));
    
    const match = currentFolder === expectedFolder;
    
    if (!match) {
      console.log(`❌ ${p.id}`);
      console.log(`   Current:  ${currentFolder}`);
      console.log(`   Expected: ${expectedFolder || 'NO MATCHING FOLDER'}`);
      console.log('');
    } else {
      console.log(`✅ ${p.id} → ${currentFolder}`);
    }
  }

  // Show products that don't have a matching folder
  console.log('\n=== Products WITHOUT matching folder ===');
  for (const p of rows) {
    const hasFolder = allFolders.includes(p.id);
    if (!hasFolder) {
      console.log(`  ⚠️ ${p.id} - no folder named "${p.id}"`);
    }
  }
}
main().catch(console.error);
