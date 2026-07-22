// Integration tests for items 4, 5, 6 and 8:
//   * preparation DRAFTS are separate, mutable, and have zero accounting effect
//     until confirmation converts them into ONE immutable event;
//   * profile FAMILY / VERSION separation — a used version is frozen, editing
//     creates a new version, and HISTORICAL ORDERS NEVER CHANGE;
//   * approved material-cost records are the source of truth, cost changes append
//     history, verified zero must be approved, unknown stays NULL;
//   * named manual quick-entry lines are itemized and frozen after confirmation.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import {
  proposeMaterialCost, approveMaterialCost, getApprovedCost, getMaterialCostHistory,
  derivePurchaseUnitCost,
} from "../services/material-cost-service.js";
import {
  createProfileFamily, createProfileVersion, getProfileFamily, calculateExpectedCost,
  suggestProfileForOrder, getProfileVersionUsage,
} from "../services/packaging-profile-service.js";
import {
  getOrCreateDraft, addCatalogLine, addManualLine, updateDraftLine, removeDraftLine,
  confirmDraft, getDraft, calculateDraftCost,
} from "../services/fulfillment-draft-service.js";
import { getFulfillmentHistory } from "../services/fulfillment-service.js";
import { buildFulfillmentResolver } from "../services/accounting-engine.js";

const ROOT = process.cwd();
const base = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const hardening = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening.sql"), "utf8");

let client: PGlite;
let db: FulfillmentDb;

async function scalar<T>(q: string, params: unknown[] = []): Promise<T> {
  const r = await client.query<Record<string, T>>(q, params as never[]);
  return Object.values(r.rows[0] ?? {})[0] as T;
}
async function balance(materialId: string): Promise<number> {
  return Number(await scalar<number>(
    `SELECT COALESCE(SUM(quantity),0)::float8 AS b FROM packaging_inventory_movements WHERE material_id=$1`,
    [materialId]));
}

beforeAll(async () => {
  client = new PGlite();
  await client.exec(`CREATE TABLE orders (id text PRIMARY KEY);
    INSERT INTO orders (id) VALUES ('d-ord-1'),('d-ord-2'),('d-ord-3'),('d-ord-4');`);
  await client.exec(base);
  await client.exec(hardening);
  db = drizzle(client, { schema }) as unknown as FulfillmentDb;

  await client.exec(`INSERT INTO fulfillment_materials (id,name,category,unit) VALUES
    ('m-box','صندوق وسط','box','piece'),
    ('m-sticker','ستكر AQUAVO','sticker','piece'),
    ('m-tape','تيب','tape','meter'),
    ('m-free','كارت شكر','card','piece'),
    ('m-unknown','مادة بدون كلفة','other','piece')`);
  await client.exec(`INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key) VALUES
    ('d-r1','m-box','purchase_receipt','500','d:r1'),
    ('d-r2','m-sticker','purchase_receipt','500','d:r2'),
    ('d-r3','m-tape','purchase_receipt','500','d:r3'),
    ('d-r4','m-free','purchase_receipt','500','d:r4'),
    ('d-r5','m-unknown','purchase_receipt','500','d:r5')`);
  await client.exec(`INSERT INTO packaging_purchases (id,material_id,quantity,total_cost,unit_cost,supplier)
    VALUES ('pur-box','m-box','100','150000','1500','مورد بغداد')`);
});

