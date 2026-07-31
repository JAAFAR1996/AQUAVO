// Data-entry forms for the carton system, all RTL Arabic.
//
// These exist because the owner has no cartons and no packing dimensions yet,
// and the system refuses to invent either. Every field here is something only
// the owner can know: a real measured dimension, a real purchase price, a real
// counted quantity.
//
// Two rules the forms enforce rather than merely suggest:
//
//   * a cost is never typed straight onto a material. It is PROPOSED and then
//     APPROVED, so the effective-dated approval trail exists and a later price
//     change is prospective instead of rewriting what old orders were charged;
//   * nothing audited is destructively deleted. Retiring is `active = false`,
//     removing is `archived_at`.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CALCULATION_BASIS_LABEL,
  formatIqd,
  useApproveMaterialCost,
  useCreateCarton,
  useCreatePreparationCost,
  useMaterialCosts,
  useProposeMaterialCost,
  useUpdateCarton,
  useUpdatePreparationCost,
  useArchivePreparationCost,
  type CalculationBasis,
} from "@/hooks/use-packaging";

/** Server-side reasonSchema is min 3 chars; mirror it so the button explains itself. */
const MIN_REASON = 3;

function useReason() {
  const [reason, setReason] = useState("");
  return { reason, setReason, ok: reason.trim().length >= MIN_REASON };
}

function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <Alert variant="destructive" className="mt-2" data-testid="form-error">
      {/* Domain codes are translated; a raw SQL string must never reach the owner. */}
      <AlertDescription className="text-xs">{translateError(msg)}</AlertDescription>
    </Alert>
  );
}

export function translateError(raw: string): string {
  const s = raw.toUpperCase();
  if (s.includes("INSUFFICIENT_CARTON_STOCK")) return "ماكو كراتين كافية بالمخزون لهذا الطلب.";
  if (s.includes("VALIDATION_INVALID")) return "في حقل ناقص أو قيمة غير مقبولة — راجع المدخلات.";
  if (s.includes("MATERIAL_NOT_FOUND")) return "المادة مو موجودة.";
  if (s.includes("DRAFT_NOT_FOUND")) return "مسودة الاستيراد مو موجودة.";
  if (s.includes("DUPLICATE") || s.includes("UNIQUE")) return "هذا الرمز مستعمل من قبل — اختر رمز ثاني.";
  if (s.includes("RESERVATION_NOT_FOUND")) return "ماكو حجز مسجّل لهذا الطلب.";
  if (s.includes("NO_CARTONS_REQUESTED")) return "ماكو كراتين مطلوبة بهذه العملية.";
  return "ما زبطت العملية. جرّب مرة ثانية، وإذا تكررت راجع المسؤول التقني.";
}

// ═══════════════════════════════════════════════════════════════════════════
// A. إضافة مادة تجهيز
// ═══════════════════════════════════════════════════════════════════════════

