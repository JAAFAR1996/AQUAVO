import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Trash2, Send, Save, X, Package, Copy, ExternalLink, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";

interface Product {
  id: string;
  name: string;
  price: string;
  thumbnail?: string;
  images?: string[];
  category?: string;
  brand?: string;
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

const CATEGORY_LABELS: Record<string, string> = {
  filters: "فلاتر", lighting: "إضاءة", pumps: "مضخات",
  "air-pumps": "هواء", heating: "تدفئة", accessories: "ملحقات",
  food: "أعلاف", plants: "نباتات", fish: "أسماك",
  substrate: "تربة", wood: "أخشاب", decor: "ديكور",
};

interface KnownCustomer {
  name: string;
  phone: string;
  city: string;
  address: string;
}

/** Extract city+address from a shippingAddress that can be string|object */
function parseAddr(raw: unknown): { city: string; address: string } {
  if (!raw) return { city: "", address: "" };
  // If it's an object (jsonb) — extract fields directly
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, string>;
    return { city: obj.city || "", address: obj.addressLine1 || obj.address || "" };
  }
  // If it's a string
  if (typeof raw === "string") {
    const str = raw.trim();
    // Try JSON first
    try {
      const obj = JSON.parse(str) as Record<string, string>;
      return { city: obj.city || "", address: obj.addressLine1 || obj.address || "" };
    } catch { /* not JSON */ }
    // Plain string like "بغداد - الكرخ، شارع 10" → split on first " - "
    const dashIdx = str.indexOf(" - ");
    if (dashIdx > 0) {
      return { city: str.slice(0, dashIdx).trim(), address: str.slice(dashIdx + 3).trim() };
    }
    // No dash — treat whole string as address
    return { city: "", address: str };
  }
  return { city: "", address: "" };
}