// ═════════════════════════════════════════════════════════════════════════════
describe("(6) approved material-cost records", () => {
  it("derives a unit cost from a purchase batch; unknown inputs stay NULL", () => {
    expect(derivePurchaseUnitCost("150000", "100")).toBe(1500);
    expect(derivePurchaseUnitCost(null, "100")).toBeNull();   // unknown total → unknown
    expect(derivePurchaseUnitCost("150000", "0")).toBeNull(); // undefined division → unknown
  });

  it("a material with NO approved record has an UNKNOWN cost (NULL, never 0)", async () => {
    const c = await getApprovedCost(db, "m-unknown");
    expect(c.unitCost).toBeNull();
    expect(c.status).toBe("unknown");
  });

  it("a PENDING proposal does not change the catalog", async () => {
    const rec = await proposeMaterialCost(db, {
      materialId: "m-box", costBasis: "purchase_batch", purchaseId: "pur-box",
      unitCost: null, reason: "فاتورة شراء 2026-07",
    });
    expect(rec.approvalStatus).toBe("pending");
    expect(Number(rec.unitCost)).toBe(1500); // derived from the batch
    expect(await scalar<string | null>(`SELECT current_unit_cost FROM fulfillment_materials WHERE id='m-box'`)).toBeNull();
    expect((await getApprovedCost(db, "m-box")).status).toBe("unknown");
  });

  it("APPROVING mirrors the cost onto the catalog and cites the record", async () => {
    const [pending] = await getMaterialCostHistory(db, "m-box");
    const { record } = await approveMaterialCost(db, { costRecordId: pending.id, approvedBy: "owner" });
    expect(record.approvalStatus).toBe("approved");
    expect(record.approvedBy).toBe("owner");
    expect(record.approvedAt).toBeTruthy();

    expect(Number(await scalar<string>(`SELECT current_unit_cost FROM fulfillment_materials WHERE id='m-box'`))).toBe(1500);
    expect(await scalar<string>(`SELECT current_cost_record_id FROM fulfillment_materials WHERE id='m-box'`)).toBe(record.id);
    expect(await scalar<string>(`SELECT current_cost_purchase_id FROM fulfillment_materials WHERE id='m-box'`)).toBe("pur-box");

    const approved = await getApprovedCost(db, "m-box");
    expect(approved.unitCost).toBe(1500);
    expect(approved.costBasis).toBe("purchase_batch");
  });

  it("the catalog can NEVER contradict its cited record", async () => {
    // Change only current_unit_cost → refused by the DB trigger.
    await expect(client.exec(`UPDATE fulfillment_materials SET current_unit_cost='99' WHERE id='m-box'`))
      .rejects.toBeTruthy();
    // Claim a cost with no record at all → refused.
    await expect(client.exec(`UPDATE fulfillment_materials SET current_unit_cost='50' WHERE id='m-tape'`))
      .rejects.toBeTruthy();
    // Point at a record belonging to a different material → refused.
    const recId = await scalar<string>(`SELECT id FROM material_cost_records WHERE material_id='m-box' AND approval_status='approved'`);
    await expect(client.query(
      `UPDATE fulfillment_materials SET current_cost_record_id=$1, current_unit_cost='1500' WHERE id='m-tape'`,
      [recId])).rejects.toBeTruthy();
  });

  it("a cost CHANGE appends history and supersedes — the old evidence survives", async () => {
    const proposal = await proposeMaterialCost(db, {
      materialId: "m-box", costBasis: "verified_manual_standard",
      unitCost: 1700, reason: "ارتفاع سعر المورد",
    });
    const { supersededId } = await approveMaterialCost(db, { costRecordId: proposal.id, approvedBy: "owner" });
    expect(supersededId).toBeTruthy();

    const history = await getMaterialCostHistory(db, "m-box");
    expect(history.length).toBeGreaterThanOrEqual(2);
    const old = history.find((h) => h.id === supersededId)!;
    expect(old.approvalStatus).toBe("superseded");
    expect(Number(old.unitCost)).toBe(1500);      // the ORIGINAL evidence is intact
    expect(old.supersededById).toBe(proposal.id);
    expect((await getApprovedCost(db, "m-box")).unitCost).toBe(1700);
  });

  it("an APPROVED record is immutable evidence — it cannot be edited or deleted", async () => {
    const recId = await scalar<string>(`SELECT id FROM material_cost_records WHERE material_id='m-box' AND approval_status='approved'`);
    await expect(client.query(`UPDATE material_cost_records SET unit_cost='1' WHERE id=$1`, [recId])).rejects.toBeTruthy();
    await expect(client.query(`DELETE FROM material_cost_records WHERE id=$1`, [recId])).rejects.toBeTruthy();
  });

  it("a VERIFIED ZERO cost is allowed only through an explicit approval with a reason", async () => {
    const free = await proposeMaterialCost(db, {
      materialId: "m-free", costBasis: "verified_manual_standard", unitCost: 0,
      reason: "كارت شكر مطبوع ضمن دفعة مجانية من المطبعة",
    });
    await approveMaterialCost(db, { costRecordId: free.id, approvedBy: "owner" });
    const c = await getApprovedCost(db, "m-free");
    expect(c.unitCost).toBe(0);       // a genuine, justified zero…
    expect(c.status).toBe("approved");
    // …and it is clearly distinct from an unknown cost.
    expect((await getApprovedCost(db, "m-unknown")).unitCost).toBeNull();
  });

  it("a purchase-batch cost must cite a batch of the SAME material", async () => {
    await expect(proposeMaterialCost(db, {
      materialId: "m-tape", costBasis: "purchase_batch", purchaseId: "pur-box",
      unitCost: 100, reason: "خطأ",
    })).rejects.toThrow(/PURCHASE_MATERIAL_MISMATCH/);
    await expect(proposeMaterialCost(db, {
      materialId: "m-tape", costBasis: "purchase_batch", unitCost: 100, reason: "بدون فاتورة",
    })).rejects.toThrow(/PURCHASE_REQUIRED/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("(5) profile family / versioning", () => {
  let familyId: string;
  let v1Id: string;

  it("creates a family with version 1 and a server-calculated expected cost", async () => {
    // tape has no approved cost yet → expected cost is UNKNOWN, not partial.
    const { family, version } = await createProfileFamily(db, {
      familyKey: "small-box-standard", name: "صندوق صغير قياسي",
      appliesTo: { default: true, maxItems: 3 },
      items: [{ materialId: "m-box", quantity: 1 }, { materialId: "m-tape", quantity: 2 }],
    });
    familyId = family.id; v1Id = version.id;
    expect(version.version).toBe(1);
    expect(version.expectedCost).toBeNull(); // one unknown cost ⇒ whole total unknown

    const tapeCost = await proposeMaterialCost(db, {
      materialId: "m-tape", costBasis: "verified_manual_standard", unitCost: 250,
      reason: "سعر قياسي مثبت",
    });
    await approveMaterialCost(db, { costRecordId: tapeCost.id, approvedBy: "owner" });

    const calc = await calculateExpectedCost(db, [
      { materialId: "m-box", quantity: 1 }, { materialId: "m-tape", quantity: 2 },
    ]);
    expect(calc.total).toBe(1700 + 2 * 250); // 1700 (current approved box cost) + 500
    expect(calc.missingCostMaterials).toEqual([]);
  });

  it("suggests the family for an order and explains WHY", async () => {
    const s = await suggestProfileForOrder(db, { itemCount: 2, categories: [] });
    expect(s).not.toBeNull();
    expect(s!.familyKey).toBe("small-box-standard");
    expect(s!.reason).toBeTruthy();       // the reason is always surfaced
    expect(s!.version).toBe(1);
  });

  it("editing creates a NEW version; the previous one is superseded, not mutated", async () => {
    const v2 = await createProfileVersion(db, {
      familyId, creationReason: "إضافة ستكر للعلبة",
      items: [
        { materialId: "m-box", quantity: 1 },
        { materialId: "m-tape", quantity: 2 },
        { materialId: "m-sticker", quantity: 1 },
      ],
    });
    expect(v2.version).toBe(2);
    expect(v2.previousVersionId).toBe(v1Id);
    expect(v2.creationReason).toBe("إضافة ستكر للعلبة");

    const loaded = await getProfileFamily(db, familyId);
    const v1 = loaded!.versions.find((v) => v.id === v1Id)!;
    expect(v1.supersededById).toBe(v2.id);
    expect(v1.items).toHaveLength(2);     // v1's definition is UNCHANGED
    expect(v1.active).toBe(false);
  });

  it("(family, version) is unique", async () => {
    await expect(client.query(
      `INSERT INTO packaging_profiles (id,profile_family_id,name,version) VALUES ('dup-v','${familyId}'::text,'dup',1)`
    )).rejects.toBeTruthy();
  });

  it("a version used by a CONFIRMED event is locked and can no longer be edited", async () => {
    // v2 adds the sticker, so give it an approved cost first — otherwise the draft
    // would be (correctly) incomplete and its actual cost unknown.
    const stickerCost = await proposeMaterialCost(db, {
      materialId: "m-sticker", costBasis: "verified_manual_standard", unitCost: 200,
      reason: "سعر مطبعة مثبت",
    });
    await approveMaterialCost(db, { costRecordId: stickerCost.id, approvedBy: "owner" });

    const draft = await getOrCreateDraft(db, { orderId: "d-ord-1", suggestionContext: { itemCount: 2 } });
    expect(draft.profileId).toBeTruthy();
    const usedProfileId = draft.profileId!;
    await confirmDraft(db, { draftId: draft.id, recordedBy: "owner" });

    expect(await scalar<boolean>(`SELECT locked FROM packaging_profiles WHERE id=$1`, [usedProfileId])).toBe(true);
    // Its costing definition is frozen…
    await expect(client.query(
      `UPDATE packaging_profiles SET expected_cost='1' WHERE id=$1`, [usedProfileId])).rejects.toBeTruthy();
    // …and so are its items.
    await expect(client.query(
      `UPDATE packaging_profile_items SET quantity='9' WHERE profile_id=$1`, [usedProfileId])).rejects.toBeTruthy();
    await expect(client.query(
      `DELETE FROM packaging_profile_items WHERE profile_id=$1`, [usedProfileId])).rejects.toBeTruthy();

    const usage = await getProfileVersionUsage(db, usedProfileId);
    expect(usage.length).toBeGreaterThanOrEqual(1);
    expect(usage[0].orderId).toBe("d-ord-1");
  });

  it("HISTORICAL ORDERS NEVER CHANGE after a profile edit or a cost change", async () => {
    const before = await getFulfillmentHistory(db, "d-ord-1");
    const snapshot = JSON.stringify(before);
    const beforeCost = before[0].actualCost;
    expect(beforeCost).not.toBeNull();

    // 1) Edit the profile → a brand new version.
    await createProfileVersion(db, {
      familyId, creationReason: "تغيير الصندوق بالكامل",
      items: [{ materialId: "m-sticker", quantity: 10 }],
    });
    // 2) Change the material cost → a brand new approved record.
    const bump = await proposeMaterialCost(db, {
      materialId: "m-box", costBasis: "verified_manual_standard", unitCost: 9999,
      reason: "قفزة سعر لاختبار الثبات التاريخي",
    });
    await approveMaterialCost(db, { costRecordId: bump.id, approvedBy: "owner" });

    const after = await getFulfillmentHistory(db, "d-ord-1");
    expect(JSON.stringify(after)).toBe(snapshot);   // byte-identical history
    expect(after[0].actualCost).toBe(beforeCost);
    // The event still cites the EXACT version it used (v2 at confirmation time),
    // and the frozen material names/quantities/unit costs.
    expect(after[0].profileVersion).toBe(2);
    expect(after[0].lines.every((l) => l.materialName.length > 0)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("(4)+(8) preparation drafts and manual quick entry", () => {
  it("calculateDraftCost: one unknown line makes the whole expected cost UNKNOWN", () => {
    const r = calculateDraftCost([
      { id: "1", materialId: null, materialName: "صندوق", category: "box", description: null,
        quantity: 1, unit: "piece", unitCost: 1000, totalCost: 1000, costStatus: "exact", source: "manual", note: null },
      { id: "2", materialId: null, materialName: "تيب", category: "tape", description: null,
        quantity: 2, unit: "meter", unitCost: null, totalCost: null, costStatus: "unknown", source: "manual", note: null },
    ]);
    expect(r.expectedCost).toBeNull();      // never coerced to the partial 1000
    expect(r.knownCostSubtotal).toBe(1000); // the partial figure is clearly labelled
    expect(r.costStatus).toBe("incomplete");
    expect(r.missingCostLines).toEqual(["تيب"]);
  });

  it("a DRAFT has ZERO accounting effect — no stock, no profit, no fulfillment total", async () => {
    const stockBefore = await balance("m-box");
    const movementsBefore = await scalar<number>(`SELECT COUNT(*)::int AS c FROM packaging_inventory_movements`);

    const draft = await getOrCreateDraft(db, { orderId: "d-ord-2", manualOnly: true, createdBy: "owner" });
    await addCatalogLine(db, { draftId: draft.id, materialId: "m-box", quantity: 1 });
    await addManualLine(db, {
      draftId: draft.id, materialName: "ستكرات", category: "sticker",
      quantity: 3, unit: "piece", unitCost: 200,
    });

    expect(await balance("m-box")).toBe(stockBefore);   // stock untouched
    expect(await scalar<number>(`SELECT COUNT(*)::int AS c FROM packaging_inventory_movements`)).toBe(movementsBefore);
    expect(await scalar<number>(`SELECT COUNT(*)::int AS c FROM order_fulfillment_events WHERE order_id='d-ord-2'`)).toBe(0);
    expect(await scalar<number>(`SELECT COUNT(*)::int AS c FROM order_fulfillment_lines WHERE order_id='d-ord-2'`)).toBe(0);

    // The canonical accounting resolver sees NOTHING for this order.
    const resolver = await buildFulfillmentResolver(db as never, new Set(["d-ord-2"]));
    expect(resolver.get("d-ord-2")).toBeUndefined();
  });

  it("draft lines are editable: quantity, cost, add and remove", async () => {
    const draft = await getOrCreateDraft(db, { orderId: "d-ord-2" });
    const boxLine = draft.lines.find((l) => l.materialId === "m-box")!;

    const afterQty = await updateDraftLine(db, { draftId: draft.id, lineId: boxLine.id, quantity: 2 });
    expect(afterQty.lines.find((l) => l.id === boxLine.id)!.quantity).toBe(2);
    // The draft froze the approved unit cost at the moment the line was added, so a
    // later catalog cost change does not silently rewrite an open draft either.
    expect(afterQty.lines.find((l) => l.id === boxLine.id)!.totalCost).toBe(2 * boxLine.unitCost!);

    const extra = await addManualLine(db, {
      draftId: draft.id, materialName: "تكلفة إضافية", category: "extra",
      description: "توصيل داخلي للمخزن", quantity: 1, unit: "order", unitCost: 500, note: "استثنائي",
    });
    expect(extra.lines).toHaveLength(3);

    const removed = await removeDraftLine(db, draft.id, extra.lines.at(-1)!.id);
    expect(removed.lines).toHaveLength(2);
  });

  it("a manual line is fully ITEMIZED — no unexplained lump sum is representable", async () => {
    const draft = await getOrCreateDraft(db, { orderId: "d-ord-3", manualOnly: true });
    const v = await addManualLine(db, {
      draftId: draft.id, materialName: "صندوق", category: "box",
      description: "صندوق كارتون 30×20", quantity: 2, unit: "piece", unitCost: 1250,
      note: "من دفعة المورد الجديدة",
    });
    const line = v.lines[0];
    expect(line.category).toBe("box");
    expect(line.description).toBe("صندوق كارتون 30×20");
    expect(line.quantity).toBe(2);
    expect(line.unit).toBe("piece");
    expect(line.unitCost).toBe(1250);
    expect(line.totalCost).toBe(2500);          // the SERVER computed this
    expect(line.costStatus).toBe("exact");
    expect(line.note).toBe("من دفعة المورد الجديدة");

    await expect(addManualLine(db, {
      draftId: draft.id, materialName: "", category: "box", quantity: 1, unitCost: 100,
    })).rejects.toThrow(/LINE_NAME_REQUIRED/);
    await expect(addManualLine(db, {
      draftId: draft.id, materialName: "تيب", category: "tape", quantity: 0, unitCost: 100,
    })).rejects.toThrow(/QUANTITY_INVALID/);
  });

  it("an unknown manual cost stays UNKNOWN and makes the draft incomplete", async () => {
    const draft = await getOrCreateDraft(db, { orderId: "d-ord-3" });
    const v = await addManualLine(db, {
      draftId: draft.id, materialName: "تغليف", category: "wrap",
      quantity: 1, unit: "order", unitCost: null,
    });
    expect(v.expectedCost).toBeNull();
    expect(v.costStatus).toBe("incomplete");
    expect(v.missingCostLines).toContain("تغليف");
    expect(v.knownCostSubtotal).toBe(2500);   // partial, clearly separate
    await removeDraftLine(db, draft.id, v.lines.at(-1)!.id);
  });

  it("CONFIRMATION converts the draft into ONE immutable event, transactionally", async () => {
    const draft = await getDraft(db, (await getOrCreateDraft(db, { orderId: "d-ord-3" })).id);
    const stockBefore = await balance("m-box");
    const expected = draft.expectedCost;

    const result = await confirmDraft(db, { draftId: draft.id, recordedBy: "owner" });
    expect(result.alreadyConfirmed).toBe(false);
    expect(result.actualCost).toBe(2500);
    expect(result.expectedCost).toBe(expected);
    expect(result.variance).toBe(0);

    const after = await getDraft(db, draft.id);
    expect(after.state).toBe("consumed");
    expect(after.confirmedEventId).toBe(result.eventId);

    const events = await getFulfillmentHistory(db, "d-ord-3");
    expect(events).toHaveLength(1);
    expect(events[0].lines).toHaveLength(1);
    expect(events[0].lines[0].category).toBe("box");     // manual descriptors frozen
    expect(events[0].lines[0].description).toBe("صندوق كارتون 30×20");
    expect(events[0].lines[0].note).toBe("من دفعة المورد الجديدة");
    // Purely manual line (no materialId) ⇒ no stock movement.
    expect(await balance("m-box")).toBe(stockBefore);
  });

  it("REPEATED confirmation returns the SAME event and never deducts stock twice", async () => {
    const draft = await getOrCreateDraft(db, { orderId: "d-ord-4", manualOnly: true });
    await addCatalogLine(db, { draftId: draft.id, materialId: "m-sticker", quantity: 4 });
    // sticker has no approved cost → deliberately set one on the draft line
    const view = await getDraft(db, draft.id);
    await updateDraftLine(db, { draftId: draft.id, lineId: view.lines[0].id, unitCost: 200 });

    const stockBefore = await balance("m-sticker");
    const first = await confirmDraft(db, { draftId: draft.id, recordedBy: "owner" });
    const stockAfter = await balance("m-sticker");
    expect(stockAfter).toBe(stockBefore - 4);

    const second = await confirmDraft(db, { draftId: draft.id, recordedBy: "owner" });
    const third = await confirmDraft(db, { draftId: draft.id, recordedBy: "owner" });
    expect(second.eventId).toBe(first.eventId);
    expect(third.eventId).toBe(first.eventId);
    expect(second.alreadyConfirmed).toBe(true);
    expect(await balance("m-sticker")).toBe(stockAfter);   // deducted exactly once
    expect(await scalar<number>(
      `SELECT COUNT(*)::int AS c FROM order_fulfillment_events WHERE order_id='d-ord-4'`)).toBe(1);
  });

  it("a CONSUMED draft rejects every edit (service and database)", async () => {
    const consumed = (await import("drizzle-orm")).eq;
    const rows = await client.query<{ id: string }>(
      `SELECT id FROM fulfillment_preparation_drafts WHERE order_id='d-ord-4' AND state='consumed'`);
    const draftId = rows.rows[0].id;
    void consumed;

    await expect(addManualLine(db, {
      draftId, materialName: "متأخر", category: "extra", quantity: 1, unitCost: 100,
    })).rejects.toThrow(/DRAFT_CONSUMED/);
    await expect(addCatalogLine(db, { draftId, materialId: "m-box", quantity: 1 }))
      .rejects.toThrow(/DRAFT_CONSUMED/);

    // Even bypassing the service, the DB refuses.
    await expect(client.query(
      `INSERT INTO fulfillment_preparation_draft_lines (id,draft_id,material_name,quantity)
       VALUES ('sneak','${draftId}'::text,'sneak','1')`)).rejects.toBeTruthy();
    await expect(client.query(
      `UPDATE fulfillment_preparation_drafts SET state='editing' WHERE id=$1`, [draftId])).rejects.toBeTruthy();
  });

  it("confirmed lines are NOT stored in the draft tables and vice-versa", async () => {
    // The immutable table has no draft rows; the draft table has no event rows.
    const draftLineIds = await client.query<{ id: string }>(
      `SELECT id FROM fulfillment_preparation_draft_lines`);
    const eventLineIds = await client.query<{ id: string }>(
      `SELECT id FROM order_fulfillment_lines`);
    const overlap = draftLineIds.rows.filter((d) => eventLineIds.rows.some((e) => e.id === d.id));
    expect(overlap).toEqual([]);
  });

  it("an empty draft cannot be confirmed", async () => {
    await client.exec(`INSERT INTO orders (id) VALUES ('d-ord-empty') ON CONFLICT DO NOTHING`);
    const draft = await getOrCreateDraft(db, { orderId: "d-ord-empty", manualOnly: true });
    await expect(confirmDraft(db, { draftId: draft.id })).rejects.toThrow(/DRAFT_EMPTY/);
  });
});
