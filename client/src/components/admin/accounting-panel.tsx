import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Pencil,
} from "lucide-react";

type Period = "day" | "month" | "year";

interface Summary {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalPackaging: number;
  totalCoupons: number;
  totalLoyalty: number;
  totalShipping: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
}

interface ProductProfit {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  packaging: number;
  netProfit: number;
  margin: number;
  costPrice: number;
  packagingCost: number;
  insertCost: number;
}

interface OrderProfit {
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  status: string;
  createdAt: string;
  revenue: number;
  cogs: number;
  packaging: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  shipping: number;
  netProfit: number;
  margin: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "اليوم" },
  { value: "month", label: "هذا الشهر" },
  { value: "year",  label: "هذه السنة" },
];

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:           { label: "انتظار",     color: "#ef4444" },
  confirmed:         { label: "مؤكد",       color: "#3b82f6" },
  processing:        { label: "تجهيز",      color: "#f59e0b" },
  shipped:           { label: "عند الشركة", color: "#f97316" },
  delivered:         { label: "موصّل",      color: "#22c55e" },
  rejected:          { label: "مرفوض",      color: "#ef4444" },
  rejected_returned: { label: "رجع للبائع", color: "#f97316" },
  rejected_carrier:  { label: "بقي بالشركة",color: "#dc2626" },
  returned:          { label: "مسترجع",     color: "#a855f7" },
  cancelled:         { label: "ملغي",       color: "#6b7280" },
};

