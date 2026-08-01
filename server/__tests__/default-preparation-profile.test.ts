// Phase 2: the two fixed preparation costs actually reach an order.
//
// This is an END-TO-END chain test, not a unit test of any one piece, because
// every individual piece already worked and the feature still did nothing:
//
//   migration 0048  seeded the materials and their approved costs      (worked)
//   migration 0049  seeds the profile family that applies them          (NEW)
//   suggestProfileForOrder  scores families and returns the default     (worked)
//   getOrCreateDraft        seeds draft lines from the suggestion       (worked)
//   confirmDraft            freezes them onto an immutable event        (worked)
//
// The bug was purely the missing middle link, so the test that matters is the
// one that runs the whole chain.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import { cartonCatalogDdl } from "./helpers/packing-migrations.js";
import { getOrCreateDraft, confirmDraft } from "../services/fulfillment-draft-service.js";
import { suggestProfileForOrder } from "../services/packaging-profile-service.js";
import { proposeMaterialCost, approveMaterialCost } from "../services/material-cost-service.js";

const ROOT = process.cwd();
const sqlOf = (f: string) => readFileSync(join(ROOT, "migrations", f), "utf8");

let client: PGlite;
let db: FulfillmentDb;

async function rows<T>(q: string): Promise<T[]> {
  return (await client.query<T>(q)).rows;
}

beforeAll(async () => {
  client = new PGlite();
  await client.exec(`
    CREATE TABLE schema_migrations (
      version text PRIMARY KEY, checksum text,
      applied_at timestamptz NOT NULL DEFAULT now(), applied_by text,
      rolled_back_at timestamptz, notes text);
    CREATE TABLE settings (key text PRIMARY KEY, value text NOT NULL,
      updated_at timestamp DEFAULT now());
    CREATE TABLE orders (id text PRIMARY KEY);
    INSERT INTO orders (id) VALUES ('p2-a'),('p2-b'),('p2-c'),('p2-d');
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $BODY$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $BODY$ LANGUAGE plpgsql;
  `);
  await client.exec(sqlOf("add_fulfillment_costing.sql"));
  await client.exec(sqlOf("add_fulfillment_hardening.sql"));
  await client.exec(sqlOf("add_pim_line_identity.sql"));
  await client.exec(cartonCatalogDdl());

  // The two migrations under test, in order and unmodified.
  await client.exec(sqlOf("0048_packing_policy_and_preparation_costs.sql"));
  await client.exec(sqlOf("0049_default_preparation_profile.sql"));

  db = drizzle(client, { schema }) as unknown as FulfillmentDb;
});

