import { useState } from "react";
import { AlertTriangle, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CALCULATION_BASIS_LABEL,
  formatIqd,
} from "@/hooks/use-packaging";
import {
  usePreparationInventory,
  usePreparationInventoryHistory,
  useReceivePreparationMaterial,
  useSetPreparationTracking,
  useStocktakePreparationMaterial,
  type PreparationInventoryItem,
  type PreparationInventoryMovement,
} from "@/hooks/use-preparation-inventory";
import { AddPreparationCostForm, PreparationCostEditor } from "./packaging-forms";

function errorText(value: unknown): string {
  return value instanceof Error ? value.message : String(value ?? "خطأ غير معروف");
}

function movementLabel(movement: PreparationInventoryMovement): string {
  if (movement.sourceDocument) return movement.sourceDocument;
  switch (movement.movementType) {
    case "fulfillment_usage": return "استهلاك تجهيز طلب";
    case "purchase_receipt": return "استلام مخزون";
    case "correction": return "تصحيح / جرد مخزون";
    case "reversal": return "عكس تجهيز قبل الشحن";
    case "return_to_stock": return "إرجاع للمخزون";
    case "damage_waste": return "تالف / هدر";
    default: return movement.movementType;
  }
}

function signedQuantity(quantity: number): string {
  return `${quantity > 0 ? "+" : ""}${quantity}`;
}

