import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("Fetching YEE products from database...");
  const products = await sql`SELECT slug, name, brand, images, has_variants, variants FROM products WHERE brand = 'YEE' ORDER BY category, name ASC`;
  
  let html = `
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="UTF-8">
    <title>YEE Image Verification</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f9; padding: 20px; }
      .product { background: white; margin-bottom: 20px; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .product h3 { margin-top: 0; color: #1a73e8; }
      .slug { font-size: 12px; color: #777; background: #eee; padding: 2px 6px; border-radius: 4px; }
      .images { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
      .images img { width: 150px; height: 150px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; background: #fff; }
      .variants { margin-top: 10px; font-size: 14px; color: #444; background: #e8f0fe; padding: 10px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>مراجعة صور منتجات YEE (${products.length} منتج)</h1>
    <p>هذا الملف يعرض جميع المنتجات المرفوعة حالياً في قاعدة البيانات مع صورها المرتبطة للتأكد من عدم وجود تكرار أو أخطاء.</p>
  `;

  for (const p of products) {
    const images = Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? JSON.parse(p.images) : []);
    const variants = Array.isArray(p.variants) ? p.variants : (typeof p.variants === 'string' ? JSON.parse(p.variants) : []);
    
    html += `
    <div class="product">
      <h3>${p.name} <span class="slug">${p.slug}</span></h3>
      ${p.has_variants && variants.length > 0 ? `<div class="variants"><strong>الخيارات المدمجة (Variants):</strong> ${variants.map((v:any) => v.label).join(' | ')}</div>` : ''}
      <div class="images">
        ${images.map((img: string) => `<img src="client/public${img}" alt="Product Image" loading="lazy">`).join('')}
      </div>
    </div>
    `;
  }

  html += `</body></html>`;
  fs.writeFileSync('verify-images.html', html);
  console.log('✅ Generated verify-images.html successfully!');
  console.log('👉 Please double click the "verify-images.html" file in your FishWebClean folder to view the images in your browser.');
}

main().catch(console.error);
