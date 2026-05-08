const { Client } = require('pg');
const fs = require('fs');

async function getPrices() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  });
  
  await client.connect();
  const res = await client.query('SELECT name, price, variants, has_variants as "hasVariants" FROM products');
  
  const formattedPrices = res.rows.map(row => {
    return {
      name: row.name,
      price: row.price,
      hasVariants: row.hasVariants,
      variants: row.variants
    };
  });
  
  fs.writeFileSync('db_prices.json', JSON.stringify(formattedPrices, null, 2));
  console.log('Prices saved to db_prices.json');
  await client.end();
}

getPrices().catch(console.error);
