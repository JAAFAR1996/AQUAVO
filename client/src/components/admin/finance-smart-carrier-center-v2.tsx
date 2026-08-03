import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addCsrfHeader } from "@/lib/csrf";

const money = z.coerce.number();
const uploadedEvidenceSchema = z.object({
  url: z.string().url(), objectKey: z.string(), storageProvider: z.string(),
  sha256: z.string(), originalName: z.string(), mimeType: z.string(), size: z.number(),
});
const openOrderSchema = z.object({
  id: z.string(), orderNumber: z.string().nullable(), status: z.string(), customerName: z.string().nullable(),
  total: money, carrier: z.string().nullable(), carrierFee: money,
  deliveryCompanyId: z.string().nullable(), createdAt: z.string(),
});
const outstandingOrderSchema = z.object({
  orderId: z.string(), orderNumber: z.string().nullable(), recognizedAt: z.string(),
  carrier: z.string().nullable(), grossCollected: money, carrierFee: money, merchantNet: money,
  deliveryCompanyId: z.string().nullable(),
});
const positionSchema = z.object({
  id: z.string(), amount: money, grossAmount: money, feeAmount: money,
  otherDeductionAmount: money, otherDeductionNote: z.string().nullable(),
  note: z.string().nullable(), confirmedAt: z.string(),
});
const companySchema = z.object({
  id: z.string(), companyKey: z.string(), name: z.string(), defaultFee: money,
  isDefault: z.boolean(), notes: z.string().nullable(),
  openOrders: z.array(openOrderSchema), outstandingOrders: z.array(outstandingOrderSchema),
  confirmedPosition: positionSchema.nullable(),
  outstanding: z.object({ count: z.coerce.number(), gross: money, fees: money, net: money }),
});
const smartSchema = z.object({
  periodKey: z.string(), generatedAt: z.string(), items: z.array(companySchema),
  unassignedOpenOrders: z.array(openOrderSchema), unmatchedOutstandingOrders: z.array(outstandingOrderSchema),
});

type UploadedEvidence = z.infer<typeof uploadedEvidenceSchema>;
type EvidenceMode = "owner_confirmation" | "electronic_attachment";
const formatIqd = (value: number) => `${Math.round(value).toLocaleString("en-US")} د.ع`;
const inputStyle = { background: "#071720", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 9px" } as const;
const buttonStyle = { background: "#0B93A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 13px", cursor: "pointer", fontWeight: 700 } as const;
const secondaryButtonStyle = { ...buttonStyle, background: "#17334d", border: "1px solid #315477" } as const;
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
    if (!file) throw new Error("اختر كشف الشركة أو السكرينشوت");
    return uploadEvidence(file);
  }
  if (note.trim().length < 5) throw new Error("اكتب ملاحظة قصيرة عن استلام الصافي");
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

