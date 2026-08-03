import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addCsrfHeader } from "@/lib/csrf";

const money = z.coerce.number();
const uploadedEvidenceSchema = z.object({
  url: z.string().url(), objectKey: z.string(), storageProvider: z.string(),
  sha256: z.string(), originalName: z.string(), mimeType: z.string(), size: z.number(),
});
const candidateSchema = z.object({
  order_id: z.string(), order_number: z.string().nullable().optional(), carrier: z.string().nullable().optional(),
  recognized_at: z.string(), gross_collected: money, carrier_fee: money, merchant_net: money,
});
const candidatesSchema = z.object({ periodKey: z.string(), items: z.array(candidateSchema) });
const expenseSchema = z.object({
  id: z.string(), category: z.string(), amount: money, description: z.string().nullable().optional(),
  expense_date: z.string(), accounting_status: z.string(), tax_treatment: z.string(),
});
const expensesSchema = z.object({ periodKey: z.string(), items: z.array(expenseSchema) });
const companySchema = z.object({
  id: z.string(), company_key: z.string(), name: z.string(), default_fee: money,
  active: z.boolean(), is_default: z.boolean(), notes: z.string().nullable().optional(),
});
const companiesSchema = z.object({ items: z.array(companySchema) });
const positionSchema = z.object({
  id: z.string(), position_type: z.string(), delivery_company_id: z.string().nullable().optional(),
  delivery_company_name: z.string().nullable().optional(), amount: money, gross_amount: money,
  fee_amount: money, evidence_mode: z.string(), note: z.string().nullable().optional(),
});
const positionsSchema = z.object({ periodKey: z.string(), items: z.array(positionSchema) });
const fixedItemSchema = z.object({
  id: z.string(), name: z.string(), current_unit_cost: money, quantity: money,
  line_cost: money, version: z.coerce.number(), expected_cost: money.nullable(),
});
const fixedItemsSchema = z.object({ items: z.array(fixedItemSchema) });

type UploadedEvidence = z.infer<typeof uploadedEvidenceSchema>;
type EvidenceMode = "owner_confirmation" | "electronic_attachment";
type PositionType = "cash" | "bank" | "carrier_receivable" | "supplier_payable" | "other_receivable";
const formatIqd = (value: number) => `${Math.round(value).toLocaleString("en-US")} د.ع`;

async function parseResponse(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.message === "string" ? data.message : "فشلت العملية");
  return data;
}

async function uploadEvidence(file: File): Promise<UploadedEvidence> {
  const form = new FormData();
  form.append("document", file);
  const response = await fetch("/api/upload/accounting-evidence", {
    method: "POST", credentials: "include", headers: addCsrfHeader({}), body: form,
  });
  return uploadedEvidenceSchema.parse(await parseResponse(response));
}

