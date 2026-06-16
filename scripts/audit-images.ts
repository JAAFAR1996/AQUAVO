import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql`
    SELECT id, name, images
    FROM products WHERE deleted_at IS NULL AND brand = 'Houyi'
    ORDER BY id
  `;

  const imageMap: Record<string, string[]> = {};
  for (const p of products) {
    const imgs = Array.isArray(p.images) ? p.images as string[] : [];
    imageMap[p.id] = imgs.map((i: string) => i.split('/').pop() || '');
  }

  let report = "";

  // Duplicated images
  report += "DUPLICATED IMAGES (same files for different products):\n\n";
  const fingerprints: Record<string, string[]> = {};
  for (const [id, files] of Object.entries(imageMap)) {
    const key = [...files].sort().join('|');
    if (!fingerprints[key]) fingerprints[key] = [];
    fingerprints[key].push(id);
  }
  for (const [key, ids] of Object.entries(fingerprints)) {
    if (ids.length > 1) {
      report += `  ${ids.join(' <=> ')}\n`;
      report += `  Files: ${key}\n\n`;
    }
  }

  // Wrong folder
  report += "WRONG FOLDER (uses images from another product folder):\n\n";
  for (const p of products) {
    const imgs = Array.isArray(p.images) ? p.images as string[] : [];
    const wrongFolders: string[] = [];
    for (const img of imgs) {
      const parts = img.split('/');
      const folder = parts.length >= 5 ? parts[4] : '';
      if (folder && folder !== p.id && !folder.includes('wood-products')) {
        wrongFolders.push(folder);
      }
    }
    if (wrongFolders.length > 0) {
      const unique = [...new Set(wrongFolders)];
      report += `  ${p.id} => uses folder: ${unique.join(', ')}\n`;
    }
  }

  // Single image
  report += "\nSINGLE IMAGE ONLY:\n\n";
  for (const p of products) {
    const imgs = Array.isArray(p.images) ? p.images as string[] : [];
    if (imgs.length <= 1) {
      report += `  ${p.id}: ${imgs.length} image(s)\n`;
    }
  }

  fs.writeFileSync('image-report.txt', report, 'utf8');
  console.log(report);
}
main().catch(console.error);
