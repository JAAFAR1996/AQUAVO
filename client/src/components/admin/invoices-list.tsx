import { useState, useEffect } from "react";
import { Plus, Send, Eye, XCircle, RefreshCw, Filter, FileText, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import ManualInvoiceCreator from "./manual-invoice-creator";

interface Invoice {
  id: string;
  invoiceNo: string;
  token: string;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  total: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  confirmedAt?: string;
  rejectedAt?: string;
  expiresAt?: string;
  orderId?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "مسودة",    color: "#94a3b8", bg: "#94a3b820" },
  sent:      { label: "مُرسلة",   color: "#0B93A6", bg: "#0B93A620" },
  confirmed: { label: "مقبولة ✅", color: "#22c55e", bg: "#22c55e20" },
  rejected:  { label: "مرفوضة",  color: "#ef4444", bg: "#ef444420" },
  completed: { label: "مكتملة",   color: "#a855f7", bg: "#a855f720" },
  cancelled: { label: "ملغاة",    color: "#6b7280", bg: "#6b728020" },
};

export default function InvoicesList() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreator, setShowCreator] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.aquavoiq.com";

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        fetch(filterStatus === "all" ? "/api/admin/invoices" : `/api/admin/invoices?status=${filterStatus}`, { credentials: "include" }),
        fetch("/api/admin/invoices/stats", { credentials: "include" }),
      ]);
      const invData = await invRes.json();
      const statsData = await statsRes.json();
      if (invData.success) setInvoices(invData.data);
      if (statsData.success) setStats(statsData.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filterStatus]);

  const handleSend = async (id: string) => {
    setActionLoading(id + "_send");
    try {
      const r = await fetch(`/api/admin/invoices/${id}/send`, {
        method: "POST", headers: addCsrfHeader(), credentials: "include",
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      // WhatsApp
      window.open(d.whatsappUrl, "_blank");
      toast({ title: "✅ تم الإرسال", description: `رابط الفاتورة جاهز ومفتوح في واتساب` });
      fetchAll();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("هل أنت متأكد من إلغاء هذه الفاتورة؟")) return;
    setActionLoading(id + "_cancel");
    try {
      const r = await fetch(`/api/admin/invoices/${id}/cancel`, {
        method: "POST", headers: addCsrfHeader(), credentials: "include",
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast({ title: "✅ تم الإلغاء" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;
    try {
      const response = await fetch(`/api/admin/invoices/${deleteInvoiceId}`, {
        method: "DELETE",
        headers: addCsrfHeader({}),
        credentials: "include",
      });
      if (!response.ok) throw new Error("فشل الحذف");
      setInvoices((prev) => prev.filter((inv) => inv.id !== deleteInvoiceId));
      toast({ title: "تم الحذف", description: "تم حذف الفاتورة" });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الفاتورة", variant: "destructive" });
    } finally {
      setDeleteInvoiceId(null);
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${baseUrl}/invoice/${token}`);
    toast({ title: "✅ تم نسخ الرابط" });
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: { fontFamily: "'Cairo','Changa',sans-serif", color: "#e2e8f0", direction: "rtl" as const },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 20 },
    statCard: (color: string) => ({ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 12, padding: "12px 16px", textAlign: "center" as const }),
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" as const, gap: 12 },
    filterRow: { display: "flex", gap: 8, flexWrap: "wrap" as const },
    filterBtn: (active: boolean) => ({ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: active ? "1px solid #0B93A6" : "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(11,147,166,0.15)" : "transparent", color: active ? "#0B93A6" : "#64748b" }),
    table: { width: "100%", borderCollapse: "collapse" as const },
    th: { textAlign: "right" as const, padding: "10px 12px", color: "#64748b", fontSize: 12, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" },
    td: { padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, verticalAlign: "middle" as const },
    badge: (s: string) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: STATUS_MAP[s]?.bg ?? "#ffffff10", color: STATUS_MAP[s]?.color ?? "#e2e8f0" }),
    btn: (color: string) => ({ padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1px solid ${color}40`, background: `${color}15`, color, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }),
    btnPrimary: { padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg, #0B93A6, #075F6B)", color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  };

  return (
    <div style={s.page}>
      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: "الكل", value: stats.total ?? 0, color: "#e2e8f0", icon: <FileText size={16} /> },
          { label: "مُرسلة", value: stats.sent ?? 0, color: "#0B93A6", icon: <Clock size={16} /> },
          { label: "مقبولة", value: stats.confirmed ?? 0, color: "#22c55e", icon: <CheckCircle2 size={16} /> },
          { label: "مرفوضة", value: stats.rejected ?? 0, color: "#ef4444", icon: <XCircle size={16} /> },
          { label: "مسودات", value: stats.draft ?? 0, color: "#94a3b8", icon: <TrendingUp size={16} /> },
        ].map((st, i) => (
          <div key={i} style={s.statCard(st.color)}>
            <div style={{ color: st.color, marginBottom: 4, display: "flex", justifyContent: "center" }}>{st.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: st.color }}>{st.value}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>📄 فواتير واتساب</h3>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>إدارة طلبات العملاء عبر واتساب</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchAll} style={{ ...s.btn("#94a3b8"), padding: "9px 12px" }}><RefreshCw size={14} /></button>
          <button onClick={() => setShowCreator(true)} style={s.btnPrimary}>
            <Plus size={16} /> فاتورة جديدة
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...s.filterRow, marginBottom: 16 }}>
        {["all", "draft", "sent", "confirmed", "rejected", "cancelled"].map(f => (
          <button key={f} style={s.filterBtn(filterStatus === f)} onClick={() => setFilterStatus(f)}>
            {f === "all" ? "الكل" : STATUS_MAP[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
          <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
          جاري التحميل...
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
          <FileText size={40} style={{ margin: "0 auto 12px" }} />
          <div>لا توجد فواتير</div>
          <button onClick={() => setShowCreator(true)} style={{ ...s.btnPrimary, margin: "16px auto 0" }}>
            <Plus size={14} /> أنشئ أول فاتورة
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                {["رقم الفاتورة", "العميل", "الهاتف", "المحافظة", "الإجمالي", "الحالة", "التاريخ", "إجراءات"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...s.td, fontWeight: 700, color: "#0B93A6" }}>{inv.invoiceNo}</td>
                  <td style={s.td}>{inv.customerName}</td>
                  <td style={{ ...s.td, direction: "ltr", color: "#94a3b8" }}>{inv.customerPhone}</td>
                  <td style={s.td}>{inv.customerCity || "—"}</td>
                  <td style={{ ...s.td, color: "var(--aqv-warning)", fontWeight: 700 }}>{Number(inv.total).toLocaleString("en-US")} د.ع</td>
                  <td style={s.td}><span style={s.badge(inv.status)}>{STATUS_MAP[inv.status]?.label ?? inv.status}</span></td>
                  <td style={{ ...s.td, color: "#64748b", fontSize: 12 }}>
                    {new Date(inv.createdAt).toLocaleDateString("ar-IQ")}
                  </td>
                  <td style={{ ...s.td }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {/* عرض الرابط */}
                      <button style={s.btn("#94a3b8")} onClick={() => window.open(`/invoice/${inv.token}`, "_blank")} title="معاينة">
                        <Eye size={13} />
                      </button>
                      {/* إرسال (draft أو إعادة إرسال) */}
                      {(inv.status === "draft" || inv.status === "sent") && (
                        <button style={s.btn("#0B93A6")} onClick={() => handleSend(inv.id)} disabled={actionLoading === inv.id + "_send"}>
                          <Send size={13} /> {inv.status === "sent" ? "إعادة إرسال" : "إرسال"}
                        </button>
                      )}
                      {/* نسخ الرابط */}
                      {inv.status === "sent" && (
                        <button style={s.btn("#a855f7")} onClick={() => copyLink(inv.token)} title="نسخ رابط العميل">
                          🔗
                        </button>
                      )}
                      {/* إلغاء */}
                      {!["completed", "cancelled"].includes(inv.status) && (
                        <button style={s.btn("#ef4444")} onClick={() => handleCancel(inv.id)} disabled={actionLoading === inv.id + "_cancel"}>
                          <XCircle size={13} />
                        </button>
                      )}
                      {/* حذف */}
                      <button
                        onClick={() => setDeleteInvoiceId(inv.id)}
                        title="حذف"
                        style={{
                          padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                          background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440",
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Creator Modal */}
      {showCreator && (
        <ManualInvoiceCreator
          onClose={() => setShowCreator(false)}
          onSaved={fetchAll}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteInvoiceId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12,
            padding: 24, maxWidth: 400, width: "90%",
          }}>
            <h3 style={{ color: "#fff", margin: "0 0 8px" }}>تأكيد حذف الفاتورة</h3>
            <p style={{ color: "#94a3b8", margin: "0 0 20px", fontSize: 14 }}>
              هل تريد حذف هذه الفاتورة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteInvoiceId(null)}
                style={{ padding: "8px 16px", borderRadius: 6, background: "#1e3a5f", color: "#94a3b8", border: "none", cursor: "pointer" }}
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteInvoice}
                style={{ padding: "8px 16px", borderRadius: 6, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer" }}
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
