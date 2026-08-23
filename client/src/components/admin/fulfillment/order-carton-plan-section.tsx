// Manual carton choice for the real order workflow.
//
// Before the original fulfillment is confirmed, the selected carton lives in the
// original fulfillment draft. After confirmation, the original event is immutable,
// so a missing carton is recorded as a small adjustment event instead of trying to
// confirm the original shipment twice.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, CheckCircle2, PackageSearch } from "lucide-react";
import { formatIqd, useCartons, type CartonView } from "@/hooks/use-packaging";
import {
  fulfillmentKeys,
  useAddCatalogLine,
  useFulfillmentEvents,
  useOrderDraft,
  useRemoveDraftLine,
  useUpdateDraftLine,
  type DraftView,
} from "@/hooks/use-fulfillment";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CartonSize = "small" | "medium" | "large";

type SizeOption = { key: CartonSize; label: string; hint: string };

const SIZE_OPTIONS: SizeOption[] = [
  { key: "small", label: "صغير", hint: "للطلبيات الخفيفة والصغيرة" },
  { key: "medium", label: "وسط", hint: "للطلبيات الاعتيادية" },
  { key: "large", label: "كبير", hint: "للطلبيات الأكبر" },
];

const FULFILLMENT_BASE = "/api/admin/fulfillment";

function cartonSize(carton: CartonView): CartonSize | null {
  const sku = (carton.sku ?? "").trim().toUpperCase();
  const name = carton.name.trim().toLowerCase();

  if (sku === "BOX-S" || /صغير|small/.test(name)) return "small";
  if (sku === "BOX-M" || /وسط|متوسط|medium/.test(name)) return "medium";
  if (sku === "BOX-L" || /كبير|large/.test(name)) return "large";
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "تعذر حفظ اختيار الكارتون";
}

function mapBySize(cartons: CartonView[]): Partial<Record<CartonSize, CartonView>> {
  const result: Partial<Record<CartonSize, CartonView>> = {};
  for (const carton of cartons) {
    const size = cartonSize(carton);
    if (size && !result[size]) result[size] = carton;
  }
  return result;
}

