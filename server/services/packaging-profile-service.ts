// ─────────────────────────────────────────────────────────────────────────────
// Packaging profile FAMILY / VERSION service (item 5).
//
// Identity (family) is separated from definition (version):
//   * a family owns an ordered chain of versions (1,2,3 …), unique per family;
//   * a version becomes LOCKED the moment a confirmed event uses it;
//   * a locked version can never be edited — editing creates a NEW version that
//     links back via previous_version_id, and the old one records superseded_by_id;
//   * a confirmed event freezes family + exact version + material names + quantities
//     + unit costs on its own immutable lines, so editing a profile can never
//     retroactively change a historical order.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  packagingProfileFamilies, packagingProfiles, packagingProfileItems,
  fulfillmentMaterials, orderFulfillmentEvents,
} from "../../shared/schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import type {
  FulfillmentDb, FulfillmentExecutor, ProfileFamilyRow, ProfileVersionRow, ProfileItemRow,
} from "./fulfillment-db.js";
import { getApprovedCosts } from "./material-cost-service.js";

function requireDb(dbArg?: FulfillmentDb): FulfillmentDb {
  const db = dbArg ?? (getDb() as FulfillmentDb | null);
  if (!db) throw new Error("Database not available");
  return db;
}

export interface ProfileItemInput { materialId: string; quantity: number }

export interface CreateFamilyInput {
  familyKey: string;
  name: string;
  appliesTo?: unknown;
  notes?: string | null;
  createdBy?: string | null;
  /** The first version's contents. */
  items: ProfileItemInput[];
  creationReason?: string | null;
  effectiveDate?: Date | null;
}

export interface ProfileVersionView extends ProfileVersionRow {
  items: Array<ProfileItemRow & { materialName: string | null }>;
  expectedCostCalculated: number | null;
  missingCostMaterials: string[];
}

/** Create a family together with its version 1. */
export async function createProfileFamily(
  dbArg: FulfillmentDb | undefined,
  input: CreateFamilyInput,
): Promise<{ family: ProfileFamilyRow; version: ProfileVersionRow }> {
  const db = requireDb(dbArg);
  if (!input.familyKey?.trim()) throw new Error("FAMILY_KEY_REQUIRED");
  if (!input.items.length) throw new Error("PROFILE_ITEMS_REQUIRED: a profile version needs at least one material");

  const familyId = randomUUID();
  const versionId = randomUUID();
  const expected = await calculateExpectedCost(db, input.items);

  await db.transaction(async (tx) => {
    await tx.insert(packagingProfileFamilies).values({
      id: familyId, familyKey: input.familyKey.trim(), name: input.name,
      appliesTo: input.appliesTo ?? null, notes: input.notes ?? null,
    });
    await tx.insert(packagingProfiles).values({
      id: versionId, profileFamilyId: familyId, name: input.name,
      appliesTo: input.appliesTo ?? null, version: 1,
      expectedCost: expected.total == null ? null : String(expected.total),
      effectiveDate: input.effectiveDate ?? new Date(),
      creationReason: input.creationReason ?? "initial version",
      createdBy: input.createdBy ?? null,
    });
    await insertItems(tx, versionId, input.items);
  });

  const [family] = await db.select().from(packagingProfileFamilies)
    .where(eq(packagingProfileFamilies.id, familyId)).limit(1);
  const [version] = await db.select().from(packagingProfiles)
    .where(eq(packagingProfiles.id, versionId)).limit(1);
  return { family: family!, version: version! };
}

async function insertItems(tx: FulfillmentExecutor, profileId: string, items: ProfileItemInput[]): Promise<void> {
  for (const it of items) {
    if (!(Number(it.quantity) > 0)) throw new Error("PROFILE_QUANTITY_INVALID: quantity must be > 0");
    await tx.insert(packagingProfileItems).values({
      id: randomUUID(), profileId, materialId: it.materialId, quantity: String(it.quantity),
    });
  }
}

