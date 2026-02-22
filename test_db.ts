import { neon } from '@neondatabase/serverless';

async function testConnection(url: string, name: string) {
    try {
        const sql = neon(url);
        const result = await sql`SELECT 1 as val`;
        console.log(`✅ Success for ${name}:`, result[0].val);
    } catch (e: any) {
        console.log(`❌ Error for ${name}:`, e.message);
    }
}

async function run() {
    console.log("Testing Neon DB Connections...");

    // 1. Original User Provided URL
    await testConnection('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', 'Original provided');

    // 2. Original User Provided URL without channel_binding
    await testConnection('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze.us-east-1.aws.neon.tech/neondb?sslmode=require', 'Without channel_binding');

    // 3. Pooler URL (standard Neon pattern)
    await testConnection('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require', 'Pooler URL without channel_binding');
}

run();
