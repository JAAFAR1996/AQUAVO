const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // First get table names
  const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log("=== TABLES ===");
  console.log(JSON.stringify(tables, null, 2));

  // Get product columns
  try {
    const cols = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'product' ORDER BY ordinal_position");
    console.log("\n=== PRODUCT COLUMNS ===");
    console.log(JSON.stringify(cols, null, 2));
  } catch(e) {
    console.log("No 'product' table, trying 'products'...");
    try {
      const cols2 = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position");
      console.log("\n=== PRODUCTS COLUMNS ===");
      console.log(JSON.stringify(cols2, null, 2));
    } catch(e2) {
      console.log("No 'products' table either");
    }
  }
}

main().catch(console.error);
