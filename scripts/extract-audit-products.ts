import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("=== EXTRACTING PRODUCTS FROM AUDIT LOGS ===\n");

  // Get ALL product audit logs with full changes data
  const allLogs = await sql`
    SELECT entity_id, action, changes, created_at
    FROM audit_logs 
    WHERE entity_type = 'product'
    ORDER BY created_at DESC
  `;

  console.log(`Total audit log entries: ${allLogs.length}`);

  // Group by entity_id and keep the LATEST version of each product
  const latestProducts = new Map<string, any>();

  for (const log of allLogs) {
    if (!log.changes) continue;
    
    const entityId = log.entity_id;
    
    // Only keep the latest version (first one we encounter since sorted DESC)
    if (!latestProducts.has(entityId)) {
      latestProducts.set(entityId, {
        ...log.changes,
        _audit_action: log.action,
        _audit_date: log.created_at
      });
    }
  }

  console.log(`Unique products found in audit logs: ${latestProducts.size}`);

  // Filter out products that were explicitly deleted
  const deletedIds = new Set<string>();
  for (const log of allLogs) {
    if (log.action === 'delete') {
      deletedIds.add(log.entity_id);
    }
  }

  // Show summary
  const productsToRestore: any[] = [];
  const productsDeleted: any[] = [];

  for (const [id, product] of latestProducts) {
    if (deletedIds.has(id)) {
      productsDeleted.push(product);
    } else {
      productsToRestore.push(product);
    }
  }

  console.log(`\nProducts available to restore: ${productsToRestore.length}`);
  console.log(`Products that were intentionally deleted: ${productsDeleted.length}`);

  // Show first 5 products to verify they have real data
  console.log("\n=== SAMPLE PRODUCTS (first 5) ===");
  for (let i = 0; i < Math.min(5, productsToRestore.length); i++) {
    const p = productsToRestore[i];
    console.log(`\n${i+1}. ${p.name}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Slug: ${p.slug}`);
    console.log(`   Brand: ${p.brand}`);
    console.log(`   Category: ${p.category}`);
    console.log(`   Price: ${p.price}`);
    console.log(`   Images: ${p.images ? p.images.length : 0}`);
    console.log(`   Has Description: ${!!p.description}`);
    console.log(`   Has Specs: ${!!p.specifications}`);
  }

  // Save to file for restoration
  fs.writeFileSync(
    'recovered_products_from_audit.json',
    JSON.stringify(productsToRestore, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Saved ${productsToRestore.length} products to recovered_products_from_audit.json`);
}

main().catch(console.error);
