import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addCsrfHeader } from "@/lib/csrf";

const companySchema = z.object({
  id: z.string(), name: z.string(), default_fee: z.coerce.number(),
  active: z.boolean(), is_default: z.boolean(),
});
const companiesSchema = z.object({ items: z.array(companySchema) });
const positionSchema = z.object({
  id: z.string(), position_type: z.string(), delivery_company_id: z.string().nullable().optional(),
  delivery_company_name: z.string().nullable().optional(), amount: z.coerce.number(),
  gross_amount: z.coerce.number(), fee_amount: z.coerce.number(),
  other_deduction_amount: z.coerce.number().default(0),
  other_deduction_note: z.string().nullable().optional(), note: z.string().nullable().optional(),
}).passthrough();
const positionsSchema = z.object({ periodKey: z.string(), items: z.array(positionSchema) });

async function json(response: Response): Promise<any> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.message === "string" ? body.message : "فشلت العملية");
  return body;
}
const formatIqd = (value: number) => `${Math.round(value).toLocaleString("en-US")} د.ع`;
const inputStyle = { background: "#071720", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 9px" } as const;

export function FinanceCarrierPositionV2({ periodKey }: { periodKey: string }) {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [gross, setGross] = useState("");
  const [fees, setFees] = useState("");
  const [otherDeduction, setOtherDeduction] = useState("0");
  const [otherNote, setOtherNote] = useState("");
  const [note, setNote] = useState("");

  const companies = useQuery({
    queryKey: ["accounting-v2-delivery-companies"],
    queryFn: async () => companiesSchema.parse(await json(await fetch(
      "/api/admin/accounting/v2/delivery-companies", { credentials: "include" },
    ))), retry: false,
  });
  const positions = useQuery({
    queryKey: ["accounting-v2-monthly-positions", periodKey],
    queryFn: async () => positionsSchema.parse(await json(await fetch(
      `/api/admin/accounting/v2/monthly-positions?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))), retry: false,
  });

  const activeCompanies = (companies.data?.items ?? []).filter((item) => item.active);
  useEffect(() => {
    const selected = activeCompanies.find((item) => item.id === companyId);
    if (selected) return;
    const defaultCompany = activeCompanies.find((item) => item.is_default) ?? activeCompanies[0];
    if (defaultCompany) setCompanyId(defaultCompany.id);
  }, [activeCompanies, companyId]);

  const selectedCompany = activeCompanies.find((item) => item.id === companyId);
  const grossNumber = Number(gross) || 0;
  const feeNumber = Number(fees) || 0;
  const otherNumber = Number(otherDeduction) || 0;
  const net = grossNumber - feeNumber - otherNumber;
  const feeUnit = selectedCompany?.default_fee ?? 5000;
  const feeIsMultiple = feeUnit <= 0 || Math.abs(feeNumber % feeUnit) < 0.001;
  const deliveryCount = feeIsMultiple && feeUnit > 0 ? feeNumber / feeUnit : null;

  const current = useMemo(() => (positions.data?.items ?? []).filter(
    (item) => item.position_type === "carrier_receivable",
  ), [positions.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("اختر شركة التوصيل");
      if (!Number.isFinite(grossNumber) || grossNumber < 0) throw new Error("أدخل الإجمالي الصحيح");
      if (!Number.isFinite(feeNumber) || feeNumber < 0) throw new Error("أدخل أجور التوصيل الصحيحة");
      if (!feeIsMultiple) throw new Error(`أجور التوصيل لازم تكون مضاعفات ${formatIqd(feeUnit)}؛ ضع الفرق باقتطاع آخر`);
      if (otherNumber > 0 && otherNote.trim().length < 3) throw new Error("فسّر الاقتطاع الآخر");
      if (net < 0) throw new Error("الصافي لا يمكن أن يكون سالباً");
      if (note.trim().length < 3) throw new Error("اكتب ملاحظة تأكيد قصيرة");
      return json(await fetch("/api/admin/accounting/v2/monthly-positions", {
        method: "POST", credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          periodKey, positionType: "carrier_receivable", deliveryCompanyId: companyId,
          amount: net, grossAmount: grossNumber, feeAmount: feeNumber,
          otherDeductionAmount: otherNumber,
          otherDeductionNote: otherNumber > 0 ? otherNote.trim() : undefined,
          note: note.trim(),
        }),
      }));
    },
    onSuccess: async () => {
      setGross(""); setFees(""); setOtherDeduction("0"); setOtherNote(""); setNote("");
      await qc.invalidateQueries({ queryKey: ["accounting-v2-monthly-positions", periodKey] });
    },
  });

  const error = companies.error ?? positions.error ?? save.error;
  return (
    <section style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
      <div>
        <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>مطابقة رصيد شركة التوصيل</h3>
        <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.65, marginBottom: 0 }}>
          أجور التوصيل تبقى مضاعفات أجرة الشركة. أي خصم آخر يظهر منفصلاً مع تفسير، ولا يُسمى أجرة توصيل.
        </p>
      </div>

      {current.map((item) => (
        <div key={item.id} style={{ color: "#cbd5e1", border: "1px solid #315477", borderRadius: 8, padding: 9, fontSize: 12 }}>
          {item.delivery_company_name ?? "شركة غير مسماة"}: إجمالي {formatIqd(item.gross_amount)} − أجور {formatIqd(item.fee_amount)}
          {item.other_deduction_amount > 0 ? ` − اقتطاع آخر ${formatIqd(item.other_deduction_amount)} (${item.other_deduction_note ?? "بلا تفسير"})` : ""}
          {` = صافي ${formatIqd(item.amount)}`}
        </div>
      ))}

      <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>شركة التوصيل
        <select style={inputStyle} value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
          <option value="">اختر...</option>
          {activeCompanies.map((item) => <option key={item.id} value={item.id}>{item.name} — {formatIqd(item.default_fee)}</option>)}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
        <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>الإجمالي عند الشركة
          <input type="number" min="0" style={inputStyle} value={gross} onChange={(event) => setGross(event.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>أجور التوصيل فقط
          <input type="number" min="0" style={inputStyle} value={fees} onChange={(event) => setFees(event.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>اقتطاع آخر
          <input type="number" min="0" style={inputStyle} value={otherDeduction} onChange={(event) => setOtherDeduction(event.target.value)} />
        </label>
      </div>
      <div style={{ color: feeIsMultiple ? "#a7f3d0" : "#fdba74", fontSize: 12 }}>
        {feeIsMultiple
          ? `أجور التوصيل تمثل ${deliveryCount ?? 0} طلب — الصافي ${formatIqd(net)}`
          : `الأجور ليست مضاعفات ${formatIqd(feeUnit)}؛ انقل الفرق إلى «اقتطاع آخر»`}
      </div>
      {otherNumber > 0 ? <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>تفسير الاقتطاع الآخر
        <input style={inputStyle} value={otherNote} onChange={(event) => setOtherNote(event.target.value)} placeholder="مثال: فرق سابق يحتاج تدقيق" />
      </label> : null}
      <label style={{ display: "grid", gap: 5, color: "#cbd5e1", fontSize: 12 }}>ملاحظة التأكيد
        <input style={inputStyle} value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: حسب كشف/تأكيد الشركة لهذا الشهر" />
      </label>
      {error ? <div role="alert" style={{ color: "#fecaca", background: "#450a0a", borderRadius: 8, padding: 8, fontSize: 12 }}>{error instanceof Error ? error.message : "حدث خطأ"}</div> : null}
      <button disabled={save.isPending} onClick={() => save.mutate()} style={{ background: "#0B93A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 13px", cursor: "pointer", fontWeight: 700 }}>
        {save.isPending ? "جاري الحفظ..." : "حفظ مطابقة الشركة"}
      </button>
    </section>
  );
}
