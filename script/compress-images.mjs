import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BASE = 'client/public/images/products/houyi';

const folders = [
  'houyi-koi-fish-net',
  'houyi-connectors-4mm',
];

async function compressImages() {
  for (const folder of folders) {
    const dir = path.join(BASE, folder);
    const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    
    console.log(`\n📁 ${folder} (${files.length} images)`);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      // Only compress if > 300KB
      if (sizeKB <= 300) {
        console.log(`  ✅ ${file} - ${sizeKB} KB (OK, skipping)`);
        continue;
      }
      
      console.log(`  🔄 ${file} - ${sizeKB} KB → compressing...`);
      
      const ext = path.extname(file).toLowerCase();
      const tempPath = filePath + '.tmp';
      
      try {
        const img = sharp(filePath).resize(1200, 1200, { 
          fit: 'inside', 
          withoutEnlargement: true 
        });
        
        if (ext === '.png') {
          await img.png({ quality: 85, compressionLevel: 9 }).toFile(tempPath);
        } else {
          await img.jpeg({ quality: 85, mozjpeg: true }).toFile(tempPath);
        }
        
        const newStats = fs.statSync(tempPath);
        const newSizeKB = Math.round(newStats.size / 1024);
        
        // Replace original with compressed
        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
        
        const savings = Math.round((1 - newStats.size / stats.size) * 100);
        console.log(`  ✅ ${file} - ${sizeKB} KB → ${newSizeKB} KB (saved ${savings}%)`);
      } catch (err) {
        console.error(`  ❌ Error compressing ${file}:`, err.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
  }
  
  console.log('\n🎉 Done! Now rebuild and redeploy.');
}

compressImages().catch(console.error);
