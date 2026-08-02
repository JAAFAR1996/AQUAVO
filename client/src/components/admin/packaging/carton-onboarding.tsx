import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Box, CheckCircle2, PackagePlus } from "lucide-react";
import {
  formatIqd,
  useCartons,
  useSetupCarton,
  type CartonSetupInput,
  type CartonView,
} from "@/hooks/use-packaging";
import { translateError } from "./packaging-forms";

interface FormState {
  name: string;
  sku: string;
  notes: string;
  internalLengthCm: string;
  internalWidthCm: string;
  internalHeightCm: string;
  maxWeightKg: string;
  lowStockThreshold: string;
  openingQuantity: string;
  unitCostIqd: string;
  costEffectiveDate: string;
  costSource: string;
}

function initialState(): FormState {
  return {
    name: "",
    sku: "",
    notes: "",
    internalLengthCm: "",
    internalWidthCm: "",
    internalHeightCm: "",
    maxWeightKg: "",
    lowStockThreshold: "0",
    openingQuantity: "0",
    unitCostIqd: "",
    costEffectiveDate: new Date().toISOString().slice(0, 10),
    costSource: "",
  };
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function toPayload(form: FormState, idempotencyKey: string): CartonSetupInput {
  return {
    name: form.name.trim(),
    sku: form.sku.trim().toUpperCase(),
    notes: form.notes.trim() || undefined,
    internalLengthCm: Number(form.internalLengthCm),
    internalWidthCm: Number(form.internalWidthCm),
    internalHeightCm: Number(form.internalHeightCm),
    maxWeightKg: Number(form.maxWeightKg),
    lowStockThreshold: Number(form.lowStockThreshold),
    openingQuantity: Number(form.openingQuantity),
    unitCostIqd: Number(form.unitCostIqd),
    costEffectiveDate: form.costEffectiveDate,
    costSource: form.costSource.trim(),
    idempotencyKey,
  };
}

function validate(form: FormState): string | null {
  if (form.name.trim().length < 2) return "اكتب اسم الكارتونة.";
  if (!form.sku.trim()) return "اكتب رمز الكارتونة.";
  const positive = [
    [form.internalLengthCm, "الطول الداخلي"],
    [form.internalWidthCm, "العرض الداخلي"],
    [form.internalHeightCm, "الارتفاع الداخلي"],
    [form.maxWeightKg, "أقصى وزن"],
  ] as const;
  for (const [raw, label] of positive) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return label + " يجب أن يكون أكبر من صفر.";
  }
  const integers = [
    [form.lowStockThreshold, "حد تنبيه المخزون"],
    [form.openingQuantity, "العدد المتوفر"],
    [form.unitCostIqd, "كلفة الوحدة"],
  ] as const;
  for (const [raw, label] of integers) {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) return label + " يجب أن يكون عدداً صحيحاً غير سالب.";
  }
  if (!form.costEffectiveDate) return "اختر تاريخ بدء الكلفة.";
  if (form.costSource.trim().length < 3) return "اكتب ملاحظة أو مصدر الكلفة.";
  return null;
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
  inputMode,
  dir,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  step?: string;
  inputMode?: "numeric" | "decimal";
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        min={min}
        step={step}
        inputMode={inputMode}
        dir={dir}
        className="w-full min-w-0"
        data-testid={id}
      />
    </div>
  );
}