export function AddPreparationCostForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [basis, setBasis] = useState<CalculationBasis>("per_order");
  const [notes, setNotes] = useState("");
  const create = useCreatePreparationCost();

  const canSave = name.trim().length >= 2 && !create.isPending;

  function save() {
    create.mutate(
      {
        name: name.trim(),
        sku: sku.trim() ? sku.trim() : undefined,
        calculationBasis: basis,
        notes: notes.trim() ? notes.trim() : undefined,
      },
      {
        onSuccess: () => {
          setName(""); setSku(""); setNotes(""); setBasis("per_order"); setOpen(false);
        },
      },
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="button-add-preparation-cost">
        إضافة مادة تجهيز
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3" data-testid="form-add-preparation-cost">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="prep-name">اسم المادة</Label>
          <Input
            id="prep-name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: شريط لاصق" data-testid="input-prep-name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="prep-sku">الرمز (اختياري)</Label>
          <Input
            id="prep-sku" value={sku} onChange={(e) => setSku(e.target.value)}
            dir="ltr" placeholder="TAPE" data-testid="input-prep-sku"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>أساس الاحتساب</Label>
        <Select value={basis} onValueChange={(v) => setBasis(v as CalculationBasis)}>
          <SelectTrigger data-testid="select-prep-basis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CALCULATION_BASIS_LABEL) as CalculationBasis[]).map((b) => (
              <SelectItem key={b} value={b}>{CALCULATION_BASIS_LABEL[b]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          «مرة واحدة لكل طلب» يعني تنحسب مرة وحدة مهما كان عدد الكراتين.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="prep-notes">ملاحظات (اختياري)</Label>
        <Textarea
          id="prep-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2} data-testid="input-prep-notes"
        />
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          الكلفة ما تنحط هنا. بعد ما تضيف المادة، سجّل كلفتها من «كلفة جديدة» حتى
          يبقى عندها سجل اعتماد وتاريخ سريان.
        </AlertDescription>
      </Alert>

      <ErrorNote error={create.error} />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={!canSave} data-testid="button-save-preparation-cost">
          {create.isPending ? "جاري الحفظ…" : "حفظ"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// A2. تعديل مادة تجهيز + كلفة جديدة
// ═══════════════════════════════════════════════════════════════════════════

export function PreparationCostEditor({
  materialId, currentName, currentBasis, active,
}: {
  materialId: string;
  currentName: string;
  currentBasis: CalculationBasis;
  active: boolean;
}) {
  const [name, setName] = useState(currentName);
  const [basis, setBasis] = useState<CalculationBasis>(currentBasis);
  const { reason, setReason, ok } = useReason();
  const update = useUpdatePreparationCost(materialId);
  const archive = useArchivePreparationCost(materialId);

  return (
    <div className="space-y-3 border-t pt-3" data-testid={`editor-prep-${materialId}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>الاسم</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} data-testid={`input-edit-name-${materialId}`} />
        </div>
        <div className="space-y-1">
          <Label>أساس الاحتساب</Label>
          <Select value={basis} onValueChange={(v) => setBasis(v as CalculationBasis)}>
            <SelectTrigger data-testid={`select-edit-basis-${materialId}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CALCULATION_BASIS_LABEL) as CalculationBasis[]).map((b) => (
                <SelectItem key={b} value={b}>{CALCULATION_BASIS_LABEL[b]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>سبب التعديل (إجباري)</Label>
        <Input
          value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="ليش تغيّر؟" data-testid={`input-edit-reason-${materialId}`}
        />
      </div>

      <ErrorNote error={update.error ?? archive.error} />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!ok || update.isPending}
          onClick={() => update.mutate({ name: name.trim(), calculationBasis: basis, reason: reason.trim() })}
          data-testid={`button-save-edit-${materialId}`}
        >
          حفظ التعديل
        </Button>
        <Button
          size="sm" variant="outline"
          disabled={!ok || update.isPending}
          onClick={() => update.mutate({ active: !active, reason: reason.trim() })}
          data-testid={`button-toggle-active-${materialId}`}
        >
          {active ? "تعطيل" : "تفعيل"}
        </Button>
        <Button
          size="sm" variant="outline"
          disabled={!ok || archive.isPending}
          onClick={() => {
            // Archive is the destructive-looking action, so it is the only one
            // that confirms. It is still non-destructive underneath.
            if (window.confirm("أرشفة المادة؟ راح تنشال من الاستعمال بس سجلها المحاسبي يبقى محفوظ.")) {
              archive.mutate({ reason: reason.trim() });
            }
          }}
          data-testid={`button-archive-${materialId}`}
        >
          أرشفة
        </Button>
      </div>

      <MaterialCostEditor materialId={materialId} />
    </div>
  );
}

/**
 * Propose-then-approve, shown as one panel because to the owner it is one act.
 * Kept as two server calls because the approval is what makes the cost effective
 * and auditable.
 */
export function MaterialCostEditor({ materialId }: { materialId: string }) {
  const { data, isLoading } = useMaterialCosts(materialId);
  const [cost, setCost] = useState("");
  const { reason, setReason, ok } = useReason();
  const propose = useProposeMaterialCost(materialId);
  const approve = useApproveMaterialCost(materialId);

  const n = Number(cost);
  const costValid = cost.trim() !== "" && Number.isFinite(n) && n >= 0;
  const pending = (data?.history ?? []).filter((r) => r.approvalStatus === "pending");

  return (
    <div className="space-y-2 rounded-md border p-3" data-testid={`cost-editor-${materialId}`}>
      <div className="text-sm font-semibold">كلفة جديدة</div>
      <p className="text-muted-foreground text-xs">
        الكلفة الجديدة تسري على الطلبات الجاية فقط. الطلبات المجهّزة سابقاً تحتفظ
        بكلفتها الأصلية ولا تتأثر.
      </p>

      <div className="flex flex-wrap gap-2">
        <Input
          value={cost} onChange={(e) => setCost(e.target.value)}
          placeholder="الكلفة بالدينار" inputMode="decimal" dir="ltr" className="w-40"
          data-testid={`input-new-cost-${materialId}`}
        />
        <Input
          value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="السبب / المصدر (إجباري)" className="min-w-40 flex-1"
          data-testid={`input-cost-reason-${materialId}`}
        />
        <Button
          size="sm"
          disabled={!costValid || !ok || propose.isPending}
          onClick={() => propose.mutate({ unitCost: n, reason: reason.trim() }, { onSuccess: () => setCost("") })}
          data-testid={`button-propose-cost-${materialId}`}
        >
          {propose.isPending ? "جاري…" : "اقتراح كلفة"}
        </Button>
      </div>

      <ErrorNote error={propose.error ?? approve.error} />

      {isLoading && <p className="text-muted-foreground text-xs">جاري تحميل سجل الكلف…</p>}

      {pending.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold">بانتظار الاعتماد</div>
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs"
              data-testid={`pending-cost-${r.id}`}
            >
              <span dir="ltr">{formatIqd(r.unitCost == null ? null : Number(r.unitCost))}</span>
              <span className="text-muted-foreground truncate">{r.reason}</span>
              <Button
                size="sm" variant="outline"
                disabled={approve.isPending}
                onClick={() => approve.mutate({ recordId: r.id })}
                data-testid={`button-approve-cost-${r.id}`}
              >
                اعتماد
              </Button>
            </div>
          ))}
          <p className="text-muted-foreground text-xs">
            الكلفة ما تصير فعّالة قبل الاعتماد — قبله تبقى «غير معروفة».
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// B. إضافة كارتونة
// ═══════════════════════════════════════════════════════════════════════════

const NUM_FIELDS = [
  { key: "internalLengthCm", label: "الطول الداخلي (سم)" },
  { key: "internalWidthCm", label: "العرض الداخلي (سم)" },
  { key: "internalHeightCm", label: "الارتفاع الداخلي (سم)" },
  { key: "maxWeightKg", label: "أقصى وزن (كغم)" },
] as const;

export function AddCartonForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [nums, setNums] = useState<Record<string, string>>({});
  const [threshold, setThreshold] = useState("");
  const [notes, setNotes] = useState("");
  const create = useCreateCarton();

  const parsed = NUM_FIELDS.map((f) => Number(nums[f.key]));
  const allNumsOk = parsed.every((v) => Number.isFinite(v) && v > 0);
  const canSave = name.trim().length >= 2 && sku.trim().length >= 2 && allNumsOk && !create.isPending;

  function save() {
    create.mutate(
      {
        name: name.trim(),
        sku: sku.trim(),
        internalLengthCm: Number(nums.internalLengthCm),
        internalWidthCm: Number(nums.internalWidthCm),
        internalHeightCm: Number(nums.internalHeightCm),
        maxWeightKg: Number(nums.maxWeightKg),
        lowStockThreshold: threshold.trim() ? Number(threshold) : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      },
      { onSuccess: () => { setName(""); setSku(""); setNums({}); setThreshold(""); setNotes(""); setOpen(false); } },
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="button-add-carton">
        إضافة كارتونة
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3" data-testid="form-add-carton">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="carton-name">اسم الكارتونة</Label>
          <Input id="carton-name" value={name} onChange={(e) => setName(e.target.value)}
                 placeholder="مثلاً: كارتونة وسط" data-testid="input-carton-name" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="carton-sku">الرمز</Label>
          <Input id="carton-sku" value={sku} onChange={(e) => setSku(e.target.value)}
                 dir="ltr" placeholder="BOX-M" data-testid="input-carton-sku" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {NUM_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={`carton-${f.key}`}>{f.label}</Label>
            <Input
              id={`carton-${f.key}`} dir="ltr" inputMode="decimal"
              value={nums[f.key] ?? ""}
              onChange={(e) => setNums((p) => ({ ...p, [f.key]: e.target.value }))}
              data-testid={`input-carton-${f.key}`}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="carton-threshold">حد التنبيه (اختياري)</Label>
          <Input id="carton-threshold" dir="ltr" inputMode="numeric" value={threshold}
                 onChange={(e) => setThreshold(e.target.value)} data-testid="input-carton-threshold" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="carton-notes">ملاحظات (اختياري)</Label>
          <Input id="carton-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                 data-testid="input-carton-notes" />
        </div>
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          القياسات لازم تكون <strong>داخلية</strong> — المساحة اللي تنحط بيها البضاعة فعلاً.
          الكلفة والمخزون ينضافون بعد الحفظ، وما ينحطون تخمين.
        </AlertDescription>
      </Alert>

      <ErrorNote error={create.error} />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={!canSave} data-testid="button-save-carton">
          {create.isPending ? "جاري الحفظ…" : "حفظ الكارتونة"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// B2. تعديل كارتونة (قياسات، وزن، حد التنبيه، تفعيل) + كلفتها
// ═══════════════════════════════════════════════════════════════════════════

export function CartonEditor({
  cartonId, active, current,
}: {
  cartonId: string;
  active: boolean;
  current: {
    internalLengthCm: number | null;
    internalWidthCm: number | null;
    internalHeightCm: number | null;
    maxWeightKg: number | null;
    lowStockThreshold: number | null;
  };
}) {
  const [nums, setNums] = useState<Record<string, string>>({
    internalLengthCm: current.internalLengthCm?.toString() ?? "",
    internalWidthCm: current.internalWidthCm?.toString() ?? "",
    internalHeightCm: current.internalHeightCm?.toString() ?? "",
    maxWeightKg: current.maxWeightKg?.toString() ?? "",
    lowStockThreshold: current.lowStockThreshold?.toString() ?? "",
  });
  const { reason, setReason, ok } = useReason();
  const update = useUpdateCarton(cartonId);

  function patch() {
    const body: Record<string, unknown> = { reason: reason.trim() };
    for (const k of ["internalLengthCm", "internalWidthCm", "internalHeightCm", "maxWeightKg", "lowStockThreshold"]) {
      const v = nums[k];
      // An emptied field means "leave it alone", not "set it to zero".
      if (v != null && v.trim() !== "" && Number.isFinite(Number(v))) body[k] = Number(v);
    }
    update.mutate(body as never);
  }

  return (
    <div className="space-y-3 border-t pt-3" data-testid={`editor-carton-${cartonId}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        {[...NUM_FIELDS, { key: "lowStockThreshold", label: "حد التنبيه" } as const].map((f) => (
          <div key={f.key} className="space-y-1">
            <Label>{f.label}</Label>
            <Input
              dir="ltr" inputMode="decimal" value={nums[f.key] ?? ""}
              onChange={(e) => setNums((p) => ({ ...p, [f.key]: e.target.value }))}
              data-testid={`input-edit-carton-${f.key}-${cartonId}`}
            />
          </div>
        ))}
      </div>

      <Input
        value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="سبب التعديل (إجباري)" data-testid={`input-carton-reason-${cartonId}`}
      />

      <ErrorNote error={update.error} />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={patch} disabled={!ok || update.isPending}
                data-testid={`button-save-carton-${cartonId}`}>
          حفظ التعديل
        </Button>
        <Button
          size="sm" variant="outline" disabled={!ok || update.isPending}
          onClick={() => update.mutate({ active: !active, reason: reason.trim() })}
          data-testid={`button-carton-active-${cartonId}`}
        >
          {active ? "تعطيل الكارتونة" : "تفعيل الكارتونة"}
        </Button>
      </div>

      <MaterialCostEditor materialId={cartonId} />
    </div>
  );
}
