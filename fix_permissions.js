const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

async function run() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        await sql`ALTER TABLE social_connections ALTER COLUMN permissions TYPE jsonb USING permissions::jsonb;`;
        console.log('Successfully altered permissions column to jsonb');
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
