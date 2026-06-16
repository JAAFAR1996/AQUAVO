import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
    console.log('='.repeat(70));
    console.log('دمج منتجات HOUYI');
    console.log('='.repeat(70));

    // ============================================
    // 1. Merge Air Distributors (2 → 1 with variants)
    // ============================================
    console.log('\n📌 1. دمج موزعات الهواء');

    const dist4 = await sql`SELECT * FROM products WHERE slug = 'houyi-air-distributor-4port'`;
    const dist6 = await sql`SELECT * FROM products WHERE slug = 'houyi-air-distributor-6port'`;

    if (dist4.length > 0 && dist6.length > 0) {
        const variants = [
            { id: '4port', label: '4 منافذ', price: dist4[0].price, stock: dist4[0].stock || 50, isDefault: true },
            { id: '6port', label: '6 منافذ', price: dist6[0].price, stock: dist6[0].stock || 50 }
        ];

        await sql`UPDATE products SET 
      name = 'موزع هواء أزرق',
      variants = ${JSON.stringify(variants)}::jsonb
      WHERE slug = 'houyi-air-distributor-4port'`;

        await sql`DELETE FROM products WHERE slug = 'houyi-air-distributor-6port'`;
        console.log('   ✅ تم دمج موزعات الهواء (4 + 6 منافذ)');
    }

    // ============================================
    // 2. Merge Connectors (3 → 1 with variants)
    // ============================================
    console.log('\n📌 2. دمج الموصلات');

    const connI = await sql`SELECT * FROM products WHERE slug = 'houyi-connector-i-4mm'`;
    const connT = await sql`SELECT * FROM products WHERE slug = 'houyi-connector-t-4mm'`;
    const connY = await sql`SELECT * FROM products WHERE slug = 'houyi-connector-y-4mm'`;

    if (connI.length > 0 && connT.length > 0 && connY.length > 0) {
        const variants = [
            { id: 'I', label: 'موصل I مستقيم', price: connI[0].price, stock: connI[0].stock || 50, isDefault: true },
            { id: 'T', label: 'موصل T', price: connT[0].price, stock: connT[0].stock || 50 },
            { id: 'Y', label: 'موصل Y', price: connY[0].price, stock: connY[0].stock || 50 }
        ];

        await sql`UPDATE products SET 
      name = 'موصلات خراطيم 4 مم',
      slug = 'houyi-connectors-4mm',
      variants = ${JSON.stringify(variants)}::jsonb
      WHERE slug = 'houyi-connector-i-4mm'`;

        await sql`DELETE FROM products WHERE slug IN ('houyi-connector-t-4mm', 'houyi-connector-y-4mm')`;
        console.log('   ✅ تم دمج الموصلات (I + T + Y)');
    }

    // ============================================
    // 3. Merge Rhododendron Roots (4 → 1 with variants)
    // ============================================
    console.log('\n📌 3. دمج جذور الرودودندرون');

    const rhodo30 = await sql`SELECT * FROM products WHERE slug = 'houyi-rhododendron-30-35cm'`;
    const rhodo40 = await sql`SELECT * FROM products WHERE slug = 'houyi-rhododendron-40-45cm'`;
    const rhodo50 = await sql`SELECT * FROM products WHERE slug = 'houyi-rhododendron-50-55cm'`;
    const rhodoBase = await sql`SELECT * FROM products WHERE slug = 'houyi-rhododendron-with-base'`;

    if (rhodo30.length > 0) {
        const variants = [
            { id: '30-35', label: '30-35 سم', price: rhodo30[0].price, stock: rhodo30[0].stock || 50, isDefault: true },
            ...(rhodo40.length > 0 ? [{ id: '40-45', label: '40-45 سم', price: rhodo40[0].price, stock: rhodo40[0].stock || 50 }] : []),
            ...(rhodo50.length > 0 ? [{ id: '50-55', label: '50-55 سم', price: rhodo50[0].price, stock: rhodo50[0].stock || 50 }] : []),
            ...(rhodoBase.length > 0 ? [{ id: 'with-base', label: 'مع قاعدة حجرية', price: rhodoBase[0].price, stock: rhodoBase[0].stock || 50 }] : [])
        ];

        await sql`UPDATE products SET 
      name = 'جذر الرودودندرون',
      slug = 'houyi-rhododendron',
      variants = ${JSON.stringify(variants)}::jsonb
      WHERE slug = 'houyi-rhododendron-30-35cm'`;

        await sql`DELETE FROM products WHERE slug IN ('houyi-rhododendron-40-45cm', 'houyi-rhododendron-50-55cm', 'houyi-rhododendron-with-base')`;
        console.log('   ✅ تم دمج جذور الرودودندرون (4 أحجام)');
    }

    // ============================================
    // 4. Merge Polished Driftwood (4 → 1 with variants)
    // ============================================
    console.log('\n📌 4. دمج الخشب العائم المصقول');

    const wood5 = await sql`SELECT * FROM products WHERE slug = 'houyi-polished-driftwood-5-8cm'`;
    const wood8 = await sql`SELECT * FROM products WHERE slug = 'houyi-polished-driftwood-8-10cm'`;
    const wood10 = await sql`SELECT * FROM products WHERE slug = 'houyi-polished-driftwood-10-15cm'`;
    const wood15 = await sql`SELECT * FROM products WHERE slug = 'houyi-polished-driftwood-15-20cm'`;

    if (wood5.length > 0) {
        const variants = [
            { id: '5-8', label: '5-8 سم', price: wood5[0].price, stock: wood5[0].stock || 50, isDefault: true },
            ...(wood8.length > 0 ? [{ id: '8-10', label: '8-10 سم', price: wood8[0].price, stock: wood8[0].stock || 50 }] : []),
            ...(wood10.length > 0 ? [{ id: '10-15', label: '10-15 سم', price: wood10[0].price, stock: wood10[0].stock || 50 }] : []),
            ...(wood15.length > 0 ? [{ id: '15-20', label: '15-20 سم', price: wood15[0].price, stock: wood15[0].stock || 50 }] : [])
        ];

        await sql`UPDATE products SET 
      name = 'خشب عائم مصقول',
      slug = 'houyi-polished-driftwood',
      variants = ${JSON.stringify(variants)}::jsonb
      WHERE slug = 'houyi-polished-driftwood-5-8cm'`;

        await sql`DELETE FROM products WHERE slug IN ('houyi-polished-driftwood-8-10cm', 'houyi-polished-driftwood-10-15cm', 'houyi-polished-driftwood-15-20cm')`;
        console.log('   ✅ تم دمج الخشب العائم المصقول (4 أحجام)');
    }

    // ============================================
    // 5. Merge Thermometers (delete duplicate)
    // ============================================
    console.log('\n📌 5. حذف ترمومتر مكرر');

    // Keep houyi-led (better name), delete houyi-led-thermometer
    const deleted = await sql`DELETE FROM products WHERE slug = 'houyi-led-thermometer' RETURNING slug`;
    if (deleted.length > 0) {
        console.log('   ✅ تم حذف ترمومتر مكرر (houyi-led-thermometer)');
    }

    // ============================================
    // 6. Merge Filter Cotton (2 → 1 with variants)
    // ============================================
    console.log('\n📌 6. دمج قطن الفلتر');

    const cottonBrown = await sql`SELECT * FROM products WHERE slug = 'houyi-medium-cotton-brown'`;
    const cottonGrey = await sql`SELECT * FROM products WHERE slug = 'houyi-medium-cotton-grey'`;

    if (cottonBrown.length > 0 && cottonGrey.length > 0) {
        const variants = [
            { id: 'brown', label: 'بني', price: cottonBrown[0].price, stock: cottonBrown[0].stock || 50, isDefault: true },
            { id: 'grey', label: 'رمادي', price: cottonGrey[0].price, stock: cottonGrey[0].stock || 50 }
        ];

        await sql`UPDATE products SET 
      name = 'قطن فلتر متوسط 50 جم',
      slug = 'houyi-medium-cotton',
      variants = ${JSON.stringify(variants)}::jsonb
      WHERE slug = 'houyi-medium-cotton-brown'`;

        await sql`DELETE FROM products WHERE slug = 'houyi-medium-cotton-grey'`;
        console.log('   ✅ تم دمج قطن الفلتر (بني + رمادي)');
    }

    // ============================================
    // Final count
    // ============================================
    console.log('\n' + '='.repeat(70));
    const remaining = await sql`SELECT COUNT(*) as count FROM products`;
    const byBrand = await sql`SELECT brand, COUNT(*) as count FROM products GROUP BY brand ORDER BY count DESC`;

    console.log(`\n📊 إجمالي المنتجات: ${remaining[0].count}`);
    console.log('\nحسب الماركة:');
    for (const b of byBrand) {
        console.log(`   ${b.brand}: ${b.count}`);
    }

    console.log('\n✅ تم دمج منتجات HOUYI بنجاح!');
}

main().catch(console.error);
