import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { CheckCircle2, XCircle, Clock, Package, MapPin, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { addCsrfHeader } from "@/lib/csrf";
import { useTranslation } from "react-i18next";
import { loadLocale } from "@/i18n";
import { LOCALES, localizePath, splitLocaleFromPath } from "@shared/i18n/locales";
import type { ManualInvoiceLocale } from "@shared/manual-invoice-locale";
import { OrderReceiptPrinter } from "@/components/cart/order-receipt-printer";
import { primeReceiptPrinterAudio } from "@/lib/receipt-printer-audio";
import "./invoice-print.css";

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
  invoiceLocale?: ManualInvoiceLocale;
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

type StatusLabel = `invoice-view.${"draft" | "s1" | "s2" | "s3" | "s4" | "s5"}`;
const STATUS_CONFIG: Record<string, { label: StatusLabel; color: string; icon: React.ReactNode }> = {
  draft:     { label: "invoice-view.draft", color: "#94a3b8", icon: <Clock className="w-6 h-6" /> },
  sent:      { label: "invoice-view.s1",  color: "#0B93A6", icon: <Clock className="w-6 h-6" /> },
  confirmed: { label: "invoice-view.s2",     color: "#22c55e", icon: <CheckCircle2 className="w-6 h-6" /> },
  rejected:  { label: "invoice-view.s3",       color: "#ef4444", icon: <XCircle className="w-6 h-6" /> },
  cancelled: { label: "invoice-view.s4",         color: "#6b7280", icon: <XCircle className="w-6 h-6" /> },
  completed: { label: "invoice-view.s5",     color: "#22c55e", icon: <CheckCircle2 className="w-6 h-6" /> },
};

export default function InvoiceView() {
  const pathLocale = splitLocaleFromPath(window.location.pathname).locale;
  const [receiptLocale, setReceiptLocale] = useState<ManualInvoiceLocale | null>(null);
  const locale = receiptLocale ?? pathLocale;
  const { t } = useTranslation("orders", { lng: locale });
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"unavailable" | "expired" | "s6" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<"confirmed" | "rejected" | null>(null);
  const printerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (actionDone === "confirmed" && invoice?.status === "confirmed") {
      printerRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [actionDone, invoice?.status]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setInvoice(null);
    setActionDone(null);
    setReceiptLocale(null);
    async function load() {
      try {
        const r = await fetch(`/api/invoice/${encodeURIComponent(token)}`, { signal: controller.signal });
        const d = await r.json();
        const storedLocale = d.success ? d.data?.invoiceLocale : d.invoiceLocale;
        const language = storedLocale === "ckb" ? "ckb" : "ar";
        if (d.success || storedLocale) await loadLocale(language);
        if (controller.signal.aborted) return;
        if (d.success || storedLocale) setReceiptLocale(language);
        if (r.ok && d.success) setInvoice(d.data);
        else setError(r.status === 410 ? "expired" : r.status === 404 ? "unavailable" : "s6");
      } catch {
        if (!controller.signal.aborted) setError("s6");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [token]);

  const actionError = (status: number, message: unknown) => {
    if (locale === "ar" && typeof message === "string") return message;
    if (status === 410) return t("invoice-view.expired");
    if (status === 404) return t("invoice-view.unavailable");
    return status === 400 || status === 409 ? t("invoice-view.review") : t("invoice-view.s8");
  };

  const handleConfirm = async () => {
    // Unlock and prefetch the existing printer sound within the original click.
    // This is silent, even if the customer cancels or confirmation fails.
    primeReceiptPrinterAudio();
    if (!confirm(t("invoice-view.s7"))) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/invoice/${token}/confirm`, {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ whatsappMarketingOptIn: true }),
      });
      const d = await r.json();
      if (d.success) {
        setActionDone("confirmed");
        setInvoice(prev => prev ? { ...prev, status: "confirmed", orderId: d.orderId ?? prev.orderId } : prev);
      } else {
        alert(actionError(r.status, d.message));
      }
    } catch {
      alert(t("invoice-view.s8"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(t("invoice-view.s9"))) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/invoice/${token}/reject`, {
        method: "POST",
        headers: addCsrfHeader(),
        credentials: "include",
      });
      const d = await r.json();
      if (d.success) {
        setActionDone("rejected");
        setInvoice(prev => prev ? { ...prev, status: "rejected" } : prev);
      } else {
        alert(actionError(r.status, d.message));
      }
    } catch {
      alert(t("invoice-view.s8"));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page:    { minHeight: "100vh", background: "#0a0f1a", color: "#e2e8f0", fontFamily: locale === "ckb" ? "'Noto Sans Arabic', Tahoma, sans-serif" : "'Cairo', Tahoma, sans-serif", padding: "16px 12px", direction: "rtl" as const },
    card:    { maxWidth: 460, margin: "0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" },
    header:  { background: "linear-gradient(135deg, #0d1b2a 0%, #0B93A620 100%)", padding: "24px 20px", textAlign: "center" as const, borderBottom: "1px solid rgba(11,147,166,0.2)" },
    logo:    { fontSize: 24, fontWeight: 800, color: "#0B93A6", letterSpacing: 3, marginBottom: 2 },
    invNo:   { color: "#94a3b8", fontSize: 12, marginTop: 4 },
    body:    { padding: "20px" },
    section: { marginBottom: 16 },
    label:   { color: "#64748b", fontSize: 11, marginBottom: 2 },
    value:   { color: "#e2e8f0", fontWeight: 600, fontSize: 13 },
    divider: { borderTop: "1px solid rgba(255,255,255,0.06)", margin: "12px 0" },
    itemRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    itemImg: { width: 44, height: 44, borderRadius: 8, objectFit: "cover" as const, background: "#1e2a3a", flexShrink: 0 },
    itemName:{ flex: 1 },
    badge:   (color: string) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 999, background: `${color}20`, color, fontWeight: 700, fontSize: 13, border: `1px solid ${color}40` }),
    total:   { background: "rgba(11,147,166,0.08)", borderRadius: 10, padding: "14px", border: "1px solid rgba(11,147,166,0.2)" },
    btnOk:   { width: "100%", padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    btnNo:   { width: "100%", padding: "12px", borderRadius: 10, background: "transparent", color: "#ef4444", fontSize: 15, fontWeight: 600, border: "1px solid #ef444440", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    success: { textAlign: "center" as const, padding: "30px 20px" },
    rejected:{ textAlign: "center" as const, padding: "30px 20px" },
    promoBox:{ background: "linear-gradient(145deg, rgba(11,147,166,0.05), rgba(201,122,46,0.05))", border: "1px solid rgba(201,122,46,0.2)", borderRadius: 12, padding: "14px", marginTop: "20px", display: "flex", gap: "10px", alignItems: "flex-start" }
  };

  if (loading) return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="animate-spin" style={{ color: "#0B93A6" }} size={40} />
    </div>
  );

  if (error) return (
    <div lang={locale} dir="rtl" style={s.page}>
      <div style={{ ...s.card, textAlign: "center", padding: 40 }}>
        <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ color: "#ef4444", marginBottom: 8 }}>{t("invoice-view.s10")}</h2>
        <p style={{ color: "#94a3b8" }}>{t(`invoice-view.${error}`)}</p>
      </div>
    </div>
  );

  if (!invoice) return null;

  const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.sent;
  const receiptDate = new Date(invoice.confirmedAt ?? invoice.createdAt);
  const receiptDateLabel = Number.isNaN(receiptDate.getTime()) ? undefined : receiptDate.toLocaleString(LOCALES[locale].intl, { timeZone: "Asia/Baghdad", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="manual-invoice-receipt" lang={locale} dir="rtl" style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>AQUAVO</div>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>{t("invoice-view.s11")}</div>
          <div style={s.invNo}>{t("invoice-view.s12")} {invoice.invoiceNo}</div>
          <div style={{ marginTop: 12 }}>
            <span style={s.badge(statusCfg.color)}>
              {statusCfg.icon} {t(statusCfg.label)}
            </span>
          </div>
        </div>

        <div style={s.body}>
          {/* بيانات العميل */}
          <div style={s.section}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={s.label}>{t("invoice-view.s13")}</div>
                <div style={s.value}>{invoice.customerName}</div>
              </div>
              {invoice.customerCity && (
                <div>
                  <div style={s.label}>{t("invoice-view.s14")}</div>
                  <div style={{ ...s.value, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={14} color="#0B93A6" /> {invoice.customerCity}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={s.divider} />

          {/* المنتجات */}
          <div style={s.section}>
            <div style={{ ...s.label, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Package size={16} color="#0B93A6" /> {t("invoice-view.s15")}
            </div>
            {invoice.items.map((item, i) => (
              <div key={i} style={s.itemRow}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={s.itemImg} />
                ) : (
                  <div style={{ ...s.itemImg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={20} color="#0B93A6" />
                  </div>
                )}
                <div style={s.itemName}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  {item.variantLabel && !item.name.endsWith(` — ${item.variantLabel}`) && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{item.variantLabel}</div>}
                  <div style={{ color: "#64748b", fontSize: 12 }}>{t("invoice-view.s16")} {item.quantity} × {item.unitPrice.toLocaleString(LOCALES[locale].intl)} {t("invoice-view.s17")}</div>
                </div>
                <div style={{ color: "#0B93A6", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {item.total.toLocaleString(LOCALES[locale].intl)} {t("invoice-view.s17")}
                </div>
              </div>
            ))}
          </div>

          <div style={s.divider} />

          {/* الإجماليات */}
          <div style={s.total}>
            {[
              { label: t("invoice-view.s18"), value: invoice.subtotal },
              ...(invoice.discount > 0 ? [{ label: t("invoice-view.s19"), value: -invoice.discount }] : []),
              ...(invoice.delivery > 0 ? [{ label: t("invoice-view.s20", { v0: invoice.customerCity || "..." }), value: invoice.delivery }] : []),
              ...((invoice.total - (invoice.subtotal - invoice.discount + invoice.delivery)) > 0 
                  ? [{ label: t("invoice-view.s21"), value: (invoice.total - (invoice.subtotal - invoice.discount + invoice.delivery)) }] 
                  : []),
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#94a3b8" }}>{row.label}</span>
                <span style={{ color: row.value < 0 ? "#22c55e" : "#e2e8f0" }}>
                  {row.value < 0 ? "-" : ""}{Math.abs(row.value).toLocaleString(LOCALES[locale].intl)} {t("invoice-view.s17")}
                </span>
              </div>
            ))}
            <div style={{ ...s.divider, margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: "#0B93A6" }}>{t("invoice-view.s22")}</span>
              <span style={{ color: "var(--aqv-warning)" }}>{invoice.total.toLocaleString(LOCALES[locale].intl)} {t("invoice-view.s17")}</span>
            </div>
          </div>

          {/* انتهاء الصلاحية */}
          {invoice.expiresAt && invoice.status === "sent" && (
            <div style={{ marginTop: 12, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
              {t("invoice-view.s23")} {new Date(invoice.expiresAt).toLocaleString(LOCALES[locale].intl, { timeZone: "Asia/Baghdad" })}
            </div>
          )}

          {/* أزرار الإجراء */}
          {invoice.status === "sent" && !actionDone && (
            <div className="manual-invoice-screen-only" style={{ marginTop: 24 }}>
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(11,147,166,0.06)", border: "1px solid rgba(11,147,166,0.18)", color: "#94a3b8", fontSize: 12, lineHeight: 1.8 }}>
                {t("invoice-view.s42")}
              </div>
              <button
                style={s.btnOk}
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {t("invoice-view.s24")}
              </button>
              <button
                style={s.btnNo}
                onClick={handleReject}
                disabled={actionLoading}
              >
                <XCircle size={18} /> {t("invoice-view.s25")}
              </button>
            </div>
          )}

          {/* حالة القبول */}
          {(actionDone === "confirmed" || invoice.status === "confirmed") && (
            <div style={s.success}>
              <CheckCircle2 size={56} color="#22c55e" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ color: "#22c55e", marginBottom: 8 }}>{t("invoice-view.s26")}</h2>
              <p style={{ color: "#94a3b8" }}>{t("invoice-view.s27")}</p>
              <p>{t("invoice-view.s28")} <bdi>{invoice.invoiceNo}</bdi></p>
              <a className="manual-invoice-screen-only" href={localizePath("/order-tracking", locale)} style={{ textDecoration: "underline" }}>
                {t("order-confirmation.s22")}
              </a>
            </div>
          )}

          {/* Same visual receipt as checkout, only after a successful order. */}
          {(invoice.status === "confirmed" || invoice.status === "completed") && invoice.items.length > 0 && (
            <div ref={printerRef} className="manual-invoice-screen-only" style={{ marginTop: 12, scrollMarginTop: 16 }}>
              <OrderReceiptPrinter
                key={token}
                orderNumber={invoice.invoiceNo}
                receiptLocale={locale === "ckb" ? "ckb" : "ar"}
                items={invoice.items.map(item => ({
                  productId: item.productId,
                  productName: item.name,
                  variantLabel: item.variantLabel && !item.name.endsWith(` — ${item.variantLabel}`) ? item.variantLabel : undefined,
                  quantity: item.quantity,
                  priceAtPurchase: String(item.unitPrice),
                }))}
                subtotal={invoice.subtotal}
                deliveryFee={invoice.delivery}
                discount={invoice.discount}
                total={invoice.total}
                roundingAdjustment={invoice.total - (invoice.subtotal - invoice.discount + invoice.delivery)}
                paymentLabel={t("order-confirmation.s13")}
                dateLabel={receiptDateLabel}
              />
            </div>
          )}

          {/* حالة الرفض */}
          {(actionDone === "rejected" || invoice.status === "rejected") && (
            <div style={s.rejected}>
              <XCircle size={56} color="#ef4444" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ color: "#ef4444", marginBottom: 8 }}>{t("invoice-view.s29")}</h2>
              <p style={{ color: "#94a3b8" }}>{t("invoice-view.s30")}</p>
            </div>
          )}

          {/* ملغاة */}
          {invoice.status === "cancelled" && (
            <div style={{ ...s.rejected }}>
              <AlertTriangle size={48} color="#6b7280" style={{ margin: "0 auto 16px" }} />
              <p style={{ color: "#94a3b8" }}>{t("invoice-view.s31")}</p>
            </div>
          )}

          {/* Promo Box */}
          <button type="button" className="manual-invoice-screen-only" onClick={() => window.print()}
            style={{ ...s.btnNo, color: "#0B93A6", borderColor: "#0B93A6", marginTop: 16 }}>
            {t("order-confirmation.s74")}
          </button>
          <div className="manual-invoice-screen-only" style={s.promoBox}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <Sparkles color="#C97A2E" size={24} />
            </div>
            <div>
              <h4 style={{ color: "var(--aqv-warning)", margin: "0 0 4px 0", fontSize: 13, fontWeight: 800 }}>{t("invoice-view.s32")}</h4>
              <p style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
                {t("invoice-view.s33")} <span style={{color: "#0B93A6", fontWeight: 700}}>{t("invoice-view.s34")}</span> {t("invoice-view.s35")} <span style={{color: "#0B93A6", fontWeight: 700}}>{t("invoice-view.s36")}</span> {t("invoice-view.s37")}
                <span style={{color: "#22c55e", fontWeight: 700}}> {t("invoice-view.s38")}</span> {t("invoice-view.s39")}
                <br/>
                <a href={localizePath("/register", locale)} target="_blank" rel="noopener noreferrer" style={{ color: "#0B93A6", textDecoration: "underline", display: "inline-block", marginTop: 8, fontWeight: 700 }}>{t("invoice-view.s40")}</a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", color: "#475569", fontSize: 12 }}>
          {t("invoice-view.s41")}
        </div>
      </div>
    </div>
  );
}