export interface NewVersionInput {
  familyId: string;
  items: ProfileItemInput[];
  creationReason: string;
  name?: string;
  appliesTo?: unknown;
  effectiveDate?: Date | null;
  createdBy?: string | null;
}

/**
 * Create the NEXT version of a family. This is the ONLY way to "edit" a profile:
 * the previous version is never mutated, so every historical event that cited it
 * keeps pointing at exactly what was used at the time.
 */
export async function createProfileVersion(
  dbArg: FulfillmentDb | undefined,
  input: NewVersionInput,
): Promise<ProfileVersionRow> {
  const db = requireDb(dbArg);
  if (!input.creationReason?.trim()) throw new Error("VERSION_REASON_REQUIRED: state why a new version is needed");
  if (!input.items.length) throw new Error("PROFILE_ITEMS_REQUIRED");

  const expected = await calculateExpectedCost(db, input.items);
  const newId = randomUUID();

  await db.transaction(async (tx) => {
    const versions = await tx.select().from(packagingProfiles)
      .where(eq(packagingProfiles.profileFamilyId, input.familyId))
      .orderBy(desc(packagingProfiles.version));
    if (versions.length === 0) throw new Error("FAMILY_NOT_FOUND");
    const latest = versions[0]!;

    await tx.insert(packagingProfiles).values({
      id: newId, profileFamilyId: input.familyId,
      name: input.name ?? latest.name,
      appliesTo: input.appliesTo ?? latest.appliesTo,
      version: latest.version + 1,
      previousVersionId: latest.id,
      creationReason: input.creationReason.trim(),
      expectedCost: expected.total == null ? null : String(expected.total),
      effectiveDate: input.effectiveDate ?? new Date(),
      createdBy: input.createdBy ?? null,
      active: true,
    });
    await insertItems(tx, newId, input.items);

    // Point the old version forward and retire it. `superseded_by_id`/`active` are
    // permitted to move even on a locked version — its costing definition is not.
    await tx.update(packagingProfiles)
      .set({ supersededById: newId, active: false, updatedAt: new Date() })
      .where(eq(packagingProfiles.id, latest.id));
  });

  const [created] = await db.select().from(packagingProfiles)
    .where(eq(packagingProfiles.id, newId)).limit(1);
  return created!;
}

/** Activate / deactivate a version (lifecycle only — never its costing definition). */
export async function setProfileVersionActive(
  dbArg: FulfillmentDb | undefined,
  profileId: string,
  active: boolean,
): Promise<ProfileVersionRow> {
  const db = requireDb(dbArg);
  await db.update(packagingProfiles).set({ active, updatedAt: new Date() })
    .where(eq(packagingProfiles.id, profileId));
  const [row] = await db.select().from(packagingProfiles)
    .where(eq(packagingProfiles.id, profileId)).limit(1);
  if (!row) throw new Error("PROFILE_VERSION_NOT_FOUND");
  return row;
}

export async function setFamilyActive(
  dbArg: FulfillmentDb | undefined,
  familyId: string,
  active: boolean,
): Promise<ProfileFamilyRow> {
  const db = requireDb(dbArg);
  await db.update(packagingProfileFamilies).set({ active, updatedAt: new Date() })
    .where(eq(packagingProfileFamilies.id, familyId));
  const [row] = await db.select().from(packagingProfileFamilies)
    .where(eq(packagingProfileFamilies.id, familyId)).limit(1);
  if (!row) throw new Error("FAMILY_NOT_FOUND");
  return row;
}

export interface ExpectedCostResult {
  /** null when ANY material's cost is unknown — never coerced to 0. */
  total: number | null;
  lines: Array<{ materialId: string; quantity: number; unitCost: number | null; totalCost: number | null }>;
  missingCostMaterials: string[];
}

/**
 * Server-side expected cost from APPROVED costs only. One unknown cost makes the
 * whole expected cost unknown (NULL) rather than silently under-reporting.
 */
