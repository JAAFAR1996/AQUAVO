// The packing plan for one order, layer by layer, in Arabic.
//
// Renders only. Every placement coordinate, support ratio and load figure is
// computed server-side by the planner and its safety layer; nothing here
// recalculates or second-guesses them.
//
// There is deliberately NO "approve anyway" control. A plan that failed
// validation is not shown as approvable. Smart recommendations are visibly
// separated from validated plans: they can choose a carton from existing owner
// measurements, but they cannot be reserved/approved until canonical packing
// measurements are complete.
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Box, Layers, PackageCheck, Sparkles } from "lucide-react";
import {
  MISSING_FIELD_LABEL,
  bpToPercent,
  formatCm,
  formatIqd,
  formatKg,
  useGeneratePlan,
  useMarkManualPackRequired,
  useReleaseReservations,
  useReserveCartons,
  useValidatePlan,
  type PackedCartonView,
  type PlacedItemView,
  type PlanResultView,
} from "@/hooks/use-packaging";

/** Group a carton's items into visual layers by their floor height. */
function layersOf(carton: PackedCartonView): Array<{ y: number; items: PlacedItemView[] }> {
  const byY = new Map<number, PlacedItemView[]>();
  for (const it of carton.items) {
    const arr = byY.get(it.yMm) ?? [];
    arr.push(it);
    byY.set(it.yMm, arr);
  }
  return Array.from(byY.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([y, items]) => ({
      y,
      items: items.sort((a, b) => a.xMm - b.xMm || a.zMm - b.zMm),
    }));
}

