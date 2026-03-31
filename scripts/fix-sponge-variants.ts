import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing Sponge Filter Variants (no color) ===\n');

  const variants = [
    {
      id: "xy-180",
      label: "XY-180 — صغير",
      price: 3000,
      stock: 5,
      isDefault: true,
      specifications: {
        "الموديل": "XY-180",
        "الحجم": "صغير",
      }
    },
    {
      id: "xy-2835",
      label: "XY-2835 — كبير",
      price: 2500,
      stock: 10,
      specifications: {
        "الموديل": "XY-2835",
        "الحجم": "كبير",
      }
    },
  ];

  await sql`
    UPDATE products SET
      variants = ${JSON.stringify(variants)}::jsonb,
      has_variants = ${true},
      updated_at = NOW()
    WHERE id = 'general-sponge-filter-xy180'
  `;

  console.log('✅ Done! Color removed from sponge filter variants\n');
  variants.forEach(v => {
    const def = v.isDefault ? ' ⭐' : '';
    console.log(`  ${v.label} → ${v.price} IQD (stock: ${v.stock})${def}`);
  });
}

main().catch(e => console.error(e));
