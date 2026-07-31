// ─────────────────────────────────────────────────────────────────────────────
// React Query bindings for the carton-planner admin API
// (`/api/admin/packaging`, admin-only, session-authenticated).
//
// HARD RULE, same as use-fulfillment.ts: no arithmetic here. These hooks
// transport server figures verbatim — costs, support ratios, loads and
// placements are all computed server-side by canonical services. The types
// mirror the server contracts and are re-declared rather than imported so the
// client never pulls server modules into its bundle.
// ─────────────────────────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const BASE = "/api/admin/packaging";

export type CalculationBasis = "per_order" | "per_carton" | "per_product_unit";
export type MatchConfidence = "exact" | "probable" | "ambiguous";

export const CALCULATION_BASIS_LABEL: Record<CalculationBasis, string> = {
  per_order: "مرة واحدة لكل طلب",
  per_carton: "لكل كارتونة",
  per_product_unit: "لكل قطعة منتج",
};

export interface PreparationCostView {
  id: string;
  name: string;
  sku: string | null;
  calculationBasis: CalculationBasis;
  /** null = unknown. Never rendered as 0. */
  unitCost: number | null;
  currency: string;
  active: boolean;
  archivedAt: string | null;
  stockTracked: boolean;
  notes: string | null;
}

export interface CartonView {
  id: string;
  name: string;
  sku: string | null;
  internalLengthCm: number | null;
  internalWidthCm: number | null;
  internalHeightCm: number | null;
  maxWeightKg: number | null;
  safetyPaddingCm: number | null;
  unitCost: number | null;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number | null;
  active: boolean;
  notes: string | null;
}

export interface CartonStockView {
  stock: { materialId: string; onHand: number; reserved: number; available: number };
  movements: Array<{
    id: string;
    movementType: string;
    quantity: string;
    sourceDocument: string | null;
    createdAt: string;
  }>;
  reservations: Array<{
    id: string;
    orderId: string;
    quantity: string;
    state: string;
    reservedAt: string;
  }>;
}

export interface MissingPackingRow {
  productId: string;
  productName: string;
  variantId: string | null;
  missing: string[];
}

export interface SafetyRejectionView {
  code: string;
  messageAr: string;
  cartonIndex: number;
  itemKey?: string;
  itemName?: string;
  observed?: number;
  limit?: number;
}

export interface PlacedItemView {
  key: string;
  item: { productId: string; variantId: string | null; name: string; weightG: number; maxSupportedWeightAboveG: number | null };
  xMm: number;
  yMm: number;
  zMm: number;
  dxMm: number;
  dyMm: number;
  dzMm: number;
  rotationType: number;
}

export interface PackedCartonView {
  cartonIndex: number;
  carton: {
    materialId: string;
    sku: string;
    name: string;
    internalLengthMm: number;
    internalWidthMm: number;
    internalHeightMm: number;
    maxWeightG: number;
    unitCost: number | null;
  };
  items: PlacedItemView[];
}

export interface PlanResultView {
  outcome: "plan" | "manual_review";
  cartons?: PackedCartonView[];
  safety?: {
    ok: boolean;
    rejections: SafetyRejectionView[];
    supportRatioBp: Record<string, number>;
    loadOnG: Record<string, number>;
  };
  totalKnownCost?: number | null;
  costStatus?: "exact" | "incomplete";
  planHash?: string;
  engineVersion?: string;
  explanationAr?: string;
  code?: string;
  messageAr?: string;
  missing?: MissingPackingRow[];
  rejections?: SafetyRejectionView[];
}

export interface StockAlertView {
  id: string;
  materialId: string;
  alertLevel: "low" | "critical";
  state: "open" | "closed";
  onHandSnapshot: string | null;
  reservedSnapshot: string | null;
  availableSnapshot: string | null;
  thresholdSnapshot: string | null;
  messageAr: string | null;
  openedAt: string;
  acknowledgedAt: string | null;
}

export interface ReturnLossView {
  rows: Array<{
    id: string;
    returnEventId: string;
    fulfillmentLineId: string;
    materialNameSnapshot: string;
    quantity: string;
    originalTotalCostSnapshot: string | null;
    lossCategory: string;
    classificationMode: string;
    reason: string;
    recordedAt: string;
  }>;
  perReturnEvent: Record<string, number>;
  /** null when any contributing snapshot cost is unknown. */
  orderTotal: number | null;
  isReclassificationOnly: boolean;
}

// ── queries ─────────────────────────────────────────────────────────────────

export function usePreparationCosts() {
  return useQuery<{ items: PreparationCostView[] }>({
    queryKey: [`${BASE}/preparation-costs`],
  });
}

export function useCartons() {
  return useQuery<{ items: CartonView[] }>({ queryKey: [`${BASE}/cartons`] });
}

export function useCartonStock(cartonId: string | null) {
  return useQuery<CartonStockView>({
    queryKey: [`${BASE}/cartons/${cartonId}/stock`],
    enabled: Boolean(cartonId),
  });
}

export function useMissingPackingData() {
  return useQuery<{ items: MissingPackingRow[] }>({ queryKey: [`${BASE}/packing/missing`] });
}

