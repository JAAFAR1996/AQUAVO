import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { CheckCircle2, XCircle, Clock, Package, MapPin, Phone, AlertTriangle, Loader2 } from "lucide-react";

interface InvoiceItem {
  productId: string;
  name: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imageUrl?: string;
}

interface InvoiceData {
  invoiceNo: string;
  customerName: string;
  customerCity?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  status: string;
  createdAt: string;
  expiresAt?: string;
  confirmedAt?: string;
  rejectedAt?: string;
  orderId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sent:      { label: "بانتظار ردك",  color: "#199bb8", icon: <Clock className="w-6 h-6" /> },
  confirmed: { label: "مقبولة ✅",     color: "#22c55e", icon: <CheckCircle2 className="w-6 h-6" /> },
  rejected:  { label: "مرفوضة",       color: "#ef4444", icon: <XCircle className="w-6 h-6" /> },
  cancelled: { label: "ملغاة",         color: "#6b7280", icon: <XCircle className="w-6 h-6" /> },
  completed: { label: "مكتملة ✅",     color: "#22c55e", icon: <CheckCircle2 className="w-6 h-6" /> },
};

export default function InvoiceView() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<"confirmed" | "rejected" | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invoice/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setInvoice(d.data);
        else setError(d.message);
      })
      .catch(() => setError("تعذّر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleConfirm = async () => {
    if (!confirm("هل أنت متأكد من قبول هذا الطلب؟")) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/invoice/${token}/confirm`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setActionDone("confirmed");
        setOrderId(d.orderId ?? null);
        setInvoice(prev => prev ? { ...prev, status: "confirmed" } : prev);
      } else {
        alert(d.message);
      }
    } catch {
      alert("حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/invoice/${token}/reject`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setActionDone("rejected");
        setInvoice(prev => prev ? { ...prev, status: "rejected" } : prev);
      } else {
        alert(d.message);
      }
    } catch {
      alert("حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page:    { minHeight: "100vh", background: "#0a0f1a", color: "#e2e8f0", fontFamily: "'Cairo', 'Changa', sans-serif", padding: "24px 16px", direction: "rtl" as const },
    card:    { maxWidth: 600, margin: "0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" },
    header:  { background: "linear-gradient(135deg, #0d1b2a 0%, #199bb820 100%)", padding: "32px 24px", textAlign: "center" as const, borderBottom: "1px solid rgba(25,155,184,0.2)" },
    logo:    { fontSize: 28, fontWeight: 800, color: "#199bb8", letterSpacing: 4, marginBottom: 4 },
    invNo:   { color: "#94a3b8", fontSize: 13, marginTop: 4 },
    body:    { padding: "24px" },
    section: { marginBottom: 20 },
    label:   { color: "#64748b", fontSize: 12, marginBottom: 4 },
    value:   { color: "#e2e8f0", fontWeight: 600 },
    divider: { borderTop: "1px solid rgba(255,255,255,0.06)", margin: "16px 0" },
    itemRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    itemImg: { width: 52, height: 52, borderRadius: 8, objectFit: "cover" as const, background: "#1e2a3a", flexShrink: 0 },
    itemName:{ flex: 1 },
    badge:   (color: string) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: `${color}20`, color, fontWeight: 700, fontSize: 14, border: `1px solid ${color}40` }),
    total:   { background: "rgba(25,155,184,0.08)", borderRadius: 12, padding: "16px", border: "1px solid rgba(25,155,184,0.2)" },
    btnOk:   { width: "100%", padding: "16px", borderRadius: 12, background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", fontSize: 18, fontWeight: 800, border: "none", cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    btnNo:   { width: "100%", padding: "14px", borderRadius: 12, background: "transparent", color: "#ef4444", fontSize: 16, fontWeight: 600, border: "1px solid #ef444440", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    success: { textAlign: "center" as const, padding: "40px 24px" },
    rejected:{ textAlign: "center" as const, padding: "40px 24px" },
  };

  if (loading) return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="animate-spin" style={{ color: "#199bb8" }} size={40} />
    </div>
  );

  if (error) return (
    <div style={s.page}>
      <div style={{ ...s.card, textAlign: "center", padding: 40 }}>
        <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ color: "#ef4444", marginBottom: 8 }}>تعذّر تحميل الفاتورة</h2>
        <p style={{ color: "#94a3b8" }}>{error}</p>
      </div>
    </div>
  );

  if (!invoice) return null;

  const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.sent;

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>AQUAVO</div>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>متجر أدوات الأسماك الزينة</div>
          <div style={s.invNo}>رقم الفاتورة: {invoice.invoiceNo}</div>
          <div style={{ marginTop: 12 }}>
            <span style={s.badge(statusCfg.color)}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>
        </div>

        <div style={s.body}>
          {/* بيانات العميل */}
          <div style={s.section}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={s.label}>اسم العميل</div>
                <div style={s.value}>{invoice.customerName}</div>
              </div>
              {invoice.customerCity && (
                <div>
                  <div style={s.label}>المحافظة</div>
                  <div style={{ ...s.value, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={14} color="#199bb8" /> {invoice.customerCity}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={s.divider} />

          {/* المنتجات */}
          <div style={s.section}>
            <div style={{ ...s.label, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Package size={16} color="#199bb8" /> المنتجات
            </div>
            {invoice.items.map((item, i) => (
              <div key={i} style={s.itemRow}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={s.itemImg} />
                ) : (
                  <div style={{ ...s.itemImg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={20} color="#199bb8" />
                  </div>
                )}
                <div style={s.itemName}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  {item.variantLabel && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{item.variantLabel}</div>}
                  <div style={{ color: "#64748b", fontSize: 12 }}>الكمية: {item.quantity} × {item.unitPrice.toLocaleString("en-US")} د.ع</div>
                </div>
                <div style={{ color: "#199bb8", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {item.total.toLocaleString("en-US")} د.ع
                </div>
              </div>
            ))}
          </div>

          <div style={s.divider} />

          {/* الإجماليات */}
          <div style={s.total}>
            {[
              { label: "المجموع الفرعي", value: invoice.subtotal },
              ...(invoice.discount > 0 ? [{ label: "الخصم", value: -invoice.discount }] : []),
              ...(invoice.delivery > 0 ? [{ label: "رسوم التوصيل", value: invoice.delivery }] : []),
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#94a3b8" }}>{row.label}</span>
                <span style={{ color: row.value < 0 ? "#22c55e" : "#e2e8f0" }}>
                  {row.value < 0 ? "-" : ""}{Math.abs(row.value).toLocaleString("en-US")} د.ع
                </span>
              </div>
            ))}
            <div style={{ ...s.divider, margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: "#199bb8" }}>الإجمالي</span>
              <span style={{ color: "#ffd700" }}>{invoice.total.toLocaleString("en-US")} د.ع</span>
            </div>
          </div>

          {/* انتهاء الصلاحية */}
          {invoice.expiresAt && invoice.status === "sent" && (
            <div style={{ marginTop: 12, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
              ⏳ ينتهي الرابط في: {new Date(invoice.expiresAt).toLocaleString("ar-IQ")}
            </div>
          )}

          {/* أزرار الإجراء */}
          {invoice.status === "sent" && !actionDone && (
            <div style={{ marginTop: 24 }}>
              <button
                style={s.btnOk}
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                قبول الطلب
              </button>
              <button
                style={s.btnNo}
                onClick={handleReject}
                disabled={actionLoading}
              >
                <XCircle size={18} /> رفض الطلب
              </button>
            </div>
          )}

          {/* حالة القبول */}
          {(actionDone === "confirmed" || invoice.status === "confirmed") && (
            <div style={s.success}>
              <CheckCircle2 size={56} color="#22c55e" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ color: "#22c55e", marginBottom: 8 }}>تم تأكيد طلبك! 🎉</h2>
              <p style={{ color: "#94a3b8" }}>سنتواصل معك قريباً لتأكيد التوصيل.</p>
              {orderId && <p style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>رقم الطلب: {orderId.slice(0, 8).toUpperCase()}</p>}
            </div>
          )}

          {/* حالة الرفض */}
          {(actionDone === "rejected" || invoice.status === "rejected") && (
            <div style={s.rejected}>
              <XCircle size={56} color="#ef4444" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ color: "#ef4444", marginBottom: 8 }}>تم تسجيل رفضك</h2>
              <p style={{ color: "#94a3b8" }}>شكراً على ردك. نأمل أن نخدمك في المرة القادمة.</p>
            </div>
          )}

          {/* ملغاة */}
          {invoice.status === "cancelled" && (
            <div style={{ ...s.rejected }}>
              <AlertTriangle size={48} color="#6b7280" style={{ margin: "0 auto 16px" }} />
              <p style={{ color: "#94a3b8" }}>هذه الفاتورة ملغاة</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", color: "#475569", fontSize: 12 }}>
          AQUAVO — متجر أدوات الأسماك الزينة © 2026
        </div>
      </div>
    </div>
  );
}
