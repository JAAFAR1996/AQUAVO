import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../shared/schema.js";

const connectionString = "postgresql://neondb_owner:npg_2hbE5zHAaLnv@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
    const pool = new Pool({ connectionString });
    const db = drizzle(pool, { schema });

    console.log("Checking tables...");

    // Check orders table
    const ordersColumns = await db.execute(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'orders'"
    );
    console.log("Orders Columns:", ordersColumns.rows.map(r => r.column_name));

    // Check gallery_submissions table
    const galleryCols = await db.execute(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'gallery_submissions'"
    );
    console.log("Gallery Submissions Columns:", galleryCols.rows.map(r => r.column_name));

    // Check if gallery_prizes exists
    const tables = await db.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log("Tables:", tables.rows.map(r => r.table_name));

    pool.end();
}

main().catch(console.error);
