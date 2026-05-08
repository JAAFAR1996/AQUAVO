import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../env.prod') });
const sql = neon(process.env.DATABASE_URL.replace(/[&?]channel_binding=require/g, ''));

const fks = await sql`
  SELECT tc.table_name, kcu.column_name 
  FROM information_schema.table_constraints tc 
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name 
  JOIN information_schema.referential_constraints rc ON tc.constraint_name=rc.constraint_name 
  JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name=tc2.constraint_name 
  WHERE tc.constraint_type='FOREIGN KEY' AND tc2.table_name='users' 
  ORDER BY tc.table_name
`;

console.log('\nالجداول المرتبطة بـ users:\n');
for (const r of fks) console.log(`  ${r.table_name}.${r.column_name}`);