async function evidencePayload(mode: EvidenceMode, file: File | null, note: string, label: string) {
  if (mode === "electronic_attachment") {
    if (!file) throw new Error(`اختر ${label} الإلكتروني`);
    return uploadEvidence(file);
  }
  if (note.trim().length < 5) throw new Error("اكتب ملاحظة داخلية قصيرة تشرح العملية");
  return { mode: "owner_confirmation" as const, note: note.trim() };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>{label}{children}</label>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
    <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>{title}</h3>{children}
  </div>;
}
const inputStyle = { background: "#071720", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 9px" } as const;
const buttonStyle = { background: "#0B93A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 13px", cursor: "pointer", fontWeight: 700 } as const;
const secondaryButtonStyle = { ...buttonStyle, background: "#17334d", border: "1px solid #315477" } as const;
const hintStyle = { color: "#94a3b8", fontSize: 12, lineHeight: 1.65 } as const;

export function FinanceAccountingOperationsV2({ periodKey }: { periodKey: string }) {
  const qc = useQueryClient();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [settlementNumber, setSettlementNumber] = useState("");
  const [settlementCompanyId, setSettlementCompanyId] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [settlementEvidenceMode, setSettlementEvidenceMode] = useState<EvidenceMode>("owner_confirmation");
  const [settlementFile, setSettlementFile] = useState<File | null>(null);
  const [settlementNote, setSettlementNote] = useState("");

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

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyFee, setNewCompanyFee] = useState("5000");
  const [newCompanyDefault, setNewCompanyDefault] = useState(false);

  const [positionType, setPositionType] = useState<PositionType>("cash");
  const [positionAmount, setPositionAmount] = useState("");
  const [positionGross, setPositionGross] = useState("");
  const [positionFee, setPositionFee] = useState("");
  const [positionCompanyId, setPositionCompanyId] = useState("");
  const [positionNote, setPositionNote] = useState("");

  const [fixedItemName, setFixedItemName] = useState("");
  const [fixedItemCost, setFixedItemCost] = useState("");
  const [fixedItemQuantity, setFixedItemQuantity] = useState("1");
  const [fixedItemNote, setFixedItemNote] = useState("");

  const candidates = useQuery({
    queryKey: ["accounting-v2-settlement-candidates", periodKey],
    queryFn: async () => candidatesSchema.parse(await parseResponse(await fetch(
      `/api/admin/accounting/v2/settlements/candidates?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))), retry: false,
  });
  const expenses = useQuery({
    queryKey: ["accounting-v2-pending-expenses", periodKey],
    queryFn: async () => expensesSchema.parse(await parseResponse(await fetch(
      `/api/admin/accounting/v2/expenses/pending?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))), retry: false,
  });
  const companies = useQuery({
    queryKey: ["accounting-v2-delivery-companies"],
    queryFn: async () => companiesSchema.parse(await parseResponse(await fetch(
      "/api/admin/accounting/v2/delivery-companies", { credentials: "include" },
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

  useEffect(() => {
    const defaultCompany = companies.data?.items.find((item) => item.active && item.is_default);
    if (!settlementCompanyId && defaultCompany) setSettlementCompanyId(defaultCompany.id);
    if (!positionCompanyId && defaultCompany) setPositionCompanyId(defaultCompany.id);
  }, [companies.data, positionCompanyId, settlementCompanyId]);

  const activeCompanies = (companies.data?.items ?? []).filter((item) => item.active);
  const totals = useMemo(() => (candidates.data?.items ?? [])
    .filter((item) => selectedOrders.includes(item.order_id))
    .reduce((acc, item) => ({ gross: acc.gross + item.gross_collected, fees: acc.fees + item.carrier_fee, net: acc.net + item.merchant_net }), { gross: 0, fees: 0, net: 0 }),
  [candidates.data, selectedOrders]);
  const positionNet = Math.max((Number(positionGross) || 0) - (Number(positionFee) || 0), 0);
  const fixedTotal = (fixedItems.data?.items ?? []).reduce((sum, item) => sum + item.line_cost, 0);

  const settle = useMutation({
    mutationFn: async () => {
      if (!selectedOrders.length) throw new Error("اختر طلباً واحداً على الأقل");
      if (!settlementCompanyId) throw new Error("اختر شركة التوصيل");
      if (!receivedAt) throw new Error("حدد وقت استلام التسوية");
      const evidence = await evidencePayload(settlementEvidenceMode, settlementFile, settlementNote, "كشف الشركة أو السكرينشوت");
      return parseResponse(await fetch("/api/admin/accounting/v2/settlements", {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          settlementNumber: settlementNumber || undefined, deliveryCompanyId: settlementCompanyId,
          receivedAt: new Date(receivedAt).toISOString(), notes: settlementNote || undefined,
          orderIds: selectedOrders, evidence,
        }),
      }));
    },
    onSuccess: async () => {
      setSelectedOrders([]); setSettlementNumber(""); setReceivedAt(""); setSettlementFile(null); setSettlementNote("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accounting-v2-settlement-candidates", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-register", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-readiness", periodKey] }),
      ]);
    },
  });

  const verifyExpense = useMutation({
    mutationFn: async () => {
      if (!expenseId) throw new Error("اختر المصروف");
      if (vendorName.trim().length < 2) throw new Error("اكتب اسم الجهة أو المورد");
      if (businessPurpose.trim().length < 5) throw new Error("اكتب الغرض التجاري للمصروف");
      const evidence = await evidencePayload(expenseEvidenceMode, expenseFile, expenseEvidenceNote, "الفاتورة أو الوصل الإلكتروني");
      return parseResponse(await fetch(`/api/admin/accounting/v2/expenses/${expenseId}/verify`, {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          vendorName, documentNumber: documentNumber || undefined, documentDate: documentDate || undefined,
          paymentMethod: paymentSource, businessPurpose, taxTreatment, evidence,
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

  const addCompany = useMutation({
    mutationFn: async () => parseResponse(await fetch("/api/admin/accounting/v2/delivery-companies", {
      method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: newCompanyName, defaultFee: Number(newCompanyFee), makeDefault: newCompanyDefault }),
    })),
    onSuccess: async () => {
      setNewCompanyName(""); setNewCompanyFee("5000"); setNewCompanyDefault(false);
      await qc.invalidateQueries({ queryKey: ["accounting-v2-delivery-companies"] });
    },
  });
  const makeDefaultCompany = useMutation({
    mutationFn: async (id: string) => parseResponse(await fetch(`/api/admin/accounting/v2/delivery-companies/${id}/default`, {
      method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }), body: "{}",
    })),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["accounting-v2-delivery-companies"] }),
  });

  const savePosition = useMutation({
    mutationFn: async () => {
      const carrierPosition = positionType === "carrier_receivable";
      const amount = carrierPosition ? positionNet : Number(positionAmount);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("أدخل مبلغاً صحيحاً");
      if (positionNote.trim().length < 3) throw new Error("اكتب ملاحظة قصيرة عن مصدر الرصيد");
      return parseResponse(await fetch("/api/admin/accounting/v2/monthly-positions", {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          periodKey, positionType, deliveryCompanyId: carrierPosition ? positionCompanyId : undefined,
          amount, grossAmount: carrierPosition ? Number(positionGross) : 0,
          feeAmount: carrierPosition ? Number(positionFee) : 0, note: positionNote,
        }),
      }));
    },
    onSuccess: async () => {
      setPositionAmount(""); setPositionGross(""); setPositionFee(""); setPositionNote("");
      await qc.invalidateQueries({ queryKey: ["accounting-v2-monthly-positions", periodKey] });
    },
  });

  const addFixedItem = useMutation({
    mutationFn: async () => parseResponse(await fetch("/api/admin/accounting/v2/fixed-preparation-items", {
      method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        name: fixedItemName, unitCost: Number(fixedItemCost), quantity: Number(fixedItemQuantity), note: fixedItemNote,
      }),
    })),
    onSuccess: async () => {
      setFixedItemName(""); setFixedItemCost(""); setFixedItemQuantity("1"); setFixedItemNote("");
      await qc.invalidateQueries({ queryKey: ["accounting-v2-fixed-preparation-items"] });
    },
  });

  const operationError = settle.error ?? verifyExpense.error ?? addCompany.error ?? makeDefaultCompany.error
    ?? savePosition.error ?? addFixedItem.error ?? candidates.error ?? expenses.error ?? companies.error
    ?? positions.error ?? fixedItems.error;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <h2 style={{ color: "#fff", fontSize: 17, margin: 0 }}>المطابقة والإعدادات المحاسبية</h2>
      {operationError ? <div role="alert" style={{ background: "#450a0a", color: "#fecaca", padding: 10, borderRadius: 8 }}>{operationError instanceof Error ? operationError.message : "حدث خطأ"}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14 }}>
        <Panel title="تسوية شركة التوصيل">
          <p style={hintStyle}>السكرينشوت أو PDF مفيد لكنه مو إجباري. عند عدم وجود ملف اختار «تأكيد داخلي» واكتب شنو استلمت.</p>
          <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
            {(candidates.data?.items ?? []).map((item) => (
              <label key={item.order_id} style={{ display: "flex", gap: 8, alignItems: "center", color: "#cbd5e1", fontSize: 12, padding: 7, border: "1px solid #172554", borderRadius: 7 }}>
                <input type="checkbox" checked={selectedOrders.includes(item.order_id)} onChange={(event) => setSelectedOrders((current) => event.target.checked ? [...current, item.order_id] : current.filter((id) => id !== item.order_id))} />
                <span>{item.order_number ?? item.order_id.slice(0, 8)} — {item.carrier ?? "غير محددة"} — {formatIqd(item.gross_collected)} إجمالي / {formatIqd(item.merchant_net)} صافي</span>
              </label>
            ))}
            {candidates.data?.items.length === 0 ? <span style={hintStyle}>ماكو طلبات معلقة عند شركة التوصيل.</span> : null}
          </div>
          <div style={{ color: "#a7f3d0", fontSize: 12 }}>المختار: إجمالي {formatIqd(totals.gross)} — أجور {formatIqd(totals.fees)} — صافي {formatIqd(totals.net)}</div>
          <Field label="شركة التوصيل"><select style={inputStyle} value={settlementCompanyId} onChange={(e) => setSettlementCompanyId(e.target.value)}><option value="">اختر...</option>{activeCompanies.map((item) => <option key={item.id} value={item.id}>{item.name} — {formatIqd(item.default_fee)}{item.is_default ? " — الافتراضية" : ""}</option>)}</select></Field>
          <Field label="رقم الكشف — اختياري"><input style={inputStyle} value={settlementNumber} onChange={(e) => setSettlementNumber(e.target.value)} placeholder="النظام يولد رقماً إذا تركته فارغاً" /></Field>
          <Field label="وقت استلام الصافي"><input type="datetime-local" style={inputStyle} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} /></Field>
          <Field label="طريقة الإثبات"><select style={inputStyle} value={settlementEvidenceMode} onChange={(e) => setSettlementEvidenceMode(e.target.value as EvidenceMode)}><option value="owner_confirmation">تأكيد داخلي — بدون ملف</option><option value="electronic_attachment">سكرينشوت / صورة / PDF</option></select></Field>
          {settlementEvidenceMode === "electronic_attachment" ? <Field label="الكشف الإلكتروني"><input type="file" accept="image/*,application/pdf" onChange={(e) => setSettlementFile(e.target.files?.[0] ?? null)} /></Field> : null}
          <Field label="ملاحظة العملية"><textarea style={inputStyle} value={settlementNote} onChange={(e) => setSettlementNote(e.target.value)} placeholder="مثال: استلمت الصافي نقداً من مندوب الوسيط" /></Field>
          <button style={buttonStyle} disabled={settle.isPending} onClick={() => settle.mutate()}>{settle.isPending ? "جاري المطابقة..." : "تسجيل ومطابقة التسوية"}</button>
        </Panel>

        <Panel title="اعتماد مصروف">
          <p style={hintStyle}>المستند الإلكتروني يشمل فاتورة PDF، سكرينشوت تحويل، رسالة مورد، إيصال إلكتروني أو صورة وصل. عند عدم توفره استخدم تأكيداً داخلياً، وسيظهر للمحاسب كدليل داخلي فقط.</p>
          <Field label="المصروف"><select style={inputStyle} value={expenseId} onChange={(e) => setExpenseId(e.target.value)}><option value="">اختر...</option>{(expenses.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.category} — {formatIqd(item.amount)} — {item.description ?? "بدون وصف"}</option>)}</select></Field>
          <Field label="اسم الجهة/المورد"><input style={inputStyle} value={vendorName} onChange={(e) => setVendorName(e.target.value)} /></Field>
          <Field label="رقم الفاتورة — اختياري"><input style={inputStyle} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} /></Field>
          <Field label="تاريخ المستند — اختياري"><input type="date" style={inputStyle} value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} /></Field>
          <Field label="مصدر الدفع"><select style={inputStyle} value={paymentSource} onChange={(e) => setPaymentSource(e.target.value as typeof paymentSource)}><option value="cash">صندوق AQUAVO</option><option value="bank">الحساب البنكي</option><option value="owner_personal">دفعه المالك شخصياً — رأس مال</option></select></Field>
          <Field label="الغرض التجاري"><input style={inputStyle} value={businessPurpose} onChange={(e) => setBusinessPurpose(e.target.value)} /></Field>
          <Field label="المعاملة الضريبية"><select style={inputStyle} value={taxTreatment} onChange={(e) => setTaxTreatment(e.target.value as typeof taxTreatment)}><option value="pending">يحددها المحاسب لاحقاً</option><option value="deductible">قابل للخصم مبدئياً</option><option value="nondeductible">غير قابل للخصم</option></select></Field>
          <Field label="طريقة الإثبات"><select style={inputStyle} value={expenseEvidenceMode} onChange={(e) => setExpenseEvidenceMode(e.target.value as EvidenceMode)}><option value="owner_confirmation">تأكيد داخلي — بدون ملف</option><option value="electronic_attachment">ملف إلكتروني</option></select></Field>
          {expenseEvidenceMode === "electronic_attachment" ? <Field label="الفاتورة أو الوصل الإلكتروني"><input type="file" accept="image/*,application/pdf" onChange={(e) => setExpenseFile(e.target.files?.[0] ?? null)} /></Field> : null}
          <Field label="ملاحظة الإثبات"><textarea style={inputStyle} value={expenseEvidenceNote} onChange={(e) => setExpenseEvidenceNote(e.target.value)} placeholder="اكتب شنو دفعت ولمن وليش" /></Field>
          <button style={buttonStyle} disabled={verifyExpense.isPending} onClick={() => verifyExpense.mutate()}>{verifyExpense.isPending ? "جاري الاعتماد..." : "اعتماد المصروف"}</button>
        </Panel>

        <Panel title="شركات التوصيل">
          <p style={hintStyle}>الوسيط هي الافتراضية حالياً وأجرتها 5,000 د.ع. تكدر تضيف شركات ثانية وتغيّر الافتراضية؛ كل طلب يحتفظ باسم الشركة وأجرتها وقت التوصيل.</p>
          <div style={{ display: "grid", gap: 6 }}>{(companies.data?.items ?? []).map((item) => <div key={item.id} style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 8, color: "#cbd5e1", fontSize: 12, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span>{item.name} — {formatIqd(item.default_fee)} {item.is_default ? "— الافتراضية" : ""} {!item.active ? "— متوقفة" : ""}</span>{item.active && !item.is_default ? <button style={secondaryButtonStyle} onClick={() => makeDefaultCompany.mutate(item.id)}>اجعلها افتراضية</button> : null}</div>)}</div>
          <Field label="اسم شركة جديدة"><input style={inputStyle} value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} /></Field>
          <Field label="أجرتها الافتراضية"><input type="number" min="0" style={inputStyle} value={newCompanyFee} onChange={(e) => setNewCompanyFee(e.target.value)} /></Field>
          <label style={{ color: "#cbd5e1", fontSize: 12, display: "flex", gap: 7 }}><input type="checkbox" checked={newCompanyDefault} onChange={(e) => setNewCompanyDefault(e.target.checked)} /> اجعلها الشركة الافتراضية</label>
          <button style={buttonStyle} disabled={addCompany.isPending} onClick={() => addCompany.mutate()}>إضافة الشركة</button>
        </Panel>

        <Panel title={`أرصدة ${periodKey} — اختيارية`}>
          <p style={hintStyle}>تدخلها فقط عندما تحتاج مطابقة شهرية. رصيد الصندوق هو النقد الموجود فعلياً، مو ربح الشهر. هذه اللقطة لا تغيّر المبيعات أو الأرباح.</p>
          <div style={{ display: "grid", gap: 6 }}>{(positions.data?.items ?? []).map((item) => <div key={item.id} style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 8, color: "#cbd5e1", fontSize: 12 }}>{item.position_type} {item.delivery_company_name ? `— ${item.delivery_company_name}` : ""}: <strong>{formatIqd(item.amount)}</strong>{item.position_type === "carrier_receivable" ? ` (إجمالي ${formatIqd(item.gross_amount)} - أجور ${formatIqd(item.fee_amount)})` : ""}</div>)}</div>
          <Field label="نوع الرصيد"><select style={inputStyle} value={positionType} onChange={(e) => setPositionType(e.target.value as PositionType)}><option value="cash">نقد بالصندوق</option><option value="bank">رصيد البنك</option><option value="carrier_receivable">مستحق عند شركة توصيل</option><option value="supplier_payable">دين لمورد</option><option value="other_receivable">مبلغ لك عند جهة أخرى</option></select></Field>
          {positionType === "carrier_receivable" ? <><Field label="شركة التوصيل"><select style={inputStyle} value={positionCompanyId} onChange={(e) => setPositionCompanyId(e.target.value)}>{activeCompanies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="الإجمالي عند الشركة"><input type="number" min="0" style={inputStyle} value={positionGross} onChange={(e) => setPositionGross(e.target.value)} /></Field><Field label="أجور الشركة"><input type="number" min="0" style={inputStyle} value={positionFee} onChange={(e) => setPositionFee(e.target.value)} /></Field><div style={{ color: "#a7f3d0", fontSize: 12 }}>الصافي المستحق: {formatIqd(positionNet)}</div></> : <Field label="المبلغ"><input type="number" min="0" style={inputStyle} value={positionAmount} onChange={(e) => setPositionAmount(e.target.value)} /></Field>}
          <Field label="ملاحظة التأكيد"><textarea style={inputStyle} value={positionNote} onChange={(e) => setPositionNote(e.target.value)} placeholder="مثال: عدّيت النقد الموجود نهاية الشهر" /></Field>
          <button style={buttonStyle} disabled={savePosition.isPending} onClick={() => savePosition.mutate()}>حفظ رصيد الشهر</button>
        </Panel>

        <Panel title="الإضافات الثابتة لكل طلب">
          <p style={hintStyle}>حالياً الملصق 50 + كارت الشكر 100 = {formatIqd(fixedTotal)} لكل طلب. الصندوق يبقى حسب الكرتون الفعلي المختار. إضافة بند هنا تنشئ نسخة جديدة للطلبات القادمة فقط.</p>
          <div style={{ display: "grid", gap: 6 }}>{(fixedItems.data?.items ?? []).map((item) => <div key={item.id} style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 8, color: "#cbd5e1", fontSize: 12 }}>{item.name}: {item.quantity} × {formatIqd(item.current_unit_cost)} = <strong>{formatIqd(item.line_cost)}</strong> — نسخة {item.version}</div>)}</div>
          <Field label="اسم الإضافة الجديدة"><input style={inputStyle} value={fixedItemName} onChange={(e) => setFixedItemName(e.target.value)} placeholder="مثال: شريط تغليف" /></Field>
          <Field label="كلفتها للوحدة"><input type="number" min="0" style={inputStyle} value={fixedItemCost} onChange={(e) => setFixedItemCost(e.target.value)} /></Field>
          <Field label="الكمية بكل طلب"><input type="number" min="0.001" step="0.001" style={inputStyle} value={fixedItemQuantity} onChange={(e) => setFixedItemQuantity(e.target.value)} /></Field>
          <Field label="سبب الإضافة"><textarea style={inputStyle} value={fixedItemNote} onChange={(e) => setFixedItemNote(e.target.value)} placeholder="ليش أضفتها ومن أي تاريخ" /></Field>
          <button style={buttonStyle} disabled={addFixedItem.isPending} onClick={() => addFixedItem.mutate()}>إضافة للطلبات القادمة</button>
        </Panel>
      </div>
    </section>
  );
}