export default function AccountingPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("year");
  const [view, setView] = useState<"products" | "orders" | "cod" | "coupons">("products");
  const [editProduct, setEditProduct] = useState<ProductProfit | null>(null);
  const [costs, setCosts] = useState({ costPrice: 0, packagingCost: 0, insertCost: 0 });
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementForm, setSettlementForm] = useState({ carrier: "", amount: "", notes: "" });
  const [newCostDate, setNewCostDate] = useState("");
  const [costHistory, setCostHistory] = useState<Array<{
    id: string; effectiveFrom: string; costPrice: string; packagingCost: string; insertCost: string;
  }>>([]);

  const { data: summary, isLoading: loadingSum } = useQuery<Summary>({
    queryKey: ["accounting-summary", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/summary?period=${period}`, { credentials: "include" });
      const j = await r.json();
      return j.data;
    },
  });

  const { data: productRows = [], isLoading: loadingProds } = useQuery<ProductProfit[]>({
    queryKey: ["accounting-products", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/products?period=${period}`, { credentials: "include" });
      const j = await r.json();
      return j.data ?? [];
    },
  });

  const { data: orderRows = [], isLoading: loadingOrders } = useQuery<OrderProfit[]>({
    queryKey: ["accounting-orders", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/orders?period=${period}`, { credentials: "include" });
      const j = await r.json();
      return j.data ?? [];
    },
    enabled: view === "orders",
  });

  const { data: codData } = useQuery({
    queryKey: ["/api/admin/accounting/cod-summary"],
    queryFn: async () => {
      const r = await fetch("/api/admin/accounting/cod-summary", { credentials: "include" });
      if (!r.ok) throw new Error("failed");
      const j = await r.json();
      return j.data as {
        totalCod: number;
        totalReceived: number;
        totalPending: number;
        settlements: Array<{ id: string; carrier: string; amount: string; notes: string | null; createdAt: string }>;
      };
    },
  });

  const { data: couponsData } = useQuery({
    queryKey: ["/api/admin/accounting/coupons", period],
    queryFn: async () => {
      const periodParam = (period as string) || "month";
      const r = await fetch(`/api/admin/accounting/coupons?period=${periodParam}`, { credentials: "include" });
      if (!r.ok) throw new Error("failed");
      const j = await r.json();
      return j.data as Array<{ couponCode: string; usageCount: number; totalDiscount: number; avgDiscount: number }>;
    },
  });

  const saveCosts = useMutation({
    mutationFn: async () => {
      if (!editProduct) return;
      const r = await fetch(`/api/admin/accounting/costs/${editProduct.productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify(costs),
      });
      if (!r.ok) throw new Error("فشل الحفظ");
    },
    onSuccess: () => {
      toast({ title: "تم حفظ التكاليف" });
      qc.invalidateQueries({ queryKey: ["accounting-products"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      setEditProduct(null);
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  const handleCreateSettlement = async () => {
    if (!settlementForm.carrier || !settlementForm.amount) return;
    try {
      const r = await fetch("/api/admin/accounting/settlements", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          carrier: settlementForm.carrier,
          amount: Number(settlementForm.amount),
          notes: settlementForm.notes || undefined,
        }),
      });
      if (!r.ok) throw new Error("فشل");
      await qc.invalidateQueries({ queryKey: ["/api/admin/accounting/cod-summary"] });
      setShowSettlement(false);
      setSettlementForm({ carrier: "", amount: "", notes: "" });
      toast({ title: "تم تسجيل الدفعة" });
    } catch {
      toast({ title: "خطأ", description: "فشل تسجيل الدفعة", variant: "destructive" });
    }
  };

  const fetchCostHistory = async (productId: string) => {
    try {
      const r = await fetch(`/api/admin/accounting/cost-history/${productId}`, { credentials: "include" });
      if (r.ok) {
        const j = await r.json();
        setCostHistory(j.data);
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">محاسب AQUAVO</h2>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? "default" : "outline"}
              onClick={() => setPeriod(p.value)}
              className={period === p.value ? "bg-[#199bb8]" : "border-[#199bb8]/40 text-[#199bb8]"}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {loadingSum ? (
        <div className="text-[#199bb8] text-center py-8">جاري التحميل...</div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<DollarSign className="w-5 h-5" />}
            label="إجمالي الإيرادات"
            value={fmt(summary.totalRevenue)}
            color="#22c55e"
          />
          <SummaryCard
            icon={<TrendingDown className="w-5 h-5" />}
            label="إجمالي التكاليف"
            value={fmt(summary.totalCosts)}
            color="#ef4444"
          />
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="صافي الربح"
            value={fmt(summary.netProfit)}
            color={summary.netProfit >= 0 ? "#199bb8" : "#ef4444"}
          />
          <SummaryCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="هامش الربح"
            value={`${summary.margin}%`}
            color="#ffd700"
          />
        </div>
      ) : null}

      {/* Cost Breakdown */}
      {summary && (
        <Card className="bg-[#0a1628] border-[#199bb8]/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">تفصيل التكاليف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <CostItem label="تكلفة البضاعة"   value={fmt(summary.totalCogs)} />
              <CostItem label="التغليف والكارت"  value={fmt(summary.totalPackaging)} />
              <CostItem label="كوبونات الخصم"    value={fmt(summary.totalCoupons)} />
              <CostItem label="نقاط الولاء"       value={fmt(summary.totalLoyalty)} />
            </div>
            {summary.totalShipping > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                * التوصيل {fmt(summary.totalShipping)} — يدفعه الزبون للشركة مباشرة، مو من حسابك
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-[#199bb8]/20 pb-2">
        <button
          className={`px-4 py-2 text-sm rounded-t ${view === "products" ? "bg-[#199bb8] text-white" : "text-[#199bb8]"}`}
          onClick={() => setView("products")}
        >
          ربحية المنتجات
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t ${view === "orders" ? "bg-[#199bb8] text-white" : "text-[#199bb8]"}`}
          onClick={() => setView("orders")}
        >
          تفصيل الطلبات
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t ${view === "cod" ? "bg-[#199bb8] text-white" : "text-[#199bb8]"}`}
          onClick={() => setView("cod")}
        >
          شركة الشحن
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t ${view === "coupons" ? "bg-[#199bb8] text-white" : "text-[#199bb8]"}`}
          onClick={() => setView("coupons")}
        >
          الكوبونات
        </button>
      </div>

      {/* Products Table */}
      {view === "products" && (
        <div className="rounded-lg border border-[#199bb8]/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#010611] border-[#199bb8]/20">
                <TableHead className="text-[#199bb8]">المنتج</TableHead>
                <TableHead className="text-[#199bb8] text-center">مبيع</TableHead>
                <TableHead className="text-[#199bb8] text-center">إيراد</TableHead>
                <TableHead className="text-[#199bb8] text-center">تكلفة بضاعة</TableHead>
                <TableHead className="text-[#199bb8] text-center">تغليف</TableHead>
                <TableHead className="text-[#199bb8] text-center">صافي ربح</TableHead>
                <TableHead className="text-[#199bb8] text-center">هامش</TableHead>
                <TableHead className="text-[#199bb8] text-center">تكاليف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProds ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">جاري التحميل...</TableCell></TableRow>
              ) : productRows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">لا توجد مبيعات في هذه الفترة</TableCell></TableRow>
              ) : productRows.map(row => (
                <TableRow key={row.productId} className="border-[#199bb8]/10 hover:bg-[#010611]/50">
                  <TableCell className="text-white font-medium max-w-[180px] truncate">{row.name}</TableCell>
                  <TableCell className="text-center text-gray-300">{row.unitsSold}</TableCell>
                  <TableCell className="text-center text-green-400">{fmt(row.revenue)}</TableCell>
                  <TableCell className="text-center text-red-400">{fmt(row.cogs)}</TableCell>
                  <TableCell className="text-center text-orange-400">{fmt(row.packaging)}</TableCell>
                  <TableCell className="text-center font-bold" style={{ color: row.netProfit >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmt(row.netProfit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge style={{ background: row.margin >= 20 ? "#22c55e20" : "#ef444420", color: row.margin >= 20 ? "#22c55e" : "#ef4444" }}>
                      {row.margin}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#199bb8] hover:text-white"
                      onClick={() => {
                        setEditProduct(row);
                        setCosts({ costPrice: row.costPrice, packagingCost: row.packagingCost, insertCost: row.insertCost });
                        fetchCostHistory(row.productId);
                      }}
                    >
                      <Pencil className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Orders Table */}
      {view === "orders" && (
        <div className="rounded-lg border border-[#199bb8]/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#010611] border-[#199bb8]/20">
                <TableHead className="text-[#199bb8]">رقم الطلب</TableHead>
                <TableHead className="text-[#199bb8]">الزبون</TableHead>
                <TableHead className="text-[#199bb8] text-center">الحالة</TableHead>
                <TableHead className="text-[#199bb8] text-center">إيراد</TableHead>
                <TableHead className="text-[#199bb8] text-center">تكلفة بضاعة</TableHead>
                <TableHead className="text-[#199bb8] text-center">كوبون</TableHead>
                <TableHead className="text-[#199bb8] text-center">نقاط</TableHead>
                <TableHead className="text-[#199bb8] text-center">توصيل (معلومة)</TableHead>
                <TableHead className="text-[#199bb8] text-center">صافي الربح</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingOrders ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">جاري التحميل...</TableCell></TableRow>
              ) : orderRows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">لا توجد طلبات في هذه الفترة</TableCell></TableRow>
              ) : orderRows.map(row => (
                <TableRow key={row.orderId} className="border-[#199bb8]/10 hover:bg-[#010611]/50">
                  <TableCell className="text-[#199bb8] font-mono text-xs">{row.orderNumber ?? row.orderId.slice(0, 8)}</TableCell>
                  <TableCell className="text-gray-300">{row.customerName ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                      background: (ORDER_STATUS_LABELS[row.status]?.color ?? "#6b7280") + "20",
                      color: ORDER_STATUS_LABELS[row.status]?.color ?? "#6b7280",
                    }}>
                      {ORDER_STATUS_LABELS[row.status]?.label ?? row.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-green-400">{fmt(row.revenue)}</TableCell>
                  <TableCell className="text-center text-red-400">{fmt(row.cogs + row.packaging)}</TableCell>
                  <TableCell className="text-center text-orange-400">{row.couponDiscount > 0 ? fmt(row.couponDiscount) : "—"}</TableCell>
                  <TableCell className="text-center text-yellow-400">{row.loyaltyDiscount > 0 ? fmt(row.loyaltyDiscount) : "—"}</TableCell>
                  <TableCell className="text-center text-gray-500 text-xs">{row.shipping > 0 ? fmt(row.shipping) : "—"}</TableCell>
                  <TableCell className="text-center font-bold" style={{ color: row.netProfit >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmt(row.netProfit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* COD Section */}
      {view === "cod" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 4 }}>
            <div style={{ background: "#0d1f3c", border: "1px solid #199bb840", borderRadius: 10, padding: 16 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>موصّل (جمعت الشركة فلوسه)</div>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>
                {((codData as any)?.totalDelivered ?? codData?.totalCod ?? 0).toLocaleString()} د.ع
              </div>
            </div>
            <div style={{ background: "#0d1f3c", border: "1px solid #f9731640", borderRadius: 10, padding: 16 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>في الطريق (لسه ما وصل)</div>
              <div style={{ color: "#f97316", fontSize: 20, fontWeight: 700 }}>
                {((codData as any)?.totalInTransit ?? 0).toLocaleString()} د.ع
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            <div style={{ background: "#0d1f3c", border: "1px solid #22c55e40", borderRadius: 10, padding: 16 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>استلمت من الشركة</div>
              <div style={{ color: "#22c55e", fontSize: 20, fontWeight: 700 }}>
                {(codData?.totalReceived ?? 0).toLocaleString()} د.ع
              </div>
            </div>
            <div style={{ background: "#0d1f3c", border: "1px solid #ef444440", borderRadius: 10, padding: 16 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>باقي عند الشركة (موصّل بس لم يدفعون)</div>
              <div style={{ color: "#ef4444", fontSize: 20, fontWeight: 700 }}>
                {(codData?.totalPending ?? 0).toLocaleString()} د.ع
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSettlement(true)}
            style={{ alignSelf: "flex-start", padding: "8px 16px", borderRadius: 8, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            تسجيل دفعة جديدة
          </button>
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e3a5f" }}>
                  {["شركة الشحن", "المبلغ", "ملاحظات", "التاريخ"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(codData?.settlements ?? []).map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #1e3a5f20" }}>
                    <td style={{ padding: "10px 14px", color: "#fff" }}>{s.carrier}</td>
                    <td style={{ padding: "10px 14px", color: "#22c55e" }}>{Number(s.amount).toLocaleString()} د.ع</td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{s.notes ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{new Date(s.createdAt).toLocaleDateString("ar-IQ")}</td>
                  </tr>
                ))}
                {(codData?.settlements ?? []).length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>لا توجد دفعات مسجلة</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {showSettlement && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%" }}>
                <h3 style={{ color: "#fff", margin: "0 0 16px" }}>تسجيل دفعة من شركة الشحن</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input placeholder="اسم شركة الشحن" value={settlementForm.carrier} onChange={(e) => setSettlementForm((p) => ({ ...p, carrier: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff" }} />
                  <input type="number" placeholder="المبلغ (د.ع)" value={settlementForm.amount} onChange={(e) => setSettlementForm((p) => ({ ...p, amount: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff" }} />
                  <input placeholder="ملاحظات (اختياري)" value={settlementForm.notes} onChange={(e) => setSettlementForm((p) => ({ ...p, notes: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff" }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={() => setShowSettlement(false)} style={{ padding: "8px 16px", borderRadius: 6, background: "#1e3a5f", color: "#94a3b8", border: "none", cursor: "pointer" }}>إلغاء</button>
                  <button onClick={handleCreateSettlement} style={{ padding: "8px 16px", borderRadius: 6, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer" }}>حفظ</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coupons Section */}
      {view === "coupons" && (
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e3a5f" }}>
                {["رمز الكوبون", "عدد الاستخدامات", "إجمالي الخصم", "متوسط الخصم"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(couponsData ?? []).map((c) => (
                <tr key={c.couponCode} style={{ borderBottom: "1px solid #1e3a5f20" }}>
                  <td style={{ padding: "10px 14px", color: "#fff", fontFamily: "monospace" }}>{c.couponCode}</td>
                  <td style={{ padding: "10px 14px", color: "#199bb8" }}>{c.usageCount}</td>
                  <td style={{ padding: "10px 14px", color: "#ef4444" }}>{c.totalDiscount.toLocaleString()} د.ع</td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{c.avgDiscount.toLocaleString()} د.ع</td>
                </tr>
              ))}
              {(couponsData ?? []).length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>لا توجد كوبونات في هذه الفترة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Costs Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="bg-[#0a1628] border-[#199bb8]/30 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-white">تكاليف: {editProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">سعر الشراء من الشركة (د.ع)</label>
              <Input
                type="number"
                value={costs.costPrice}
                onChange={e => setCosts(c => ({ ...c, costPrice: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">سعر الكارتونة/البوكس (د.ع)</label>
              <Input
                type="number"
                value={costs.packagingCost}
                onChange={e => setCosts(c => ({ ...c, packagingCost: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">سعر الكارت/المواد الداخلية (د.ع)</label>
              <Input
                type="number"
                value={costs.insertCost}
                onChange={e => setCosts(c => ({ ...c, insertCost: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            {/* Cost History Section */}
            <div style={{ borderTop: "1px solid #1e3a5f", marginTop: 16, paddingTop: 16 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>تطبيق السعر من تاريخ محدد (اختياري):</div>
              <input
                type="date"
                value={newCostDate}
                onChange={(e) => setNewCostDate(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff", width: "100%", marginBottom: 8 }}
              />
              <button
                disabled={!newCostDate}
                onClick={async () => {
                  const productId = editProduct?.productId;
                  if (!productId || !newCostDate) return;
                  await fetch(`/api/admin/accounting/cost-history/${productId}`, {
                    method: "POST",
                    headers: addCsrfHeader({ "Content-Type": "application/json" }),
                    credentials: "include",
                    body: JSON.stringify({
                      costPrice: Number(costs?.costPrice ?? 0),
                      packagingCost: Number(costs?.packagingCost ?? 0),
                      insertCost: Number(costs?.insertCost ?? 0),
                      effectiveFrom: newCostDate,
                    }),
                  });
                  await fetchCostHistory(productId);
                  setNewCostDate("");
                  toast({ title: "تم حفظ السعر الجديد من التاريخ المحدد" });
                }}
                style={{ padding: "6px 12px", borderRadius: 6, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", opacity: newCostDate ? 1 : 0.5 }}
              >
                حفظ بتاريخ محدد
              </button>
              {costHistory.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>التاريخ السابق:</div>
                  {costHistory.slice(0, 5).map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", padding: "4px 0", borderBottom: "1px solid #1e3a5f20" }}>
                      <span>{new Date(h.effectiveFrom).toLocaleDateString("ar-IQ")}</span>
                      <span>تكلفة: {h.costPrice} | تغليف: {h.packagingCost} | كارت: {h.insertCost}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveCosts.mutate()}
              disabled={saveCosts.isPending}
              className="bg-[#199bb8] hover:bg-[#199bb8]/80"
            >
              {saveCosts.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="bg-[#0a1628] border-[#199bb8]/20">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg mt-1" style={{ background: color + "20", color }}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-red-400 font-medium mt-0.5">{value}</p>
    </div>
  );
}
