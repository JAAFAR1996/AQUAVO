
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
    console.log('Checking for early_access_leads table...');

    try {
        // Create the table if it doesn't exist
        await sql`
      CREATE TABLE IF NOT EXISTS early_access_leads (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        source VARCHAR(50) DEFAULT 'landing_page',
        ip_address VARCHAR(45),
        user_agent TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
        console.log('✅ early_access_leads table checked/created successfully.');
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
}

main();
