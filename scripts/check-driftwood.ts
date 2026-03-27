import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function main() {
  const rows = await sql`SELECT id, name, slug, has_variants, variants FROM products WHERE slug = 'houyi-polished-driftwood'`;
  console.log("has_variants:", rows[0].has_variants);
  console.log("variants type:", typeof rows[0].variants);
  console.log("variants is array:", Array.isArray(rows[0].variants));
  console.log("variants length:", Array.isArray(rows[0].variants) ? rows[0].variants.length : "N/A");
  console.log("\nFull row:");
  console.log(JSON.stringify(rows[0], null, 2));
}

main().catch(console.error);
