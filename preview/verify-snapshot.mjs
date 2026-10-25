import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('preview/catalogue.json','utf8'));
assert.equal(data.capturedAt,'2026-10-24T20:34:00Z');
const originalPath = process.argv[2];
if (!originalPath) throw Error('Supply the original public GET /api/products snapshot path');
const original = JSON.parse(readFileSync(originalPath,'utf8')).products;
for (const product of data.products) {
  const source = original.find(p=>p.id===product.id);
  assert.ok(source);
  for (const field of ['price','stock','hasVariants']) assert.deepEqual(product[field],source[field]);
  assert.equal(product.variants.length,source.variants.length);
  for (const variant of product.variants) {
    const actual = source.variants.find(v=>v.id===variant.id);
    for (const field of ['price','stock','priceStatus','availabilityStatus','isArchived','isDefault','images','image']) assert.deepEqual(variant[field],actual[field],`${product.id}/${variant.id}/${field}`);
  }
}
assert.equal(data.products.length,original.length);
assert.equal(data.products.flatMap(p=>p.variants).filter(v=>v.isArchived).length,11);
console.log('Public snapshot commerce, image, option identity and archived-state contract passed');
