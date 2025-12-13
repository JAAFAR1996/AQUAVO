import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
console.log("Checking DB connection...");
if(!dbUrl) {
    console.error("No DATABASE_URL");
    process.exit(1);
}

try {
    const sql = neon(dbUrl);
    const result = await sql`SELECT 1 as val`;
    console.log("Result:", result);
    console.log("Connection successful");
} catch(e) {
    console.error("Connection failed:", e);
}
