import { neon } from '@neondatabase/serverless';
import fs from 'fs';

async function run() {
  // 1. Check DB
  try {
    const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
    const products = await sql`SELECT id, name, price, original_price FROM products LIMIT 5`;
    console.log('Sample Products from NEON:');
    console.log(products);
    
    const allPrices = await sql`SELECT price, count(*) from products group by price order by count(*) desc limit 5`;
    console.log('\nMost common prices in DB:');
    console.log(allPrices);
  } catch (err) {
    console.error('Error fetching from neon:', err.message);
  }

  // 2. Fix the Prompts
  try {
    const filePath = 'Launch_Ideas/promot/AQUAVO_REELS_PROMPTS_BATCH11.md';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    function cleanTexts(promptStr) {
      // Very specific replacements based on the known format
      let result = promptStr;
      if (result.includes("Texts: ") || result.includes("Texts to include: ")) {
        // Strip emojis
        result = result.replace(/[❌💡🫧🍽️🔖📊🧬😊🏥🔴🔵⚫🟠🪴❄️🤯🎨🖼️💀🌡️✨🌫️🎮🌃👇✅🌿🔄❤️🦐🔥]/g, '');
        
        // Strip percentages like (White, 30%), or (30%), or (30% height)
        result = result.replace(/\(\d+%\)/g, '');
        result = result.replace(/\([^)]*\d+%[^)]*\)/g, (match) => {
             // Keep the color but remove percentage
             let color = match.replace(/[\d]+%/, '').replace(/height|bold|left side|right side/, '').replace(/[,]/g, '').trim();
             return color;
        });
      }
      return result;
    }

    // Apply to file line by line for safety or replace the object
    const lines = content.split('\n');
    for (let i=0; i<lines.length; i++) {
        if (lines[i].includes('"nano_banana_prompt":')) {
            lines[i] = cleanTexts(lines[i]);
            // Ensure instructions are clear
            if (!lines[i].includes('DEAD CENTER')) {
                 lines[i] = lines[i].replace('",', ' Stack all texts vertically exactly in the DEAD CENTER.",');
            }
        }
    }
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log('\nSuccessfully cleaned prompts in BATCH11 file.');
  } catch(e) {
    console.error('Prompt clean error', e);
  }
}
run();
