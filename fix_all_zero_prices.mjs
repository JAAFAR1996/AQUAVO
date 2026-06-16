import { neon } from '@neondatabase/serverless';

const DB = 'postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DB);

// These prices come from the original add-all-houyi-products.ts and add-houyi-products.ts scripts
// The zero-prices.ts script wiped them all — this restores the correct values

const fixes = [
  // === Wood & Decor products with single price (no variants) ===
  { slug: 'houyi-thai-branches',       price: 2000, variants: null, hasVariants: false },
  { slug: 'houyi-black-slate',         price: 1500, variants: null, hasVariants: false },
  { slug: 'houyi-pumice',              price: 1000, variants: null, hasVariants: false },
  { slug: 'houyi-inflatable-fish-bag', price: 9000, variants: null, hasVariants: false },
  { slug: 'houyi-sinking-wood-large',  price: 6500, variants: null, hasVariants: false },
  { slug: 'houyi-moss-tree',           price: 8000, variants: null, hasVariants: false },
  { slug: 'houyi-mountain-wood',       price: 5000, variants: null, hasVariants: false },
  // c1-1069 = YEE sample food pack (free sample — keep at 0 or set minimal price)
  // { slug: 'c1-1069', price: 0, ... }, // intentionally free

  // === Products with variants (prices were 0 due to zero-prices.ts) ===
  {
    slug: 'houyi-spider-wood-sm', price: 3500, hasVariants: true,
    variants: [
      { id: 'sm',   label: 'صغير 10-20 سم',   price: 3500,  stock: 10, isDefault: true,  specifications: { الحجم: '10-20 سم' } },
      { id: 'md',   label: 'وسط 20-35 سم',    price: 6000,  stock: 10, isDefault: false, specifications: { الحجم: '20-35 سم' } },
      { id: 'lg',   label: 'كبير 35-50 سم',   price: 9500,  stock: 10, isDefault: false, specifications: { الحجم: '35-50 سم' } },
      { id: 'root', label: 'جذر ضخم 40-60 سم', price: 12000, stock: 10, isDefault: false, specifications: { الحجم: '40-60 سم' } },
    ]
  },
  {
    slug: 'houyi-spider-wood-md', price: 6000, hasVariants: false,
    variants: null,
  },
  {
    slug: 'houyi-spider-wood-lg', price: 9500, hasVariants: false,
    variants: null,
  },
  {
    slug: 'houyi-spider-wood-root', price: 12000, hasVariants: false,
    variants: null,
  },
  {
    slug: 'houyi-polished-driftwood', price: 2500, hasVariants: true,
    variants: [
      { id: 'sm', label: 'صغير 13-20 سم',      price: 2500,  stock: 10, isDefault: true,  specifications: { الحجم: '13-20 سم' } },
      { id: 'md', label: 'متوسط 18-30 سم',     price: 4500,  stock: 10, isDefault: false, specifications: { الحجم: '18-30 سم' } },
      { id: 'lg', label: 'كبير 30-45 سم',      price: 7500,  stock: 10, isDefault: false, specifications: { الحجم: '30-45 سم' } },
      { id: 'xl', label: 'كبير جداً 50-60 سم', price: 12000, stock: 10, isDefault: false, specifications: { الحجم: '50-60 سم' } },
    ]
  },
  {
    slug: 'houyi-rhododendron-root', price: 7500, hasVariants: true,
    variants: [
      { id: 'rhododendron-30-35cm',    label: '30–35 سم',                     price: 7500,  stock: 10, isDefault: true,  specifications: { الحجم: '30–35 سم', النوع: 'بدون قاعدة' } },
      { id: 'rhododendron-40-45cm',    label: '40–45 سم',                     price: 10000, stock: 10, isDefault: false, specifications: { الحجم: '40–45 سم', النوع: 'بدون قاعدة' } },
      { id: 'rhododendron-50-55cm',    label: '50–55 سم',                     price: 13500, stock: 10, isDefault: false, specifications: { الحجم: '50–55 سم', النوع: 'بدون قاعدة' } },
      { id: 'rhododendron-with-base',  label: 'مع قاعدة حجرية 30–45 سم',     price: 15000, stock: 10, isDefault: false, specifications: { الحجم: '30–45 سم', النوع: 'مع قاعدة حجرية' } },
    ]
  },
];

console.log(`\n🔧 Fixing ${fixes.length} zero-price products (cause: zero-prices.ts script wiped prices)\n`);

let updated = 0;
for (const fix of fixes) {
  if (fix.variants !== null && fix.variants !== undefined) {
    // Update price + variants
    await sql`
      UPDATE products 
      SET price = ${fix.price},
          has_variants = ${fix.hasVariants},
          variants = ${JSON.stringify(fix.variants)}::jsonb,
          updated_at = NOW()
      WHERE slug = ${fix.slug}
    `;
  } else {
    // Update price only
    await sql`
      UPDATE products 
      SET price = ${fix.price},
          has_variants = ${fix.hasVariants},
          updated_at = NOW()
      WHERE slug = ${fix.slug}
    `;
  }
  console.log(`✅ ${fix.slug} → ${fix.price.toLocaleString()} د.ع`);
  updated++;
}

// Final verification
const remaining = await sql`
  SELECT slug, price FROM products 
  WHERE (price = 0 OR price IS NULL) 
  AND slug NOT IN ('c1-1069')
  ORDER BY slug
`;

console.log(`\n✅ Updated ${updated} products`);
if (remaining.length === 0) {
  console.log('🎉 All products now have prices! (except free sample c1-1069)');
} else {
  console.log(`⚠️ Still ${remaining.length} with zero price:`);
  remaining.forEach(r => console.log(`   - ${r.slug}: ${r.price}`));
}
