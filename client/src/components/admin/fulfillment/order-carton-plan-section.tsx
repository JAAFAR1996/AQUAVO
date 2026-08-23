// Manual carton choice for the real order workflow.
//
// The owner explicitly chooses the carton size. No product dimensions, weights,
// planner recommendation, validation or automatic carton selection are used here.
// The selected carton is added to the existing fulfillment draft so its approved
// cost and stock movement still flow through the normal accounting path.
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, CheckCircle2, PackageSearch } from "lucide-react";
import { formatIqd, useCartons, type CartonView } from "@/hooks/use-packaging";
import {
  useAddCatalogLine,
  useOrderDraft,
  useRemoveDraftLine,
  useUpdateDraftLine,
} from "@/hooks/use-fulfillment";
import { useToast } from "@/hooks/use-toast";

type CartonSize = "small" | "medium" | "large";

const SIZE_OPTIONS: Array<{ key: CartonSize; label: string; hint: string }> = [
  { key: "small", label: "صغير", hint: "للطلبيات الخفيفة والصغيرة" },
  { key: "medium", label: "وسط", hint: "للطلبيات الاعتيادية" },
  { key: "large", label: "كبير", hint: "للطلبيات الأكبر" },
];

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

export function OrderCartonPlanSection({
  orderId,
  children: _children,
}: {
  orderId: string;
  children?: ReactNode;
}) {
  const { toast } = useToast();
  const cartons = useCartons();
  const draftQuery = useOrderDraft(orderId);
  const draft = draftQuery.data;
  const draftId = draft?.id;

  const addCatalog = useAddCatalogLine(orderId, draftId);
  const removeLine = useRemoveDraftLine(orderId, draftId);
  const updateLine = useUpdateDraftLine(orderId, draftId);
  const [busySize, setBusySize] = useState<CartonSize | null>(null);

  const activeCartons = useMemo(
    () => (cartons.data?.items ?? []).filter((c) => c.active),
    [cartons.data?.items],
  );

  const bySize = useMemo(() => {
    const result: Partial<Record<CartonSize, CartonView>> = {};
    for (const carton of activeCartons) {
      const size = cartonSize(carton);
      if (size && !result[size]) result[size] = carton;
    }
    return result;
  }, [activeCartons]);

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

      // Remove any other carton choice first. The rest of the packaging draft is
      // untouched (bags, tape, inserts, etc.).
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
        description: `${chosen.name} — الاختيار يدوي وماكو اختيار تلقائي`,
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

  const loading = cartons.isLoading || draftQuery.isLoading;
  const mutationError = addCatalog.error ?? removeLine.error ?? updateLine.error;

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
        {loading ? (
          <p className="text-muted-foreground text-sm">جاري تحميل الكراتين…</p>
        ) : (
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
                  onClick={() => void choose(option.key)}
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
        )}

        {!editable && draft && (
          <p className="text-muted-foreground text-xs">
            هذا التجهيز مقفول بعد التأكيد، لذلك اختيار الكارتون غير قابل للتعديل.
          </p>
        )}

        {mutationError && (
          <p className="text-destructive text-xs" role="alert">
            {errorMessage(mutationError)}
          </p>
        )}

        <p className="text-muted-foreground text-xs">
          تم إيقاف اقتراح الكارتون التلقائي وحساب خطة التغليف من هذه الشاشة. اختيارك هنا يدخل ضمن مواد تجهيز الطلب وكلفته بشكل طبيعي.
        </p>
      </CardContent>
    </Card>
  );
}
