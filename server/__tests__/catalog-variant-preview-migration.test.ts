import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync('migrations/0104_catalog_variant_preview_and_history.sql', 'utf8');
let db: PGlite;
let sequence = 0;
const id = () => `product-${++sequence}`;
const priced = (variantId = 'current', stock = 0) => ({ id: variantId, label: variantId, stock, price: 500 });
const pending = () => ({ id: 'incoming', label: 'incoming', stock: 0, price: null, priceStatus: 'pending', availabilityStatus: 'coming_soon' });
async function product(variants: unknown[] = [], variantProduct = true) {
  const productId = id();
  await db.query('INSERT INTO products(id,has_variants,variants) VALUES($1,$2,$3::jsonb)', [productId, variantProduct, JSON.stringify(variants)]);
  return productId;
}
async function update(productId: string, variants: unknown[]) {
  return db.query('UPDATE products SET variants=$2::jsonb WHERE id=$1', [productId, JSON.stringify(variants)]);
}
async function move(productId: string, variantId: string | null, quantity: number, key: string) {
  return db.query(`INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,idempotency_key)
    VALUES($1,$2,'main',$3,'transfer','test',$4)`, [productId, variantId, quantity, key]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE schema_migrations(version text PRIMARY KEY,checksum text,notes text);
    CREATE TABLE products(id text PRIMARY KEY,variants jsonb,has_variants boolean DEFAULT false,stock integer DEFAULT 0,updated_at timestamptz DEFAULT now());
    CREATE TABLE product_variant_reconciliation(product_id text,variant_id text,label text,sku text,observed_price numeric,observed_original_price numeric,observed_stock integer,is_default boolean,specifications jsonb,source_snapshot jsonb,reconciliation_status text,is_active boolean,updated_at timestamptz DEFAULT now(),approved_canonical_stock integer,PRIMARY KEY(product_id,variant_id));
    CREATE TABLE settings(key text PRIMARY KEY,value text);
    INSERT INTO settings VALUES('inventory_ledger_mode','enforce');
    CREATE TABLE inventory_locations(id text PRIMARY KEY,code text,is_active boolean);
    INSERT INTO inventory_locations VALUES('main','MAIN',true);
    CREATE TABLE inventory_movements(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,product_id text,variant_id text,location_id text,quantity_delta integer,movement_type text,source_type text,source_id text,idempotency_key text UNIQUE,unit_cost numeric,currency text,happened_at timestamptz,created_by text,metadata jsonb,reversed_movement_id text);
    CREATE TABLE returns(id text PRIMARY KEY,created_at timestamp DEFAULT now(),type text DEFAULT 'customer',status text,restocked boolean,affected_items jsonb,restocked_at timestamptz,note text);
    CREATE TABLE orders(id text PRIMARY KEY,status text,is_test boolean DEFAULT false);
    CREATE TABLE order_items_relational(id text PRIMARY KEY,order_id text,product_id text,quantity integer,metadata jsonb);
    CREATE TABLE order_inventory_custody_events(order_id text,custody_state text,source_order_status text,idempotency_key text UNIQUE,metadata jsonb);
    CREATE FUNCTION aquavo_active_cutover() RETURNS timestamptz LANGUAGE sql AS $$SELECT '2000-01-01'::timestamptz$$;
  `);
  await db.query("SELECT set_config('aquavo.migration_checksum',$1,false)", [createHash('sha256').update(migration).digest('hex')]);
  await db.exec(migration);
  // Preserve production inventory guards/projection, not a test-only bypass.
  const source = readFileSync('migrations/0088_allow_zero_stock_variant_shape_changes.sql', 'utf8');
  const guard = source.match(/CREATE OR REPLACE FUNCTION public\.guard_products_inventory_direct_write\(\)[\s\S]*?\$function\$;/)?.[0];
  if (!guard) throw new Error('0088 inventory guard missing');
  await db.exec(guard);
  await db.exec(`
    CREATE FUNCTION prevent_negative_inventory_balance() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE balance bigint;
    BEGIN
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.product_id||'|'||COALESCE(NEW.variant_id,'')||'|'||NEW.location_id,0));
      SELECT COALESCE(SUM(quantity_delta),0) INTO balance FROM inventory_movements WHERE product_id=NEW.product_id AND variant_id IS NOT DISTINCT FROM NEW.variant_id AND location_id=NEW.location_id;
      IF balance+NEW.quantity_delta<0 THEN RAISE EXCEPTION 'insufficient canonical inventory balance'; END IF;
      RETURN NEW;
    END $$;
    CREATE FUNCTION project_test_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE balance bigint; variant_product boolean;
    BEGIN
      SELECT has_variants INTO variant_product FROM products WHERE id=NEW.product_id FOR UPDATE;
      SELECT SUM(quantity_delta) INTO balance FROM inventory_movements WHERE product_id=NEW.product_id AND variant_id IS NOT DISTINCT FROM NEW.variant_id AND location_id=NEW.location_id;
      IF NEW.variant_id IS NULL THEN
        IF NOT variant_product THEN UPDATE products SET stock=balance WHERE id=NEW.product_id; END IF;
      ELSE
        UPDATE products p SET variants=(SELECT jsonb_agg(CASE WHEN e->>'id'=NEW.variant_id THEN jsonb_set(e,'{stock}',to_jsonb(balance::integer),false) ELSE e END ORDER BY ord) FROM jsonb_array_elements(p.variants) WITH ORDINALITY x(e,ord)) WHERE p.id=NEW.product_id;
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER products_a_validate BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION validate_product_variants_json();
    CREATE TRIGGER products_b_aggregate BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION enforce_product_stock_from_variants();
    CREATE TRIGGER products_c_guard BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION guard_products_inventory_direct_write();
    CREATE TRIGGER products_sync AFTER INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION sync_product_variant_reconciliation();
    CREATE TRIGGER movement_prevent_negative BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION prevent_negative_inventory_balance();
    CREATE TRIGGER movement_project AFTER INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION project_test_inventory();
    CREATE TRIGGER return_inventory AFTER UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION apply_verified_return_inventory();
    CREATE TRIGGER order_inventory AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION reverse_order_inventory_on_terminal_status();
  `);
}, 90_000);
afterAll(async () => { await db?.close(); });

describe('0104 explicit preview-only price contract', () => {
  it('permits marked null at zero stock and normal positive prices', async () => {
    const p = await product([priced(), pending()]);
    const result = await db.query<{ stock: number }>('SELECT stock FROM products WHERE id=$1', [p]);
    expect(result.rows[0].stock).toBe(0);
  });
  it.each([0, -1, '', 'NaN', 'Infinity', '-Infinity', false, {}, []])('rejects malformed new price %j', async (price) => {
    await expect(product([{ ...pending(), price }])).rejects.toThrow();
  });
  it('requires explicit null and both markers, never a missing field', async () => {
    const absent: Record<string, unknown> = pending(); delete absent.price;
    await expect(product([absent])).rejects.toThrow();
    await expect(product([{ ...pending(), priceStatus: undefined }])).rejects.toThrow();
    await expect(product([{ ...pending(), availabilityStatus: undefined }])).rejects.toThrow();
  });
  it('rejects activation of a pending choice without positive price', async () => {
    const p = await product([pending()]);
    await expect(update(p, [{ ...pending(), stock: 1 }])).rejects.toThrow(/price/);
    await expect(move(p, 'incoming', 1, `${p}-receive`)).rejects.toThrow(/price/);
    const result = await db.query('SELECT * FROM inventory_movements WHERE product_id=$1', [p]);
    expect(result.rows).toHaveLength(0);
  });
  it('supports properly priced activation through ledger, not direct stock edits', async () => {
    const p = await product([pending()]);
    await update(p, [{ ...priced('incoming'), availabilityStatus: 'available' }]);
    await expect(update(p, [{ ...priced('incoming', 1) }])).rejects.toThrow(/DIRECT/);
    await move(p, 'incoming', 1, `${p}-receive`);
    const result = await db.query<{stock: number}>('SELECT stock FROM products WHERE id=$1', [p]);
    expect(result.rows[0].stock).toBe(1);
  });
  it.each([-1, 0.5, 'NaN', 'Infinity', null, ''])('rejects bad stock %j', async (stock) => {
    await expect(product([{ ...priced(), stock }])).rejects.toThrow();
  });
  it('keeps duplicate, missing id and default constraints', async () => {
    await expect(product([priced(), priced()])).rejects.toThrow(/duplicate/);
    await expect(product([{ ...priced(), id: '' }])).rejects.toThrow(/non-empty/);
    await expect(product([{ ...priced('a'), isDefault: true }, { ...priced('b'), isDefault: true }])).rejects.toThrow(/default/);
  });
  it('archives identity without erasing history or inflating sellable stock', async () => {
    const p = await product([{ ...priced('legacy'), isArchived: true, isDefault: true }, { ...priced('current'), isDefault: true }]);
    await move(p, 'legacy', 2, `${p}-legacy-return`);
    const result = await db.query<{stock: number; variants: {id: string; stock: number}[]}>('SELECT stock,variants FROM products WHERE id=$1', [p]);
    expect(result.rows[0].stock).toBe(0);
    expect(result.rows[0].variants.find(v => v.id === 'legacy')?.stock).toBe(2);
    const recon = await db.query<{is_active: boolean; is_default: boolean}>('SELECT is_active,is_default FROM product_variant_reconciliation WHERE product_id=$1 AND variant_id=$2', [p, 'legacy']);
    expect(recon.rows[0]).toEqual({is_active: false, is_default: false});
  });
});

describe('0104 historical base inventory routing', () => {
  it('serializes null routing before bucket writes with a separate fresh route read', async () => {
    // PGlite executes PostgreSQL function semantics but has one connection. This
    // verifies the lock/snapshot contract, not a concurrent two-session schedule.
    const result = await db.query<{provolatile: string; prosrc: string}>(
      "SELECT provolatile,prosrc FROM pg_proc WHERE oid='public.resolve_historical_inventory_variant(text,text)'::regprocedure"
    );
    const fn = result.rows[0];
    expect(fn.provolatile).toBe('v');
    expect(fn.prosrc).toMatch(/PERFORM 1 FROM public\.products WHERE id=p_product FOR UPDATE;\s*SELECT target_variant_id INTO target/);
    expect(fn.prosrc.indexOf('FOR UPDATE;')).toBeLessThan(fn.prosrc.indexOf('SELECT target_variant_id'));
    const p = await product([priced()]);
    await db.exec('BEGIN');
    const base = await db.query<{v: null}>('SELECT resolve_historical_inventory_variant($1,NULL) v', [p]);
    expect(base.rows[0].v).toBeNull();
    await db.query(`INSERT INTO product_inventory_variant_routes VALUES($1,'current','Verified original base identity','test',now())`, [p]);
    const routed = await db.query<{v: string}>('SELECT resolve_historical_inventory_variant($1,NULL) v', [p]);
    expect(routed.rows[0].v).toBe('current');
    await db.exec('ROLLBACK');
  });
  it('reclassifies base stock net zero and restores old null orders into the verified current option', async () => {
    const p = await product([], false);
    await move(p, null, 18, `${p}-opening`);
    await db.query('INSERT INTO orders VALUES($1,$2,false)', [`order-${p}`, 'shipped']);
    await db.query('INSERT INTO order_items_relational VALUES($1,$2,$3,1,$4::jsonb)', [`item-${p}`, `order-${p}`, p, '{}']);
    await db.query(`INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,idempotency_key) VALUES($1,NULL,'main',-1,'sale','order_line',$2)`, [p, `order_item:item-${p}`]);
    await db.exec('BEGIN');
    await move(p, null, -17, `${p}-transfer-out`);
    await db.query('UPDATE products SET has_variants=true,variants=$2::jsonb WHERE id=$1', [p, JSON.stringify([priced('current'), pending()])]);
    await db.query(`INSERT INTO product_inventory_variant_routes(product_id,target_variant_id,reason,created_by) VALUES($1,'current','Verified existing size, owner approved','test')`, [p]);
    await move(p, 'current', 17, `${p}-transfer-in`);
    await db.exec('COMMIT');
    await db.query("UPDATE orders SET status='cancelled' WHERE id=$1", [`order-${p}`]);
    const result = await db.query<{stock: number}>('SELECT stock FROM products WHERE id=$1', [p]);
    expect(result.rows[0].stock).toBe(18);
    const movement = await db.query<{variant_id: string; metadata: {historical_variant_id: null}}>("SELECT variant_id,metadata FROM inventory_movements WHERE product_id=$1 AND source_type='order_status_reversal'", [p]);
    expect(movement.rows[0].variant_id).toBe('current');
    expect(movement.rows[0].metadata.historical_variant_id).toBeNull();
    const oldLine = await db.query<{metadata: object}>('SELECT metadata FROM order_items_relational WHERE id=$1', [`item-${p}`]);
    expect(oldLine.rows[0].metadata).toEqual({});
    await db.query("UPDATE orders SET status='rejected' WHERE id=$1", [`order-${p}`]);
    const again = await db.query<{stock: number}>('SELECT stock FROM products WHERE id=$1', [p]);
    expect(again.rows[0].stock).toBe(18);
  });
  it('routes a null return and its reversal consistently while concrete legacy IDs stay untouched', async () => {
    const p = await product([priced('current'), { ...priced('old-weight'), isArchived: true }]);
    await db.query(`INSERT INTO product_inventory_variant_routes(product_id,target_variant_id,reason,created_by) VALUES($1,'current','Verified original base identity','test')`, [p]);
    const items = [{productId: p, qty: 2, cogsAtTime: 10}];
    await db.query("INSERT INTO returns(id,status,restocked,affected_items) VALUES($1,'pending',true,$2::jsonb)", [`return-${p}`, JSON.stringify(items)]);
    await db.query("UPDATE returns SET status='verified' WHERE id=$1", [`return-${p}`]);
    await db.query("UPDATE returns SET status='pending' WHERE id=$1", [`return-${p}`]);
    const movements = await db.query<{variant_id: string; quantity_delta: number}>('SELECT variant_id,quantity_delta FROM inventory_movements WHERE product_id=$1 ORDER BY quantity_delta', [p]);
    expect(movements.rows).toEqual([{variant_id: 'current', quantity_delta: -2}, {variant_id: 'current', quantity_delta: 2}]);
    const concrete = await db.query<{v: string}>('SELECT resolve_historical_inventory_variant($1,$2) v', [p, 'old-weight']);
    expect(concrete.rows[0].v).toBe('old-weight');
    const unmapped = await db.query<{v: null}>("SELECT resolve_historical_inventory_variant('not-mapped',NULL) v");
    expect(unmapped.rows[0].v).toBeNull();
  });
  it('reverses a return posted before conversion into the audited current bucket', async () => {
    const p = await product([], false);
    await db.query("INSERT INTO returns(id,status,restocked,affected_items) VALUES($1,'pending',true,$2::jsonb)", [`old-return-${p}`, JSON.stringify([{productId: p, qty: 2, cogsAtTime: 10}])]);
    await db.query("UPDATE returns SET status='verified' WHERE id=$1", [`old-return-${p}`]);
    await move(p, null, -2, `${p}-transfer-out`);
    await db.query('UPDATE products SET has_variants=true,variants=$2::jsonb WHERE id=$1', [p, JSON.stringify([priced('current')])]);
    await db.query(`INSERT INTO product_inventory_variant_routes(product_id,target_variant_id,reason,created_by) VALUES($1,'current','Verified original identity','test')`, [p]);
    await move(p, 'current', 2, `${p}-transfer-in`);
    await db.query("UPDATE returns SET status='pending' WHERE id=$1", [`old-return-${p}`]);
    const result = await db.query<{stock: number}>('SELECT stock FROM products WHERE id=$1', [p]);
    expect(result.rows[0].stock).toBe(0);
    const undo = await db.query<{variant_id: string; reversed_movement_id: string}>("SELECT variant_id,reversed_movement_id FROM inventory_movements WHERE product_id=$1 AND movement_type='return_out'", [p]);
    expect(undo.rows[0].variant_id).toBe('current');
    expect(undo.rows[0].reversed_movement_id).toBeTruthy();
  });
  it('allows a known priced sold-out identity even when labeled coming soon', async () => {
    const p = await product([{...priced('known'), availabilityStatus: 'coming_soon'}]);
    await db.query(`INSERT INTO product_inventory_variant_routes VALUES($1,'known','Known historical original identity','test',now())`, [p]);
    const routed = await db.query<{v: string}>('SELECT resolve_historical_inventory_variant($1,NULL) v', [p]);
    expect(routed.rows[0].v).toBe('known');
  });
  it('rejects invalid route targets and identity remapping', async () => {
    const p = await product([priced('current'), priced('other'), pending(), {...priced('archive'), isArchived: true}]);
    await expect(db.query(`INSERT INTO product_inventory_variant_routes VALUES($1,'missing','Enough explanation','test',now())`, [p])).rejects.toThrow(/CONFIRMED/);
    await expect(db.query(`INSERT INTO product_inventory_variant_routes VALUES($1,'archive','Enough explanation','test',now())`, [p])).rejects.toThrow(/CONFIRMED/);
    await expect(db.query(`INSERT INTO product_inventory_variant_routes VALUES($1,'incoming','Enough explanation','test',now())`, [p])).rejects.toThrow(/CONFIRMED/);
    await db.query(`INSERT INTO product_inventory_variant_routes VALUES($1,'current','Enough explanation','test',now())`, [p]);
    await expect(db.query("UPDATE product_inventory_variant_routes SET target_variant_id='other' WHERE product_id=$1", [p])).rejects.toThrow(/IMMUTABLE/);
  });
});
