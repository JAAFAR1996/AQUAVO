import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const migration = readFileSync(
  join(root, "migrations/0071_accounting_return_line_identity_and_refund_guard.sql"),
  "utf8",
);

const BASE = String.raw`
CREATE TABLE schema_migrations(
  version text PRIMARY KEY,
  checksum text NOT NULL,
  notes text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz
);

CREATE TABLE order_items_relational(
  id text PRIMARY KEY,
  order_id text NOT NULL,
  product_id text NOT NULL,
  quantity integer NOT NULL,
  price_at_purchase numeric NOT NULL,
  total_price numeric NOT NULL,
  unit_cost_price numeric,
  unit_packaging_cost numeric,
  unit_insert_cost numeric,
  cost_snapshot_status text,
  cost_snapshot_source text,
  cost_snapshot_confidence text,
  cost_snapshot_version integer,
  cost_snapshot_at timestamp,
  unit_sale_price_snapshot numeric,
  discount_snapshot numeric,
  final_unit_sale_price_snapshot numeric,
  sale_price_snapshot_at timestamp,
  sale_price_source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE order_return_events(
  id text PRIMARY KEY,
  order_id text NOT NULL,
  type text NOT NULL,
  reason text,
  refund_amount numeric NOT NULL DEFAULT 0,
  delivery_cost_loss numeric NOT NULL DEFAULT 0,
  return_shipping_cost numeric NOT NULL DEFAULT 0,
  packaging_loss numeric NOT NULL DEFAULT 0,
  product_write_off_amount numeric NOT NULL DEFAULT 0,
  cogs_loss numeric NOT NULL DEFAULT 0,
  restocked boolean NOT NULL DEFAULT false,
  restocked_at timestamp,
  affected_items jsonb,
  status text NOT NULL DEFAULT 'recorded',
  note text,
  created_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  packaging_loss_source text NOT NULL DEFAULT 'manual'
);

CREATE OR REPLACE FUNCTION prepare_verified_return_inventory()
RETURNS trigger LANGUAGE plpgsql AS $stub$
BEGIN
  RETURN NEW;
END;
$stub$;

CREATE TRIGGER order_returns_prepare_verification
BEFORE UPDATE OF status ON order_return_events
FOR EACH ROW EXECUTE FUNCTION prepare_verified_return_inventory();
`;

