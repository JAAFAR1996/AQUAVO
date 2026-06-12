const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback

async function run() {
  const sql = neon(process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL environment variable is required"); })());
  try {
    console.log("Adding pending_loyalty_points...");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_loyalty_points INTEGER DEFAULT 0`;
    console.log("Adding pending_cashback_balance...");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_cashback_balance INTEGER DEFAULT 0`;
    console.log("Adding status to loyalty_transactions...");
    await sql`ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'`;
    console.log("Done!");
  } catch (err) {
    console.error("Error running migration:", err);
  }
}

run();