export function FinanceSmartCarrierCenterV2({ periodKey }: { periodKey: string }) {
  const qc = useQueryClient();
  const [assignmentValues, setAssignmentValues] = useState<Record<string, string>>({});
  const [settlementCompanyId, setSettlementCompanyId] = useState("");
  const [settlementNumber, setSettlementNumber] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>("owner_confirmation");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [settlementNote, setSettlementNote] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyFee, setNewCompanyFee] = useState("5000");
  const [newCompanyDefault, setNewCompanyDefault] = useState(false);

  const smart = useQuery({
    queryKey: ["accounting-v2-smart-carriers", periodKey],
    queryFn: async () => smartSchema.parse(await parseResponse(await fetch(
      `/api/admin/accounting/v2/carriers/smart?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))),
    retry: false,
  });

  const companies = smart.data?.items ?? [];
  const openOrders = useMemo(() => {
    const map = new Map<string, z.infer<typeof openOrderSchema>>();
    for (const company of companies) for (const order of company.openOrders) map.set(order.id, order);
    for (const order of smart.data?.unassignedOpenOrders ?? []) map.set(order.id, order);
    return Array.from(map.values());
  }, [companies, smart.data?.unassignedOpenOrders]);

  useEffect(() => {
    if (!smart.data) return;
    setAssignmentValues((current) => {
      const next = { ...current };
      for (const order of openOrders) {
        if (!next[order.id] && order.deliveryCompanyId) next[order.id] = order.deliveryCompanyId;
      }
      return next;
    });
    const current = companies.find((company) => company.id === settlementCompanyId && company.outstanding.count > 0);
    if (current) return;
    const preferred = companies.find((company) => company.isDefault && company.outstanding.count > 0)
      ?? companies.find((company) => company.outstanding.count > 0);
    setSettlementCompanyId(preferred?.id ?? "");
  }, [companies, openOrders, settlementCompanyId, smart.data]);

  const selectedSettlementCompany = companies.find((company) => company.id === settlementCompanyId);

  const assign = useMutation({
    mutationFn: async ({ orderId, companyId }: { orderId: string; companyId: string }) => {
      if (!companyId) throw new Error("اختر شركة التوصيل");
      return parseResponse(await fetch(`/api/admin/accounting/v2/orders/${orderId}/delivery-company`, {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ deliveryCompanyId: companyId }),
      }));
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["accounting-v2-smart-carriers", periodKey] });
    },
  });

  const settleAll = useMutation({
    mutationFn: async () => {
      const company = selectedSettlementCompany;
      if (!company || company.outstandingOrders.length === 0) throw new Error("ماكو طلبات غير مسوّاة لهذه الشركة");
      if (!receivedAt) throw new Error("حدد وقت استلام المبلغ");
      const evidence = await evidencePayload(evidenceMode, evidenceFile, settlementNote);
      return parseResponse(await fetch("/api/admin/accounting/v2/settlements", {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          settlementNumber: settlementNumber || undefined,
          deliveryCompanyId: company.id,
          receivedAt: new Date(receivedAt).toISOString(),
          notes: settlementNote || undefined,
          orderIds: company.outstandingOrders.map((order) => order.orderId),
          evidence,
        }),
      }));
    },
    onSuccess: async () => {
      setSettlementNumber(""); setReceivedAt(""); setEvidenceFile(null); setSettlementNote("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accounting-v2-smart-carriers", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-settlement-candidates", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-register", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-readiness", periodKey] }),
      ]);
    },
  });

  const addCompany = useMutation({
    mutationFn: async () => {
      if (newCompanyName.trim().length < 2) throw new Error("اكتب اسم شركة التوصيل");
      const fee = Number(newCompanyFee);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("أدخل أجرة صحيحة");
      return parseResponse(await fetch("/api/admin/accounting/v2/delivery-companies", {
        method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: newCompanyName.trim(), defaultFee: fee, makeDefault: newCompanyDefault }),
      }));
    },
    onSuccess: async () => {
      setNewCompanyName(""); setNewCompanyFee("5000"); setNewCompanyDefault(false);
      await qc.invalidateQueries({ queryKey: ["accounting-v2-smart-carriers", periodKey] });
    },
  });

  const makeDefault = useMutation({
    mutationFn: async (companyId: string) => parseResponse(await fetch(
      `/api/admin/accounting/v2/delivery-companies/${companyId}/default`,
      { method: "POST", credentials: "include", headers: addCsrfHeader({ "Content-Type": "application/json" }), body: "{}" },
    )),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["accounting-v2-smart-carriers", periodKey] }),
  });

  const error = smart.error ?? assign.error ?? settleAll.error ?? addCompany.error ?? makeDefault.error;

  return (
    <section style={{ display: "grid", gap: 14 }} data-testid="smart-carrier-center-v2">
      <div>
        <h2 style={{ color: "#fff", fontSize: 17, margin: 0 }}>شركات التوصيل — حساب تلقائي</h2>
        <p style={hintStyle}>
          تختار الشركة للطلب مرة واحدة فقط. بعدها الإجمالي، أجرة الشركة، الصافي والطلبات غير المسوّاة تُحسب من سجل الطلبات تلقائياً؛ لا يوجد إدخال يدوي للمبالغ.
        </p>
      </div>

      {error ? <div role="alert" style={{ background: "#450a0a", color: "#fecaca", padding: 10, borderRadius: 8 }}>{error instanceof Error ? error.message : "حدث خطأ"}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))", gap: 10 }}>
        {companies.map((company) => (
          <div key={company.id} style={{ background: "#0d1f3c", border: company.isDefault ? "1px solid #0B93A6" : "1px solid #1e3a5f", borderRadius: 12, padding: 13, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ color: "#fff" }}>{company.name}</strong>
              <span style={{ color: company.isDefault ? "#67e8f9" : "#94a3b8", fontSize: 11 }}>{company.isDefault ? "الافتراضية" : formatIqd(company.defaultFee)}</span>
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 12 }}>طلبات مفتوحة مرتبطة: {company.openOrders.length}</div>
            <div style={{ color: "#cbd5e1", fontSize: 12 }}>مسلّمة وغير مسوّاة: {company.outstanding.count}</div>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>COD تلقائي: {formatIqd(company.outstanding.gross)}</div>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>أجور الشركة: {formatIqd(company.outstanding.fees)}</div>
            <div style={{ color: "#a7f3d0", fontSize: 14, fontWeight: 800 }}>الصافي التلقائي: {formatIqd(company.outstanding.net)}</div>
            {company.confirmedPosition ? (
              <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 8, color: "#fcd34d", fontSize: 11 }}>
                رصيد مؤكد سابقاً: {formatIqd(company.confirmedPosition.amount)}
                <div style={{ color: "#94a3b8", marginTop: 3 }}>يبقى منفصلاً عن الطلبات الجديدة حتى تتم تسوية الرصيد الافتتاحي.</div>
              </div>
            ) : null}
            {!company.isDefault ? <button style={secondaryButtonStyle} disabled={makeDefault.isPending} onClick={() => makeDefault.mutate(company.id)}>اجعلها افتراضية</button> : null}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14 }}>
        <Panel title="ربط الطلب بشركة التوصيل">
          <p style={hintStyle}>الطلب الجديد يأخذ الشركة الافتراضية آلياً. غيّرها هنا فقط عندما ستسلمه لشركة ثانية، وقبل تحقق البيع.</p>
          <div style={{ display: "grid", gap: 7, maxHeight: 310, overflow: "auto" }}>
            {openOrders.map((order) => (
              <div key={order.id} style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 8, display: "grid", gridTemplateColumns: "minmax(130px,1fr) minmax(150px,1fr) auto", gap: 8, alignItems: "center" }}>
                <div style={{ color: "#cbd5e1", fontSize: 12 }}>
                  <strong>{order.orderNumber ?? order.id.slice(0, 8)}</strong>
                  <div style={{ color: "#94a3b8", marginTop: 2 }}>{order.customerName ?? "زبون"} — {order.status}</div>
                </div>
                <select style={inputStyle} value={assignmentValues[order.id] ?? ""} onChange={(event) => setAssignmentValues((current) => ({ ...current, [order.id]: event.target.value }))}>
                  <option value="">اختر الشركة...</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name} — {formatIqd(company.defaultFee)}</option>)}
                </select>
                <button style={secondaryButtonStyle} disabled={assign.isPending || !assignmentValues[order.id]} onClick={() => assign.mutate({ orderId: order.id, companyId: assignmentValues[order.id] })}>حفظ</button>
              </div>
            ))}
            {openOrders.length === 0 ? <span style={hintStyle}>ماكو طلبات مفتوحة تحتاج ربطاً حالياً.</span> : null}
          </div>
          {(smart.data?.unmatchedOutstandingOrders.length ?? 0) > 0 ? (
            <div style={{ color: "#fecaca", background: "#450a0a", borderRadius: 8, padding: 8, fontSize: 12 }}>
              توجد طلبات مسلّمة باسم شركة غير موجودة في دليل الشركات. تحتاج تصحيحاً موثقاً قبل التسوية.
            </div>
          ) : null}
        </Panel>

        <Panel title="استلام وتسوية شركة التوصيل">
          <p style={hintStyle}>اختر الشركة فقط؛ النظام يحدد كل طلباتها غير المسوّاة ويحسب المبالغ من الحقائق المحاسبية المجمدة.</p>
          <Field label="شركة التوصيل">
            <select style={inputStyle} value={settlementCompanyId} onChange={(event) => setSettlementCompanyId(event.target.value)}>
              <option value="">لا توجد شركة بمبالغ معلقة</option>
              {companies.filter((company) => company.outstanding.count > 0).map((company) => (
                <option key={company.id} value={company.id}>{company.name} — {company.outstanding.count} طلب — {formatIqd(company.outstanding.net)}</option>
              ))}
            </select>
          </Field>
          {selectedSettlementCompany ? (
            <div style={{ border: "1px solid #315477", borderRadius: 9, padding: 10, display: "grid", gap: 4, color: "#cbd5e1", fontSize: 12 }}>
              <div>الطلبات: {selectedSettlementCompany.outstanding.count}</div>
              <div>الإجمالي: {formatIqd(selectedSettlementCompany.outstanding.gross)}</div>
              <div>أجور الشركة: {formatIqd(selectedSettlementCompany.outstanding.fees)}</div>
              <strong style={{ color: "#a7f3d0" }}>الصافي الذي تستلمه: {formatIqd(selectedSettlementCompany.outstanding.net)}</strong>
            </div>
          ) : null}
          <Field label="رقم كشف الشركة — اختياري"><input style={inputStyle} value={settlementNumber} onChange={(event) => setSettlementNumber(event.target.value)} /></Field>
          <Field label="وقت استلام الصافي"><input type="datetime-local" style={inputStyle} value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} /></Field>
          <Field label="طريقة الإثبات"><select style={inputStyle} value={evidenceMode} onChange={(event) => setEvidenceMode(event.target.value as EvidenceMode)}><option value="owner_confirmation">تأكيد داخلي — بدون ملف</option><option value="electronic_attachment">سكرينشوت / صورة / PDF</option></select></Field>
          {evidenceMode === "electronic_attachment" ? <Field label="كشف الشركة"><input type="file" accept="image/*,application/pdf" onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)} /></Field> : null}
          <Field label="ملاحظة الاستلام"><textarea style={inputStyle} value={settlementNote} onChange={(event) => setSettlementNote(event.target.value)} placeholder="مثال: استلمت الصافي نقداً من مندوب الشركة" /></Field>
          <button style={buttonStyle} disabled={settleAll.isPending || !selectedSettlementCompany} onClick={() => settleAll.mutate()}>
            {settleAll.isPending ? "جاري المطابقة..." : "استلام ومطابقة كل طلبات الشركة"}
          </button>
        </Panel>

        <Panel title="إدارة شركات التوصيل">
          <p style={hintStyle}>أضف الشركة مرة واحدة فقط، وحدد أجرتها الافتراضية. بعدها تظهر في الطلبات والتسويات تلقائياً.</p>
          <Field label="اسم الشركة"><input style={inputStyle} value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} /></Field>
          <Field label="أجرتها الافتراضية"><input type="number" min="0" style={inputStyle} value={newCompanyFee} onChange={(event) => setNewCompanyFee(event.target.value)} /></Field>
          <label style={{ color: "#cbd5e1", fontSize: 12, display: "flex", gap: 7 }}><input type="checkbox" checked={newCompanyDefault} onChange={(event) => setNewCompanyDefault(event.target.checked)} /> اجعلها الشركة الافتراضية</label>
          <button style={buttonStyle} disabled={addCompany.isPending} onClick={() => addCompany.mutate()}>إضافة الشركة</button>
        </Panel>
      </div>
    </section>
  );
}
