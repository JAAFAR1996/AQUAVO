import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function addPreferencesColumn() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL not found');
    }

    const sql = neon(connectionString);

    console.log('🔄 Checking if preferences column exists...');

    try {
        // Check if column exists
        const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'preferences'
    `;

        if (result.length > 0) {
            console.log('✅ Column "preferences" already exists!');
            return;
        }

        console.log('⚠️ Column "preferences" does not exist. Adding it now...');

        // Add the column
        await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS preferences JSONB
    `;

        console.log('✅ Column "preferences" added successfully!');
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

addPreferencesColumn().then(() => {
    console.log('Done!');
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
