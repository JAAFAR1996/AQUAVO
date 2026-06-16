import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../shared/schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Provide it via the environment (e.g. a gitignored .env), never hardcoded.");
}

async function main() {
    const pool = new Pool({ connectionString });
    const db = drizzle(pool, { schema });

    console.log("Checking schemas...");
    const schemas = await db.execute("SELECT schema_name FROM information_schema.schemata");
    console.log("Schemas:", schemas.rows.map(r => r.schema_name));

    console.log("Checking databases...");
    const databases = await db.execute("SELECT datname FROM pg_database WHERE datistemplate = false");
    console.log("Databases:", databases.rows.map(r => r.datname));

    console.log("Checking tables in current database...");
    const tables = await db.execute(
        "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')"
    );
    console.log("Tables:", tables.rows.map(r => `${r.table_schema}.${r.table_name}`));

    pool.end();
}

main().catch(console.error);
