import { neon } from '@neondatabase/serverless';

// Use production (non-pooler) connection
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    // Test
    const t = await sql`SELECT 1 as ok`;
    console.log('Connected:', t[0].ok);

    // 1. Update sponge filter price + variants
    const r1 = await sql`
      UPDATE products 
      SET price = '3500',
          variants = '[{"id":"xy-180","label":"XY-180 — صغير","price":3500,"stock":5,"isDefault":true,"specifications":{"الحجم":"صغير","الموديل":"XY-180"}},{"id":"xy-2835","label":"XY-2835 — كبير","price":3000,"stock":10,"specifications":{"الحجم":"كبير","الموديل":"XY-2835"}}]'::jsonb,
          updated_at = NOW()
      WHERE id = 'general-sponge-filter-xy180'
      RETURNING id, price
    `;
    console.log('Filter updated:', r1.length > 0 ? 'YES' : 'NO');

    // 2. Update air stone 18x30 variants only  
    const curr = await sql`SELECT variants FROM products WHERE id = 'general-air-stone'`;
    if (curr.length > 0 && curr[0].variants) {
      const vars = (curr[0].variants as any[]).map((v: any) => {
        if (v.id === '18x30-grey' || v.id === '18x30-blue') {
          return { ...v, price: 1000 };
        }
        return v;
      });
      
      const r2 = await sql`
        UPDATE products 
        SET variants = ${JSON.stringify(vars)}::jsonb, updated_at = NOW()
        WHERE id = 'general-air-stone'
        RETURNING id
      `;
      console.log('Air stone updated:', r2.length > 0 ? 'YES' : 'NO');
    }

    console.log('DONE');
  } catch (e: any) {
    console.error('ERROR:', e.message);
  }
}

main();