function MovementHistory({ material }: { material: PreparationInventoryItem }) {
  const { data, isLoading, isError, error } = usePreparationInventoryHistory(material.id);
  if (isLoading) return <p className="text-xs text-muted-foreground">جاري تحميل سجل الحركات…</p>;
  if (isError) return <p className="text-xs text-destructive">{errorText(error)}</p>;
  const movements = data?.movements ?? [];
  return (
    <div className="rounded-md border p-3" data-testid={`prep-movements-${material.id}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">سجل الحركات</span>
        <span className="text-xs text-muted-foreground">الرصيد الدفتري: {data?.balance ?? material.stockBalance}</span>
      </div>
      {movements.length === 0 ? (
        <p className="text-xs text-muted-foreground">ماكو حركات مخزون لهذه المادة بعد.</p>
      ) : (
        <ul className="space-y-2">
          {movements.map((movement) => (
            <li key={movement.id} className="rounded border border-border/60 px-2 py-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-medium">{movementLabel(movement)}</span>
                  <span className="text-muted-foreground">
                    {new Date(movement.createdAt).toLocaleString("ar-IQ")}
                    {movement.recordedBy ? ` · بواسطة ${movement.recordedBy}` : ""}
                  </span>
                </span>
                <span dir="ltr" className={movement.quantity < 0 ? "font-semibold text-destructive" : "font-semibold"}>
                  {signedQuantity(movement.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EnableTracking({ material, onDone }: { material: PreparationInventoryItem; onDone: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [reason, setReason] = useState("جرد افتتاحي عند تفعيل تتبع المخزون");
  const tracking = useSetPreparationTracking(material.id);
  const q = Number(quantity);
  const thresholdValue = threshold.trim() === "" ? null : Number(threshold);
  const valid = Number.isFinite(q) && q >= 0 &&
    (thresholdValue === null || (Number.isFinite(thresholdValue) && thresholdValue >= 0)) &&
    reason.trim().length >= 3;

  return (
    <div className="rounded-md border border-dashed p-3 space-y-2" data-testid={`enable-tracking-${material.id}`}>
      <p className="text-xs font-semibold">تفعيل تتبع مخزون هذه المادة</p>
      <p className="text-xs text-muted-foreground">
        أدخل الكمية الفعلية الموجودة الآن. النظام يسجل فرق الجرد كحركة ولا يكتب فوق الرصيد.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">
          الكمية الحالية
          <Input
            type="number" min="0" step="any" dir="ltr"
            value={quantity} onChange={(e) => setQuantity(e.target.value)}
            placeholder="مثال: 500"
            data-testid={`tracking-quantity-${material.id}`}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          حد التنبيه (اختياري)
          <Input
            type="number" min="0" step="any" dir="ltr"
            value={threshold} onChange={(e) => setThreshold(e.target.value)}
            placeholder="مثال: 50"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          السبب
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
      <Button
        size="sm"
        disabled={!valid || tracking.isPending}
        onClick={() => tracking.mutateTracking({
          enabled: true,
          currentQuantity: q,
          lowStockThreshold: thresholdValue,
          reason: reason.trim(),
        }, { onSuccess: onDone })}
        data-testid={`button-enable-tracking-${material.id}`}
      >
        {tracking.isPending ? "جاري الحفظ…" : "تفعيل التتبع وحفظ الكمية"}
      </Button>
      {tracking.isError && <p className="text-xs text-destructive">{errorText(tracking.error)}</p>}
    </div>
  );
}

function TrackedStockControls({ material }: { material: PreparationInventoryItem }) {
  const [stocktakeQty, setStocktakeQty] = useState(String(material.stockBalance));
  const [stocktakeReason, setStocktakeReason] = useState("جرد فعلي");
  const [receiveQty, setReceiveQty] = useState("");
  const [receiveReason, setReceiveReason] = useState("استلام مخزون جديد");
  const [disableReason, setDisableReason] = useState("إيقاف تتبع مخزون المادة");
  const stocktake = useStocktakePreparationMaterial(material.id);
  const receive = useReceivePreparationMaterial(material.id);
  const tracking = useSetPreparationTracking(material.id);

  const target = Number(stocktakeQty);
  const incoming = Number(receiveQty);
  const canStocktake = Number.isFinite(target) && target >= 0 && stocktakeReason.trim().length >= 3;
  const canReceive = Number.isFinite(incoming) && incoming > 0 && receiveReason.trim().length >= 3;

  return (
    <div className="space-y-3" data-testid={`tracked-controls-${material.id}`}>
      <div className="rounded-md border p-3 space-y-2">
        <p className="text-xs font-semibold">جرد / تحديد الكمية الحالية</p>
        <p className="text-xs text-muted-foreground">
          اكتب العدد الموجود فعلياً الآن. إذا الرصيد 120 وكتبت 100، يسجل النظام حركة -20.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-32" type="number" min="0" step="any" dir="ltr"
            value={stocktakeQty} onChange={(e) => setStocktakeQty(e.target.value)}
            data-testid={`stocktake-quantity-${material.id}`}
          />
          <Input
            className="min-w-48 flex-1" value={stocktakeReason}
            onChange={(e) => setStocktakeReason(e.target.value)} placeholder="سبب الجرد"
          />
          <Button
            size="sm" variant="outline"
            disabled={!canStocktake || stocktake.isPending}
            onClick={() => stocktake.mutateStocktake({ quantity: target, reason: stocktakeReason.trim() })}
            data-testid={`button-stocktake-${material.id}`}
          >
            {stocktake.isPending ? "جاري الجرد…" : "تثبيت الجرد"}
          </Button>
        </div>
        {stocktake.isError && <p className="text-xs text-destructive">{errorText(stocktake.error)}</p>}
      </div>

      <div className="rounded-md border p-3 space-y-2">
        <p className="text-xs font-semibold">إضافة مخزون</p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-32" type="number" min="0" step="any" dir="ltr"
            value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)}
            placeholder="مثال: 1000"
            data-testid={`receive-quantity-${material.id}`}
          />
          <Input
            className="min-w-48 flex-1" value={receiveReason}
            onChange={(e) => setReceiveReason(e.target.value)} placeholder="مصدر / سبب الاستلام"
          />
          <Button
            size="sm"
            disabled={!canReceive || receive.isPending}
            onClick={() => receive.mutateReceive(
              { quantity: incoming, reason: receiveReason.trim() },
              { onSuccess: () => setReceiveQty("") },
            )}
            data-testid={`button-receive-prep-${material.id}`}
          >
            {receive.isPending ? "جاري الإضافة…" : "إضافة مخزون"}
          </Button>
        </div>
        {receive.isError && <p className="text-xs text-destructive">{errorText(receive.error)}</p>}
      </div>

      <div className="rounded-md border p-3 space-y-2">
        <p className="text-xs font-semibold">متابعة المخزون</p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-48 flex-1" value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)} placeholder="سبب إيقاف التتبع"
          />
          <Button
            size="sm" variant="outline"
            disabled={disableReason.trim().length < 3 || tracking.isPending}
            onClick={() => tracking.mutateTracking({ enabled: false, reason: disableReason.trim() })}
          >
            إيقاف التتبع
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          إيقاف التتبع لا يمسح سجل الحركات. إذا فعلته لاحقاً سيطلب منك جرداً فعلياً جديداً.
        </p>
        {tracking.isError && <p className="text-xs text-destructive">{errorText(tracking.error)}</p>}
      </div>
    </div>
  );
}

function MaterialInventoryCard({ material }: { material: PreparationInventoryItem }) {
  const [openEditor, setOpenEditor] = useState(false);
  const [openStock, setOpenStock] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const low = material.stockTracked && material.lowStockThreshold != null &&
    material.stockBalance <= material.lowStockThreshold;
  const basis = CALCULATION_BASIS_LABEL[
    material.calculationBasis as keyof typeof CALCULATION_BASIS_LABEL
  ] ?? material.calculationBasis;

  return (
    <div className="rounded-md border p-3 space-y-3" data-testid={`preparation-inventory-${material.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span>{material.name}</span>
            {material.sku && <code className="text-xs text-muted-foreground" dir="ltr">{material.sku}</code>}
            {!material.active && <Badge variant="outline">معطّل</Badge>}
            {material.archivedAt && <Badge variant="secondary">مؤرشف</Badge>}
            <Badge variant={material.stockTracked ? "default" : "outline"}>
              متابعة المخزون: {material.stockTracked ? "نعم" : "لا"}
            </Badge>
            {low && <Badge variant="destructive"><AlertTriangle className="ml-1 h-3 w-3" />مخزون منخفض</Badge>}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{basis}</div>
        </div>
        <div className="grid min-w-52 grid-cols-2 gap-x-5 gap-y-1 text-sm">
          <span className="text-muted-foreground">كلفة الوحدة</span>
          <span className="text-left font-semibold" dir="ltr">{formatIqd(material.unitCost)}</span>
          <span className="text-muted-foreground">الرصيد الحالي</span>
          <span className="text-left font-semibold" dir="ltr" data-testid={`prep-balance-${material.id}`}>
            {material.stockBalance}
          </span>
          <span className="text-muted-foreground">حد التنبيه</span>
          <span className="text-left" dir="ltr">{material.lowStockThreshold ?? "—"}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpenStock((v) => !v)}>
          {openStock ? "إخفاء إدارة المخزون" : "جرد / إدارة المخزون"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? "إخفاء سجل الحركات" : "سجل الحركات"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpenEditor((v) => !v)}>
          {openEditor ? "إخفاء تعديل الكلفة" : "تعديل وكلفة جديدة"}
        </Button>
      </div>

      {openStock && (
        material.stockTracked
          ? <TrackedStockControls material={material} />
          : <EnableTracking material={material} onDone={() => setOpenStock(true)} />
      )}
      {showHistory && <MovementHistory material={material} />}
      {openEditor && (
        <PreparationCostEditor
          materialId={material.id}
          currentName={material.name}
          currentBasis={material.calculationBasis as keyof typeof CALCULATION_BASIS_LABEL}
          active={material.active}
        />
      )}
    </div>
  );
}

export function PreparationInventoryPanel() {
  const { data, isLoading, isError, error } = usePreparationInventory();
  const items = data?.items ?? [];

  return (
    <Card dir="rtl" data-testid="panel-preparation-inventory">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageOpen className="h-5 w-5" />
          مواد تجهيز الطلب ومخزونها
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          الكلفة تُحسب مرة واحدة على مستوى تجهيز الطلب. المخزون كمية مستقلة ويُخصم فقط للمواد التي فعلت لها التتبع.
        </p>
        <div className="pt-2"><AddPreparationCostForm /></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">جاري التحميل…</p>}
        {isError && <p className="text-sm text-destructive">{errorText(error)}</p>}
        {!isLoading && !isError && items.length === 0 && (
          <p className="text-sm text-muted-foreground">ماكو مواد تجهيز مسجّلة.</p>
        )}
        {items.map((material) => <MaterialInventoryCard key={material.id} material={material} />)}
      </CardContent>
    </Card>
  );
}