describe("the default profile is what makes 50 + 100 reach an order", () => {
  it("is suggested for an order with no distinguishing context at all", async () => {
    const s = await suggestProfileForOrder(db, {});
    expect(s).not.toBeNull();
    expect(s!.familyKey).toBe("default-preparation");
    expect(s!.items.map((i) => i.materialName).sort()).toEqual(
      ["كارت الشكر والتواصل", "ملصق السعر"].sort(),
    );
    expect(s!.expectedCost).toBe(150);
  });

  it("seeds a new draft with both materials at quantity 1", async () => {
    const draft = await getOrCreateDraft(db, { orderId: "p2-a" });
    expect(draft.state).toBe("suggested");
    const names = draft.lines.map((l) => l.materialName).sort();
    expect(names).toEqual(["كارت الشكر والتواصل", "ملصق السعر"].sort());
    for (const l of draft.lines) expect(Number(l.quantity)).toBe(1);
    expect(draft.expectedCost).toBe(150);
  });

  it("counts them ONCE PER ORDER, not once per carton", async () => {
    // Both materials are calculation_basis 'per_order'. The profile quantity is a
    // multiplier, not a carton count, so a multi-carton order must still total
    // 150 -- this is the single most misread rule in the whole feature.
    const basis = await rows<{ sku: string; calculation_basis: string }>(
      `SELECT sku, calculation_basis FROM fulfillment_materials
        WHERE sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD') ORDER BY sku`,
    );
    expect(basis.map((b) => b.calculation_basis)).toEqual(["per_order", "per_order"]);

    const draft = await getOrCreateDraft(db, { orderId: "p2-b" });
    expect(draft.expectedCost).toBe(150);
    expect(draft.lines).toHaveLength(2);
  });

  it("re-opening a draft does not add the materials a second time", async () => {
    const first = await getOrCreateDraft(db, { orderId: "p2-c" });
    const again = await getOrCreateDraft(db, { orderId: "p2-c" });
    expect(again.id).toBe(first.id);
    expect(again.lines).toHaveLength(2);
    expect(again.expectedCost).toBe(150);
  });

  it("freezes the costs onto the confirmed event", async () => {
    const draft = await getOrCreateDraft(db, { orderId: "p2-d" });
    const res = await confirmDraft(db, { draftId: draft.id });
    expect(res.alreadyConfirmed).toBe(false);
    expect(res.actualCost).toBe(150);

    const lines = await rows<{ material_name: string; unit_cost: string }>(
      `SELECT l.material_name_snapshot AS material_name, l.unit_cost_snapshot AS unit_cost FROM order_fulfillment_lines l
         JOIN order_fulfillment_events e ON e.id = l.event_id
        WHERE e.order_id = 'p2-d' ORDER BY 1`,
    );
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => Number(l.unit_cost)).sort((a, b) => a - b)).toEqual([50, 100]);
  });

  it("confirming again is idempotent — no duplicate lines, no second charge", async () => {
    const rowsBefore = await rows(`SELECT l.id FROM order_fulfillment_lines l
       JOIN order_fulfillment_events e ON e.id=l.event_id WHERE e.order_id='p2-d'`);
    const draftRow = await rows<{ id: string }>(
      `SELECT id FROM fulfillment_preparation_drafts WHERE order_id='p2-d'`);
    const again = await confirmDraft(db, { draftId: draftRow[0]!.id });
    expect(again.alreadyConfirmed).toBe(true);

    const rowsAfter = await rows(`SELECT l.id FROM order_fulfillment_lines l
       JOIN order_fulfillment_events e ON e.id=l.event_id WHERE e.order_id='p2-d'`);
    expect(rowsAfter).toHaveLength(rowsBefore.length);
    expect(rowsAfter).toHaveLength(2);
  });
});

describe("a later price change is prospective", () => {
  it("does not rewrite the cost already frozen on a shipped order", async () => {
    const before = await rows<{ unit_cost: string }>(
      `SELECT l.unit_cost_snapshot AS unit_cost FROM order_fulfillment_lines l
         JOIN order_fulfillment_events e ON e.id=l.event_id
        WHERE e.order_id='p2-d' AND l.material_name_snapshot='ملصق السعر'`,
    );
    expect(Number(before[0]!.unit_cost)).toBe(50);

    const [label] = await rows<{ id: string }>(
      `SELECT id FROM fulfillment_materials WHERE sku='PRICE_LABEL'`);
    const rec = await proposeMaterialCost(db, {
      materialId: label!.id,
      costBasis: "verified_manual_standard",
      unitCost: 75,
      reason: "ارتفاع سعر الطباعة",
      createdBy: "owner",
    });
    await approveMaterialCost(db, { costRecordId: rec.id, approvedBy: "owner" });

    // Catalogue moved…
    const current = await rows<{ unit_cost: string }>(
      `SELECT unit_cost FROM material_cost_records
        WHERE material_id='${label!.id}' AND approval_status='approved' AND superseded_at IS NULL`);
    expect(Number(current[0]!.unit_cost)).toBe(75);

    // …the shipped order did not.
    const after = await rows<{ unit_cost: string }>(
      `SELECT l.unit_cost_snapshot AS unit_cost FROM order_fulfillment_lines l
         JOIN order_fulfillment_events e ON e.id=l.event_id
        WHERE e.order_id='p2-d' AND l.material_name_snapshot='ملصق السعر'`,
    );
    expect(Number(after[0]!.unit_cost)).toBe(50);
  });
});
