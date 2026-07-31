// Independent verification tests.
//
// Two things are proved here:
//   1. a database built ONLY through the canonical services passes every invariant;
//   2. each check actually CATCHES its violation — corruption is injected directly
//      via SQL (bypassing the services and, where necessary, the triggers) and the
//      verifier must report it. A checker that never fails proves nothing.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cartonCatalogDdl } from "./helpers/packing-migrations.js";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import {
  verifyFulfillmentIntegrity, formatVerificationReport,
} from "../services/fulfillment-verifier.js";
import { confirmFulfillment, reverseFulfillmentEvent } from "../services/fulfillment-service.js";
import { proposeMaterialCost, approveMaterialCost } from "../services/material-cost-service.js";
import { createProfileFamily } from "../services/packaging-profile-service.js";
import { getOrCreateDraft, addManualLine, confirmDraft } from "../services/fulfillment-draft-service.js";

const ROOT = process.cwd();
const base = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const hardening = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening.sql"), "utf8");
// F-4: per-line identity for packaging_inventory_movements (add_pim_line_identity.sql)
const pimLineIdentity = readFileSync(join(ROOT, "migrations/add_pim_line_identity.sql"), "utf8");

let client: PGlite;
let db: FulfillmentDb;

/** Temporarily drop a guard trigger so we can inject the corruption it prevents. */
async function withoutTrigger<T>(trigger: string, table: string, fn: () => Promise<T>): Promise<T> {
  await client.exec(`ALTER TABLE ${table} DISABLE TRIGGER ${trigger}`);
  try { return await fn(); }
  finally { await client.exec(`ALTER TABLE ${table} ENABLE TRIGGER ${trigger}`); }
}

async function findingsFor(check: string) {
  const report = await verifyFulfillmentIntegrity(db);
  return report.findings.filter((f) => f.check === check);
}

beforeAll(async () => {
  client = new PGlite();
  await client.exec(`CREATE TABLE orders (id text PRIMARY KEY);
    INSERT INTO orders (id) VALUES ('v-ord-1'),('v-ord-2');`);
  await client.exec(base);
  await client.exec(hardening);
  await client.exec(pimLineIdentity);
  // Migration 0040: the Drizzle model now names these columns, so the test
  // database must have them or every select() on fulfillment_materials fails.
  await client.exec(cartonCatalogDdl());
  db = drizzle(client, { schema }) as unknown as FulfillmentDb;

  // ── Build a realistic, entirely service-authored dataset ──────────────────
  await client.exec(`INSERT INTO fulfillment_materials (id,name,category,unit)
    VALUES ('v-box','صندوق','box','piece'),('v-tape','تيب','tape','meter')`);
  await client.exec(`INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key)
    VALUES ('v-rc1','v-box','purchase_receipt','200','v:rc1'),('v-rc2','v-tape','purchase_receipt','200','v:rc2')`);

  for (const [id, cost] of [["v-box", 1500], ["v-tape", 250]] as const) {
    const rec = await proposeMaterialCost(db, {
      materialId: id, costBasis: "verified_manual_standard", unitCost: cost,
      reason: "سعر قياسي مثبت",
    });
    await approveMaterialCost(db, { costRecordId: rec.id, approvedBy: "owner" });
  }

  await createProfileFamily(db, {
    familyKey: "verify-standard", name: "قياسي", appliesTo: { default: true },
    items: [{ materialId: "v-box", quantity: 1 }, { materialId: "v-tape", quantity: 2 }],
  });

  // order 1: draft → confirmed original, then a reshipment that gets reversed
  const draft = await getOrCreateDraft(db, { orderId: "v-ord-1", suggestionContext: { itemCount: 1 } });
  await addManualLine(db, {
    draftId: draft.id, materialName: "كارت", category: "card",
    quantity: 1, unit: "piece", unitCost: 300,
  });
  await confirmDraft(db, { draftId: draft.id, recordedBy: "owner" });

  const rs = await confirmFulfillment(db, {
    orderId: "v-ord-1", eventType: "reshipment", requestId: "v-rs-1",
    lines: [{ materialId: "v-box", materialName: "صندوق", quantity: 1, unitCost: 1500 }],
  });
  await reverseFulfillmentEvent(db, rs.eventId, "الزبون رفض الاستلام", "owner");

  // order 2: an event with a deliberately UNKNOWN cost (a legitimate state)
  await confirmFulfillment(db, {
    orderId: "v-ord-2", requestId: "v-unknown",
    lines: [{ materialId: "v-tape", materialName: "تيب", quantity: 3, unitCost: null }],
  });
});

