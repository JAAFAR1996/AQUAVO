// ─────────────────────────────────────────────────────────────────────────────
// تجهيز الطلب — the owner-facing draft: a pre-filled suggested packaging profile
// that can be confirmed in a couple of seconds, plus quick manual entry.
//
// Every monetary figure shown here (line totals, expected cost, known subtotal,
// actual cost, variance) is read verbatim from the server response. This file
// performs no arithmetic on money.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  UNKNOWN_LABEL, draftStateLabel, eventTypeLabel, formatQuantity,
} from "@/lib/fulfillment-format";
import {
  useAddCatalogLine, useAddManualLine, useConfirmDraft, useDiscardDraft,
  useFulfillmentMaterials, useFulfillmentReference, useOrderDraft,
  useRemoveDraftLine, useUpdateDraftLine,
  type ConfirmResult, type DraftLineView, type DraftView,
} from "@/hooks/use-fulfillment";
import {
  Amount, CostStatusBadge, EmptyState, ErrorState, LoadingState, SectionCard,
} from "./fulfillment-primitives";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "خطأ غير معروف");
}

/** The server signals a stock shortfall with this domain code. */
function isStockError(err: unknown): boolean {
  return /INSUFFICIENT_STOCK/.test(errorMessage(err));
}

interface QuickAddState {
  category: string;
  label: string;
  materialName: string;
  quantity: string;
  unitCost: string;
}

