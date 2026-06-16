import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Adding Sponge Filter Variants ===\n');

  const variants = [
    {
      id: "xy-180",
      label: "XY-180 — صغير",
      price: 3000,
      stock: 5,
      isDefault: true,
      specifications: {
        "الموديل": "XY-180",
        "اللون": "أسود",
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
        "اللون": "أسود",
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

  console.log('✅ Sponge filter variants added!\n');

  // Verify
  const verify = await sql`
    SELECT id, name, has_variants, variants
    FROM products WHERE id = 'general-sponge-filter-xy180'
  `;
  const p = verify[0];
  console.log(`Product: ${p.name}`);
  console.log(`Has Variants: ${p.has_variants}`);
  const v = p.variants as any[];
  v.forEach((variant: any) => {
    const def = variant.isDefault ? ' ⭐ DEFAULT' : '';
    console.log(`  ${variant.id}: ${variant.label} → ${variant.price} IQD (stock: ${variant.stock})${def}`);
  });

  console.log('\n=== Done! ===');
}

main().catch(e => console.error(e));
