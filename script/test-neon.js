import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL environment variable is required");

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
