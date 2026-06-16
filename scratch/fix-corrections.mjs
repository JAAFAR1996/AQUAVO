import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function retry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      console.log(`Attempt ${i+1} failed: ${err.message}`);
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 2000));
      else throw err;
    }
  }
}

async function main() {
  // 1. Update shrimp food stock to 5
  console.log('=== 1. تحديث كمية طعام الروبيان إلى 5 ===');
  await retry(async () => {
    await sql`UPDATE products SET stock = 5, updated_at = NOW() WHERE id = 'yee-c1-1066-2'`;
    const [r] = await sql`SELECT name, stock FROM products WHERE id = 'yee-c1-1066-2'`;
    console.log(`✅ ${r.name} | Stock: ${r.stock}`);
  });

  // 2. Rename 19939 to مزيل طحالب  
  console.log('\n=== 2. تغيير اسم 19939 إلى مزيل طحالب ===');
  await retry(async () => {
    await sql`UPDATE products SET name = 'مزيل طحالب — 1000 مل', updated_at = NOW() WHERE id = 'yee-19939'`;
    const [r] = await sql`SELECT name, stock FROM products WHERE id = 'yee-19939'`;
    console.log(`✅ ${r.name} | Stock: ${r.stock}`);
  });

  // 3. Final verification
  console.log('\n=== التحقق النهائي ===');
  await retry(async () => {
    const results = await sql`
      SELECT id, name, stock FROM products 
      WHERE id IN ('yee-c1-1066-2', 'yee-19939', 'yee-19429')
      ORDER BY id
    `;
    for (const r of results) {
      console.log(`${r.id.padEnd(20)} | Stock: ${String(r.stock).padEnd(3)} | ${r.name}`);
    }
  });
}

main().catch(e => console.error('Fatal:', e.message));
