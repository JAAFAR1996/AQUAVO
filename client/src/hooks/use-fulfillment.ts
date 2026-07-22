// ─────────────────────────────────────────────────────────────────────────────
// React Query bindings for the admin fulfillment-costing API
// (`/api/admin/fulfillment`, admin-only, session-authenticated).
//
// HARD RULE: no financial arithmetic lives here. These hooks transport server
// figures verbatim. The types below mirror the server contracts in
// server/services/{fulfillment-draft-service,fulfillment-service,accounting-engine}.ts
// — they are re-declared (not imported) because the client must not pull server
// modules into its bundle.
// ─────────────────────────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const BASE = "/api/admin/fulfillment";

// ── Server contract types ───────────────────────────────────────────────────

export type CostStatus = "exact" | "estimated" | "incomplete" | "unknown";
export type DraftState = "suggested" | "editing" | "awaiting_confirmation" | "consumed" | "discarded";

export interface DraftLineView {
  id: string;
  materialId: string | null;
  materialName: string;
  category: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  /** null = UNKNOWN, never 0. */
  unitCost: number | null;
  /** Server-calculated. null = UNKNOWN. */
  totalCost: number | null;
  costStatus: "exact" | "unknown";
  source: string;
  note: string | null;
}

export interface DraftView {
  id: string;
  orderId: string;
  eventType: string;
  state: DraftState;
  profileFamilyId: string | null;
  profileId: string | null;
  profileVersion: number | null;
  suggestionReason: string | null;
  lines: DraftLineView[];
  /** null whenever ANY line cost is unknown — never coerced to 0. */
  expectedCost: number | null;
  /** Sum over KNOWN lines only. Must always be labelled as partial in the UI. */
  knownCostSubtotal: number;
  costStatus: "exact" | "incomplete" | "unknown";
  missingCostLines: string[];
  confirmedEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentEventLine {
  id: string;
  materialId: string | null;
  materialName: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  costStatus: string;
  source: string;
  category: string | null;
  description: string | null;
  unit: string | null;
  note: string | null;
}

export interface FulfillmentEvent {
  id: string;
  orderId: string;
  eventType: string;
  sequenceNumber: number;
  workflowState: string;
  costStatus: string;
  profileFamilyId: string | null;
  profileId: string | null;
  profileVersion: number | null;
  reversalOfEventId: string | null;
  parentEventId: string | null;
  draftId: string | null;
  expectedCost: number | null;
  actualCost: number | null;
  variance: number | null;
  varianceReason: string | null;
  adjustmentReason: string | null;
  recordedBy: string | null;
  recordedAt: string;
  lines: FulfillmentEventLine[];
}

export interface ConfirmResult {
  eventId: string;
  alreadyConfirmed?: boolean;
  reused?: boolean;
  sequenceNumber: number;
  actualCost: number | null;
  expectedCost: number | null;
  variance: number | null;
  costStatus: CostStatus;
}

export interface OrderProfitItem {
  productId: string;
  name: string;
  qty: number;
  priceAtPurchase: number;
  unitCostPrice: number | null;
  unitPackagingCost: number | null;
  unitInsertCost: number | null;
  costStatus: CostStatus;
}

export interface OrderCostBreakdown {
  orderId: string;
  orderNumber: string | null;
  status: string;
  createdAt: string;
  collectedAmount: number;
  revenue: number;
  productCogs: number | null;
  supplierPackaging: number | null;
  aquavoFulfillmentCost: number | null;
  originalShipmentCost: number | null;
  reshipmentCost: number | null;
  returnHandlingCost: number | null;
  replacementCost: number | null;
  courierCost: number | null;
  commissions: number | null;
  paymentFees: number | null;
  otherDirectCosts: number | null;
  totalKnownDirectCost: number | null;
  contributionProfit: number | null;
  contributionMargin: number | null;
  unallocated: {
    legacyBoxCost: number | null;
    unknownProductLines: number;
    unknownFulfillmentLines: number;
    reversedFulfillmentCost: number;
  };
  dataStatus: CostStatus;
  productCostStatus: CostStatus;
  fulfillmentCostStatus: CostStatus;
  items: OrderProfitItem[];
}

export interface FulfillmentMaterial {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  approvedCost: { unitCost: number | null; status: string };
  stockBalance: number;
}

export interface FulfillmentReference {
  manualCategories: Array<{ value: string; label: string }>;
  eventTypes: string[];
}

export interface SuggestionContext {
  categories?: string[];
  itemCount?: number;
  fragile?: boolean;
}

// ── Query keys ──────────────────────────────────────────────────────────────

export const fulfillmentKeys = {
  draft: (orderId: string) => [BASE, "draft", orderId] as const,
  events: (orderId: string) => [BASE, "events", orderId] as const,
  profitability: (orderId: string) => [BASE, "profitability", orderId] as const,
  materials: () => [BASE, "materials"] as const,
  reference: () => [BASE, "reference"] as const,
};

async function json<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await apiRequest(method, url, body);
  return (await res.json()) as T;
}

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * Gets (or opens) the order's draft. This is a POST because opening a draft
 * seeds it from the suggested profile server-side; it is idempotent per order.
 */
