import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load env
config({ path: '.env.production' });

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Direct SQL query for first 5 houyi products  
const result = await sql`
  SELECT id, name, slug, image_url
  FROM products
  WHERE slug LIKE 'houyi-%'
  ORDER BY id ASC
  LIMIT 10
`;

console.log('\n=== أول منتجات Houyi في قاعدة البيانات ===\n');
result.forEach((p, i) => {
  console.log(`${i+1}. ID: ${p.id}`);
  console.log(`   Name: ${p.name}`);
  console.log(`   Slug: ${p.slug}`);
  console.log(`   Image: ${p.image_url}`);
  console.log('');
});

process.exit(0);
