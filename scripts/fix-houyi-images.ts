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

async function main() {
  // Fix tool-kit to use its own folder
  const toolKitImgs = getImages('houyi-tool-kit');
  if (toolKitImgs.length > 0) {
    await sql(`UPDATE products SET images = $1::jsonb, thumbnail = $2, updated_at = NOW() WHERE id = 'houyi-tool-kit'`,
      [JSON.stringify(toolKitImgs), toolKitImgs[0]]);
    console.log(`✅ houyi-tool-kit → ${toolKitImgs.length} images from its own folder`);
  }

  // Fix tracheal-suction to use houyi-tracheal-suction folder
  const tracheaImgs = getImages('houyi-tracheal-suction');
  if (tracheaImgs.length > 0) {
    await sql(`UPDATE products SET images = $1::jsonb, thumbnail = $2, updated_at = NOW() WHERE id = 'houyi-tracheal-suction'`,
      [JSON.stringify(tracheaImgs), tracheaImgs[0]]);
    console.log(`✅ houyi-tracheal-suction → ${tracheaImgs.length} images from its own folder`);
  }

  console.log('\nDone!');
}
main().catch(console.error);