export async function calculateExpectedCost(
  dbArg: FulfillmentDb | undefined,
  items: ProfileItemInput[],
): Promise<ExpectedCostResult> {
  const costs = await getApprovedCosts(dbArg, items.map((i) => i.materialId));
  let total = 0;
  const missing: string[] = [];
  const lines = items.map((i) => {
    const unitCost = costs.get(i.materialId)?.unitCost ?? null;
    const qty = Number(i.quantity);
    const lineTotal = unitCost == null || !Number.isFinite(qty) ? null : unitCost * qty;
    if (lineTotal == null) missing.push(i.materialId); else total += lineTotal;
    return { materialId: i.materialId, quantity: qty, unitCost, totalCost: lineTotal };
  });
  return { total: missing.length > 0 ? null : total, lines, missingCostMaterials: missing };
}

/** A family with all its versions, newest first. */
export async function getProfileFamily(
  dbArg: FulfillmentDb | undefined,
  familyId: string,
): Promise<{ family: ProfileFamilyRow; versions: ProfileVersionView[] } | null> {
  const db = requireDb(dbArg);
  const [family] = await db.select().from(packagingProfileFamilies)
    .where(eq(packagingProfileFamilies.id, familyId)).limit(1);
  if (!family) return null;

  const versions = await db.select().from(packagingProfiles)
    .where(eq(packagingProfiles.profileFamilyId, familyId))
    .orderBy(desc(packagingProfiles.version));
  const views: ProfileVersionView[] = [];
  for (const v of versions) views.push(await hydrateVersion(db, v));
  return { family, versions: views };
}

async function hydrateVersion(db: FulfillmentDb, v: ProfileVersionRow): Promise<ProfileVersionView> {
  const items = await db.select().from(packagingProfileItems)
    .where(eq(packagingProfileItems.profileId, v.id));
  const materialIds = items.map((i) => i.materialId);
  const names = new Map<string, string>();
  if (materialIds.length) {
    const mats = await db.select().from(fulfillmentMaterials)
      .where(inArray(fulfillmentMaterials.id, materialIds));
    for (const m of mats) names.set(m.id, m.name);
  }
  const expected = await calculateExpectedCost(db,
    items.map((i) => ({ materialId: i.materialId, quantity: Number(i.quantity) })));
  return {
    ...v,
    items: items.map((i) => ({ ...i, materialName: names.get(i.materialId) ?? null })),
    expectedCostCalculated: expected.total,
    missingCostMaterials: expected.missingCostMaterials,
  };
}

export async function listProfileFamilies(
  dbArg: FulfillmentDb | undefined,
  opts: { includeInactive?: boolean } = {},
): Promise<Array<ProfileFamilyRow & { versionCount: number; activeVersion: ProfileVersionRow | null }>> {
  const db = requireDb(dbArg);
  const families = opts.includeInactive
    ? await db.select().from(packagingProfileFamilies)
    : await db.select().from(packagingProfileFamilies).where(eq(packagingProfileFamilies.active, true));

  const out = [];
  for (const f of families) {
    const versions = await db.select().from(packagingProfiles)
      .where(eq(packagingProfiles.profileFamilyId, f.id))
      .orderBy(desc(packagingProfiles.version));
    out.push({
      ...f,
      versionCount: versions.length,
      activeVersion: versions.find((v) => v.active) ?? versions[0] ?? null,
    });
  }
  return out;
}

/** The newest ACTIVE version of a family — what a new suggestion should use. */
export async function getActiveVersion(
  dbArg: FulfillmentDb | undefined,
  familyId: string,
): Promise<ProfileVersionView | null> {
  const db = requireDb(dbArg);
  const versions = await db.select().from(packagingProfiles).where(and(
    eq(packagingProfiles.profileFamilyId, familyId),
    eq(packagingProfiles.active, true),
  )).orderBy(desc(packagingProfiles.version));
  if (!versions[0]) return null;
  return hydrateVersion(db, versions[0]);
}

/**
 * LOCK a profile version so it can never be edited again. Called inside the
 * confirmation transaction the first time a confirmed event cites the version.
 */
