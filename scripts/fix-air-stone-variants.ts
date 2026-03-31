import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing Air Stone Variants (Size Only) ===\n');

  const variants = [
    { id: "10x25", label: "10×25 مم", price: 500, stock: 10, isDefault: true, specifications: { "القطر × الطول": "10×25 مم", "قطر التوصيل": "4 مم" } },
    { id: "10x30", label: "10×30 مم", price: 500, stock: 10, specifications: { "القطر × الطول": "10×30 مم", "قطر التوصيل": "4 مم" } },
    { id: "12x25", label: "12×25 مم", price: 500, stock: 10, specifications: { "القطر × الطول": "12×25 مم", "قطر التوصيل": "4 مم" } },
    { id: "13x25", label: "13×25 مم", price: 500, stock: 10, specifications: { "القطر × الطول": "13×25 مم", "قطر التوصيل": "4 مم" } },
    { id: "15x25", label: "15×25 مم", price: 500, stock: 5, specifications: { "القطر × الطول": "15×25 مم", "قطر التوصيل": "4 مم" } },
    { id: "15x30", label: "15×30 مم", price: 500, stock: 10, specifications: { "القطر × الطول": "15×30 مم", "قطر التوصيل": "4 مم" } },
    { id: "18x30", label: "18×30 مم", price: 750, stock: 5, specifications: { "القطر × الطول": "18×30 مم", "قطر التوصيل": "4 مم" } },
    { id: "18x45", label: "18×45 مم", price: 1000, stock: 10, specifications: { "القطر × الطول": "18×45 مم", "قطر التوصيل": "4 مم" } },
    { id: "18x50", label: "18×50 مم", price: 1000, stock: 5, specifications: { "القطر × الطول": "18×50 مم", "قطر التوصيل": "4 مم" } },
    { id: "20x50", label: "20×50 مم", price: 1000, stock: 10, specifications: { "القطر × الطول": "20×50 مم", "قطر التوصيل": "4 مم" } },
    { id: "25x40", label: "25×40 مم", price: 1250, stock: 5, specifications: { "القطر × الطول": "25×40 مم", "قطر التوصيل": "4 مم أو 8 مم" } },
    { id: "25x50", label: "25×50 مم", price: 1250, stock: 5, specifications: { "القطر × الطول": "25×50 مم", "قطر التوصيل": "4 مم أو 8 مم" } },
    { id: "25x100", label: "25×100 مم", price: 2000, stock: 5, specifications: { "القطر × الطول": "25×100 مم", "قطر التوصيل": "4 مم أو 8 مم" } },
    { id: "30x70", label: "30×70 مم", price: 1750, stock: 3, specifications: { "القطر × الطول": "30×70 مم", "قطر التوصيل": "4 مم أو 8 مم" } },
    { id: "30x100", label: "30×100 مم", price: 2000, stock: 3, specifications: { "القطر × الطول": "30×100 مم", "قطر التوصيل": "4 مم أو 8 مم" } },
    { id: "50x50", label: "50×50 مم", price: 2500, stock: 3, specifications: { "القطر × الطول": "50×50 مم", "قطر التوصيل": "4 مم أو 8 مم" } },
    { id: "50x100", label: "50×100 مم", price: 3500, stock: 3, specifications: { "القطر × الطول": "50×100 مم", "قطر التوصيل": "4 مم أو 8 مم" } },
  ];

  await sql`
    UPDATE products SET
      variants = ${JSON.stringify(variants)}::jsonb,
      has_variants = ${true},
      updated_at = NOW()
    WHERE id = 'general-air-stone'
  `;

  console.log(`✅ ${variants.length} variants (size only, no color)\n`);
  variants.forEach(v => {
    const def = v.isDefault ? ' ⭐' : '';
    console.log(`  ${v.label} → ${v.price} IQD (stock: ${v.stock})${def}`);
  });
  console.log('\n=== Done! ===');
}

main().catch(e => console.error(e));