export function FulfillmentDraftPanel({ orderId }: { orderId: string }) {
  const draftQuery = useOrderDraft(orderId);
  const referenceQuery = useFulfillmentReference();
  const materialsQuery = useFulfillmentMaterials();

  const draft = draftQuery.data;
  const draftId = draft?.id;

  const addManual = useAddManualLine(orderId, draftId);
  const addCatalog = useAddCatalogLine(orderId, draftId);
  const updateLine = useUpdateDraftLine(orderId, draftId);
  const removeLine = useRemoveDraftLine(orderId, draftId);
  const discard = useDiscardDraft(orderId, draftId);
  const confirm = useConfirmDraft(orderId, draftId);

  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null);
  const [catalogId, setCatalogId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [varianceReason, setVarianceReason] = useState("");
  const [stockOverride, setStockOverride] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  const unknownLines = draft?.missingCostLines ?? [];
  const hasUnknownCost = unknownLines.length > 0;

  const materials = materialsQuery.data ?? [];
  const catalogOptions = useMemo(
    () => materials.filter((m) => !draft?.lines.some((l) => l.materialId === m.id)),
    [materials, draft],
  );

  if (draftQuery.isLoading) {
    return <SectionCard title="تجهيز الطلب"><LoadingState label="جاري تحضير المسودة..." /></SectionCard>;
  }
  if (draftQuery.isError) {
    return (
      <SectionCard title="تجهيز الطلب">
        <ErrorState message={errorMessage(draftQuery.error)} onRetry={() => draftQuery.refetch()} />
      </SectionCard>
    );
  }
  if (!draft) {
    return <SectionCard title="تجهيز الطلب"><EmptyState message="لا توجد مسودة تجهيز لهذا الطلب" /></SectionCard>;
  }

  const consumed = draft.state === "consumed";
  const editable = !consumed && draft.state !== "discarded";

  function submitQuickAdd() {
    if (!quickAdd) return;
    const quantity = Number(quickAdd.quantity);
    if (!(quantity > 0)) return;
    const raw = quickAdd.unitCost.trim();
    addManual.mutate(
      {
        materialName: quickAdd.materialName.trim() || quickAdd.label,
        category: quickAdd.category,
        quantity,
        // Empty field means the owner does not know the cost → null, never 0.
        unitCost: raw === "" ? null : Number(raw),
      },
      { onSuccess: () => setQuickAdd(null) },
    );
  }

  function startConfirm() {
    setResult(null);
    setStockOverride(false);
    setConfirmOpen(true);
  }

  function runConfirm(allowNegativeStock: boolean) {
    confirm.mutate(
      {
        varianceReason: varianceReason.trim() ? varianceReason.trim() : undefined,
        allowNegativeStock: allowNegativeStock || undefined,
      },
      {
        onSuccess: (res) => {
          setResult(res);
          setConfirmOpen(false);
          setVarianceReason("");
        },
        onError: (err) => {
          if (isStockError(err)) setStockOverride(true);
        },
      },
    );
  }

  return (
    <SectionCard
      title="تجهيز الطلب"
      action={
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{eventTypeLabel(draft.eventType)}</span>
          <span
            data-testid="draft-state"
            className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
          >
            {draftStateLabel(draft.state)}
          </span>
          <CostStatusBadge status={draft.costStatus} />
        </span>
      }
    >
      {/* البروفايل المقترح + سبب الاقتراح */}
      <div className="mb-3 rounded-lg border border-border/60 bg-muted/40 p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-1">البروفايل المقترح</p>
        <p className="text-sm" data-testid="suggestion-reason">
          {draft.suggestionReason ?? "لا يوجد بروفايل مقترح — أضف المواد يدوياً"}
        </p>
        {draft.profileVersion != null && (
          <p className="mt-1 text-xs text-muted-foreground">نسخة البروفايل: {draft.profileVersion}</p>
        )}
      </div>

      {/* مواد التغليف */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">مواد التغليف</p>
        {draft.lines.length === 0 ? (
          <EmptyState message="لا توجد بنود بعد — أضف مواد التغليف المستخدمة" />
        ) : (
          <ul className="space-y-2" data-testid="draft-lines">
            {draft.lines.map((line) => (
              <DraftLineRow
                key={line.id}
                line={line}
                editable={editable}
                busy={updateLine.isPending || removeLine.isPending}
                onQuantity={(quantity) => updateLine.mutate({ lineId: line.id, quantity })}
                onUnitCost={(unitCost) => updateLine.mutate({ lineId: line.id, unitCost })}
                onRemove={() => removeLine.mutate({ lineId: line.id })}
              />
            ))}
          </ul>
        )}
        {(updateLine.isError || removeLine.isError) && (
          <div className="mt-2">
            <ErrorState message={errorMessage(updateLine.error ?? removeLine.error)} />
          </div>
        )}
      </div>

      {/* الإدخال اليدوي السريع */}
      {editable && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">الإدخال اليدوي السريع</p>
          {referenceQuery.isLoading && <LoadingState label="جاري تحميل التصنيفات..." />}
          {referenceQuery.isError && <ErrorState message={errorMessage(referenceQuery.error)} onRetry={() => referenceQuery.refetch()} />}
          {referenceQuery.data && (
            <div className="flex flex-wrap gap-2" data-testid="quick-add-chips">
              {referenceQuery.data.manualCategories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setQuickAdd({
                    category: c.value, label: c.label, materialName: c.label,
                    quantity: "1", unitCost: "",
                  })}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {quickAdd && (
            <div className="mt-3 rounded-lg border border-border p-3 space-y-2" data-testid="quick-add-form">
              <p className="text-xs font-semibold">إضافة: {quickAdd.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="text-xs text-muted-foreground">
                  الاسم
                  <input
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={quickAdd.materialName}
                    onChange={(e) => setQuickAdd({ ...quickAdd, materialName: e.target.value })}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  الكمية
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={quickAdd.quantity}
                    onChange={(e) => setQuickAdd({ ...quickAdd, quantity: e.target.value })}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  كلفة الوحدة (اتركها فارغة إذا غير معروفة)
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={UNKNOWN_LABEL}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={quickAdd.unitCost}
                    onChange={(e) => setQuickAdd({ ...quickAdd, unitCost: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" size="sm" variant="outline" onClick={() => setQuickAdd(null)}>إلغاء</Button>
                <Button type="button" size="sm" disabled={addManual.isPending} onClick={submitQuickAdd}>
                  {addManual.isPending ? "جاري الإضافة..." : "إضافة البند"}
                </Button>
              </div>
              {addManual.isError && <ErrorState message={errorMessage(addManual.error)} />}
            </div>
          )}

          {/* إضافة من كتالوج المواد */}
          {catalogOptions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-xs text-muted-foreground grow min-w-[12rem]">
                من كتالوج المواد
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  value={catalogId}
                  onChange={(e) => setCatalogId(e.target.value)}
                >
                  <option value="">اختر مادة</option>
                  {catalogOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.approvedCost.unitCost == null ? ` — ${UNKNOWN_LABEL}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!catalogId || addCatalog.isPending}
                onClick={() => addCatalog.mutate(
                  { materialId: catalogId, quantity: 1 },
                  { onSuccess: () => setCatalogId("") },
                )}
              >
                إضافة
              </Button>
              {addCatalog.isError && <ErrorState message={errorMessage(addCatalog.error)} />}
            </div>
          )}
        </div>
      )}

      {/* التكلفة المتوقعة */}
      <div className="rounded-lg border border-border p-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">التكلفة المتوقعة</span>
          <Amount value={draft.expectedCost} testId="expected-cost" />
        </div>
        {draft.expectedCost == null && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-1">
            <span className="text-xs text-muted-foreground">مجموع البنود المعروفة فقط</span>
            <Amount value={draft.knownCostSubtotal} testId="known-subtotal" className="text-sm" />
          </div>
        )}
        {hasUnknownCost && (
          <p
            data-testid="unknown-cost-warning"
            role="status"
            className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            كلفة غير معروفة في: {unknownLines.join("، ")}
          </p>
        )}
      </div>

      {/* التأكيد */}
      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="grow sm:grow-0"
            disabled={draft.lines.length === 0 || confirm.isPending}
            onClick={startConfirm}
            data-testid="confirm-fulfillment"
          >
            {confirm.isPending ? "جاري التأكيد..." : "تأكيد التجهيز"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={discard.isPending}
            onClick={() => discard.mutate()}
          >
            إلغاء المسودة
          </Button>
        </div>
      )}

      {consumed && (
        <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          تم تأكيد هذا التجهيز وتسجيله في الحسابات
        </p>
      )}

      {/* التكلفة الفعلية + فرق التكلفة (من رد الخادم) */}
      {result && (
        <div className="mt-3 rounded-lg border border-border p-3 space-y-1" data-testid="confirm-result">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">التكلفة الفعلية</span>
            <Amount value={result.actualCost} testId="actual-cost" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">فرق التكلفة</span>
            <Amount value={result.variance} testId="variance" variance />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">حالة البيانات</span>
            <CostStatusBadge status={result.costStatus} />
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          draft={draft}
          unknownLines={unknownLines}
          stockOverride={stockOverride}
          pending={confirm.isPending}
          error={confirm.isError ? errorMessage(confirm.error) : null}
          varianceReason={varianceReason}
          onVarianceReason={setVarianceReason}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => runConfirm(stockOverride)}
        />
      )}
    </SectionCard>
  );
}

// ── Line row ────────────────────────────────────────────────────────────────

function DraftLineRow({
  line, editable, busy, onQuantity, onUnitCost, onRemove,
}: {
  line: DraftLineView;
  editable: boolean;
  busy: boolean;
  onQuantity: (q: number) => void;
  onUnitCost: (c: number | null) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [unitCost, setUnitCost] = useState(line.unitCost == null ? "" : String(line.unitCost));

  return (
    <li className="rounded-lg border border-border/70 p-2" data-testid="draft-line">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{line.materialName}</p>
          <p className="text-xs text-muted-foreground">
            {formatQuantity(line.quantity, line.unit)}
            {" · "}
            كلفة الوحدة: <Amount value={line.unitCost} className="text-xs" />
          </p>
          {line.note && <p className="text-xs text-muted-foreground">{line.note}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Amount value={line.totalCost} testId="line-total" className="text-sm" />
          {editable && (
            <>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing((v) => !v)}>
                {editing ? "إغلاق" : "تعديل"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive"
                disabled={busy}
                onClick={onRemove}
              >
                حذف
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && editable && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <label className="text-xs text-muted-foreground">
            الكمية
            <input
              type="number" min="0" step="any"
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            كلفة الوحدة
            <input
              type="number" min="0" step="any"
              placeholder={UNKNOWN_LABEL}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </label>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => {
              const q = Number(quantity);
              if (q > 0 && q !== line.quantity) onQuantity(q);
              const raw = unitCost.trim();
              const next = raw === "" ? null : Number(raw);
              if (next !== line.unitCost) onUnitCost(next);
              setEditing(false);
            }}
          >
            حفظ
          </Button>
        </div>
      )}
    </li>
  );
}

// ── Confirmation dialog ─────────────────────────────────────────────────────

function ConfirmDialog({
  draft, unknownLines, stockOverride, pending, error, varianceReason,
  onVarianceReason, onCancel, onConfirm,
}: {
  draft: DraftView;
  unknownLines: string[];
  stockOverride: boolean;
  pending: boolean;
  error: string | null;
  varianceReason: string;
  onVarianceReason: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="تأكيد التجهيز"
        dir="rtl"
        data-testid="confirm-dialog"
        className="w-full max-w-md space-y-3 rounded-xl border border-border bg-background p-4"
      >
        <h3 className="text-sm font-bold">تأكيد التجهيز</h3>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">التكلفة المتوقعة</span>
          <Amount value={draft.expectedCost} />
        </div>

        {unknownLines.length > 0 && (
          <div
            data-testid="confirm-unknown-warning"
            className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <p className="font-semibold">تحذير: كلفة غير معروفة</p>
            <p>سيتم تسجيل التجهيز بكلفة ناقصة للبنود: {unknownLines.join("، ")}</p>
          </div>
        )}

        {stockOverride && (
          <div
            data-testid="confirm-stock-warning"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive"
          >
            <p className="font-semibold">تحذير: المخزون غير كافٍ</p>
            <p>التأكيد الآن سيجعل رصيد المخزون بالسالب. تابع فقط إذا كنت متأكداً.</p>
          </div>
        )}

        <label className="block text-xs text-muted-foreground">
          سبب الفرق (اختياري)
          <input
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={varianceReason}
            onChange={(e) => onVarianceReason(e.target.value)}
            placeholder="مثال: استخدمنا صندوق أكبر"
          />
        </label>

        {error && !stockOverride && <ErrorState message={error} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
          <Button type="button" size="sm" disabled={pending} onClick={onConfirm} data-testid="confirm-dialog-submit">
            {pending ? "جاري التأكيد..." : stockOverride ? "تأكيد رغم نقص المخزون" : "تأكيد"}
          </Button>
        </div>
      </div>
    </div>
  );
}
