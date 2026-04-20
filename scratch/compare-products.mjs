import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Get both algae remover products
  const [existing500] = await sql`SELECT * FROM products WHERE id = 'yee-19429'`;
  const [wrong1000] = await sql`SELECT * FROM products WHERE id = 'yee-19939'`;
  
  console.log('=== مزيل طحالب 500 مل (المرجع) ===');
  console.log('Name:', existing500.name);
  console.log('Description:', existing500.description);
  console.log('Slug:', existing500.slug);
  console.log('Specs:', existing500.specs);
  console.log('Specifications:', JSON.stringify(existing500.specifications, null, 2));
  console.log('Category:', existing500.category);
  console.log('Brand:', existing500.brand);
  console.log('Images:', JSON.stringify(existing500.images));
  console.log('Image:', existing500.image);
  console.log('Thumbnail:', existing500.thumbnail);
  
  console.log('\n=== المنتج الخطأ 1000 مل (يحتاج تغيير) ===');
  console.log('Name:', wrong1000.name);
  console.log('Description:', wrong1000.description);
  console.log('Slug:', wrong1000.slug);
  console.log('Specs:', wrong1000.specs);
  console.log('Specifications:', JSON.stringify(wrong1000.specifications, null, 2));
  console.log('Category:', wrong1000.category);
  console.log('Brand:', wrong1000.brand);
  console.log('Images:', JSON.stringify(wrong1000.images));
  console.log('Image:', wrong1000.image);
  console.log('Thumbnail:', wrong1000.thumbnail);
}

main().catch(e => console.error('Error:', e.message));
