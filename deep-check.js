import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = 'postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function deepCheck() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('🔬 فحص معمق شامل للنظام...\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. Database Products
    const products = await sql`
      SELECT *
      FROM products
      WHERE deleted_at IS NULL
      ORDER BY brand, name
    `;

    console.log('📦 1. فحص قاعدة البيانات:\n');
    console.log(`   ✓ إجمالي المنتجات: ${products.length}`);

    // Check for duplicates
    const names = products.map(p => p.name);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      console.log(`   ⚠️  أسماء مكررة: ${duplicateNames.length}`);
      duplicateNames.forEach(name => console.log(`      - ${name}`));
    } else {
      console.log('   ✓ لا توجد أسماء مكررة');
    }

    // Check for duplicate slugs
    const slugs = products.map(p => p.slug);
    const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
    if (duplicateSlugs.length > 0) {
      console.log(`   ⚠️  Slugs مكررة: ${duplicateSlugs.length}`);
      duplicateSlugs.forEach(slug => console.log(`      - ${slug}`));
    } else {
      console.log('   ✓ لا توجد slugs مكررة');
    }

    // Check for duplicate IDs (should never happen)
    const ids = products.map(p => p.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.log(`   ❌ IDs مكررة: ${duplicateIds.length}`);
      duplicateIds.forEach(id => console.log(`      - ${id}`));
    } else {
      console.log('   ✓ لا توجد IDs مكررة');
    }

    console.log('\n───────────────────────────────────────────────────\n');

    // 2. Data Completeness
    console.log('📋 2. فحص اكتمال البيانات:\n');

    const issues = {
      noName: [],
      noPrice: [],
      priceZero: [],
      noImages: [],
      noThumbnail: [],
      noDescription: [],
      noCategory: [],
      noSubcategory: [],
      noBrand: [],
      noStock: [],
      noSpecifications: [],
      invalidPrice: [],
    };

    products.forEach(p => {
      if (!p.name || p.name.trim() === '') issues.noName.push(p.id);
      if (!p.price) issues.noPrice.push(p.name);
      if (Number(p.price) === 0) issues.priceZero.push(p.name);
      if (Number(p.price) < 0) issues.invalidPrice.push(p.name);
      if (!p.images || p.images.length === 0) issues.noImages.push(p.name);
      if (!p.thumbnail) issues.noThumbnail.push(p.name);
      if (!p.description || p.description.trim() === '') issues.noDescription.push(p.name);
      if (!p.category) issues.noCategory.push(p.name);
      if (!p.subcategory) issues.noSubcategory.push(p.name);
      if (!p.brand) issues.noBrand.push(p.name);
      if (p.stock === null || p.stock === undefined) issues.noStock.push(p.name);
      if (!p.specifications || Object.keys(p.specifications).length === 0) issues.noSpecifications.push(p.name);
    });

    let hasIssues = false;
    Object.keys(issues).forEach(key => {
      if (issues[key].length > 0) {
        hasIssues = true;
        const labels = {
          noName: 'بدون اسم',
          noPrice: 'بدون سعر',
          priceZero: 'سعر صفر',
          noImages: 'بدون صور',
          noThumbnail: 'بدون thumbnail',
          noDescription: 'بدون وصف',
          noCategory: 'بدون فئة',
          noSubcategory: 'بدون فئة فرعية',
          noBrand: 'بدون براند',
          noStock: 'بدون مخزون',
          noSpecifications: 'بدون مواصفات',
          invalidPrice: 'سعر سالب',
        };
        console.log(`   ⚠️  ${labels[key]}: ${issues[key].length}`);
        if (issues[key].length <= 5) {
          issues[key].forEach(name => console.log(`      - ${name}`));
        }
      }
    });

    if (!hasIssues) {
      console.log('   ✅ جميع المنتجات لديها بيانات كاملة!');
    }

    console.log('\n───────────────────────────────────────────────────\n');

    // 3. Images Check
    console.log('🖼️  3. فحص الصور:\n');

    let totalImages = 0;
    const missingImageFiles = [];
    const productsWithImageIssues = [];

    for (const product of products) {
      const images = product.images || [];
      totalImages += images.length;

      if (images.length === 0) {
        productsWithImageIssues.push({ name: product.name, issue: 'لا توجد صور' });
        continue;
      }

      // Check if image files exist
      for (const imagePath of images) {
        const filePath = path.join(process.cwd(), 'client', 'public', imagePath);

        if (!fs.existsSync(filePath)) {
          missingImageFiles.push({
            product: product.name,
            path: imagePath
          });
        }
      }

      // Check thumbnail
      if (product.thumbnail) {
        const thumbPath = path.join(process.cwd(), 'client', 'public', product.thumbnail);
        if (!fs.existsSync(thumbPath)) {
          missingImageFiles.push({
            product: product.name,
            path: product.thumbnail + ' (thumbnail)'
          });
        }
      }
    }

    console.log(`   ✓ إجمالي الصور: ${totalImages}`);
    console.log(`   ✓ متوسط الصور لكل منتج: ${(totalImages / products.length).toFixed(1)}`);

    if (missingImageFiles.length > 0) {
      console.log(`   ❌ صور مفقودة من النظام: ${missingImageFiles.length}`);
      missingImageFiles.slice(0, 10).forEach(({ product, path }) => {
        console.log(`      📦 ${product}`);
        console.log(`         ❌ ${path}`);
      });
      if (missingImageFiles.length > 10) {
        console.log(`      ... و ${missingImageFiles.length - 10} أخرى`);
      }
    } else {
      console.log('   ✅ جميع الصور موجودة في النظام');
    }

    console.log('\n───────────────────────────────────────────────────\n');

    // 4. Brand Analysis
    console.log('🏷️  4. تحليل البراندات:\n');

    const byBrand = {};
    products.forEach(p => {
      if (!byBrand[p.brand]) byBrand[p.brand] = [];
      byBrand[p.brand].push(p);
    });

    Object.keys(byBrand).sort().forEach(brand => {
      console.log(`   ${brand}: ${byBrand[brand].length} منتج`);
    });

    console.log('\n───────────────────────────────────────────────────\n');

    // 5. Category Analysis
    console.log('📂 5. تحليل الفئات:\n');

    const byCategory = {};
    products.forEach(p => {
      const key = `${p.category} / ${p.subcategory}`;
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(p);
    });

    Object.keys(byCategory).sort().forEach(cat => {
      console.log(`   ${cat}: ${byCategory[cat].length} منتج`);
    });

    console.log('\n───────────────────────────────────────────────────\n');

    // 6. HOUYI Folder Analysis
    console.log('📁 6. تحليل مجلدات HOUYI:\n');

    const houyiPath = path.join(process.cwd(), 'client', 'public', 'images', 'products', 'houyi');

    if (fs.existsSync(houyiPath)) {
      const folders = fs.readdirSync(houyiPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort();

      console.log(`   📁 إجمالي المجلدات: ${folders.length}`);

      // Get used folders
      const usedFolders = new Set();
      const houyiProducts = products.filter(p => p.brand === 'HOUYI');

      houyiProducts.forEach(product => {
        if (product.images && product.images.length > 0) {
          product.images.forEach(imagePath => {
            const match = imagePath.match(/\/images\/products\/houyi\/([^\/]+)/);
            if (match) usedFolders.add(match[1]);
          });
        }
      });

      console.log(`   📦 منتجات HOUYI في قاعدة البيانات: ${houyiProducts.length}`);
      console.log(`   📂 مجلدات مستخدمة: ${usedFolders.size}`);

      const unusedFolders = folders.filter(f => !usedFolders.has(f));
      console.log(`   ⚠️  مجلدات غير مستخدمة: ${unusedFolders.length}`);

      if (unusedFolders.length > 0) {
        console.log('\n   المنتجات المفقودة من قاعدة البيانات:');
        unusedFolders.forEach((folder, idx) => {
          const folderPath = path.join(houyiPath, folder);
          const files = fs.readdirSync(folderPath);
          const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

          if (imageFiles.length > 0) {
            console.log(`\n   ${idx + 1}. 📁 ${folder}`);
            console.log(`      ${imageFiles.length} صورة`);
          }
        });
      }
    } else {
      console.log('   ❌ مجلد HOUYI غير موجود!');
    }

    console.log('\n───────────────────────────────────────────────────\n');

    // 7. HYGGER Folder Analysis
    console.log('📁 7. تحليل مجلدات HYGGER:\n');

    const hyggerPath = path.join(process.cwd(), 'client', 'public', 'images', 'products', 'hygger');

    if (fs.existsSync(hyggerPath)) {
      const folders = fs.readdirSync(hyggerPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort();

      console.log(`   📁 إجمالي المجلدات: ${folders.length}`);

      const usedFolders = new Set();
      const hyggerProducts = products.filter(p => p.brand === 'HYGGER');

      hyggerProducts.forEach(product => {
        if (product.images && product.images.length > 0) {
          product.images.forEach(imagePath => {
            const match = imagePath.match(/\/images\/products\/hygger\/([^\/]+)/);
            if (match) usedFolders.add(match[1]);
          });
        }
      });

      console.log(`   📦 منتجات HYGGER في قاعدة البيانات: ${hyggerProducts.length}`);
      console.log(`   📂 مجلدات مستخدمة: ${usedFolders.size}`);

      const unusedFolders = folders.filter(f => !usedFolders.has(f));

      if (unusedFolders.length > 0) {
        console.log(`   ⚠️  مجلدات غير مستخدمة: ${unusedFolders.length}`);
        unusedFolders.forEach(f => console.log(`      - ${f}`));
      } else {
        console.log('   ✅ جميع المجلدات مستخدمة');
      }
    } else {
      console.log('   ❌ مجلد HYGGER غير موجود!');
    }

    console.log('\n───────────────────────────────────────────────────\n');

    // 8. Price Analysis
    console.log('💰 8. تحليل الأسعار:\n');

    const prices = products.map(p => Number(p.price)).filter(p => p > 0).sort((a, b) => a - b);

    if (prices.length > 0) {
      const min = prices[0];
      const max = prices[prices.length - 1];
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const median = prices[Math.floor(prices.length / 2)];

      console.log(`   أقل سعر: ${min.toLocaleString()} د.ع`);
      console.log(`   أعلى سعر: ${max.toLocaleString()} د.ع`);
      console.log(`   متوسط السعر: ${Math.round(avg).toLocaleString()} د.ع`);
      console.log(`   السعر الوسيط: ${Math.round(median).toLocaleString()} د.ع`);

      // Find cheapest and most expensive
      const cheapest = products.find(p => Number(p.price) === min);
      const expensive = products.find(p => Number(p.price) === max);

      console.log(`\n   أرخص منتج: ${cheapest.name} (${min.toLocaleString()} د.ع)`);
      console.log(`   أغلى منتج: ${expensive.name} (${max.toLocaleString()} د.ع)`);
    }

    console.log('\n───────────────────────────────────────────────────\n');

    // 9. Stock Analysis
    console.log('📊 9. تحليل المخزون:\n');

    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const avgStock = totalStock / products.length;
    const outOfStock = products.filter(p => !p.stock || p.stock === 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock < p.low_stock_threshold);

    console.log(`   إجمالي المخزون: ${totalStock.toLocaleString()} قطعة`);
    console.log(`   متوسط المخزون: ${Math.round(avgStock)} قطعة/منتج`);
    console.log(`   منتجات نفذت: ${outOfStock.length}`);
    console.log(`   منتجات مخزون منخفض: ${lowStock.length}`);

    if (outOfStock.length > 0 && outOfStock.length <= 10) {
      console.log('\n   المنتجات التي نفذت:');
      outOfStock.forEach(p => console.log(`      - ${p.name}`));
    }

    console.log('\n═══════════════════════════════════════════════════\n');

    // Final Summary
    console.log('📝 الملخص النهائي:\n');
    console.log(`   ✓ إجمالي المنتجات: ${products.length}`);
    console.log(`   ✓ HYGGER: ${byBrand['HYGGER']?.length || 0}`);
    console.log(`   ✓ HOUYI: ${byBrand['HOUYI']?.length || 0}`);
    console.log(`   ✓ إجمالي الصور: ${totalImages}`);
    console.log(`   ✓ إجمالي المخزون: ${totalStock.toLocaleString()} قطعة`);

    if (unusedFolders && unusedFolders.length > 0) {
      console.log(`\n   ⚠️  منتجات HOUYI مفقودة: ${unusedFolders.filter(f => {
        const folderPath = path.join(houyiPath, f);
        const files = fs.readdirSync(folderPath);
        return files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).length > 0;
      }).length}`);
    }

    if (missingImageFiles.length > 0) {
      console.log(`   ⚠️  صور مفقودة: ${missingImageFiles.length}`);
    }

    console.log('\n✅ اكتمل الفحص المعمق!\n');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error.stack);
  }
}

deepCheck();
