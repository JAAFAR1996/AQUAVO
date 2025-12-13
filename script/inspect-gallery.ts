import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../shared/schema.js";

const connectionString = "postgresql://neondb_owner:npg_2hbE5zHAaLnv@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
    const pool = new Pool({ connectionString });
    const db = drizzle(pool, { schema });

    console.log("Checking gallery_submissions...");
    const gs = await db.execute(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'gallery_submissions'"
    );
    console.log(JSON.stringify(gs.rows.map(r => ({ name: r.column_name, null: r.is_nullable })), null, 2));

    console.log("Checking gallery_prizes table...");
    const gp = await db.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'gallery_prizes'"
    );
    console.log("Exists:", gp.rows.length > 0);

    pool.end();
}

main().catch(console.error);
