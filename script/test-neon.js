import { neon } from "@neondatabase/serverless";

const dbUrl = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  try {
    const sql = neon(dbUrl);
    const result = await sql`SELECT 1 as success`;
    console.log("DB Connection successful:", result);
  } catch (err) {
    console.error("DB Connection failed:", err.message);
  }
}
run();
