import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addCsrfHeader } from "@/lib/csrf";

const money = z.coerce.number();
const evidenceSchema = z.object({
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

type UploadedEvidence = z.infer<typeof evidenceSchema>;
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
  return evidenceSchema.parse(await parseResponse(response));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>{label}{children}</label>;
}
const inputStyle = { background: "#071720", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 9px" } as const;
const buttonStyle = { background: "#0B93A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 13px", cursor: "pointer", fontWeight: 700 } as const;

export function FinanceAccountingOperationsV2({ periodKey }: { periodKey: string }) {
  const qc = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [settlementNumber, setSettlementNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [settlementFile, setSettlementFile] = useState<File | null>(null);
  const [settlementNote, setSettlementNote] = useState("");

  const [expenseId, setExpenseId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [paymentSource, setPaymentSource] = useState<"cash" | "bank" | "owner_personal">("cash");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [taxTreatment, setTaxTreatment] = useState<"deductible" | "nondeductible">("deductible");
  const [expenseFile, setExpenseFile] = useState<File | null>(null);

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

  const totals = useMemo(() => (candidates.data?.items ?? [])
    .filter((item) => selectedOrders.includes(item.order_id))
    .reduce((acc, item) => ({ gross: acc.gross + item.gross_collected, fees: acc.fees + item.carrier_fee, net: acc.net + item.merchant_net }), { gross: 0, fees: 0, net: 0 }),
  [candidates.data, selectedOrders]);

  const settle = useMutation({
    mutationFn: async () => {
      if (!settlementFile) throw new Error("ارفع كشف شركة التوصيل");
      if (!selectedOrders.length) throw new Error("اختر طلباً واحداً على الأقل");
      if (!receivedAt) throw new Error("حدد وقت استلام التسوية");
      const evidence = await uploadEvidence(settlementFile);
      return parseResponse(await fetch("/api/admin/accounting/v2/settlements", {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          settlementNumber, carrier, receivedAt: new Date(receivedAt).toISOString(),
          notes: settlementNote || undefined, orderIds: selectedOrders, evidence,
        }),
      }));
    },
    onSuccess: async () => {
      setSelectedOrders([]); setSettlementNumber(""); setCarrier(""); setReceivedAt(""); setSettlementFile(null); setSettlementNote("");
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
      if (!expenseFile) throw new Error("ارفع فاتورة أو وصل المصروف");
      const evidence = await uploadEvidence(expenseFile);
      return parseResponse(await fetch(`/api/admin/accounting/v2/expenses/${expenseId}/verify`, {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          vendorName, documentNumber, documentDate, paymentMethod: paymentSource,
          businessPurpose, taxTreatment, evidence,
        }),
      }));
    },
    onSuccess: async () => {
      setExpenseId(""); setVendorName(""); setDocumentNumber(""); setDocumentDate(""); setBusinessPurpose(""); setExpenseFile(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accounting-v2-pending-expenses", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-register", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-readiness", periodKey] }),
      ]);
    },
  });

  const operationError = settle.error ?? verifyExpense.error ?? candidates.error ?? expenses.error;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <h2 style={{ color: "#fff", fontSize: 17, margin: 0 }}>المطابقة والتوثيق</h2>
      {operationError ? <div role="alert" style={{ background: "#450a0a", color: "#fecaca", padding: 10, borderRadius: 8 }}>{operationError instanceof Error ? operationError.message : "حدث خطأ"}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>تسوية شركة التوصيل</h3>
          <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
            {(candidates.data?.items ?? []).map((item) => (
              <label key={item.order_id} style={{ display: "flex", gap: 8, alignItems: "center", color: "#cbd5e1", fontSize: 12, padding: 7, border: "1px solid #172554", borderRadius: 7 }}>
                <input type="checkbox" checked={selectedOrders.includes(item.order_id)} onChange={(event) => setSelectedOrders((current) => event.target.checked ? [...current, item.order_id] : current.filter((id) => id !== item.order_id))} />
                <span>{item.order_number ?? item.order_id.slice(0, 8)} — {formatIqd(item.gross_collected)} إجمالي / {formatIqd(item.merchant_net)} صافي</span>
              </label>
            ))}
            {candidates.data?.items.length === 0 ? <span style={{ color: "#94a3b8", fontSize: 12 }}>ماكو طلبات معلقة عند شركة التوصيل.</span> : null}
          </div>
          <div style={{ color: "#a7f3d0", fontSize: 12 }}>المختار: إجمالي {formatIqd(totals.gross)} — أجور {formatIqd(totals.fees)} — صافي {formatIqd(totals.net)}</div>
          <Field label="رقم كشف/تسوية الشركة"><input style={inputStyle} value={settlementNumber} onChange={(e) => setSettlementNumber(e.target.value)} /></Field>
          <Field label="اسم شركة التوصيل"><input style={inputStyle} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></Field>
          <Field label="وقت استلام الصافي"><input type="datetime-local" style={inputStyle} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} /></Field>
          <Field label="صورة الكشف أو PDF"><input type="file" accept="image/*,application/pdf" onChange={(e) => setSettlementFile(e.target.files?.[0] ?? null)} /></Field>
          <Field label="ملاحظة"><input style={inputStyle} value={settlementNote} onChange={(e) => setSettlementNote(e.target.value)} /></Field>
          <button style={buttonStyle} disabled={settle.isPending} onClick={() => settle.mutate()}>{settle.isPending ? "جاري المطابقة..." : "تسجيل ومطابقة التسوية"}</button>
          {settle.isSuccess ? <span style={{ color: "#a7f3d0", fontSize: 12 }}>تم تسجيل التسوية وترحيل صافي النقد.</span> : null}
        </div>

        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>اعتماد مصروف بمستند</h3>
          <Field label="المصروف">
            <select style={inputStyle} value={expenseId} onChange={(e) => setExpenseId(e.target.value)}>
              <option value="">اختر...</option>
              {(expenses.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.category} — {formatIqd(item.amount)} — {item.description ?? "بدون وصف"}</option>)}
            </select>
          </Field>
          <Field label="اسم الجهة/المورد"><input style={inputStyle} value={vendorName} onChange={(e) => setVendorName(e.target.value)} /></Field>
          <Field label="رقم الفاتورة أو الوصل"><input style={inputStyle} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} /></Field>
          <Field label="تاريخ المستند"><input type="date" style={inputStyle} value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} /></Field>
          <Field label="مصدر الدفع">
            <select style={inputStyle} value={paymentSource} onChange={(e) => setPaymentSource(e.target.value as typeof paymentSource)}>
              <option value="cash">صندوق AQUAVO</option><option value="bank">الحساب البنكي</option><option value="owner_personal">دفعه المالك شخصياً — يُثبت كرأس مال</option>
            </select>
          </Field>
          <Field label="الغرض التجاري"><input style={inputStyle} value={businessPurpose} onChange={(e) => setBusinessPurpose(e.target.value)} /></Field>
          <Field label="المعاملة الضريبية المبدئية">
            <select style={inputStyle} value={taxTreatment} onChange={(e) => setTaxTreatment(e.target.value as typeof taxTreatment)}>
              <option value="deductible">قابل للخصم — بانتظار المحاسب</option><option value="nondeductible">غير قابل للخصم</option>
            </select>
          </Field>
          <Field label="صورة الفاتورة أو PDF"><input type="file" accept="image/*,application/pdf" onChange={(e) => setExpenseFile(e.target.files?.[0] ?? null)} /></Field>
          <button style={buttonStyle} disabled={verifyExpense.isPending} onClick={() => verifyExpense.mutate()}>{verifyExpense.isPending ? "جاري الاعتماد..." : "ربط المستند واعتماد المصروف"}</button>
          {verifyExpense.isSuccess ? <span style={{ color: "#a7f3d0", fontSize: 12 }}>تم توثيق المصروف وترحيل قيده.</span> : null}
        </div>
      </div>
    </section>
  );
}