function SelectorButtons({
  bySize,
  selectedMaterialId,
  editable,
  busySize,
  onChoose,
}: {
  bySize: Partial<Record<CartonSize, CartonView>>;
  selectedMaterialId: string | null;
  editable: boolean;
  busySize: CartonSize | null;
  onChoose: (size: CartonSize) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="manual-carton-size-selector">
      {SIZE_OPTIONS.map((option) => {
        const carton = bySize[option.key];
        const selected = carton != null && selectedMaterialId === carton.id;
        const busy = busySize === option.key;
        const unavailable = !carton;

        return (
          <Button
            key={option.key}
            type="button"
            variant={selected ? "default" : "outline"}
            className="h-auto min-h-24 justify-start px-3 py-3 text-right"
            disabled={!editable || unavailable || busySize != null}
            onClick={() => onChoose(option.key)}
            data-testid={`carton-size-${option.key}`}
          >
            <span className="flex w-full items-start gap-2">
              {selected ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <Box className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{option.label}</span>
                  {selected && <Badge variant="secondary">مختار</Badge>}
                </span>
                <span className="mt-1 block text-xs font-normal opacity-80">{option.hint}</span>
                <span className="mt-1 block text-xs font-normal opacity-80">
                  {unavailable
                    ? "غير مسجل حالياً"
                    : `${carton.name} · ${formatIqd(carton.unitCost)} · متوفر ${carton.available}`}
                </span>
                {busy && <span className="mt-1 block text-xs">جاري الحفظ…</span>}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function OriginalCartonSelector({
  orderId,
  activeCartons,
}: {
  orderId: string;
  activeCartons: CartonView[];
}) {
  const { toast } = useToast();
  const draftQuery = useOrderDraft(orderId);
  const draft = draftQuery.data;
  const draftId = draft?.id;
  const addCatalog = useAddCatalogLine(orderId, draftId);
  const removeLine = useRemoveDraftLine(orderId, draftId);
  const updateLine = useUpdateDraftLine(orderId, draftId);
  const [busySize, setBusySize] = useState<CartonSize | null>(null);

  const bySize = useMemo(() => mapBySize(activeCartons), [activeCartons]);
  const cartonIds = useMemo(() => new Set(activeCartons.map((c) => c.id)), [activeCartons]);
  const currentCartonLines = draft?.lines.filter(
    (line) => line.materialId != null && cartonIds.has(line.materialId),
  ) ?? [];
  const selectedMaterialId = currentCartonLines.length === 1 ? currentCartonLines[0].materialId : null;
  const editable = Boolean(draft && draft.state !== "consumed" && draft.state !== "discarded");

  async function choose(size: CartonSize) {
    const chosen = bySize[size];
    if (!chosen || !draft || !editable || busySize) return;

    setBusySize(size);
    try {
      const chosenLines = currentCartonLines.filter((line) => line.materialId === chosen.id);
      const keep = chosenLines[0] ?? null;

      for (const line of currentCartonLines) {
        if (!keep || line.id !== keep.id) {
          await removeLine.mutateAsync({ lineId: line.id });
        }
      }

      if (keep) {
        if (keep.quantity !== 1) {
          await updateLine.mutateAsync({ lineId: keep.id, quantity: 1 });
        }
      } else {
        await addCatalog.mutateAsync({
          materialId: chosen.id,
          quantity: 1,
          note: `اختيار يدوي للكارتون: ${SIZE_OPTIONS.find((o) => o.key === size)?.label ?? chosen.name}`,
        });
      }

      toast({
        title: "تم اختيار الكارتون",
        description: `${chosen.name} — راح ينحفظ ويا تأكيد التجهيز`,
      });
    } catch (error) {
      toast({
        title: "تعذر حفظ الاختيار",
        description: errorMessage(error),
        variant: "destructive",
      });
    } finally {
      setBusySize(null);
    }
  }

  const mutationError = addCatalog.error ?? removeLine.error ?? updateLine.error;

  if (draftQuery.isLoading) {
    return <p className="text-muted-foreground text-sm">جاري تحميل الكراتين…</p>;
  }

  if (draftQuery.isError) {
    return <p className="text-destructive text-sm">تعذر تحميل مسودة التجهيز.</p>;
  }

  return (
    <>
      <SelectorButtons
        bySize={bySize}
        selectedMaterialId={selectedMaterialId}
        editable={editable}
        busySize={busySize}
        onChoose={(size) => void choose(size)}
      />

      {!editable && draft && (
        <p className="text-muted-foreground text-xs">
          هذا التجهيز مقفول بعد التأكيد.
        </p>
      )}

      {mutationError && (
        <p className="text-destructive text-xs" role="alert">
          {errorMessage(mutationError)}
        </p>
      )}
    </>
  );
}

function AfterConfirmationCartonSelector({
  orderId,
  allCartons,
  activeCartons,
}: {
  orderId: string;
  allCartons: CartonView[];
  activeCartons: CartonView[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const eventsQuery = useFulfillmentEvents(orderId);
  const [busySize, setBusySize] = useState<CartonSize | null>(null);
  const bySize = useMemo(() => mapBySize(activeCartons), [activeCartons]);
  const allCartonIds = useMemo(() => new Set(allCartons.map((c) => c.id)), [allCartons]);

  const confirmedCarton = useMemo(() => {
    const events = eventsQuery.data ?? [];
    for (const event of [...events].reverse()) {
      if (event.workflowState === "reversed") continue;
      const line = [...(event.lines ?? [])].reverse().find(
        (item) => item.materialId != null && allCartonIds.has(item.materialId),
      );
      if (!line?.materialId) continue;
      const carton = allCartons.find((item) => item.id === line.materialId);
      if (carton) return { carton, eventId: event.id };
    }
    return null;
  }, [eventsQuery.data, allCartonIds, allCartons]);

  const adjustmentKey = [FULFILLMENT_BASE, "carton-adjustment-draft", orderId] as const;
  const adjustmentQuery = useQuery<DraftView>({
    queryKey: adjustmentKey,
    enabled: eventsQuery.isSuccess && !confirmedCarton,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("POST", `${FULFILLMENT_BASE}/orders/${orderId}/draft`, {
        eventType: "adjustment",
        manualOnly: true,
      });
      const data = await response.json() as { draft: DraftView };
      return data.draft;
    },
  });

  const draft = adjustmentQuery.data;
  const draftId = draft?.id;
  const activeCartonIds = useMemo(() => new Set(activeCartons.map((c) => c.id)), [activeCartons]);
  const currentCartonLines = draft?.lines.filter(
    (line) => line.materialId != null && activeCartonIds.has(line.materialId),
  ) ?? [];
  const selectedMaterialId = currentCartonLines.length === 1 ? currentCartonLines[0].materialId : null;

  const updateDraftCache = (data: { draft: DraftView }) => {
    qc.setQueryData(adjustmentKey, data.draft);
  };

  const addCatalog = useMutation({
    mutationFn: async (input: { materialId: string; quantity: number; note?: string }) => {
      if (!draftId) throw new Error("مسودة اختيار الكارتون غير جاهزة بعد");
      const response = await apiRequest("POST", `${FULFILLMENT_BASE}/drafts/${draftId}/lines/catalog`, input);
      return await response.json() as { draft: DraftView };
    },
    onSuccess: updateDraftCache,
  });

  const removeLine = useMutation({
    mutationFn: async (lineId: string) => {
      if (!draftId) throw new Error("مسودة اختيار الكارتون غير جاهزة بعد");
      const response = await apiRequest("DELETE", `${FULFILLMENT_BASE}/drafts/${draftId}/lines/${lineId}`);
      return await response.json() as { draft: DraftView };
    },
    onSuccess: updateDraftCache,
  });

  const updateLine = useMutation({
    mutationFn: async (input: { lineId: string; quantity: number }) => {
      if (!draftId) throw new Error("مسودة اختيار الكارتون غير جاهزة بعد");
      const response = await apiRequest(
        "PATCH",
        `${FULFILLMENT_BASE}/drafts/${draftId}/lines/${input.lineId}`,
        { quantity: input.quantity },
      );
      return await response.json() as { draft: DraftView };
    },
    onSuccess: updateDraftCache,
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error("اختار الكارتون أولاً");
      const response = await apiRequest("POST", `${FULFILLMENT_BASE}/drafts/${draftId}/confirm`, {
        varianceReason: "اختيار الكارتون يدوياً بعد تأكيد تجهيز الطلب",
      });
      return await response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: fulfillmentKeys.events(orderId) }),
        qc.invalidateQueries({ queryKey: fulfillmentKeys.profitability(orderId) }),
        qc.invalidateQueries({ queryKey: [`/api/admin/packaging/cartons`] }),
      ]);
      toast({ title: "تم حفظ الكارتون", description: "انضاف للكلفة والمخزون بدون تكرار تجهيز الطلب الأصلي" });
    },
    onError: (error) => {
      toast({ title: "تعذر حفظ الكارتون", description: errorMessage(error), variant: "destructive" });
    },
  });

  async function choose(size: CartonSize) {
    const chosen = bySize[size];
    if (!chosen || !draft || busySize) return;

    setBusySize(size);
    try {
      const chosenLines = currentCartonLines.filter((line) => line.materialId === chosen.id);
      const keep = chosenLines[0] ?? null;

      for (const line of currentCartonLines) {
        if (!keep || line.id !== keep.id) {
          await removeLine.mutateAsync(line.id);
        }
      }

      if (keep) {
        if (keep.quantity !== 1) {
          await updateLine.mutateAsync({ lineId: keep.id, quantity: 1 });
        }
      } else {
        await addCatalog.mutateAsync({
          materialId: chosen.id,
          quantity: 1,
          note: `اختيار يدوي للكارتون بعد تأكيد التجهيز: ${SIZE_OPTIONS.find((o) => o.key === size)?.label ?? chosen.name}`,
        });
      }
    } catch (error) {
      toast({ title: "تعذر اختيار الكارتون", description: errorMessage(error), variant: "destructive" });
    } finally {
      setBusySize(null);
    }
  }

  if (eventsQuery.isLoading || adjustmentQuery.isLoading) {
    return <p className="text-muted-foreground text-sm">جاري تحميل اختيار الكارتون…</p>;
  }

  if (eventsQuery.isError || adjustmentQuery.isError) {
    return <p className="text-destructive text-sm">تعذر تحميل اختيار الكارتون. أغلق الطلب وافتحه مرة ثانية.</p>;
  }

  if (confirmedCarton) {
    const size = cartonSize(confirmedCarton.carton);
    return (
      <div className="space-y-2">
        <SelectorButtons
          bySize={bySize}
          selectedMaterialId={confirmedCarton.carton.id}
          editable={false}
          busySize={null}
          onChoose={() => {}}
        />
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          الكارتون محفوظ فعلياً: {size ? SIZE_OPTIONS.find((o) => o.key === size)?.label : confirmedCarton.carton.name}.
        </p>
      </div>
    );
  }

  const mutationError = addCatalog.error ?? removeLine.error ?? updateLine.error;

  return (
    <div className="space-y-3">
      <SelectorButtons
        bySize={bySize}
        selectedMaterialId={selectedMaterialId}
        editable={Boolean(draft)}
        busySize={busySize}
        onChoose={(size) => void choose(size)}
      />

      {mutationError && (
        <p className="text-destructive text-xs" role="alert">{errorMessage(mutationError)}</p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!selectedMaterialId || confirm.isPending || busySize != null}
          onClick={() => confirm.mutate()}
          data-testid="confirm-carton-adjustment"
        >
          {confirm.isPending ? "جاري الحفظ…" : "حفظ اختيار الكارتون"}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        تجهيز الطلب الأصلي يبقى مثل ما هو. هنانا ينضاف فقط الكارتون اللي تختاره، حتى ما تتكرر كلفة التجهيز أو ينخصم المخزون مرتين.
      </p>
    </div>
  );
}

export function OrderCartonPlanSection({
  orderId,
  afterConfirmation = false,
}: {
  orderId: string;
  afterConfirmation?: boolean;
}) {
  const cartons = useCartons();
  const allCartons = cartons.data?.items ?? [];
  const activeCartons = useMemo(() => allCartons.filter((c) => c.active), [allCartons]);

  return (
    <Card dir="rtl" data-testid="order-carton-plan-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageSearch className="h-5 w-5" />
          اختيار الكارتون
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          الاختيار يدوي فقط — اختار صغير أو وسط أو كبير حسب الطلب.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {cartons.isLoading ? (
          <p className="text-muted-foreground text-sm">جاري تحميل الكراتين…</p>
        ) : cartons.isError ? (
          <p className="text-destructive text-sm">تعذر تحميل أنواع الكراتين.</p>
        ) : afterConfirmation ? (
          <AfterConfirmationCartonSelector
            orderId={orderId}
            allCartons={allCartons}
            activeCartons={activeCartons}
          />
        ) : (
          <OriginalCartonSelector orderId={orderId} activeCartons={activeCartons} />
        )}
      </CardContent>
    </Card>
  );
}
