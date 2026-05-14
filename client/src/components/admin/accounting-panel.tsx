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
}

interface OrderProfit {
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
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

export default function AccountingPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("month");
  const [view, setView] = useState<"products" | "orders">("products");
  const [editProduct, setEditProduct] = useState<ProductProfit | null>(null);
  const [costs, setCosts] = useState({ costPrice: 0, packagingCost: 0, insertCost: 0 });

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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <CostItem label="تكلفة البضاعة"  value={fmt(summary.totalCogs)} />
              <CostItem label="التغليف والكارت" value={fmt(summary.totalPackaging)} />
              <CostItem label="كوبونات الخصم"   value={fmt(summary.totalCoupons)} />
              <CostItem label="نقاط الولاء"      value={fmt(summary.totalLoyalty)} />
              <CostItem label="تكلفة التوصيل"   value={fmt(summary.totalShipping)} />
            </div>
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
                        setCosts({ costPrice: row.cogs / (row.unitsSold || 1), packagingCost: 0, insertCost: 0 });
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
                <TableHead className="text-[#199bb8] text-center">إيراد</TableHead>
                <TableHead className="text-[#199bb8] text-center">تكلفة</TableHead>
                <TableHead className="text-[#199bb8] text-center">كوبون</TableHead>
                <TableHead className="text-[#199bb8] text-center">نقاط</TableHead>
                <TableHead className="text-[#199bb8] text-center">توصيل</TableHead>
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
                  <TableCell className="text-center text-green-400">{fmt(row.revenue)}</TableCell>
                  <TableCell className="text-center text-red-400">{fmt(row.cogs + row.packaging)}</TableCell>
                  <TableCell className="text-center text-orange-400">{row.couponDiscount > 0 ? fmt(row.couponDiscount) : "—"}</TableCell>
                  <TableCell className="text-center text-yellow-400">{row.loyaltyDiscount > 0 ? fmt(row.loyaltyDiscount) : "—"}</TableCell>
                  <TableCell className="text-center text-gray-400">{fmt(row.shipping)}</TableCell>
                  <TableCell className="text-center font-bold" style={{ color: row.netProfit >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmt(row.netProfit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