export default function ManualInvoiceCreator({ onClose, onSaved }: ManualInvoiceCreatorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // بيانات العميل
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Autocomplete — قاعدة بيانات الزبائن السابقين
  const [knownCustomers, setKnownCustomers] = useState<KnownCustomer[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<KnownCustomer[]>([]);
  const [showNameDrop, setShowNameDrop] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameSuggestRef = useRef<HTMLDivElement>(null);

  // المنتجات
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // الأسعار
  const [discount, setDiscount] = useState(0);
  const [delivery, setDelivery] = useState(0);

  // نتيجة الإنشاء
  const [createdInvoice, setCreatedInvoice] = useState<{ invoiceNo: string; customerLink: string; whatsappUrl: string } | null>(null);

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const rawTotal = Math.max(0, subtotal - discount + delivery);
  const total = Math.ceil(rawTotal / 250) * 250;
  const roundingDifference = total - rawTotal;

  // ── جلب الزبائن السابقين عند فتح النموذج ──────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/orders", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((orders: Array<{ customerName?: string; customerPhone?: string; shippingAddress?: unknown }>) => {
        // نأخذ أحدث طلب لكل اسم زبون (وليس لكل رقم هاتف)
        const seen = new Map<string, KnownCustomer>();
        for (const o of orders) {
          const name = (o.customerName || "").trim();
          const phone = (o.customerPhone || "").trim();
          if (!name) continue;
          const key = name;
          if (!seen.has(key)) {
            const { city, address } = parseAddr(o.shippingAddress);
            seen.set(key, { name, phone, city, address });
          }
        }
        setKnownCustomers(Array.from(seen.values()));
      })
      .catch(() => {});
  }, []);

  // ── فلترة الاقتراحات بحسب ما يكتبه الأدمن ──────────────────────────────────
  useEffect(() => {
    const q = customerName.trim();
    if (q.length < 2) { setNameSuggestions([]); setShowNameDrop(false); return; }
    const filtered = knownCustomers.filter(c =>
      c.name.includes(q) || c.name.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);
    setNameSuggestions(filtered);
    setShowNameDrop(filtered.length > 0);
  }, [customerName, knownCustomers]);

  // ── إغلاق dropdown الاسم عند النقر خارجه ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        nameSuggestRef.current && !nameSuggestRef.current.contains(e.target as Node) &&
        nameInputRef.current && !nameInputRef.current.contains(e.target as Node)
      ) setShowNameDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyCustomer = (c: KnownCustomer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    if (c.city) setCustomerCity(c.city);
    if (c.address) setCustomerAddress(c.address);
    setShowNameDrop(false);
    setTimeout(() => nameInputRef.current?.blur(), 50);
  };

  // ── Smart AI Search (uses embedding semantic search with text fallback) ──────
  const searchProducts = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    setDropdownOpen(true);
    try {
      // Try smart semantic search first
      const r = await fetch(`/api/products/smart-search?q=${encodeURIComponent(trimmed)}`, {
        credentials: "include",
      });
      const d = await r.json();
      const products: Product[] = d.products || [];

      // If < 3 results from smart search, supplement with regular search
      if (products.length < 3) {
        const r2 = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}&limit=15`, {
          credentials: "include",
        });
        const d2 = await r2.json();
        const extra: Product[] = (d2.products || []).filter(
          (p: Product) => !products.find((sp) => sp.id === p.id)
        );
        setSearchResults([...products, ...extra].slice(0, 15));
      } else {
        setSearchResults(products.slice(0, 15));
      }
    } catch {
      // Fallback to plain search
      try {
        const r = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}&limit=15`, {
          credentials: "include",
        });
        const d = await r.json();
        setSearchResults(d.products || []);
      } catch { /* silent */ }
    } finally {
      setSearching(false);
      setHighlightedIdx(-1);
    }
  }, []);

  // Debounce — 200ms (faster feel than 300ms)
  useEffect(() => {
    const t = setTimeout(() => searchProducts(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery, searchProducts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Flat list of all selectable items (for keyboard nav) ──────────────────
  type FlatItem = { product: Product; variant: { id: string; label: string; price: number } | null };
  const flatItems: FlatItem[] = searchResults.flatMap((p): FlatItem[] => {
    if (p.hasVariants && p.variants && p.variants.length > 0) {
      return p.variants.map((v): FlatItem => ({ product: p, variant: v }));
    }
    return [{ product: p, variant: null }];
  });

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      const sel = flatItems[highlightedIdx];
      if (sel) {
        if (sel.variant) {
          addItem(sel.product, sel.variant.id, sel.variant.label, sel.variant.price);
        } else {
          addItem(sel.product);
        }
      }
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIdx >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.querySelector(`[data-idx="${highlightedIdx}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIdx]);

  const addItem = (product: Product, variantId?: string, variantLabel?: string, variantPrice?: number) => {
    const unitPrice = variantPrice ?? Number(product.price);
    const name = variantLabel ? `${product.name} — ${variantLabel}` : product.name;
    const imageUrl = product.thumbnail || product.images?.[0];
    const existing = items.find((i) => i.productId === product.id && i.variantId === variantId);
    if (existing) {
      setItems(items.map((i) =>
        i.productId === product.id && i.variantId === variantId
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i
      ));
    } else {
      setItems([...items, { productId: product.id, variantId, variantLabel, name, quantity: 1, unitPrice, total: unitPrice, imageUrl }]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setDropdownOpen(false);
    setHighlightedIdx(-1);
    searchInputRef.current?.focus();
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
      const r1 = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ customerName, customerPhone, customerCity, customerAddress, customerNotes, items, subtotal, discount, delivery, total }),
      });
      const d1 = await r1.json();
      if (!d1.success) throw new Error(d1.message);

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
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto" as const, padding: "24px 16px" },
    modal:   { width: "100%", maxWidth: 720, background: "#0d1b2a", border: "1px solid rgba(11,147,166,0.2)", borderRadius: 20, overflow: "hidden", fontFamily: "'Cairo','Changa',sans-serif", direction: "rtl" as const, color: "#e2e8f0" },
    header:  { background: "linear-gradient(135deg, #0B1E28, #112240)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(11,147,166,0.2)" },
    body:    { padding: "24px" },
    label:   { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 600 },
    input:   { width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
    select:  { width: "100%", padding: "10px 14px", borderRadius: 10, background: "#0d1b2a", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 14 },
    grid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
    section: { marginBottom: 20 },
    divider: { borderTop: "1px solid rgba(255,255,255,0.06)", margin: "20px 0" },
    itemRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    btnPrimary: { padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #0B93A6, #075F6B)", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
    btnSecondary: { padding: "12px 24px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
    btnGreen: { padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
    searchDrop: { position: "absolute" as const, top: "calc(100% + 4px)", right: 0, left: 0, background: "#0d1e33", border: "1px solid rgba(11,147,166,0.35)", borderRadius: 12, zIndex: 50, maxHeight: 380, overflowY: "auto" as const, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
    total:   { background: "rgba(11,147,166,0.06)", borderRadius: 12, padding: "16px", border: "1px solid rgba(11,147,166,0.15)" },
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

  // ── Main Form ────────────────────────────────────────────────────────────────
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
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0B93A6", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              👤 بيانات العميل
            </div>
            <div style={s.grid2}>
              <div style={{ position: "relative" }}>
                <label style={s.label}>الاسم <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  ref={nameInputRef}
                  style={{
                    ...s.input,
                    border: showNameDrop ? "1px solid rgba(11,147,166,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: showNameDrop ? "0 0 0 3px rgba(11,147,166,0.1)" : "none",
                    borderRadius: showNameDrop ? "10px 10px 0 0" : 10,
                  }}
                  placeholder="أحمد محمد"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  onFocus={() => { if (nameSuggestions.length > 0) setShowNameDrop(true); }}
                  autoComplete="off"
                />
                {/* ── اقتراحات الأسماء ── */}
                {showNameDrop && nameSuggestions.length > 0 && (
                  <div
                    ref={nameSuggestRef}
                    style={{
                      position: "absolute", top: "calc(100% + 0px)", right: 0, left: 0,
                      background: "#0d1e33", border: "1px solid rgba(11,147,166,0.4)",
                      borderTop: "none", borderRadius: "0 0 10px 10px",
                      zIndex: 100, maxHeight: 240, overflowY: "auto",
                      boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                    }}
                  >
                    {nameSuggestions.map((c, i) => (
                      <div
                        key={i}
                        onMouseDown={e => { e.preventDefault(); applyCustomer(c); }}
                        style={{
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: i < nameSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                          display: "flex", flexDirection: "column", gap: 2,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(11,147,166,0.12)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{c.name}</span>
                        <span style={{ fontSize: 12, color: "#64748b", direction: "ltr" as const, display: "flex", gap: 8 }}>
                          <span>📞 {c.phone}</span>
                          {c.city && <span>📍 {c.city}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0B93A6", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              📦 المنتجات
            </div>

            {/* ── Smart Search Box ── */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                {/* Search icon */}
                {searching
                  ? <Loader2 size={16} color="#0B93A6" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", animation: "spin 1s linear infinite" }} />
                  : <Search size={16} color={dropdownOpen ? "#0B93A6" : "#475569"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", transition: "color 0.2s" }} />
                }
                <input
                  ref={searchInputRef}
                  style={{
                    ...s.input,
                    paddingRight: 38,
                    border: dropdownOpen ? "1px solid rgba(11,147,166,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: dropdownOpen ? "0 0 0 3px rgba(11,147,166,0.1)" : "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    borderRadius: dropdownOpen && (searchResults.length > 0 || searching) ? "10px 10px 0 0" : 10,
                  }}
                  placeholder="ابحث باسم المنتج، الفئة، أو الماركة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.trim()) setDropdownOpen(true); }}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {/* ── Dropdown ── */}
              {dropdownOpen && (searching || searchResults.length > 0) && (
                <div style={s.searchDrop} ref={dropdownRef}>
                  {/* Loading */}
                  {searching && searchResults.length === 0 && (
                    <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: 10, color: "#64748b", fontSize: 13 }}>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      جاري البحث...
                    </div>
                  )}

                  {/* Results */}
                  {searchResults.map((product) => {
                    const catLabel = CATEGORY_LABELS[product.category || ""] || product.category || "";
                    const thumb = product.thumbnail || product.images?.[0];

                    if (product.hasVariants && product.variants && product.variants.length > 0) {
                      // Product with variants: show header + collapsed variants
                      const isExpanded = expandedProduct === product.id;
                      return (
                        <div key={product.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {/* Parent row — click to expand */}
                          <div
                            style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                            onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(11,147,166,0.07)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            {/* Thumbnail */}
                            {thumb
                              ? <img src={thumb} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                              : <div style={{ width: 36, height: 36, borderRadius: 6, background: "#1a2a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={14} color="#0B93A6" /></div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                {catLabel && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(11,147,166,0.15)", color: "#0B93A6" }}>{catLabel}</span>}
                                <span style={{ fontSize: 11, color: "#64748b" }}>{product.variants.length} خيار</span>
                              </div>
                            </div>
                            <ChevronDown size={14} color="#64748b" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                          </div>

                          {/* Variant rows */}
                          {isExpanded && product.variants.map((v, vi) => {
                            const globalIdx = flatItems.findIndex((fi: FlatItem) => fi.product.id === product.id && fi.variant?.id === v.id);
                            const isHighlighted = globalIdx === highlightedIdx;
                            return (
                              <div
                                key={v.id}
                                data-idx={globalIdx}
                                style={{
                                  padding: "9px 14px 9px 14px",
                                  paddingRight: 62,
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: 13,
                                  background: isHighlighted ? "rgba(11,147,166,0.15)" : vi % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                                  borderTop: "1px solid rgba(255,255,255,0.03)",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(11,147,166,0.12)"; setHighlightedIdx(globalIdx); }}
                                onMouseLeave={e => { e.currentTarget.style.background = isHighlighted ? "rgba(11,147,166,0.15)" : vi % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"; }}
                                onClick={() => addItem(product, v.id, v.label, v.price)}
                              >
                                <span style={{ color: "#c8d8e8" }}>↳ {v.label}</span>
                                <span style={{ color: "var(--aqv-warning)", fontWeight: 700, fontSize: 13 }}>{v.price.toLocaleString("en-US")} د.ع</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    // Simple product
                    const globalIdx = flatItems.findIndex((fi: FlatItem) => fi.product.id === product.id && fi.variant === null);
                    const isHighlighted = globalIdx === highlightedIdx;
                    return (
                      <div
                        key={product.id}
                        data-idx={globalIdx}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: isHighlighted ? "rgba(11,147,166,0.15)" : "transparent",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(11,147,166,0.12)"; setHighlightedIdx(globalIdx); }}
                        onMouseLeave={e => { e.currentTarget.style.background = isHighlighted ? "rgba(11,147,166,0.15)" : "transparent"; }}
                        onClick={() => addItem(product)}
                      >
                        {/* Thumbnail */}
                        {thumb
                          ? <img src={thumb} alt="" style={{ width: 38, height: 38, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
                          : <div style={{ width: 38, height: 38, borderRadius: 7, background: "#1a2a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={14} color="#0B93A6" /></div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
                          {catLabel && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(11,147,166,0.15)", color: "#0B93A6", marginTop: 2, display: "inline-block" }}>{catLabel}</span>
                          )}
                        </div>
                        <span style={{ color: "var(--aqv-warning)", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{Number(product.price).toLocaleString("en-US")} د.ع</span>
                      </div>
                    );
                  })}

                  {/* No results */}
                  {!searching && searchResults.length === 0 && searchQuery.length >= 1 && (
                    <div style={{ padding: "18px", color: "#64748b", textAlign: "center", fontSize: 13 }}>
                      لا توجد نتائج لـ "{searchQuery}"
                    </div>
                  )}

                  {/* Hint */}
                  {searchResults.length > 0 && (
                    <div style={{ padding: "8px 14px", fontSize: 11, color: "#334155", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      ↑↓ للتنقل · Enter للاختيار · Esc للإغلاق
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* قائمة المضاف */}
            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "#475569", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10 }}>
                <Package size={32} style={{ margin: "0 auto 8px" }} />
                <div>ابحث عن منتج وأضفه للفاتورة</div>
                <div style={{ fontSize: 12, marginTop: 4, color: "#334155" }}>يمكنك البحث بالاسم العربي أو الإنجليزي أو الفئة</div>
              </div>
            ) : (
              <>
                {items.map((item, idx) => (
                  <div key={idx} style={s.itemRow}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1e2a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={18} color="#0B93A6" /></div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{item.unitPrice.toLocaleString("en-US")} د.ع / قطعة</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => updateQuantity(idx, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", cursor: "pointer" }}>-</button>
                      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(11,147,166,0.15)", border: "1px solid rgba(11,147,166,0.3)", color: "#0B93A6", cursor: "pointer" }}>+</button>
                    </div>
                    <div style={{ color: "var(--aqv-warning)", fontWeight: 700, minWidth: 90, textAlign: "left" as const, fontSize: 13 }}>
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
              <span style={{ color: "#0B93A6" }}>الإجمالي</span>
              <span style={{ color: "var(--aqv-warning)" }}>{total.toLocaleString("en-US")} د.ع</span>
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
