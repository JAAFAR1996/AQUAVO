import { neon } from '@neondatabase/serverless';
import fs from 'fs';

async function getPrices() {
  const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
  
  const res = await sql`SELECT id, slug, name, price, variants FROM products`;
  
  fs.writeFileSync('db_prices_full.json', JSON.stringify(res, null, 2));
  console.log('Prices saved to db_prices_full.json');
}

getPrices().catch(console.error);