describe("0071 return line identity and refund execution (PGlite PostgreSQL)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE);
    await db.exec(migration);
  }, 60_000);

  it("ignores client money and freezes refund, price and COGS from the sale line", async () => {
    await db.exec(`
      INSERT INTO order_items_relational(
        id,order_id,product_id,quantity,price_at_purchase,total_price,
        unit_cost_price,unit_packaging_cost,unit_insert_cost,cost_snapshot_status,
        final_unit_sale_price_snapshot,metadata
      ) VALUES(
        'line-1','order-1','product-1',2,100,200,
        20,4,1,'exact',90,
        '{"variantId":"variant-1","variantLabel":"الحجم الأول"}'::jsonb
      );

      INSERT INTO order_return_events(
        id,order_id,type,refund_amount,product_write_off_amount,cogs_loss,
        affected_items,status,updated_at
      ) VALUES(
        'return-1','order-1','partial_return',999999,888888,777777,
        '[{"orderItemId":"line-1","productId":"product-1","variantId":"variant-1","qty":1,"priceAtPurchase":999,"cogsAtTime":999}]'::jsonb,
        'recorded',now()
      );

      UPDATE order_return_events
      SET status='verified',updated_at=now()
      WHERE id='return-1';
    `);

    const result = await db.query<{
      refund_amount: string;
      product_write_off_amount: string;
      cogs_loss: string;
      affected_items: Array<Record<string, unknown>>;
    }>(`
      SELECT
        refund_amount::text,
        product_write_off_amount::text,
        cogs_loss::text,
        affected_items
      FROM order_return_events
      WHERE id='return-1'
    `);

    expect(Number(result.rows[0].refund_amount)).toBe(90);
    expect(Number(result.rows[0].product_write_off_amount)).toBe(0);
    expect(Number(result.rows[0].cogs_loss)).toBe(0);
    expect(result.rows[0].affected_items[0]).toMatchObject({
      orderItemId: "line-1",
      productId: "product-1",
      variantId: "variant-1",
      qty: 1,
      priceAtPurchase: 90,
      cogsAtTime: 25,
    });
  });

  it("rejects a verified return without relational orderItemId", async () => {
    await db.exec(`
      INSERT INTO order_items_relational(
        id,order_id,product_id,quantity,price_at_purchase,total_price,
        unit_cost_price,unit_packaging_cost,unit_insert_cost,cost_snapshot_status,
        final_unit_sale_price_snapshot,metadata
      ) VALUES('line-2','order-2','product-2',1,50,50,10,0,0,'exact',50,'{}');

      INSERT INTO order_return_events(id,order_id,type,affected_items,status,updated_at)
      VALUES(
        'return-2','order-2','customer_return',
        '[{"productId":"product-2","variantId":null,"qty":1,"priceAtPurchase":50,"cogsAtTime":10}]',
        'recorded',now()
      );
    `);

    await expect(db.exec(`
      UPDATE order_return_events SET status='verified',updated_at=now()
      WHERE id='return-2'
    `)).rejects.toThrow(/RETURN_ORDER_ITEM_ID_REQUIRED/);
  });

  it("rejects product or variant identity that contradicts the order line", async () => {
    await db.exec(`
      INSERT INTO order_items_relational(
        id,order_id,product_id,quantity,price_at_purchase,total_price,
        unit_cost_price,unit_packaging_cost,unit_insert_cost,cost_snapshot_status,
        final_unit_sale_price_snapshot,metadata
      ) VALUES(
        'line-3','order-3','product-3',1,75,75,15,0,0,'exact',75,
        '{"variantId":"variant-real"}'
      );

      INSERT INTO order_return_events(id,order_id,type,affected_items,status,updated_at)
      VALUES(
        'return-3','order-3','customer_return',
        '[{"orderItemId":"line-3","productId":"product-3","variantId":"variant-fake","qty":1,"priceAtPurchase":75,"cogsAtTime":15}]',
        'recorded',now()
      );
    `);

    await expect(db.exec(`
      UPDATE order_return_events SET status='verified',updated_at=now()
      WHERE id='return-3'
    `)).rejects.toThrow(/RETURN_VARIANT_MISMATCH/);
  });

  it("counts prior verified quantities by order line and blocks over-return", async () => {
    await db.exec(`
      INSERT INTO order_items_relational(
        id,order_id,product_id,quantity,price_at_purchase,total_price,
        unit_cost_price,unit_packaging_cost,unit_insert_cost,cost_snapshot_status,
        final_unit_sale_price_snapshot,metadata
      ) VALUES('line-4','order-4','product-4',2,40,80,8,0,0,'exact',40,'{}');

      INSERT INTO order_return_events(id,order_id,type,affected_items,status,updated_at)
      VALUES(
        'return-4a','order-4','partial_return',
        '[{"orderItemId":"line-4","productId":"product-4","variantId":null,"qty":1,"priceAtPurchase":40,"cogsAtTime":8}]',
        'recorded',now()
      );
      UPDATE order_return_events SET status='verified',updated_at=now() WHERE id='return-4a';

      INSERT INTO order_return_events(id,order_id,type,affected_items,status,updated_at)
      VALUES(
        'return-4b','order-4','partial_return',
        '[{"orderItemId":"line-4","productId":"product-4","variantId":null,"qty":2,"priceAtPurchase":40,"cogsAtTime":8}]',
        'recorded',now()
      );
    `);

    await expect(db.exec(`
      UPDATE order_return_events SET status='verified',updated_at=now()
      WHERE id='return-4b'
    `)).rejects.toThrow(/RETURN_QUANTITY_EXCEEDS_ORDER/);
  });
});
