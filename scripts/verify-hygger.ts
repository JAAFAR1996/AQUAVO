import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const excelModels = [
  'HG-978-18W', 'HG-978-22W', 'HG-978-26W', 'HG-978-36W',
  'HG085-200W', 'HG153-10W', 'HG153-18W',
  'HG101-1200L(UV)', 'HG101-1800L(UV)',
  'HG150-6W', 'HG037-3W', 'HG087-1.5W', 'HG-958-5W',
  'HGY0001-M', 'HG124-S', 'HG124-M', 'HG124-L', 'HG953-M',
  'HG073-L', 'HG030-Color', 'HG-957-36W', 'HG957-48W',
  'HG239', 'HC004-S', 'HC004-M', 'HC004-L', 'HC004-XL', 'HG006-50'
];

async function verify() {
  // Get all Hygger products
  const products = await sql`
    SELECT slug, name FROM products
    WHERE slug LIKE 'hg%' OR slug LIKE 'hc%'
    ORDER BY slug
  `;

  console.log('=== HYGGER PRODUCTS IN DATABASE ===');
  console.log(`Total: ${products.length}\n`);
  products.forEach((p: any, i: number) => console.log(`${i+1}. ${p.slug} - ${p.name.substring(0, 45)}`));

  console.log('\n=== MATCHING EXCEL MODELS ===');
  let matched = 0;
  const missing: string[] = [];

  for (const model of excelModels) {
    const normalized = model.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = products.find((p: any) => {
      const slug = p.slug.replace(/[^a-z0-9]/g, '');
      return slug === normalized || slug.includes(normalized.replace('uv', ''));
    });

    if (found) {
      console.log(`✓ ${model} -> ${found.slug}`);
      matched++;
    } else {
      console.log(`✗ ${model} - NOT FOUND`);
      missing.push(model);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Excel models: ${excelModels.length}`);
  console.log(`Matched: ${matched}`);
  console.log(`Missing: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`Missing models: ${missing.join(', ')}`);
  }
}

verify().catch(console.error);
