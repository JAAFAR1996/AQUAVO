import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Rebuilding Air Stone Variants (Size × Color) ===\n');

  // Define all sizes
  const sizes = [
    { dim: "10×25 مم", price: 500, stock: 10, conn: "4 مم", colors: ["رمادي"] },
    { dim: "10×30 مم", price: 500, stock: 10, conn: "4 مم", colors: ["رمادي"] },
    { dim: "12×25 مم", price: 500, stock: 10, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "13×25 مم", price: 500, stock: 10, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "15×25 مم", price: 500, stock: 5, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "15×30 مم", price: 500, stock: 10, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "18×30 مم", price: 750, stock: 5, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "18×45 مم", price: 1000, stock: 10, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "18×50 مم", price: 1000, stock: 5, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "20×50 مم", price: 1000, stock: 10, conn: "4 مم", colors: ["رمادي", "أزرق"] },
    { dim: "25×40 مم", price: 1250, stock: 5, conn: "4 مم أو 8 مم", colors: ["رمادي", "أزرق"] },
    { dim: "25×50 مم", price: 1250, stock: 5, conn: "4 مم أو 8 مم", colors: ["رمادي", "أزرق"] },
    { dim: "25×100 مم", price: 2000, stock: 5, conn: "4 مم أو 8 مم", colors: ["رمادي", "أزرق"] },
    { dim: "30×70 مم", price: 1750, stock: 3, conn: "4 مم أو 8 مم", colors: ["رمادي", "أزرق"] },
    { dim: "30×100 مم", price: 2000, stock: 3, conn: "4 مم أو 8 مم", colors: ["رمادي", "أزرق"] },
    { dim: "50×50 مم", price: 2500, stock: 3, conn: "4 مم أو 8 مم", colors: ["رمادي", "أزرق"] },
    { dim: "50×100 مم", price: 3500, stock: 3, conn: "4 مم أو 8 مم", colors: ["رمادي", "أزرق"] },
  ];

  // Generate all variants (size × color combinations)
  const variants: any[] = [];
  let isFirst = true;

  for (const size of sizes) {
    for (const color of size.colors) {
      const sizeKey = size.dim.replace(/\s/g, '').replace('×', 'x').replace('مم', '');
      const colorKey = color === "رمادي" ? "grey" : "blue";
      const id = `${sizeKey}-${colorKey}`;

      const stockPerColor = Math.max(1, Math.floor(size.stock / size.colors.length));

      variants.push({
        id,
        label: `${size.dim} — ${color}`,
        price: size.price,
        stock: stockPerColor,
        ...(isFirst ? { isDefault: true } : {}),
        specifications: {
          "الحجم": size.dim,
          "اللون": color,
          "قطر التوصيل": size.conn,
        }
      });
      isFirst = false;
    }
  }

  // Update the product
  await sql`
    UPDATE products SET
      variants = ${JSON.stringify(variants)}::jsonb,
      has_variants = ${true},
      updated_at = NOW()
    WHERE id = 'general-air-stone'
  `;

  console.log(`✅ ${variants.length} variants added! (Size × Color)\n`);

  // Summary
  const greyCount = variants.filter(v => v.specifications["اللون"] === "رمادي").length;
  const blueCount = variants.filter(v => v.specifications["اللون"] === "أزرق").length;
  const uniqueSizes = new Set(variants.map(v => v.specifications["الحجم"])).size;

  console.log(`📐 أحجام: ${uniqueSizes}`);
  console.log(`🔘 رمادي: ${greyCount} خيار`);
  console.log(`🔵 أزرق: ${blueCount} خيار`);
  console.log(`📊 إجمالي: ${variants.length} خيار\n`);

  // Print table
  console.log('--- All Variants ---');
  variants.forEach(v => {
    const def = v.isDefault ? ' ⭐' : '';
    console.log(`  ${v.id}: ${v.label} → ${v.price} IQD (stock: ${v.stock})${def}`);
  });

  console.log('\n=== Done! ===');
}

main().catch(e => console.error(e));