export function CartonOnboardingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const [clientError, setClientError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const setup = useSetupCarton();

  const payload = idempotencyKey ? toPayload(form, idempotencyKey) : null;
  const set = (key: keyof FormState) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  function resetAndClose(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setForm(initialState());
      setStep("form");
      setClientError(null);
      setIdempotencyKey(null);
      setup.reset();
    }
  }

  function review() {
    const error = validate(form);
    setClientError(error);
    if (error) return;
    if (!idempotencyKey) setIdempotencyKey(createIdempotencyKey());
    setStep("review");
  }

  function save() {
    if (!payload) return;
    setup.mutate(payload, { onSuccess: () => setStep("success") });
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent dir="rtl" className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "success" ? "تم إعداد الكارتونة" : "إضافة كارتونة جديدة"}</DialogTitle>
          <DialogDescription>
            {step === "review"
              ? "راجع المعلومات قبل الحفظ. لن يُحفظ أي جزء إذا فشلت العملية."
              : "سجّل النوع والقياسات والعدد والكلفة من مكان واحد."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6" data-testid="carton-onboarding-form">
            <section className="space-y-3">
              <h3 className="font-semibold">معلومات الكارتونة</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="carton-name" label="اسم الكارتونة" value={form.name} onChange={set("name")} />
                <Field id="carton-sku" label="الرمز SKU" value={form.sku} onChange={set("sku")} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carton-notes">ملاحظات اختيارية</Label>
                <Textarea id="carton-notes" value={form.notes} onChange={(event) => set("notes")(event.target.value)} rows={2} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">القياسات الداخلية</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id="carton-length" label="الطول الداخلي (سم)" value={form.internalLengthCm} onChange={set("internalLengthCm")} type="number" min="0.01" step="0.01" inputMode="decimal" />
                <Field id="carton-width" label="العرض الداخلي (سم)" value={form.internalWidthCm} onChange={set("internalWidthCm")} type="number" min="0.01" step="0.01" inputMode="decimal" />
                <Field id="carton-height" label="الارتفاع الداخلي (سم)" value={form.internalHeightCm} onChange={set("internalHeightCm")} type="number" min="0.01" step="0.01" inputMode="decimal" />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">الأمان</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="carton-max-weight" label="أقصى وزن مسموح (كغم)" value={form.maxWeightKg} onChange={set("maxWeightKg")} type="number" min="0.01" step="0.01" inputMode="decimal" />
                <Field id="carton-threshold" label="حد تنبيه المخزون" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} type="number" min="0" step="1" inputMode="numeric" />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">المخزون الحالي</h3>
              <Field id="carton-opening-quantity" label="العدد المتوفر حالياً" value={form.openingQuantity} onChange={set("openingQuantity")} type="number" min="0" step="1" inputMode="numeric" />
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">الكلفة</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="carton-unit-cost" label="كلفة الكارتونة الواحدة (د.ع)" value={form.unitCostIqd} onChange={set("unitCostIqd")} type="number" min="0" step="1" inputMode="numeric" />
                <Field id="carton-cost-date" label="تاريخ بدء الكلفة" value={form.costEffectiveDate} onChange={set("costEffectiveDate")} type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carton-cost-source">ملاحظة أو مصدر الكلفة</Label>
                <Textarea id="carton-cost-source" value={form.costSource} onChange={(event) => set("costSource")(event.target.value)} rows={2} />
              </div>
            </section>

            {clientError && (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{clientError}</AlertDescription></Alert>
            )}
          </div>
        )}

        {step === "review" && payload && (
          <div className="space-y-4" data-testid="carton-onboarding-review">
            <ReviewRow label="الاسم والرمز" value={payload.name + " — " + payload.sku} />
            <ReviewRow label="القياسات الداخلية" value={payload.internalLengthCm + " × " + payload.internalWidthCm + " × " + payload.internalHeightCm + " سم"} />
            <ReviewRow label="أقصى وزن" value={payload.maxWeightKg + " كغم"} />
            <ReviewRow label="العدد المتوفر" value={String(payload.openingQuantity)} />
            <ReviewRow label="حد التنبيه" value={String(payload.lowStockThreshold)} />
            <ReviewRow label="كلفة الوحدة" value={formatIqd(payload.unitCostIqd)} />
            <ReviewRow label="تاريخ بدء الكلفة" value={payload.costEffectiveDate} />
            {setup.error && (
              <Alert variant="destructive"><AlertDescription>{translateError(setup.error instanceof Error ? setup.error.message : String(setup.error))}</AlertDescription></Alert>
            )}
          </div>
        )}

        {step === "success" && (
          <Alert data-testid="carton-onboarding-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <p>تم إنشاء الكارتونة.</p>
              <p>تم تسجيل العدد المتوفر.</p>
              <p>تم تسجيل كلفة الوحدة وتاريخ سريانها.</p>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          {step === "form" && <Button onClick={review} data-testid="button-review-carton">مراجعة قبل الحفظ</Button>}
          {step === "review" && (
            <>
              <Button onClick={save} disabled={setup.isPending} data-testid="button-save-carton-setup">
                {setup.isPending ? "جاري الحفظ…" : "تأكيد وحفظ"}
              </Button>
              <Button variant="outline" onClick={() => setStep("form")} disabled={setup.isPending}>رجوع للتعديل</Button>
            </>
          )}
          {step === "success" && <Button onClick={() => resetAndClose(false)}>إغلاق</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="break-words text-sm">{value}</strong>
    </div>
  );
}

function cartonStatus(carton: CartonView): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (carton.available <= 0) return { label: "نافد", variant: "destructive" };
  if (carton.lowStockThreshold != null && carton.available <= carton.lowStockThreshold) {
    return { label: "منخفض", variant: "secondary" };
  }
  return { label: "متوفر", variant: "default" };
}

