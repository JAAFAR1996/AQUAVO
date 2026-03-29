import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // 1. تأكد من المنتج المدمج
  const merged = await sql`
    SELECT id, name, price, has_variants, variants, images
    FROM products WHERE id = 'houyi-spider-wood-sm'
  `;
  console.log("=== المنتج المدمج ===");
  console.log(`Name: ${merged[0].name}`);
  console.log(`has_variants: ${merged[0].has_variants}`);
  console.log(`Variants: ${(merged[0].variants as any[]).length}`);
  for (const v of merged[0].variants as any[]) {
    console.log(`  - ${v.label} | ${v.price} | default: ${v.isDefault}`);
  }

  // 2. تأكد من حذف البقية
  const deleted = await sql`
    SELECT id, deleted_at FROM products WHERE id IN ('houyi-spider-wood-md','houyi-spider-wood-lg','houyi-spider-wood-root')
  `;
  console.log("\n=== المحذوفة ===");
  for (const d of deleted) {
    console.log(`${d.id} → deleted_at: ${d.deleted_at}`);
  }

  // 3. العدد الكلي الحالي
  const total = await sql`SELECT COUNT(*) as c FROM products WHERE deleted_at IS NULL AND brand = 'Houyi'`;
  console.log(`\nإجمالي المنتجات النشطة: ${total[0].c}`);
}
main().catch(console.error);
