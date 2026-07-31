// Load propagation through a stack.
//
// The naive rule — "everything above A presses on A" — is wrong as soon as an
// upper item spans two lower ones: it charges the full weight to BOTH, which
// either rejects a perfectly safe plan or, in the mirror case, hides that a
// single supporter is genuinely overloaded. So load is split by CONTACT AREA
// and propagated downward through the support graph.
//
// Ordering. Every support edge runs from an item with a higher underside to one
// with a lower top face, so processing items by descending `bottomY` is a valid
// topological order: when we reach A, everything resting on A has already been
// charged. Ties break on (x, z, key) so the traversal is identical on every run.
// A cycle is geometrically impossible with positive heights, but we detect one
// anyway and reject rather than loop.
//
// Conservation. Shares are integer grams computed with `floor`, and the
// remainder is handed to the largest-area supporter. `sum(shares) == transmitted`
// exactly — no gram is invented and none evaporates, which is what makes the
// "one supporter over its limit, the other under" test meaningful.
import type {
  PackingPolicy,
  PlacedItem,
  SafetyRejection,
} from "../../shared/packing-types.js";
import { bottomY, type SupportEdge } from "./carton-support-analyzer.js";

export interface LoadResult {
  /** key -> grams pressing down on that item from everything above it. */
  loadG: Record<string, number>;
  rejections: SafetyRejection[];
}

function hasCycle(
  items: readonly PlacedItem[],
  edgesByItem: ReadonlyMap<string, SupportEdge[]>,
): boolean {
  const state = new Map<string, 0 | 1 | 2>();
  for (const i of items) state.set(i.key, 0);
  const byKey = new Map(items.map((i) => [i.key, i]));

  const visit = (key: string): boolean => {
    const s = state.get(key);
    if (s === 1) return true;
    if (s === 2) return false;
    state.set(key, 1);
    for (const e of edgesByItem.get(key) ?? []) {
      if (!byKey.has(e.supporter.key)) continue;
      if (visit(e.supporter.key)) return true;
    }
    state.set(key, 2);
    return false;
  };

  for (const i of items) if (visit(i.key)) return true;
  return false;
}

/**
 * Distribute weight down one carton's stack and check every supporter against
 * its declared limit.
 *
 * An item carrying load whose `maxSupportedWeightAboveG` is null is rejected —
 * unknown capacity is never read as unlimited.
 */
export function distributeLoad(
  cartonIndex: number,
  items: readonly PlacedItem[],
  edgesByItem: ReadonlyMap<string, SupportEdge[]>,
  _policy: PackingPolicy,
): LoadResult {
  const rejections: SafetyRejection[] = [];
  const loadG: Record<string, number> = {};
  for (const i of items) loadG[i.key] = 0;

  if (hasCycle(items, edgesByItem)) {
    rejections.push({
      code: "SUPPORT_CYCLE",
      messageAr: "بنية إسناد دائرية أو غامضة داخل الكارتونة",
      cartonIndex,
    });
    return { loadG, rejections };
  }

  const order = [...items].sort(
    (a, b) =>
      bottomY(b) - bottomY(a) ||
      a.xMm - b.xMm ||
      a.zMm - b.zMm ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );

  for (const b of order) {
    const edges = edgesByItem.get(b.key) ?? [];
    if (edges.length === 0) continue; // floor-resting, or already flagged floating

    const transmitted = b.item.weightG + (loadG[b.key] ?? 0);
    let total = 0;
    for (const e of edges) total += e.areaMm2;
    if (total <= 0) continue;

    let assigned = 0;
    for (const e of edges) {
      const share = Math.floor((transmitted * e.areaMm2) / total);
      loadG[e.supporter.key] = (loadG[e.supporter.key] ?? 0) + share;
      assigned += share;
    }
    // Remainder to the largest contact (edges are pre-sorted by area desc).
    const first = edges[0]!.supporter.key;
    loadG[first] = (loadG[first] ?? 0) + (transmitted - assigned);
  }

  for (const a of [...items].sort((x, y) => (x.key < y.key ? -1 : 1))) {
    const load = loadG[a.key] ?? 0;
    if (load <= 0) continue;
    const limit = a.item.maxSupportedWeightAboveG;
    if (limit == null) {
      rejections.push({
        code: "SUPPORT_LIMIT_UNKNOWN",
        messageAr: `حد تحمّل المنتج غير معروف ولا يُفترض: ${a.item.name}`,
        cartonIndex,
        itemKey: a.key,
        itemName: a.item.name,
        observed: load,
      });
      continue;
    }
    if (load > limit) {
      rejections.push({
        code: "LOAD_EXCEEDS_LIMIT",
        messageAr: `الحمل فوق المنتج يتجاوز تحمّله: ${a.item.name}`,
        cartonIndex,
        itemKey: a.key,
        itemName: a.item.name,
        observed: load,
        limit,
      });
    }
  }

  return { loadG, rejections };
}
