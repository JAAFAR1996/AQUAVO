// The carton-planner admin surfaces, all RTL Arabic.
//
//   1. تكاليف تجهيز الطلب
//   2. الكراتين ومواد التغليف
//   3. مخزون الكراتين وحركاته
//   4. بيانات تغليف المنتجات (طابور النواقص)
//   5. تنبيهات انخفاض المخزون
//   6. تقرير الكراتين التالفة بسبب الطلبات الراجعة
//
// Presentation only. Every figure is a server figure; a null cost renders as
// «غير معروف» and never as 0 د.ع, because a missing cost and a free item are
// different facts.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, PackageOpen, Boxes, Ruler, Bell, RotateCcw } from "lucide-react";
import {
  CALCULATION_BASIS_LABEL,
  MISSING_FIELD_LABEL,
  UNKNOWN_LABEL,
  cartonDimsLabel,
  formatIqd,
  useAcknowledgeAlert,
  useCartonStock,
  useCartons,
  useCorrectCartonStock,
  useMissingPackingData,
  useOrderReturnLoss,
  usePreparationCosts,
  useReceiveCartons,
  useStockAlerts,
  type CartonView,
} from "@/hooks/use-packaging";
import {
  AddCartonForm,
  AddPreparationCostForm,
  CartonEditor,
  PreparationCostEditor,
} from "./packaging-forms";

// ═══════════════════════════════════════════════════════════════════════════
// 1. تكاليف تجهيز الطلب
// ═══════════════════════════════════════════════════════════════════════════