export async function lockProfileVersion(tx: FulfillmentExecutor, profileId: string): Promise<void> {
  await tx.update(packagingProfiles)
    .set({ locked: true, lockedAt: new Date() })
    .where(and(eq(packagingProfiles.id, profileId), eq(packagingProfiles.locked, false)));
}

/** Which confirmed events have used a given version — the historical-usage view. */
export async function getProfileVersionUsage(
  dbArg: FulfillmentDb | undefined,
  profileId: string,
): Promise<Array<{ eventId: string; orderId: string; eventType: string; recordedAt: string; actualCost: number | null }>> {
  const db = requireDb(dbArg);
  const events = await db.select().from(orderFulfillmentEvents)
    .where(eq(orderFulfillmentEvents.profileId, profileId));
  return events.map((e) => ({
    eventId: e.id, orderId: e.orderId, eventType: e.eventType,
    recordedAt: new Date(e.recordedAt).toISOString(),
    actualCost: toMoneyOrNull(e.actualCost),
  }));
}

export interface ProfileSuggestion {
  familyId: string;
  familyKey: string;
  profileId: string;
  version: number;
  reason: string;
  items: Array<{ materialId: string; materialName: string | null; quantity: number; unitCost: number | null }>;
  expectedCost: number | null;
  missingCostMaterials: string[];
}

/**
 * Suggest a profile for an order. Matching is rule-based on the family's `appliesTo`
 * (category / weight / fragility hints); the REASON is always returned so the owner
 * can see why. A suggestion is advisory only — it never becomes an accounting fact
 * until the owner confirms the draft it seeds.
 */
export async function suggestProfileForOrder(
  dbArg: FulfillmentDb | undefined,
  context: { categories?: string[]; itemCount?: number; fragile?: boolean },
): Promise<ProfileSuggestion | null> {
  const db = requireDb(dbArg);
  const families = await db.select().from(packagingProfileFamilies)
    .where(eq(packagingProfileFamilies.active, true));
  if (families.length === 0) return null;

  let best: { family: ProfileFamilyRow; score: number; reason: string } | null = null;
  for (const f of families) {
    const rules = (f.appliesTo ?? {}) as {
      categories?: string[]; maxItems?: number; minItems?: number; fragile?: boolean; default?: boolean;
    };
    let score = 0;
    const why: string[] = [];
    if (rules.default) { score += 1; why.push("البروفايل الافتراضي"); }
    if (rules.categories?.length && context.categories?.length) {
      const hit = rules.categories.filter((c) => context.categories!.includes(c));
      if (hit.length) { score += 5 * hit.length; why.push(`تطابق التصنيف: ${hit.join("، ")}`); }
    }
    if (typeof context.itemCount === "number") {
      const minOk = rules.minItems == null || context.itemCount >= rules.minItems;
      const maxOk = rules.maxItems == null || context.itemCount <= rules.maxItems;
      if ((rules.minItems != null || rules.maxItems != null) && minOk && maxOk) {
        score += 3; why.push(`عدد المنتجات (${context.itemCount}) ضمن نطاق البروفايل`);
      }
    }
    if (rules.fragile != null && context.fragile != null && rules.fragile === context.fragile) {
      score += 2; why.push(context.fragile ? "طلب يحتاج حماية إضافية" : "طلب غير قابل للكسر");
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { family: f, score, reason: why.join(" · ") };
    }
  }
  if (!best) return null;

  const version = await getActiveVersion(db, best.family.id);
  if (!version) return null;
  const costs = await getApprovedCosts(db, version.items.map((i) => i.materialId));

  return {
    familyId: best.family.id, familyKey: best.family.familyKey,
    profileId: version.id, version: version.version, reason: best.reason,
    items: version.items.map((i) => ({
      materialId: i.materialId, materialName: i.materialName, quantity: Number(i.quantity),
      unitCost: costs.get(i.materialId)?.unitCost ?? null,
    })),
    expectedCost: version.expectedCostCalculated,
    missingCostMaterials: version.missingCostMaterials,
  };
}
