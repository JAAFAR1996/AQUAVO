/** Reviewed category-only migration. DATABASE_URL stays outside the repository.
 * Usage: NODE_USE_ENV_PROXY=1 node --import tsx TOOLS/catalog/organize-20261022.ts [check|apply|rollback]
 * Restore with rollback using the same reviewed plan; conflicting rows fail closed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { products, categories } from "../../shared/schema.js";
const state = z.object({ category: z.string().min(1), categoryId: z.string().nullable(), subcategory: z.string().min(1) });
const row = z.object({ id: z.string().min(1), name: z.string(), slug: z.string(), before: state, after: state, changed: z.boolean() });
const plan = z.array(row).parse(JSON.parse(readFileSync(new URL('./organization-20261022.json', import.meta.url), 'utf8')));
const mode = z.enum(['check', 'apply', 'rollback']).parse(process.argv[2] ?? 'check');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = drizzle(neon(process.env.DATABASE_URL));
const changes = plan.filter(item => item.changed);
const reverse = mode === 'rollback';
const fields = { id: products.id, category: products.category, categoryId: products.categoryId, subcategory: products.subcategory, deletedAt: products.deletedAt };
const before = await db.select(fields).from(products).where(inArray(products.id, changes.map(item => item.id)));
const targetCategories = await db.select({ id: categories.id, name: categories.name }).from(categories);
for (const item of changes) {
  const expected = reverse ? item.after : item.before;
  const next = reverse ? item.before : item.after;
  const current = before.find(product => product.id === item.id);
  if (!current || current.deletedAt || current.category !== expected.category || current.categoryId !== expected.categoryId || current.subcategory !== expected.subcategory) throw new Error(`Classification changed since review: ${item.id}`);
  if (!targetCategories.some(category => category.id === next.categoryId && category.name === next.category)) throw new Error(`Invalid category link: ${item.id}`);
}
console.log(JSON.stringify({ mode, reviewed: plan.length, changes: changes.length, categoryMoves: changes.filter(item => item.before.category !== item.after.category).length }));
if (mode !== 'check') {
  const queries = changes.map(item => {
    const expected = reverse ? item.after : item.before;
    const next = reverse ? item.before : item.after;
    return db.update(products).set(next).where(and(
      eq(products.id, item.id), isNull(products.deletedAt), eq(products.category, expected.category),
      expected.categoryId === null ? isNull(products.categoryId) : eq(products.categoryId, expected.categoryId),
      eq(products.subcategory, expected.subcategory),
    )).returning({ id: products.id });
  });
  const result = await db.batch(queries as [typeof queries[number], ...typeof queries]);
  const updated = result.flat().map(item => item.id);
  if (updated.length !== changes.length) {
    const appliedIds = new Set(updated);
    const undo = changes.filter(item => appliedIds.has(item.id)).map(item => {
      const written = reverse ? item.before : item.after;
      const restore = reverse ? item.after : item.before;
      return db.update(products).set(restore).where(and(
        eq(products.id, item.id), eq(products.category, written.category),
        written.categoryId === null ? isNull(products.categoryId) : eq(products.categoryId, written.categoryId),
        eq(products.subcategory, written.subcategory),
      )).returning({ id: products.id });
    });
    const restored = undo.length ? (await db.batch(undo as [typeof undo[number], ...typeof undo])).flat().length : 0;
    throw new Error(`Concurrent classification conflict; reverted ${restored}/${updated.length} applied rows. Review current state before retrying.`);
  }
  const after = await db.select(fields).from(products).where(inArray(products.id, changes.map(item => item.id)));
  for (const item of changes) {
    const actual = after.find(product => product.id === item.id);
    const expected = reverse ? item.before : item.after;
    if (!actual || Object.entries(expected).some(([key, value]) => actual[key as keyof typeof actual] !== value)) throw new Error(`Verification failed: ${item.id}`);
  }
  // Audit only classification and identity; do not export costs or other private fields.
  const receipt = { at: new Date().toISOString(), mode, count: updated.length, rows: changes.map(item => ({ id: item.id, before: reverse ? item.after : item.before, after: reverse ? item.before : item.after })) };
  if (process.env.CATALOG_RECEIPT_PATH) writeFileSync(process.env.CATALOG_RECEIPT_PATH, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ verified: updated.length }));
}
