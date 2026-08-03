import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addCsrfHeader } from "@/lib/csrf";

const money = z.coerce.number();
const uploadedEvidenceSchema = z.object({
  url: z.string().url(), objectKey: z.string(), storageProvider: z.string(),
  sha256: z.string(), originalName: z.string(), mimeType: z.string(), size: z.number(),
});
const expenseSchema = z.object({
  id: z.string(), category: z.string(), amount: money, description: z.string().nullable().optional(),
  expense_date: z.string(), accounting_status: z.string(), tax_treatment: z.string(),
});
const expensesSchema = z.object({ periodKey: z.string(), items: z.array(expenseSchema) });
const positionSchema = z.object({
  id: z.string(), position_type: z.string(), amount: money,
  delivery_company_name: z.string().nullable().optional(), note: z.string().nullable().optional(),
});
const positionsSchema = z.object({ periodKey: z.string(), items: z.array(positionSchema) });
const fixedItemSchema = z.object({
  id: z.string(), name: z.string(), current_unit_cost: money, quantity: money,
  line_cost: money, version: z.coerce.number(), expected_cost: money.nullable(),
});
const fixedItemsSchema = z.object({ items: z.array(fixedItemSchema) });

type UploadedEvidence = z.infer<typeof uploadedEvidenceSchema>;
type EvidenceMode = "owner_confirmation" | "electronic_attachment";
type PositionType = "cash" | "bank" | "supplier_payable" | "other_receivable";
const formatIqd = (value: number) => `${Math.round(value).toLocaleString("en-US")} د.ع`;
const inputStyle = { background: "#071720", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 9px" } as const;
const buttonStyle = { background: "#0B93A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 13px", cursor: "pointer", fontWeight: 700 } as const;
const hintStyle = { color: "#94a3b8", fontSize: 12, lineHeight: 1.65 } as const;

async function parseResponse(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.message === "string" ? data.message : "فشلت العملية");
  return data;
}
async function uploadEvidence(file: File): Promise<UploadedEvidence> {
  const form = new FormData();
  form.append("document", file);
  return uploadedEvidenceSchema.parse(await parseResponse(await fetch("/api/upload/accounting-evidence", {
    method: "POST", credentials: "include", headers: addCsrfHeader({}), body: form,
  })));
}
async function evidencePayload(mode: EvidenceMode, file: File | null, note: string) {
  if (mode === "electronic_attachment") {
    if (!file) throw new Error("اختر الفاتورة أو الوصل الإلكتروني");
    return uploadEvidence(file);
  }
  if (note.trim().length < 5) throw new Error("اكتب ملاحظة داخلية قصيرة تشرح المصروف");
  return { mode: "owner_confirmation" as const, note: note.trim() };
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
    <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>{title}</h3>{children}
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>{label}{children}</label>;
}
const POSITION_LABELS: Record<PositionType, string> = {
  cash: "النقد الموجود بالصندوق",
  bank: "الرصيد البنكي الفعلي",
  supplier_payable: "الدين الفعلي للموردين",
  other_receivable: "مبالغ لك عند جهات أخرى",
};

