import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.production' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = neon(process.env.DATABASE_URL!);

async function fixTank601515() {
    const tankFolder = path.join(__dirname, '..', 'client', 'public', 'images', 'products', 'yee', 'Bare side stream tank 601515cm 6mm water pump');

    // Check if folder exists
    if (!fs.existsSync(tankFolder)) {
        console.error('❌ المجلد غير موجود:', tankFolder);
        console.log('\nالرجاء نسخ المجلد أولاً باستخدام الأمر:');
        console.log('Copy-Item -Path "C:\\Users\\jaafa\\Downloads\\Bare side stream tank 601515cm 6mm water pump" -Destination "C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\client\\public\\images\\products\\yee\\" -Recurse');
        return;
    }

    // List all images in the folder
    const files = fs.readdirSync(tankFolder).filter(f =>
        ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(path.extname(f).toLowerCase())
    );

    if (files.length === 0) {
        console.error('❌ لا توجد صور في المجلد');
        return;
    }

    console.log(`✓ تم العثور على ${files.length} صورة`);
    files.forEach(f => console.log(`  - ${f}`));

    // Build image paths
    const basePath = '/images/products/yee/Bare side stream tank 601515cm 6mm water pump';
    const images = files.map(f => `${basePath}/${f}`);
    const thumbnail = images[0];

    // Update database
    const result = await sql`
    UPDATE products 
    SET 
      thumbnail = ${thumbnail},
      images = ${JSON.stringify(images)}::jsonb,
      updated_at = NOW()
    WHERE id = 'yee-tank-601515'
    RETURNING id, name
  `;

    console.log('\n✓ تم تحديث المنتج:', result[0]?.name);
    console.log('  Thumbnail:', thumbnail);
    console.log('  Images count:', images.length);
}

fixTank601515().catch(console.error);