export function useStockAlerts() {
  return useQuery<{ items: StockAlertView[] }>({
    queryKey: [`${BASE}/alerts`],
    refetchInterval: 60_000,
  });
}

export function useOrderReturnLoss(orderId: string | null) {
  return useQuery<ReturnLossView>({
    queryKey: [`${BASE}/orders/${orderId}/return-loss`],
    enabled: Boolean(orderId),
  });
}

// ── mutations ───────────────────────────────────────────────────────────────

/** Stable per user action so a retry is a no-op rather than a second write. */
function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function useCreateCarton() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Parameters<typeof JSON.stringify>[0] & Record<string, unknown>, never>) => {
      const res = await apiRequest("POST", `${BASE}/cartons`, {
        ...input,
        idempotencyKey: newIdempotencyKey("carton"),
      });
      return res.json();
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [`${BASE}/cartons`] }),
  });
}

export function useReceiveCartons(cartonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { quantity: number; reason: string }) => {
      const res = await apiRequest("POST", `${BASE}/cartons/${cartonId}/receive`, {
        ...input,
        idempotencyKey: newIdempotencyKey("receipt"),
      });
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [`${BASE}/cartons`] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/cartons/${cartonId}/stock`] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/alerts`] });
    },
  });
}

export function useCorrectCartonStock(cartonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { quantity: number; reason: string }) => {
      const res = await apiRequest("POST", `${BASE}/cartons/${cartonId}/correct`, {
        ...input,
        idempotencyKey: newIdempotencyKey("correct"),
      });
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [`${BASE}/cartons`] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/cartons/${cartonId}/stock`] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/alerts`] });
    },
  });
}

export function useGeneratePlan(orderId: string) {
  return useMutation({
    mutationFn: async (): Promise<PlanResultView> => {
      const res = await apiRequest("POST", `${BASE}/orders/${orderId}/plan`, {});
      return res.json();
    },
  });
}

export function useValidatePlan(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `${BASE}/orders/${orderId}/plan/validate`, {
        idempotencyKey: newIdempotencyKey("plan"),
      });
      return res.json();
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [`${BASE}/orders/${orderId}/plan`] }),
  });
}

export function useReserveCartons(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `${BASE}/orders/${orderId}/reserve`, {
        idempotencyKey: newIdempotencyKey("reserve"),
      });
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [`${BASE}/cartons`] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/orders/${orderId}/plan`] });
    },
  });
}

export function useReleaseReservations(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reason: string }) => {
      const res = await apiRequest("POST", `${BASE}/orders/${orderId}/release`, input);
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [`${BASE}/cartons`] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/orders/${orderId}/plan`] });
    },
  });
}

/**
 * Declare that the order is packed outside the automated model.
 *
 * This is NOT a safety override — there is no endpoint that accepts a plan which
 * failed validation. It records that no validated plan applies and releases
 * every carton hold the order had.
 */
export function useMarkManualPackRequired(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reason: string }) => {
      const res = await apiRequest("POST", `${BASE}/orders/${orderId}/manual-pack-required`, input);
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [`${BASE}/cartons`] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/orders/${orderId}/plan`] });
    },
  });
}

export function useSavePackingData(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiRequest("PUT", `${BASE}/products/${productId}/packing`, input);
      return res.json();
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [`${BASE}/packing/missing`] }),
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const res = await apiRequest("POST", `${BASE}/alerts/${alertId}/acknowledge`, {});
      return res.json();
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [`${BASE}/alerts`] }),
  });
}

// ── presentation helpers (formatting only, never computation) ───────────────

export const UNKNOWN_LABEL = "غير معروف";

/** Money. `null` is "غير معروف", never 0 د.ع. */
export function formatIqd(value: number | null | undefined): string {
  if (value == null) return UNKNOWN_LABEL;
  return `${Math.round(value).toLocaleString("en-US")} د.ع`;
}

export function formatCm(mm: number | null | undefined): string {
  if (mm == null) return UNKNOWN_LABEL;
  const cm = mm / 10;
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}

export function formatKg(grams: number | null | undefined): string {
  if (grams == null) return UNKNOWN_LABEL;
  return `${(grams / 1000).toFixed(2)} كغم`;
}

/** Basis points -> whole percent, for support ratios. */
export function bpToPercent(bp: number | null | undefined): string {
  if (bp == null) return UNKNOWN_LABEL;
  return `${Math.round(bp / 100)}%`;
}

export function cartonDimsLabel(c: {
  internalLengthCm: number | null;
  internalWidthCm: number | null;
  internalHeightCm: number | null;
}): string {
  if (c.internalLengthCm == null || c.internalWidthCm == null || c.internalHeightCm == null) {
    return UNKNOWN_LABEL;
  }
  return `${c.internalLengthCm}×${c.internalWidthCm}×${c.internalHeightCm} سم`;
}

export const MISSING_FIELD_LABEL: Record<string, string> = {
  packed_height_cm: "الارتفاع بعد التغليف",
  packed_width_cm: "العرض بعد التغليف",
  packed_depth_cm: "السماكة/العمق بعد التغليف",
  packed_weight_kg: "الوزن بعد التغليف",
};