export function useOrderDraft(orderId: string | null, context?: SuggestionContext) {
  return useQuery<DraftView>({
    queryKey: fulfillmentKeys.draft(orderId ?? ""),
    enabled: !!orderId,
    retry: false,
    queryFn: async () => {
      const data = await json<{ draft: DraftView }>(
        "POST", `${BASE}/orders/${orderId}/draft`, context ? { context } : {},
      );
      return data.draft;
    },
  });
}

export function useFulfillmentEvents(orderId: string | null) {
  return useQuery<FulfillmentEvent[]>({
    queryKey: fulfillmentKeys.events(orderId ?? ""),
    enabled: !!orderId,
    retry: false,
    queryFn: async () => {
      const data = await json<{ events: FulfillmentEvent[] }>("GET", `${BASE}/orders/${orderId}/events`);
      // Ordering only — the server assigns sequenceNumber, we never derive it.
      return [...(data.events ?? [])].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    },
  });
}

export function useOrderProfitability(orderId: string | null) {
  return useQuery<OrderCostBreakdown>({
    queryKey: fulfillmentKeys.profitability(orderId ?? ""),
    enabled: !!orderId,
    retry: false,
    queryFn: async () => {
      const data = await json<{ breakdown: OrderCostBreakdown }>(
        "GET", `${BASE}/orders/${orderId}/profitability`,
      );
      return data.breakdown;
    },
  });
}

export function useFulfillmentMaterials(enabled = true) {
  return useQuery<FulfillmentMaterial[]>({
    queryKey: fulfillmentKeys.materials(),
    enabled,
    retry: false,
    queryFn: async () => (await json<{ materials: FulfillmentMaterial[] }>("GET", `${BASE}/materials`)).materials ?? [],
  });
}

export function useFulfillmentReference(enabled = true) {
  return useQuery<FulfillmentReference>({
    queryKey: fulfillmentKeys.reference(),
    enabled,
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => json<FulfillmentReference>("GET", `${BASE}/reference`),
  });
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Every draft mutation returns the WHOLE recalculated draft, so the cache is
 * replaced with the server's version rather than patched locally. That is what
 * keeps the displayed totals identical to the server's.
 */
function useDraftMutation<TVars>(
  orderId: string,
  run: (vars: TVars) => Promise<{ draft: DraftView }>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (data) => {
      qc.setQueryData(fulfillmentKeys.draft(orderId), data.draft);
    },
  });
}

export function useAddCatalogLine(orderId: string, draftId: string | undefined) {
  return useDraftMutation<{ materialId: string; quantity: number; note?: string }>(
    orderId,
    (vars) => json(`POST`, `${BASE}/drafts/${draftId}/lines/catalog`, vars),
  );
}

export interface ManualLineInput {
  materialName: string;
  category: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  /** null = the owner does not know the cost yet. Never send 0 to mean "unknown". */
  unitCost: number | null;
  note?: string | null;
}

export function useAddManualLine(orderId: string, draftId: string | undefined) {
  return useDraftMutation<ManualLineInput>(
    orderId,
    (vars) => json(`POST`, `${BASE}/drafts/${draftId}/lines/manual`, vars),
  );
}

export function useUpdateDraftLine(orderId: string, draftId: string | undefined) {
  return useDraftMutation<{
    lineId: string;
    quantity?: number;
    unitCost?: number | null;
    note?: string | null;
    description?: string | null;
  }>(orderId, ({ lineId, ...patch }) => json(`PATCH`, `${BASE}/drafts/${draftId}/lines/${lineId}`, patch));
}

export function useRemoveDraftLine(orderId: string, draftId: string | undefined) {
  return useDraftMutation<{ lineId: string }>(
    orderId,
    ({ lineId }) => json(`DELETE`, `${BASE}/drafts/${draftId}/lines/${lineId}`),
  );
}

export function useDiscardDraft(orderId: string, draftId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => json<{ draft: DraftView }>("POST", `${BASE}/drafts/${draftId}/discard`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.draft(orderId) });
    },
  });
}

export function useConfirmDraft(orderId: string, draftId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { varianceReason?: string; allowNegativeStock?: boolean }) =>
      json<ConfirmResult>("POST", `${BASE}/drafts/${draftId}/confirm`, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.draft(orderId) });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.events(orderId) });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.profitability(orderId) });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.materials() });
    },
  });
}

export interface ReverseResult {
  reversalEventId: string;
  reused: boolean;
  reversedMovements: number;
}

export function useReverseEvent(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { eventId: string; reason: string }) =>
      json<ReverseResult>("POST", `${BASE}/events/${vars.eventId}/reverse`, { reason: vars.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.events(orderId) });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.profitability(orderId) });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.materials() });
    },
  });
}