export function CartonWorkspace({ onOpenImport }: { onOpenImport: () => void }) {
  const { data, isLoading, error } = useCartons();
  const [dialogOpen, setDialogOpen] = useState(false);
  const cartons = data?.items ?? [];
  const summary = useMemo(() => ({
    types: cartons.length,
    onHand: cartons.reduce((sum, carton) => sum + carton.onHand, 0),
    low: cartons.filter((carton) => carton.available > 0 && carton.lowStockThreshold != null && carton.available <= carton.lowStockThreshold).length,
    out: cartons.filter((carton) => carton.available <= 0).length,
  }), [cartons]);

  return (
    <div className="space-y-4" dir="rtl" data-testid="carton-workspace">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">التغليف والكراتين</h2>
          <p className="text-sm text-muted-foreground">المخزون مأخوذ من دفتر الحركات بعد طرح الحجوزات النشطة.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto" data-testid="button-add-carton-primary">
          <PackagePlus className="ml-2 h-4 w-4" />إضافة كارتونة جديدة
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="أنواع الكراتين" value={summary.types} />
        <SummaryCard label="إجمالي الكراتين المتوفرة" value={summary.onHand} />
        <SummaryCard label="كراتين وصلت حد التنبيه" value={summary.low} />
        <SummaryCard label="كراتين نفد مخزونها" value={summary.out} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">جاري تحميل الكراتين…</p>}
      {error && <Alert variant="destructive"><AlertDescription>تعذر تحميل مخزون الكراتين.</AlertDescription></Alert>}

      {!isLoading && !error && cartons.length === 0 && (
        <Card data-testid="empty-cartons-state">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Box className="h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-bold">ماكو كراتين مسجلة بعد</h3>
            <p className="max-w-lg text-sm text-muted-foreground">أضف أول نوع كارتونة وسجّل قياسها وكلفتها والعدد المتوفر عندك.</p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button onClick={() => setDialogOpen(true)}>إضافة أول كارتونة</Button>
              <Button variant="outline" onClick={onOpenImport}>استيراد بيانات من ملف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cartons.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {cartons.map((carton) => {
            const status = cartonStatus(carton);
            return (
              <Card key={carton.id} data-testid={"carton-card-" + carton.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><CardTitle className="text-base">{carton.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground" dir="ltr">{carton.sku ?? "—"}</p></div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                  <Value label="القياسات الداخلية" value={carton.internalLengthCm + " × " + carton.internalWidthCm + " × " + carton.internalHeightCm + " سم"} />
                  <Value label="الموجود فعلياً" value={String(carton.onHand)} />
                  <Value label="المحجوز للطلبات" value={String(carton.reserved)} />
                  <Value label="المتاح فعلياً" value={String(carton.available)} strong />
                  <Value label="حد التنبيه" value={carton.lowStockThreshold == null ? "غير محدد" : String(carton.lowStockThreshold)} />
                  <Value label="كلفة الوحدة الفعالة" value={formatIqd(carton.unitCost)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CartonOnboardingDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>;
}

function Value({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="rounded-md bg-muted/40 p-2"><div className="text-xs text-muted-foreground">{label}</div><div className={strong ? "mt-1 font-bold" : "mt-1"}>{value}</div></div>;
}
