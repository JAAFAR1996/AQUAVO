import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const BASE = "/api/admin/packaging/preparation-inventory";
const FULFILLMENT_BASE = "/api/admin/fulfillment";

function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export interface PreparationInventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unitCost: number | null;
  currency: string;
  calculationBasis: string;
  stockTracked: boolean;
  stockBalance: number;
  lowStockThreshold: number | null;
  active: boolean;
  archivedAt: string | null;
  notes: string | null;
}

export interface PreparationInventoryMovement {
  id: string;
  movementType: string;
  quantity: number;
  orderId: string | null;
  eventId: string | null;
  lineId: string | null;
  purchaseId: string | null;
  reversalOfMovementId: string | null;
  idempotencyKey: string;
  sourceDocument: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface PreparationInventoryHistory {
  balance: number;
  movements: PreparationInventoryMovement[];
}

export function usePreparationInventory() {
  return useQuery<{ items: PreparationInventoryItem[] }>({
    queryKey: [BASE],
  });
}

export function usePreparationInventoryHistory(materialId: string | null, enabled = true) {
  return useQuery<PreparationInventoryHistory>({
    queryKey: [`${BASE}/${materialId}/movements`],
    enabled: Boolean(materialId) && enabled,
  });
}

function useInventoryMutation(
  materialId: string,
  suffix: "stocktake" | "receive" | "tracking",
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("POST", `${BASE}/${materialId}/${suffix}`, body);
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [BASE] });
      void qc.invalidateQueries({ queryKey: [`${BASE}/${materialId}/movements`] });
      // Draft projections and material lists are server-owned; a tracking/stock
      // change must invalidate them so the confirm UI immediately reflects truth.
      void qc.invalidateQueries({ queryKey: [FULFILLMENT_BASE] });
    },
  });
}

export function useStocktakePreparationMaterial(materialId: string) {
  const mutation = useInventoryMutation(materialId, "stocktake");
  return {
    ...mutation,
    mutateStocktake: (input: { quantity: number; reason: string }, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate({
        ...input,
        idempotencyKey: newIdempotencyKey("stocktake"),
      }, options),
  };
}

export function useReceivePreparationMaterial(materialId: string) {
  const mutation = useInventoryMutation(materialId, "receive");
  return {
    ...mutation,
    mutateReceive: (input: { quantity: number; reason: string }, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate({
        ...input,
        idempotencyKey: newIdempotencyKey("receive"),
      }, options),
  };
}

export function useSetPreparationTracking(materialId: string) {
  const mutation = useInventoryMutation(materialId, "tracking");
  return {
    ...mutation,
    mutateTracking: (
      input: {
        enabled: boolean;
        currentQuantity?: number;
        lowStockThreshold?: number | null;
        reason: string;
      },
      options?: Parameters<typeof mutation.mutate>[1],
    ) => mutation.mutate({
      ...input,
      idempotencyKey: newIdempotencyKey("tracking"),
    }, options),
  };
}
