import { neon } from '@neondatabase/serverless';

const DB = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DB);

const zero = await sql`
  SELECT id, name, price, slug, variants, has_variants
  FROM products 
  WHERE (price = 0 OR price IS NULL)
  ORDER BY slug
`;

console.log(`Zero-price products remaining: ${zero.length}\n`);
for (const p of zero) {
  const variants = p.variants;
  let variantPrices = 'no variants';
  if (Array.isArray(variants)) {
    variantPrices = variants.map(v => `${v.label || v.id}: ${v.price}`).join(', ');
  }
  console.log(`[${p.slug}] has_variants=${p.has_variants} | variants: ${variantPrices}`);
}
