
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
sql`SELECT id, name, deleted_at FROM products LIMIT 5`.then(res => {
    console.log("Sample products:", res);
    process.exit(0);
});