export function PreparationCostsPanel() {
  const { data, isLoading } = usePreparationCosts();
  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const items = data?.items ?? [];

  return (
    <Card dir="rtl" data-testid="panel-preparation-costs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageOpen className="h-5 w-5" />
          تكاليف تجهيز الطلب
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          تُحتسب داخلياً وتنقص الربح، ولا تغيّر المبلغ المستحق على الزبون إطلاقاً.
        </p>
        <div className="pt-2">
          <AddPreparationCostForm />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground text-sm">جاري التحميل…</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-muted-foreground text-sm">ماكو تكاليف تجهيز مسجّلة.</p>
        )}
        <div className="space-y-2">
          {items.map((c) => (
            <div
              key={c.id}
              className="rounded-md border p-3"
              data-testid={`preparation-cost-${c.sku ?? c.id}`}
            >
             <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium">
                  {c.name}
                  {c.sku && (
                    <code className="text-muted-foreground text-xs" dir="ltr">
                      {c.sku}
                    </code>
                  )}
                  {!c.active && <Badge variant="outline">معطّل</Badge>}
                  {c.archivedAt && <Badge variant="secondary">مؤرشف</Badge>}
                </div>
                <div className="text-muted-foreground text-xs">
                  {CALCULATION_BASIS_LABEL[c.calculationBasis]}
                  {c.stockTracked ? " · متتبَّع مخزنياً" : " · كلفة محاسبية بدون مخزون"}
                </div>
              </div>
              <div className="text-left font-semibold" dir="ltr" data-testid={`cost-${c.sku ?? c.id}`}>
                {formatIqd(c.unitCost)}
              </div>
             </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setOpenEditor(openEditor === c.id ? null : c.id)}
                data-testid={`button-edit-prep-${c.sku ?? c.id}`}
              >
                {openEditor === c.id ? "إخفاء التعديل" : "تعديل وكلفة جديدة"}
              </Button>
              {openEditor === c.id && (
                <PreparationCostEditor
                  materialId={c.id}
                  currentName={c.name}
                  currentBasis={c.calculationBasis}
                  active={c.active}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 + 3. الكراتين ومخزونها
// ═══════════════════════════════════════════════════════════════════════════

function CartonStockDetail({ carton }: { carton: CartonView }) {
  const { data } = useCartonStock(carton.id);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const receive = useReceiveCartons(carton.id);
  const correct = useCorrectCartonStock(carton.id);

  const n = Number(qty);
  const canReceive = Number.isFinite(n) && n > 0 && reason.trim().length >= 3;
  const canCorrect = Number.isFinite(n) && n !== 0 && reason.trim().length >= 3;

  return (
    <div className="space-y-3 border-t pt-3" data-testid={`carton-stock-${carton.id}`}>
      <div className="flex flex-wrap gap-2">
        <Input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="الكمية"
          inputMode="numeric"
          className="w-28"
          dir="ltr"
          data-testid={`input-qty-${carton.id}`}
        />
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="السبب (إجباري)"
          dir="rtl"
          className="min-w-40 flex-1"
          data-testid={`input-reason-${carton.id}`}
        />
        <Button
          size="sm"
          onClick={() => receive.mutate({ quantity: n, reason: reason.trim() })}
          disabled={!canReceive || receive.isPending}
          data-testid={`button-receive-${carton.id}`}
        >
          استلام شراء
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => correct.mutate({ quantity: n, reason: reason.trim() })}
          disabled={!canCorrect || correct.isPending}
          data-testid={`button-correct-${carton.id}`}
        >
          تصحيح يدوي
        </Button>
      </div>

      {data && (
        <div className="text-xs">
          <div className="mb-1 font-semibold">آخر الحركات</div>
          <ul className="space-y-1">
            {data.movements.slice(0, 8).map((m) => (
              <li key={m.id} className="text-muted-foreground flex justify-between gap-3">
                <span>{m.movementType}</span>
                <span dir="ltr">{m.quantity}</span>
                <span className="truncate">{m.sourceDocument ?? ""}</span>
              </li>
            ))}
            {data.movements.length === 0 && <li className="text-muted-foreground">ماكو حركات</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CartonCatalogPanel() {
  const { data, isLoading } = useCartons();
  const [open, setOpen] = useState<string | null>(null);
  const items = data?.items ?? [];

  return (
    <Card dir="rtl" data-testid="panel-cartons">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Boxes className="h-5 w-5" />
          الكراتين ومواد التغليف
        </CardTitle>
        <div className="pt-2">
          <AddCartonForm />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-sm">جاري التحميل…</p>}
        {!isLoading && items.length === 0 && (
          <Alert data-testid="no-cartons-notice">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ماكو كراتين مسجّلة. أدخل قياساتك الحقيقية — النظام ما يخترع ولا كارتونة.
            </AlertDescription>
          </Alert>
        )}

        {items.map((c) => {
          const low = c.lowStockThreshold != null && c.available <= c.lowStockThreshold;
          return (
            <div key={c.id} className="rounded-md border p-3" data-testid={`carton-${c.sku ?? c.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {c.name}
                    {c.sku && (
                      <code className="text-muted-foreground text-xs" dir="ltr">
                        {c.sku}
                      </code>
                    )}
                    {!c.active && <Badge variant="outline">غير نشطة</Badge>}
                    {c.available <= 0 && <Badge variant="destructive">نفد المخزون</Badge>}
                    {low && c.available > 0 && <Badge variant="destructive">مخزون منخفض</Badge>}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    القياس الداخلي {cartonDimsLabel(c)} · أقصى وزن{" "}
                    {c.maxWeightKg == null ? UNKNOWN_LABEL : `${c.maxWeightKg} كغم`} · الكلفة{" "}
                    {formatIqd(c.unitCost)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm" dir="ltr">
                  <span title="على الرف">{c.onHand}</span>
                  <span className="text-muted-foreground" title="محجوز">
                    −{c.reserved}
                  </span>
                  <span className="font-semibold" title="المتاح" data-testid={`available-${c.sku ?? c.id}`}>
                    ={c.available}
                  </span>
                  <span className="text-muted-foreground text-xs" title="حد التنبيه">
                    ⌊{c.lowStockThreshold ?? "—"}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setOpen(open === c.id ? null : c.id)}
                data-testid={`button-toggle-stock-${c.id}`}
              >
                {open === c.id ? "إخفاء المخزون والتعديل" : "المخزون والحركات والتعديل"}
              </Button>
              {open === c.id && (
                <>
                  <CartonStockDetail carton={c} />
                  <CartonEditor cartonId={c.id} active={c.active} current={c} />
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. بيانات تغليف المنتجات — طابور النواقص
// ═══════════════════════════════════════════════════════════════════════════

export function MissingPackingDataPanel() {
  const { data, isLoading } = useMissingPackingData();
  const items = data?.items ?? [];

  return (
    <Card dir="rtl" data-testid="panel-missing-packing">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ruler className="h-5 w-5" />
          بيانات تغليف ناقصة
          {items.length > 0 && <Badge variant="destructive">{items.length}</Badge>}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          المخطط التلقائي ما يشتغل لأي طلب فيه منتج من هذول — وما يخمّن أي قياس.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground text-sm">جاري التحميل…</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm">كل المنتجات عندها بيانات تغليف كاملة.</p>
        )}
        <ul className="space-y-2">
          {items.map((m) => (
            <li
              key={`${m.productId}-${m.variantId ?? ""}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
              data-testid={`missing-${m.productId}`}
            >
              <span className="font-medium">{m.productName}</span>
              <span className="text-muted-foreground text-xs">
                ناقص: {m.missing.map((f) => MISSING_FIELD_LABEL[f] ?? f).join("، ")}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. تنبيهات انخفاض المخزون
// ═══════════════════════════════════════════════════════════════════════════

export function StockAlertsPanel() {
  const { data, isLoading } = useStockAlerts();
  const ack = useAcknowledgeAlert();
  const items = data?.items ?? [];

  return (
    <Card dir="rtl" data-testid="panel-stock-alerts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          تنبيهات مخزون الكراتين
          {items.length > 0 && <Badge variant="destructive">{items.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-muted-foreground text-sm">جاري التحميل…</p>}
        {!isLoading && items.length === 0 && <p className="text-sm">ماكو تنبيهات مفتوحة.</p>}
        {items.map((a) => (
          <Alert
            key={a.id}
            variant={a.alertLevel === "critical" ? "destructive" : "default"}
            data-testid={`alert-${a.id}`}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{a.messageAr}</span>
              <span className="text-xs" dir="ltr">
                on-hand {a.onHandSnapshot ?? "—"} · reserved {a.reservedSnapshot ?? "—"} · available{" "}
                {a.availableSnapshot ?? "—"} · threshold {a.thresholdSnapshot ?? "—"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => ack.mutate(a.id)}
                disabled={Boolean(a.acknowledgedAt) || ack.isPending}
                data-testid={`button-ack-${a.id}`}
              >
                {a.acknowledgedAt ? "مُطّلع عليه" : "اطّلعت"}
              </Button>
            </AlertDescription>
          </Alert>
        ))}
        {items.length > 0 && (
          <p className="text-muted-foreground text-xs">
            التنبيه ينغلق تلقائياً لما المتاح يرتفع فوق الحد — والاطّلاع ما يغلقه.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. تقرير الكراتين التالفة بسبب الطلبات الراجعة
// ═══════════════════════════════════════════════════════════════════════════

export function ReturnCartonLossPanel({ orderId }: { orderId: string }) {
  const { data, isLoading } = useOrderReturnLoss(orderId);
  const rows = data?.rows ?? [];

  return (
    <Card dir="rtl" data-testid="panel-return-loss">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RotateCcw className="h-5 w-5" />
          خسارة التغليف بسبب الإرجاع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-sm">جاري التحميل…</p>}
        {!isLoading && rows.length === 0 && (
          <p className="text-sm">ماكو خسارة تغليف مسجّلة لهذا الطلب.</p>
        )}

        {rows.length > 0 && (
          <>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-md border p-2 text-sm" data-testid={`loss-${r.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.materialNameSnapshot}</span>
                    <span dir="ltr">×{r.quantity}</span>
                    <span className="font-semibold" dir="ltr">
                      {formatIqd(r.originalTotalCostSnapshot == null ? null : Number(r.originalTotalCostSnapshot))}
                    </span>
                    <Badge variant="outline">
                      {r.classificationMode === "automatic" ? "تلقائي" : "تسجيل يدوي"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">{r.reason}</div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between rounded-md border p-2 text-sm font-semibold">
              <span>إجمالي خسارة التغليف</span>
              <span dir="ltr">{formatIqd(data?.orderTotal ?? null)}</span>
            </div>

            {/* The single most important sentence on this screen. */}
            <Alert data-testid="reclassification-notice">
              <AlertDescription className="text-xs">
                هذا المبلغ <strong>إعادة تصنيف</strong> لكلفة اعتُرف بيها أصلاً عند الشحن — ما
                ينخصم من الربح مرة ثانية. الملصق وكارت الشكر رجعوا مع الطلب، ما يُعتبرون تالفين،
                وكلفتهم تبقى ضمن لقطة التجهيز الأصلية.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
