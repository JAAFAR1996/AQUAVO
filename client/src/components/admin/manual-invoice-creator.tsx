import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Send, Save, X, Package, Copy, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";

interface Product {
  id: string;
  name: string;
  price: string;
  thumbnail?: string;
  images?: string[];
  hasVariants?: boolean;
  variants?: Array<{ id: string; label: string; price: number }>;
}

interface InvoiceItem {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imageUrl?: string;
}

interface ManualInvoiceCreatorProps {
  onClose: () => void;
  onSaved?: () => void;
}

const CITIES = ["بغداد", "البصرة", "أربيل", "الموصل", "النجف", "كربلاء", "كركوك", "الأنبار", "ديالى", "ذي قار", "المثنى", "ميسان", "القادسية", "بابل", "واسط", "صلاح الدين", "نينوى", "دهوك", "السليمانية", "حلبجة"];

export default function ManualInvoiceCreator({ onClose, onSaved }: ManualInvoiceCreatorProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1); // 1: بيانات، 2: معاينة
  const [saving, setSaving] = useState(false);

  // بيانات العميل
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // المنتجات
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // الأسعار
  const [discount, setDiscount] = useState(0);
  const [delivery, setDelivery] = useState(0);

  // نتيجة الإنشاء
  const [createdInvoice, setCreatedInvoice] = useState<{ invoiceNo: string; customerLink: string; whatsappUrl: string } | null>(null);

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const rawTotal = Math.max(0, subtotal - discount + delivery);
  // التقريب لأقرب 250 دينار عراقي تصاعدياً
  const total = Math.ceil(rawTotal / 250) * 250;
  const roundingDifference = total - rawTotal;

  // بحث المنتجات
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`, { credentials: "include" });
      const d = await r.json();
      setSearchResults(d.products || []);
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchProducts]);

  const addItem = (product: Product, variantId?: string, variantLabel?: string, variantPrice?: number) => {
    const unitPrice = variantPrice ?? Number(product.price);
    const name = variantLabel ? `${product.name} — ${variantLabel}` : product.name;
    const imageUrl = product.thumbnail || product.images?.[0];
    const existing = items.find(i => i.productId === product.id && i.variantId === variantId);
    if (existing) {
      setItems(items.map(i =>
        i.productId === product.id && i.variantId === variantId
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i
      ));
    } else {
      setItems([...items, { productId: product.id, variantId, variantLabel, name, quantity: 1, unitPrice, total: unitPrice, imageUrl }]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (idx: number, qty: number) => {
    if (qty <= 0) { removeItem(idx); return; }
    setItems(items.map((item, i) => i === idx ? { ...item, quantity: qty, total: qty * item.unitPrice } : item));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const validate = () => {
    if (!customerName.trim()) { toast({ title: "خطأ", description: "أدخل اسم العميل", variant: "destructive" }); return false; }
    if (!customerPhone.trim()) { toast({ title: "خطأ", description: "أدخل رقم الهاتف", variant: "destructive" }); return false; }
    if (items.length === 0) { toast({ title: "خطأ", description: "أضف منتجاً واحداً على الأقل", variant: "destructive" }); return false; }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ customerName, customerPhone, customerCity, customerAddress, customerNotes, items, subtotal, discount, delivery, total }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast({ title: "✅ تم الحفظ كمسودة", description: `الفاتورة ${d.data.invoiceNo} محفوظة` });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSendToCustomer = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Create first
      const r1 = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ customerName, customerPhone, customerCity, customerAddress, customerNotes, items, subtotal, discount, delivery, total }),
      });
      const d1 = await r1.json();
      if (!d1.success) throw new Error(d1.message);

      // Send
      const r2 = await fetch(`/api/admin/invoices/${d1.data.id}/send`, {
        method: "POST",
        headers: addCsrfHeader(),
        credentials: "include",
      });
      const d2 = await r2.json();
      if (!d2.success) throw new Error(d2.message);

      setCreatedInvoice({ invoiceNo: d2.data.invoiceNo, customerLink: d2.customerLink, whatsappUrl: d2.whatsappUrl });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto" as const, padding: "24px 16px" },
    modal:   { width: "100%", maxWidth: 720, background: "#0d1b2a", border: "1px solid rgba(25,155,184,0.2)", borderRadius: 20, overflow: "hidden", fontFamily: "'Cairo','Changa',sans-serif", direction: "rtl" as const, color: "#e2e8f0" },
    header:  { background: "linear-gradient(135deg, #0a1628, #112240)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(25,155,184,0.2)" },
    body:    { padding: "24px" },
    label:   { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 600 },
    input:   { width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
    select:  { width: "100%", padding: "10px 14px", borderRadius: 10, background: "#0d1b2a", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 14 },
    grid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
    section: { marginBottom: 20 },
    divider: { borderTop: "1px solid rgba(255,255,255,0.06)", margin: "20px 0" },
    itemRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    btnPrimary: { padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #199bb8, #0d7d96)", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
    btnSecondary: { padding: "12px 24px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
    btnGreen: { padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
    searchDrop: { position: "absolute" as const, top: "100%", right: 0, left: 0, background: "#112240", border: "1px solid rgba(25,155,184,0.3)", borderRadius: 10, zIndex: 50, maxHeight: 300, overflowY: "auto" as const, marginTop: 4 },
    total:   { background: "rgba(25,155,184,0.06)", borderRadius: 12, padding: "16px", border: "1px solid rgba(25,155,184,0.15)" },
  };

  // ── Success Screen ───────────────────────────────────────────────────────────
  if (createdInvoice) {
    return (
      <div style={s.overlay}>
        <div style={s.modal}>
          <div style={s.header}>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#22c55e" }}>✅ تم إنشاء الفاتورة وإرسالها</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={22} /></button>
          </div>
          <div style={{ ...s.body, textAlign: "center" as const }}>
            <CheckCircle2 size={64} color="#22c55e" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>الفاتورة {createdInvoice.invoiceNo} جاهزة!</h3>
            <p style={{ color: "#94a3b8", marginBottom: 24 }}>أرسل الرابط للعميل عبر واتساب</p>

            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, direction: "ltr" as const }}>
              <span style={{ flex: 1, fontSize: 13, color: "#94a3b8", wordBreak: "break-all" as const, textAlign: "left" as const }}>{createdInvoice.customerLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(createdInvoice.customerLink); toast({ title: "✅ تم النسخ" }); }}
                style={{ ...s.btnSecondary, padding: "8px 12px", flexShrink: 0 }}
              >
                <Copy size={16} />
              </button>
            </div>

            <a href={createdInvoice.whatsappUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...s.btnGreen, justifyContent: "center", textDecoration: "none", display: "flex", marginBottom: 12 }}>
              <ExternalLink size={18} /> فتح واتساب وإرسال الفاتورة
            </a>
            <button onClick={onClose} style={{ ...s.btnSecondary, justifyContent: "center", width: "100%" }}>إغلاق</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>📄 فاتورة واتساب جديدة</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>أنشئ فاتورة للعميل وأرسلها كرابط</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={22} /></button>
        </div>

        <div style={s.body}>
          {/* ── بيانات العميل ── */}
          <div style={s.section}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#199bb8", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              👤 بيانات العميل
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>الاسم <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={s.input} placeholder="أحمد محمد" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>رقم الهاتف <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={s.input} placeholder="07xxxxxxxxx" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>المحافظة</label>
                <select style={s.select} value={customerCity} onChange={e => setCustomerCity(e.target.value)}>
                  <option value="">اختر المحافظة</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>العنوان التفصيلي</label>
                <input style={s.input} placeholder="الحي، الشارع، المنزل..." value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={s.label}>ملاحظات</label>
              <input style={s.input} placeholder="أي تفاصيل إضافية..." value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} />
            </div>
          </div>

          <div style={s.divider} />

          {/* ── المنتجات ── */}
          <div style={s.section}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#199bb8", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              📦 المنتجات
            </div>

            {/* بحث */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={16} color="#199bb8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  style={{ ...s.input, paddingRight: 36 }}
                  placeholder="ابحث عن منتج..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {(searching || searchResults.length > 0) && (
                <div style={s.searchDrop}>
                  {searching && <div style={{ padding: 12, color: "#64748b", textAlign: "center" }}>جاري البحث...</div>}
                  {searchResults.map(p => (
                    <div key={p.id}>
                      {p.hasVariants && p.variants && p.variants.length > 0 ? (
                        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ padding: "8px 14px", color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                          {p.variants.map(v => (
                            <div key={v.id}
                              style={{ padding: "8px 24px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 13 }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(25,155,184,0.1)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              onClick={() => addItem(p, v.id, v.label, v.price)}
                            >
                              <span>{v.label}</span>
                              <span style={{ color: "#199bb8" }}>{v.price.toLocaleString("en-US")} د.ع</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(25,155,184,0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          onClick={() => addItem(p)}
                        >
                          <span style={{ fontSize: 14 }}>{p.name}</span>
                          <span style={{ color: "#199bb8", fontWeight: 700 }}>{Number(p.price).toLocaleString("en-US")} د.ع</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                    <div style={{ padding: 12, color: "#64748b", textAlign: "center" }}>لا توجد نتائج</div>
                  )}
                </div>
              )}
            </div>

            {/* قائمة المضاف */}
            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "#475569", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10 }}>
                <Package size={32} style={{ margin: "0 auto 8px" }} />
                <div>ابحث عن منتج وأضفه للفاتورة</div>
              </div>
            ) : (
              <>
                {items.map((item, idx) => (
                  <div key={idx} style={s.itemRow}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1e2a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={18} color="#199bb8" /></div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{item.unitPrice.toLocaleString("en-US")} د.ع / قطعة</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => updateQuantity(idx, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", cursor: "pointer" }}>-</button>
                      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(25,155,184,0.15)", border: "1px solid rgba(25,155,184,0.3)", color: "#199bb8", cursor: "pointer" }}>+</button>
                    </div>
                    <div style={{ color: "#ffd700", fontWeight: 700, minWidth: 90, textAlign: "left" as const, fontSize: 13 }}>
                      {item.total.toLocaleString("en-US")} د.ع
                    </div>
                    <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={s.divider} />

          {/* ── الأسعار ── */}
          <div style={s.total}>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>خصم (د.ع)</label>
                <input style={s.input} type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
              </div>
              <div>
                <label style={s.label}>رسوم التوصيل (د.ع)</label>
                <input style={s.input} type="number" min="0" value={delivery} onChange={e => setDelivery(Number(e.target.value))} />
              </div>
            </div>
            {[
              { label: "المجموع الفرعي", value: subtotal },
              ...(discount > 0 ? [{ label: "الخصم", value: -discount }] : []),
              ...(delivery > 0 ? [{ label: `التوصيل إلى ${customerCity || "..."}`, value: delivery }] : []),
              ...(roundingDifference > 0 ? [{ label: "تقريب المبلغ", value: roundingDifference }] : []),
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: "#94a3b8" }}>{row.label}</span>
                <span style={{ color: row.value < 0 ? "#22c55e" : "#e2e8f0" }}>{row.value < 0 ? "-" : ""}{Math.abs(row.value).toLocaleString("en-US")} د.ع</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#199bb8" }}>الإجمالي</span>
              <span style={{ color: "#ffd700" }}>{total.toLocaleString("en-US")} د.ع</span>
            </div>
          </div>

          {/* ── الأزرار ── */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" as const }}>
            <button onClick={handleSendToCustomer} disabled={saving} style={{ ...s.btnGreen, flex: 1, justifyContent: "center" }}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              إرسال للعميل عبر واتساب
            </button>
            <button onClick={handleSaveDraft} disabled={saving} style={{ ...s.btnSecondary, justifyContent: "center" }}>
              <Save size={16} /> مسودة
            </button>
            <button onClick={onClose} style={{ ...s.btnSecondary, justifyContent: "center" }}>
              <X size={16} /> إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