describe("independent fulfillment verification", () => {
  it("a database built only through the canonical services passes EVERY invariant", async () => {
    const report = await verifyFulfillmentIntegrity(db);
    if (!report.ok) console.error(formatVerificationReport(report));
    expect(report.findings.filter((f) => f.severity === "critical")).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.totals.events).toBeGreaterThan(0);
    expect(report.totals.movements).toBeGreaterThan(0);
  });

  it("the report is PII-free and human-readable", async () => {
    const text = formatVerificationReport(await verifyFulfillmentIntegrity(db));
    expect(text).toContain("Fulfillment integrity — PASS");
    // Identifiers only: no customer names, phones or addresses are ever queried.
    expect(text).not.toMatch(/07\d{9}|customer_name|shipping_address/);
  });

  it("an event whose stored cost disagrees with its lines is CAUGHT", async () => {
    expect(await findingsFor("event_cost_matches_lines")).toEqual([]);
    await withoutTrigger("ofe_guard", "order_fulfillment_events", async () => {
      await client.exec(`UPDATE order_fulfillment_events SET actual_cost = actual_cost + 500
        WHERE order_id='v-ord-1' AND event_type='original'`);
    });
    const found = await findingsFor("event_cost_matches_lines");
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe("critical");

    await withoutTrigger("ofe_guard", "order_fulfillment_events", async () => {
      await client.exec(`UPDATE order_fulfillment_events SET actual_cost = actual_cost - 500
        WHERE order_id='v-ord-1' AND event_type='original'`);
    });
    expect(await findingsFor("event_cost_matches_lines")).toEqual([]);
  });

  it("an UNKNOWN line cost materialized into a total is CAUGHT", async () => {
    expect(await findingsFor("unknown_cost_never_zero")).toEqual([]);
    await withoutTrigger("ofl_immutable", "order_fulfillment_lines", async () => {
      // The classic bug: an unknown cost quietly becomes a number.
      await client.exec(`UPDATE order_fulfillment_lines SET total_cost='0'
        WHERE unit_cost_snapshot IS NULL`);
    });
    const found = await findingsFor("unknown_cost_never_zero");
    expect(found).toHaveLength(1);
    await withoutTrigger("ofl_immutable", "order_fulfillment_lines", async () => {
      await client.exec(`UPDATE order_fulfillment_lines SET total_cost=NULL
        WHERE unit_cost_snapshot IS NULL`);
    });
    expect(await findingsFor("unknown_cost_never_zero")).toEqual([]);
  });

  it("a duplicated sequence number is CAUGHT", async () => {
    expect(await findingsFor("sequence_unique_per_order")).toEqual([]);
    await client.exec(`DROP INDEX IF EXISTS ofe_order_sequence_uidx`);
    await withoutTrigger("ofe_guard", "order_fulfillment_events", async () => {
      await client.exec(`UPDATE order_fulfillment_events SET sequence_number=1
        WHERE order_id='v-ord-1' AND event_type='reshipment'`);
    });
    expect(await findingsFor("sequence_unique_per_order")).toHaveLength(1);

    await withoutTrigger("ofe_guard", "order_fulfillment_events", async () => {
      await client.exec(`UPDATE order_fulfillment_events SET sequence_number=2
        WHERE order_id='v-ord-1' AND event_type='reshipment'`);
    });
    await client.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ofe_order_sequence_uidx
      ON order_fulfillment_events(order_id, sequence_number)`);
    expect(await findingsFor("sequence_unique_per_order")).toEqual([]);
  });

  it("a sequence counter that fell behind (and could re-issue) is CAUGHT", async () => {
    expect(await findingsFor("sequence_counter_not_behind")).toEqual([]);
    await client.exec(`UPDATE order_fulfillment_sequences SET next_sequence=1 WHERE order_id='v-ord-1'`);
    expect(await findingsFor("sequence_counter_not_behind")).toHaveLength(1);
    await client.exec(`UPDATE order_fulfillment_sequences SET next_sequence=
      (SELECT MAX(sequence_number)+1 FROM order_fulfillment_events WHERE order_id='v-ord-1')
      WHERE order_id='v-ord-1'`);
    expect(await findingsFor("sequence_counter_not_behind")).toEqual([]);
  });

  it("a reversal that is not the exact negation is CAUGHT", async () => {
    expect(await findingsFor("reversal_exact_negation")).toEqual([]);
    await withoutTrigger("pim_immutable", "packaging_inventory_movements", async () => {
      await client.exec(`UPDATE packaging_inventory_movements SET quantity='99'
        WHERE movement_type='reversal'`);
    });
    const found = await findingsFor("reversal_exact_negation");
    expect(found).toHaveLength(1);
    expect(found[0].message).toMatch(/exact negative/);
    await withoutTrigger("pim_immutable", "packaging_inventory_movements", async () => {
      await client.exec(`UPDATE packaging_inventory_movements m SET quantity = -o.quantity
        FROM packaging_inventory_movements o
        WHERE m.reversal_of_movement_id = o.id`);
    });
    expect(await findingsFor("reversal_exact_negation")).toEqual([]);
  });

  it("a catalog cost contradicting its approved record is CAUGHT", async () => {
    expect(await findingsFor("catalog_cost_matches_approved_record")).toEqual([]);
    await withoutTrigger("fmat_cost_consistency", "fulfillment_materials", async () => {
      await client.exec(`UPDATE fulfillment_materials SET current_unit_cost='99999' WHERE id='v-box'`);
    });
    expect(await findingsFor("catalog_cost_matches_approved_record")).toHaveLength(1);
    await withoutTrigger("fmat_cost_consistency", "fulfillment_materials", async () => {
      await client.exec(`UPDATE fulfillment_materials m SET current_unit_cost = r.unit_cost
        FROM material_cost_records r WHERE r.id = m.current_cost_record_id AND m.id='v-box'`);
    });
    expect(await findingsFor("catalog_cost_matches_approved_record")).toEqual([]);
  });

  it("a used profile version left unlocked is CAUGHT", async () => {
    expect(await findingsFor("used_profile_version_is_locked")).toEqual([]);
    await withoutTrigger("pp_locked_guard", "packaging_profiles", async () => {
      await client.exec(`UPDATE packaging_profiles SET locked=false WHERE locked=true`);
    });
    expect(await findingsFor("used_profile_version_is_locked")).toHaveLength(1);
    await withoutTrigger("pp_locked_guard", "packaging_profiles", async () => {
      await client.exec(`UPDATE packaging_profiles p SET locked=true
        FROM order_fulfillment_events e WHERE e.profile_id = p.id`);
    });
    expect(await findingsFor("used_profile_version_is_locked")).toEqual([]);
  });

  it("a draft converted twice is CAUGHT", async () => {
    expect(await findingsFor("draft_converted_at_most_once")).toEqual([]);
    await client.exec(`DROP INDEX IF EXISTS ofe_draft_uidx`);
    await client.exec(`INSERT INTO order_fulfillment_events
        (id,order_id,event_type,sequence_number,idempotency_key,workflow_state,cost_status,draft_id)
      SELECT 'dup-draft-ev', order_id, 'adjustment', 500, 'dup:draft', 'confirmed','exact', draft_id
        FROM order_fulfillment_events WHERE draft_id IS NOT NULL LIMIT 1`);
    expect(await findingsFor("draft_converted_at_most_once")).toHaveLength(1);
    await withoutTrigger("ofe_guard", "order_fulfillment_events", async () => {
      await client.exec(`DELETE FROM order_fulfillment_events WHERE id='dup-draft-ev'`);
    });
    await client.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ofe_draft_uidx
      ON order_fulfillment_events(draft_id) WHERE draft_id IS NOT NULL`);
    expect(await findingsFor("draft_converted_at_most_once")).toEqual([]);
  });

  it("a confirmed material line with no stock movement is CAUGHT", async () => {
    expect(await findingsFor("every_material_line_has_a_movement")).toEqual([]);
    await withoutTrigger("pim_immutable", "packaging_inventory_movements", async () => {
      await client.exec(`DELETE FROM packaging_inventory_movements
        WHERE movement_type='fulfillment_usage' AND material_id='v-tape'`);
    });
    expect((await findingsFor("every_material_line_has_a_movement")).length).toBeGreaterThan(0);
  });

  it("the verifier only reads — it never writes", async () => {
    const before = await client.query<{ c: number }>(
      `SELECT (SELECT COUNT(*) FROM order_fulfillment_events)
            + (SELECT COUNT(*) FROM order_fulfillment_lines)
            + (SELECT COUNT(*) FROM packaging_inventory_movements) AS c`);
    await verifyFulfillmentIntegrity(db);
    const after = await client.query<{ c: number }>(
      `SELECT (SELECT COUNT(*) FROM order_fulfillment_events)
            + (SELECT COUNT(*) FROM order_fulfillment_lines)
            + (SELECT COUNT(*) FROM packaging_inventory_movements) AS c`);
    expect(after.rows[0].c).toBe(before.rows[0].c);
  });
});