function CartonCard({
  carton,
  supportRatioBp,
  loadOnG,
  showWeight = true,
  showSafety = true,
}: {
  carton: PackedCartonView;
  supportRatioBp: Record<string, number>;
  loadOnG: Record<string, number>;
  showWeight?: boolean;
  showSafety?: boolean;
}) {
  const layers = useMemo(() => layersOf(carton), [carton]);
  const totalWeightG = carton.items.reduce((s, i) => s + i.item.weightG, 0);
  const occupiedMm = carton.items.reduce((m, i) => Math.max(m, i.yMm + i.dyMm), 0);
  const utilisation =
    carton.carton.internalHeightMm > 0
      ? Math.round((occupiedMm * 100) / carton.carton.internalHeightMm)
      : 0;

  return (
    <Card dir="rtl" data-testid={`carton-${carton.cartonIndex}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Box className="h-4 w-4 shrink-0" />
          <span>كارتونة {carton.cartonIndex + 1}</span>
          <Badge variant="outline">{carton.carton.name}</Badge>
          <span className="text-muted-foreground text-sm font-normal">
            {formatCm(carton.carton.internalLengthMm)}×{formatCm(carton.carton.internalWidthMm)}×
            {formatCm(carton.carton.internalHeightMm)} سم
          </span>
        </CardTitle>
        <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
          {showWeight ? (
            <span>
              الوزن {formatKg(totalWeightG)} من {formatKg(carton.carton.maxWeightG)}
            </span>
          ) : (
            <span>الوزن النهائي يحتاج تثبيت قبل الاعتماد</span>
          )}
          <span>استغلال الارتفاع {utilisation}%</span>
          <span>كلفة الكارتونة {formatIqd(carton.carton.unitCost)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {layers.map((layer, idx) => (
          <div key={layer.y} className="border-r-2 border-muted pr-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-3.5 w-3.5" />
              الطبقة {idx + 1} — على ارتفاع {formatCm(layer.y)} سم
            </div>
            <ul className="space-y-2">
              {layer.items.map((it: PlacedItemView) => {
                const load = loadOnG[it.key] ?? 0;
                const limit = it.item.maxSupportedWeightAboveG;
                const overloaded = limit != null && load > limit;
                return (
                  <li key={it.key} className="text-sm" data-testid={`placement-${it.key}`}>
                    <div className="font-medium">{it.item.name}</div>
                    <div className="text-muted-foreground text-xs">
                      الموضع ({formatCm(it.xMm)}, {formatCm(it.yMm)}, {formatCm(it.zMm)}) سم ·
                      الأبعاد المشغولة {formatCm(it.dxMm)}×{formatCm(it.dyMm)}×{formatCm(it.dzMm)} سم
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {!showSafety ? (
                        "ترتيب مكاني مقترح — فحص الحمل النهائي مؤجل لحين تثبيت الوزن"
                      ) : (
                        <>
                          {it.yMm === 0
                            ? "مسنود على أرضية الكارتونة"
                            : `نسبة الإسناد ${bpToPercent(supportRatioBp[it.key])}`}
                          {load > 0 && (
                            <span className={overloaded ? "text-destructive font-semibold" : ""}>
                              {" · "}الحمل فوقه {formatKg(load)} من{" "}
                              {limit == null ? "حد غير محدد" : formatKg(limit)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ManualReview({ result }: { result: PlanResultView }) {
  return (
    <Alert variant="destructive" dir="rtl" data-testid="plan-manual-review">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>تحتاج مراجعة يدوية</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{result.messageAr}</p>

        {result.missing && result.missing.length > 0 && (
          <div>
            <div className="mb-1 font-semibold">منتجات ببيانات ناقصة:</div>
            <ul className="space-y-1">
              {result.missing.map((m) => (
                <li key={`${m.productId}-${m.variantId ?? ""}`} className="text-sm">
                  <span className="font-medium">{m.productName}</span>
                  {" — "}
                  {m.missing.map((f) => MISSING_FIELD_LABEL[f] ?? f).join("، ")}
                  {" · "}
                  <a
                    className="underline"
                    href={`/admin?tab=packing-data&product=${m.productId}`}
                    data-testid={`fix-packing-${m.productId}`}
                  >
                    إكمال البيانات
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.rejections && result.rejections.length > 0 && (
          <div>
            <div className="mb-1 font-semibold">أسباب رفض الترتيبات المجرّبة:</div>
            <ul className="list-disc space-y-1 pr-5 text-sm">
              {result.rejections.slice(0, 12).map((r, i) => (
                <li key={`${r.code}-${i}`}>{r.messageAr}</li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

function SmartRecommendation({ result }: { result: PlanResultView }) {
  const details = result as PlanResultView & {
    recommendationNotes?: string[];
    unknownWeightProducts?: number;
    estimatedProducts?: number;
  };
  const names = Array.from(new Set((result.cartons ?? []).map((c) => c.carton.name))).join(" + ");

  return (
    <div dir="rtl" className="space-y-4" data-testid="plan-smart-recommendation">
      <Alert className="border-emerald-500/40 bg-emerald-500/5">
        <Sparkles className="h-4 w-4" />
        <AlertTitle>اختيار ذكي للكارتونة: {names || "تم إيجاد اقتراح"}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            النظام هسه يستفيد من القياسات القديمة اللي مدخلها بالمخزون ومن مواصفات المنتج، بدل ما يعتبرها مفقودة.
          </p>
          {(details.unknownWeightProducts ?? 0) > 0 && (
            <p className="text-muted-foreground text-xs">
              اختيار الحجم جاهز؛ اعتماد الخطة وحجز الكارتونة يبقون مقفولين فقط لحد ما يثبت الوزن/السماكة الحقيقية، حتى ما نسجل تخمين كأنه قياس مؤكد.
            </p>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>اقتراح من القياسات الموجودة</Badge>
        <span>كلفة الكراتين: {formatIqd(result.totalKnownCost ?? null)}</span>
        <span className="text-muted-foreground">عدد الكراتين: {result.cartons?.length ?? 0}</span>
      </div>

      <div className="grid gap-4">
        {(result.cartons ?? []).map((c) => (
          <CartonCard
            key={c.cartonIndex}
            carton={c}
            supportRatioBp={{}}
            loadOnG={{}}
            showWeight={false}
            showSafety={false}
          />
        ))}
      </div>

      {result.explanationAr && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">ليش اختار هاي الكارتونة؟</summary>
          <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap">
            {result.explanationAr}
          </pre>
        </details>
      )}
    </div>
  );
}

export function CartonPlanViewer({ orderId }: { orderId: string }) {
  const [result, setResult] = useState<PlanResultView | null>(null);
  const [reason, setReason] = useState("");

  const generate = useGeneratePlan(orderId);
  const validate = useValidatePlan(orderId);
  const reserve = useReserveCartons(orderId);
  const release = useReleaseReservations(orderId);
  const manual = useMarkManualPackRequired(orderId);

  const isPlan = result?.outcome === "plan";
  const isSmartRecommendation =
    result?.outcome === "manual_review" && result.code === "SMART_CARTON_RECOMMENDATION";
  const safetyOk = result?.safety?.ok ?? false;
  const reasonValid = reason.trim().length >= 3;

  return (
    <div dir="rtl" className="space-y-4" data-testid="carton-plan-viewer">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => generate.mutateAsync().then(setResult)}
          disabled={generate.isPending}
          data-testid="button-generate-plan"
        >
          <PackageCheck className="ml-2 h-4 w-4" />
          احسب خطة التغليف
        </Button>

        {/* Only a passing canonical plan can be stored, reserved or confirmed. */}
        <Button
          variant="secondary"
          onClick={() => validate.mutate()}
          disabled={!isPlan || !safetyOk || validate.isPending}
          data-testid="button-validate-plan"
        >
          اعتماد الخطة
        </Button>
        <Button
          variant="secondary"
          onClick={() => reserve.mutate()}
          disabled={!isPlan || !safetyOk || reserve.isPending}
          data-testid="button-reserve-cartons"
        >
          حجز الكراتين
        </Button>
        <Button
          variant="outline"
          onClick={() => release.mutate({ reason: reason.trim() })}
          disabled={!reasonValid || release.isPending}
          data-testid="button-release-cartons"
        >
          تحرير الحجز
        </Button>
      </div>

      {result?.outcome === "plan" && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant={result.costStatus === "exact" ? "default" : "destructive"}>
              {result.costStatus === "exact" ? "الكلفة مكتملة" : "الكلفة ناقصة"}
            </Badge>
            <span>كلفة الكراتين: {formatIqd(result.totalKnownCost ?? null)}</span>
            <span className="text-muted-foreground">
              عدد الكراتين: {result.cartons?.length ?? 0}
            </span>
            <span className="text-muted-foreground text-xs">محرك: {result.engineVersion}</span>
          </div>

          {result.costStatus !== "exact" && (
            <Alert data-testid="cost-incomplete-notice">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                كلفة واحدة أو أكثر من الكراتين غير مسجّلة — الربح لهذا الطلب يظهر ناقصاً وليس صفراً.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {(result.cartons ?? []).map((c) => (
              <CartonCard
                key={c.cartonIndex}
                carton={c}
                supportRatioBp={result.safety?.supportRatioBp ?? {}}
                loadOnG={result.safety?.loadOnG ?? {}}
              />
            ))}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">الشرح النصي للخطة</summary>
            <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap">
              {result.explanationAr}
            </pre>
          </details>
        </>
      )}

      {isSmartRecommendation && result && <SmartRecommendation result={result} />}
      {result?.outcome === "manual_review" && !isSmartRecommendation && <ManualReview result={result} />}

      <Card dir="rtl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">إجراء يدوي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="السبب إجباري لأي إجراء يدوي"
            dir="rtl"
            data-testid="input-manual-reason"
          />
          <p className="text-muted-foreground text-xs">
            التغليف اليدوي لا يُسجَّل كخطة آلية آمنة، ويحرّر كل حجوزات الكراتين لهذا الطلب.
          </p>
          <Button
            variant="destructive"
            onClick={() => manual.mutate({ reason: reason.trim() })}
            disabled={!reasonValid || manual.isPending}
            data-testid="button-manual-pack-required"
          >
            تحتاج تغليف يدوي
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default CartonPlanViewer;