export function FinanceAccountingOperationsLiteV2({ periodKey }: { periodKey: string }) {
  const qc = useQueryClient();
  const [expenseId, setExpenseId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [paymentSource, setPaymentSource] = useState<"cash" | "bank" | "owner_personal">("cash");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [taxTreatment, setTaxTreatment] = useState<"pending" | "deductible" | "nondeductible">("pending");
  const [expenseEvidenceMode, setExpenseEvidenceMode] = useState<EvidenceMode>("owner_confirmation");
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [expenseEvidenceNote, setExpenseEvidenceNote] = useState("");

  const [positionType, setPositionType] = useState<PositionType>("cash");
  const [positionAmount, setPositionAmount] = useState("");
  const [positionNote, setPositionNote] = useState("");

  const [fixedItemName, setFixedItemName] = useState("");
  const [fixedItemCost, setFixedItemCost] = useState("");
  const [fixedItemQuantity, setFixedItemQuantity] = useState("1");
  const [fixedItemNote, setFixedItemNote] = useState("");

  const expenses = useQuery({
    queryKey: ["accounting-v2-pending-expenses", periodKey],
    queryFn: async () => expensesSchema.parse(await parseResponse(await fetch(
      `/api/admin/accounting/v2/expenses/pending?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))), retry: false,
  });
  const positions = useQuery({
    queryKey: ["accounting-v2-monthly-positions", periodKey],
    queryFn: async () => positionsSchema.parse(await parseResponse(await fetch(
      `/api/admin/accounting/v2/monthly-positions?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))), retry: false,
  });
  const fixedItems = useQuery({
    queryKey: ["accounting-v2-fixed-preparation-items"],
    queryFn: async () => fixedItemsSchema.parse(await parseResponse(await fetch(
      "/api/admin/accounting/v2/fixed-preparation-items", { credentials: "include" },
    ))), retry: false,
  });

  const nonCarrierPositions = useMemo(() => (positions.data?.items ?? []).filter(
    (item) => item.position_type !== "carrier_receivable",
  ), [positions.data]);
  const fixedTotal = (fixedItems.data?.items ?? []).reduce((sum, item) => sum + item.line_cost, 0);

  const verifyExpense = useMutation({
    mutationFn: async () => {
      if (!expenseId) throw new Error("اختر المصروف");
      if (vendorName.trim().length < 2) throw new Error("اكتب اسم الجهة أو المورد");
      if (businessPurpose.trim().length < 5) throw new Error("اكتب الغرض التجاري للمصروف");
      const evidence = await evidencePayload(expenseEvidenceMode, expenseFile, expenseEvidenceNote);
      return parseResponse(await fetch(`/api/admin/accounting/v2/expenses/${expenseId}/verify`, {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          vendorName: vendorName.trim(), documentNumber: documentNumber || undefined,
          documentDate: documentDate || undefined, paymentMethod: paymentSource,
          businessPurpose: businessPurpose.trim(), taxTreatment, evidence,
        }),
      }));
    },
    onSuccess: async () => {
      setExpenseId(""); setVendorName(""); setDocumentNumber(""); setDocumentDate("");
      setBusinessPurpose(""); setExpenseFile(null); setExpenseEvidenceNote("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accounting-v2-pending-expenses", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-register", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-readiness", periodKey] }),
      ]);
    },
  });

  const savePosition = useMutation({
    mutationFn: async () => {
      const amount = Number(positionAmount);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("أدخل المبلغ الفعلي الصحيح");
      if (positionNote.trim().length < 3) throw new Error("اكتب ملاحظة قصيرة عن طريقة التأكد");
      return parseResponse(await fetch("/api/admin/accounting/v2/monthly-positions", {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          periodKey, positionType, amount, grossAmount: 0, feeAmount: 0, note: positionNote.trim(),
        }),
      }));
    },
    onSuccess: async () => {
      setPositionAmount(""); setPositionNote("");
      await qc.invalidateQueries({ queryKey: ["accounting-v2-monthly-positions", periodKey] });
    },
  });

  const addFixedItem = useMutation({
    mutationFn: async () => {
      const cost = Number(fixedItemCost);
      const quantity = Number(fixedItemQuantity);
      if (fixedItemName.trim().length < 2) throw new Error("اكتب اسم البند");
      if (!Number.isFinite(cost) || cost < 0) throw new Error("أدخل كلفة صحيحة");
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("أدخل كمية صحيحة");
      if (fixedItemNote.trim().length < 3) throw new Error("اكتب سبب الإضافة");
      return parseResponse(await fetch("/api/admin/accounting/v2/fixed-preparation-items", {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: fixedItemName.trim(), unitCost: cost, quantity, note: fixedItemNote.trim() }),
      }));
    },
    onSuccess: async () => {
      setFixedItemName(""); setFixedItemCost(""); setFixedItemQuantity("1"); setFixedItemNote("");
      await qc.invalidateQueries({ queryKey: ["accounting-v2-fixed-preparation-items"] });
    },
  });

  const error = expenses.error ?? positions.error ?? fixedItems.error
    ?? verifyExpense.error ?? savePosition.error ?? addFixedItem.error;

  return (
    <section style={{ display: "grid", gap: 14 }} data-testid="accounting-operations-lite-v2">
      <div>
        <h2 style={{ color: "#fff", fontSize: 17, margin: 0 }}>المطابقة الفعلية والمصاريف</h2>
        <p style={hintStyle}>الإدخال اليدوي بقي فقط لما يحتاج مشاهدة بشرية فعلية: عدّ الصندوق، كشف البنك، دين المورد أو مستند المصروف. حسابات شركات التوصيل صارت تلقائية.</p>
      </div>
      {error ? <div role="alert" style={{ background: "#450a0a", color: "#fecaca", padding: 10, borderRadius: 8 }}>{error instanceof Error ? error.message : "حدث خطأ"}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14 }}>
        <Panel title="اعتماد مصروف">
          <p style={hintStyle}>المصروف يُسجل أولاً، ثم يُعتمد هنا مع اسم الجهة والغرض التجاري ومصدر الدفع. الملف اختياري والتأكيد الداخلي يبقى موسوماً بوضوح.</p>
          <Field label="المصروف"><select style={inputStyle} value={expenseId} onChange={(event) => setExpenseId(event.target.value)}><option value="">اختر...</option>{(expenses.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.category} — {formatIqd(item.amount)} — {item.description ?? "بدون وصف"}</option>)}</select></Field>
          <Field label="اسم الجهة أو المورد"><input style={inputStyle} value={vendorName} onChange={(event) => setVendorName(event.target.value)} /></Field>
          <Field label="رقم المستند — اختياري"><input style={inputStyle} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} /></Field>
          <Field label="تاريخ المستند — اختياري"><input type="date" style={inputStyle} value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} /></Field>
          <Field label="مصدر الدفع"><select style={inputStyle} value={paymentSource} onChange={(event) => setPaymentSource(event.target.value as typeof paymentSource)}><option value="cash">صندوق AQUAVO</option><option value="bank">الحساب البنكي</option><option value="owner_personal">دفعه المالك شخصياً</option></select></Field>
          <Field label="الغرض التجاري"><input style={inputStyle} value={businessPurpose} onChange={(event) => setBusinessPurpose(event.target.value)} /></Field>
          <Field label="المعاملة الضريبية"><select style={inputStyle} value={taxTreatment} onChange={(event) => setTaxTreatment(event.target.value as typeof taxTreatment)}><option value="pending">يحددها المحاسب لاحقاً</option><option value="deductible">قابل للخصم مبدئياً</option><option value="nondeductible">غير قابل للخصم</option></select></Field>
          <Field label="طريقة الإثبات"><select style={inputStyle} value={expenseEvidenceMode} onChange={(event) => setExpenseEvidenceMode(event.target.value as EvidenceMode)}><option value="owner_confirmation">تأكيد داخلي — بدون ملف</option><option value="electronic_attachment">صورة / PDF</option></select></Field>
          {expenseEvidenceMode === "electronic_attachment" ? <Field label="الفاتورة أو الوصل"><input type="file" accept="image/*,application/pdf" onChange={(event) => setExpenseFile(event.target.files?.[0] ?? null)} /></Field> : null}
          <Field label="ملاحظة الإثبات"><textarea style={inputStyle} value={expenseEvidenceNote} onChange={(event) => setExpenseEvidenceNote(event.target.value)} /></Field>
          <button style={buttonStyle} disabled={verifyExpense.isPending} onClick={() => verifyExpense.mutate()}>{verifyExpense.isPending ? "جاري الاعتماد..." : "اعتماد المصروف"}</button>
        </Panel>

        <Panel title={`الأرصدة الفعلية — ${periodKey}`}>
          <p style={hintStyle}>هذه ليست مبيعات ولا أرباح. أدخلها فقط عند المطابقة الشهرية لأن النظام لا يستطيع عدّ النقد أو قراءة كشف بنك غير مربوط.</p>
          <div style={{ display: "grid", gap: 6 }}>
            {nonCarrierPositions.map((item) => (
              <div key={item.id} style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 8, color: "#cbd5e1", fontSize: 12 }}>
                {POSITION_LABELS[item.position_type as PositionType] ?? item.position_type}: <strong>{formatIqd(item.amount)}</strong>
              </div>
            ))}
          </div>
          <Field label="نوع الرصيد"><select style={inputStyle} value={positionType} onChange={(event) => setPositionType(event.target.value as PositionType)}><option value="cash">النقد الموجود بالصندوق</option><option value="bank">الرصيد البنكي الفعلي</option><option value="supplier_payable">الدين الفعلي للموردين</option><option value="other_receivable">مبلغ لك عند جهة أخرى</option></select></Field>
          <Field label="المبلغ"><input type="number" min="0" style={inputStyle} value={positionAmount} onChange={(event) => setPositionAmount(event.target.value)} /></Field>
          <Field label="كيف تأكدت؟"><textarea style={inputStyle} value={positionNote} onChange={(event) => setPositionNote(event.target.value)} placeholder="مثال: عدّيت النقد الموجود نهاية الشهر" /></Field>
          <button style={buttonStyle} disabled={savePosition.isPending} onClick={() => savePosition.mutate()}>حفظ المطابقة</button>
        </Panel>

        <Panel title="الإضافات الثابتة لكل طلب">
          <p style={hintStyle}>الكلفة الحالية للطلبات القادمة: {formatIqd(fixedTotal)}. الصندوق يبقى حسب الكرتون الفعلي؛ إضافة بند تنشئ نسخة جديدة ولا تغيّر الطلبات القديمة.</p>
          <div style={{ display: "grid", gap: 6 }}>
            {(fixedItems.data?.items ?? []).map((item) => <div key={item.id} style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 8, color: "#cbd5e1", fontSize: 12 }}>{item.name}: {formatIqd(item.current_unit_cost)} × {item.quantity} = <strong>{formatIqd(item.line_cost)}</strong></div>)}
          </div>
          <Field label="اسم بند جديد"><input style={inputStyle} value={fixedItemName} onChange={(event) => setFixedItemName(event.target.value)} /></Field>
          <Field label="كلفة الوحدة"><input type="number" min="0" style={inputStyle} value={fixedItemCost} onChange={(event) => setFixedItemCost(event.target.value)} /></Field>
          <Field label="الكمية لكل طلب"><input type="number" min="0.01" step="0.01" style={inputStyle} value={fixedItemQuantity} onChange={(event) => setFixedItemQuantity(event.target.value)} /></Field>
          <Field label="سبب الإضافة"><textarea style={inputStyle} value={fixedItemNote} onChange={(event) => setFixedItemNote(event.target.value)} /></Field>
          <button style={buttonStyle} disabled={addFixedItem.isPending} onClick={() => addFixedItem.mutate()}>إضافة للطلبات القادمة</button>
        </Panel>
      </div>
    </section>
  );
}
