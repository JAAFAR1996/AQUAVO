import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, Eye, AlertTriangle, Trash2, ReceiptText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addCsrfHeader } from "@/lib/csrf";
import { OrderReturnAdjustmentModal } from "@/components/admin/order-return-adjustment-modal";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  userId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  total: number;
  totalAmount?: number;
  roundedTotal?: number;
  status: string;
  shippingAddress?: string;
  trackingNumber?: string;
  orderNumber?: string;
  shippingCost?: number;
  boxCost?: number;
  discountTotal?: number;
  couponId?: string;
  pointsUsed?: number;
  cashbackUsed?: number;
  pointsDiscount?: number;
  pointsEarned?: number;
  roundingCashback?: number;
  notes?: string;
  codReceived?: boolean;
  createdAt: string;
  updatedAt: string;
}

const ORDER_STATUSES = {
  pending: { label: "قيد الانتظار", color: "bg-red-500 hover:bg-red-600" },
  confirmed: { label: "تم التأكيد", color: "bg-blue-500 hover:bg-blue-600" },
  processing: { label: "جاري التجهيز", color: "bg-yellow-500 hover:bg-yellow-600 text-black" },
  shipped: { label: "عند شركة النقل 🚚", color: "bg-orange-500 hover:bg-orange-600 text-white" },
  delivered: { label: "تم التوصيل ✅", color: "bg-green-500 hover:bg-green-600" },
  rejected: { label: "رفض الاستلام ❌", color: "bg-red-600 hover:bg-red-700" },
  returned: { label: "تم الاسترجاع 📦", color: "bg-purple-500 hover:bg-purple-600 text-white" },
  cancelled: { label: "ملغي", color: "bg-gray-500 hover:bg-gray-600" },
  rejected_returned: { label: "رجع للبائع", color: "bg-orange-600 hover:bg-orange-700" },
  rejected_carrier:  { label: "بقي بالشركة", color: "bg-rose-700 hover:bg-rose-800" },
};

const getDisplayTotal = (order: Order) => {
  if (order.roundedTotal !== undefined && order.roundedTotal !== null) {
    return Number(order.roundedTotal);
  }
  const rawTotal = Number(order.totalAmount ?? order.total ?? 0);
  return Math.ceil(rawTotal / 250) * 250;
};

export function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  // Triple confirmation state for rejection
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectStep, setRejectStep] = useState(0);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  // Return adjustment modal state
  const [returnAdjustOrder, setReturnAdjustOrder] = useState<Order | null>(null);

  // Return event count for the currently-viewed order detail
  const [detailReturnCount, setDetailReturnCount] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrder || !isDetailOpen) { setDetailReturnCount(0); return; }
    fetch(`/api/admin/accounting/return-events?orderId=${selectedOrder.id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d: { data: unknown[] }) => setDetailReturnCount(d.data?.length ?? 0))
      .catch(() => setDetailReturnCount(0));
  }, [selectedOrder?.id, isDetailOpen]);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/admin/orders", { credentials: "include" });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({ title: "غير مصرح", description: "يرجى تسجيل الدخول كمدير", variant: "destructive" });
          setOrders([]);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOrders(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({ title: "خطأ", description: "فشل تحميل الطلبات.", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({ title: "غير مصرح", description: "يرجى تسجيل الدخول كمدير", variant: "destructive" });
          return;
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update order");
      }

      const statusLabels: Record<string, string> = {
        processing: "⚡ بدأ تجهيز الطلب",
        shipped: "🚚 تم تسليم الطلب لشركة النقل",
        delivered: "✅ تم التوصيل — النقاط أُضيفت للعميل",
        rejected: "❌ رفض الاستلام — بانتظار استلام من الشركة",
        returned: "📦 تم الاسترجاع — المخزون رجع لمكانه",
        cancelled: "🚫 تم إلغاء الطلب",
      };

      toast({ title: "تم التحديث", description: statusLabels[newStatus] || "تم تحديث الحالة" });
      fetchOrders();
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast({ title: "خطأ", description: error.message || "فشل تحديث الحالة", variant: "destructive" });
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    try {
      const response = await fetch(`/api/admin/orders/${deleteOrderId}`, {
        method: "DELETE",
        headers: addCsrfHeader({}),
        credentials: "include",
      });
      if (!response.ok) throw new Error("فشل الحذف");
      setOrders((prev) => prev.filter((o) => o.id !== deleteOrderId));
      toast({ title: "تم الحذف", description: "تم حذف الطلب بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الطلب", variant: "destructive" });
    } finally {
      setDeleteOrderId(null);
    }
  };

  // Triple confirmation rejection
  const startReject = (orderId: string) => {
    setRejectOrderId(orderId);
    setRejectStep(1);
  };

  const handleRejectConfirm = () => {
    if (rejectStep < 3) {
      setRejectStep(rejectStep + 1);
    } else {
      if (rejectOrderId) handleStatusChange(rejectOrderId, "rejected");
      setRejectOrderId(null);
      setRejectStep(0);
    }
  };

  const handleRejectCancel = () => {
    setRejectOrderId(null);
    setRejectStep(0);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.pending;
  };

  const REJECT_MESSAGES = [
    { title: "⚠️ تأكيد رفض الاستلام (1/3)", desc: "هل أنت متأكد من رفض هذا الطلب؟ سيتم إيقاف النقاط المجمدة." },
    { title: "⚠️⚠️ تأكيد ثاني (2/3)", desc: "تأكد مرة ثانية! المخزون سيُرجع عند استلامك من شركة النقل." },
    { title: "🔴 تأكيد نهائي (3/3)", desc: "هذا التأكيد الأخير! بعد الضغط سيتم تسجيل الرفض رسمياً." },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="ابحث عن طلب برقم الطلب أو البريد الإلكتروني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="حالة الطلب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.entries(ORDER_STATUSES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">رقم الطلب</TableHead>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-500">لا توجد طلبات</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm font-bold text-primary">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customerName || "غير محدد"}</p>
                        <p className="text-sm text-gray-500">{order.customerEmail || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {getDisplayTotal(order).toLocaleString()} د.ع
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} border-none`}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setIsDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-500 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                          title="تعديل الفاتورة / راجع"
                          onClick={() => setReturnAdjustOrder(order)}
                        >
                          <ReceiptText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          onClick={() => setDeleteOrderId(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {order.status === 'pending' && (
                          <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => handleStatusChange(order.id, 'processing')}>
                            بدء التجهيز ⚡
                          </Button>
                        )}

                        {order.status === 'processing' && (
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => handleStatusChange(order.id, 'shipped')}>
                            تسليم للنقل 🚚
                          </Button>
                        )}

                        {order.status === 'shipped' && (
                          <>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleStatusChange(order.id, 'delivered')}>
                              استلم الزبون ✅
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => startReject(order.id)}>
                              رفض الاستلام ❌
                            </Button>
                          </>
                        )}

                        {order.status === 'rejected' && (
                          <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white" onClick={() => handleStatusChange(order.id, 'returned')}>
                            استلمت من الشركة 📦
                          </Button>
                        )}

                        {order.status === 'delivered' && (
                          <span className="text-green-600 font-bold px-3 py-1 border border-green-200 rounded-md bg-green-50">مكتمل ✅</span>
                        )}

                        {order.status === 'returned' && (
                          <span className="text-purple-600 font-bold px-3 py-1 border border-purple-200 rounded-md bg-purple-50">تم الاسترجاع 📦</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Triple Confirmation Dialog */}
      <AlertDialog open={rejectStep > 0}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {rejectStep > 0 && REJECT_MESSAGES[rejectStep - 1]?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {rejectStep > 0 && REJECT_MESSAGES[rejectStep - 1]?.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleRejectCancel}>إلغاء</Button>
            <Button onClick={handleRejectConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              {rejectStep < 3 ? `تأكيد (${rejectStep}/3)` : "🔴 رفض نهائي!"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Order AlertDialog */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => { if (!open) setDeleteOrderId(null); }}>
        <AlertDialogContent className="bg-[#0d1f3c] border-[#1e3a5f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">تأكيد حذف الطلب</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              هل تريد حذف هذا الطلب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#1e3a5f] text-gray-300">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteOrder}
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return Adjustment Modal */}
      {returnAdjustOrder && (
        <OrderReturnAdjustmentModal
          order={returnAdjustOrder}
          open={!!returnAdjustOrder}
          onClose={() => setReturnAdjustOrder(null)}
        />
      )}

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">فاتورة الطلب</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <span>رقم الطلب: <span className="text-primary font-mono font-bold">{selectedOrder?.orderNumber || selectedOrder?.id.slice(0, 8)}</span></span>
                  {detailReturnCount > 0 && (
                    <span className="text-orange-500 font-semibold text-xs border border-orange-300 rounded px-2 py-0.5 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 inline" />
                      يوجد {detailReturnCount} تعديل/راجع على هذه الفاتورة
                    </span>
                  )}
                </DialogDescription>
              </div>
              <div className="flex gap-2 print:hidden">
                {selectedOrder && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-500 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                    onClick={() => { setIsDetailOpen(false); setReturnAdjustOrder(selectedOrder); }}
                  >
                    <ReceiptText className="h-4 w-4 ml-1" />
                    تعديل / راجع
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => window.print()}>🖨️ طباعة</Button>
              </div>
            </div>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 print:text-black">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-primary">AQUAVO</h2>
                <p className="text-sm text-muted-foreground">متجر أدوات ومستلزمات الأحواض المائية</p>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">معلومات العميل</h3>
                  <p className="font-medium">{selectedOrder.customerName || "غير محدد"}</p>
                  {selectedOrder.customerPhone && (
                    <p className="text-sm font-mono mt-1">📞 <a href={`tel:${selectedOrder.customerPhone}`} className="text-primary hover:underline" dir="ltr">{selectedOrder.customerPhone}</a></p>
                  )}
                  {selectedOrder.shippingAddress && <p className="text-sm mt-1">📍 {selectedOrder.shippingAddress}</p>}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">تفاصيل الطلب</h3>
                  <p className="text-sm">{new Date(selectedOrder.createdAt).toLocaleDateString('en-GB')}</p>
                  <Badge className={getStatusInfo(selectedOrder.status).color + " mt-2 border-none"}>
                    {getStatusInfo(selectedOrder.status).label}
                  </Badge>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" /> المنتجات
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-center">السعر</TableHead>
                        <TableHead className="text-left">المجموع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center">{Number(item.price).toLocaleString()} د.ع</TableCell>
                          <TableCell className="text-left font-semibold">{(item.price * item.quantity).toLocaleString()} د.ع</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* === تفاصيل الحركة المالية الكاملة === */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h3 className="font-bold text-sm flex items-center gap-2 border-b pb-2 mb-2">💰 تفاصيل الحركة المالية</h3>

                {/* مجموع المنتجات (total already includes delivery - discount, so derive subtotal) */}
                <div className="flex justify-between text-sm">
                  <span>مجموع المنتجات:</span>
                  <span className="font-semibold">{(Number(selectedOrder.total ?? 0) - Number(selectedOrder.shippingCost ?? 0) + Number(selectedOrder.discountTotal ?? 0)).toLocaleString()} د.ع</span>
                </div>

                {/* تكلفة التوصيل */}
                <div className="flex justify-between text-sm">
                  <span>🚚 تكلفة التوصيل:</span>
                  <span className="font-semibold">
                    {Number(selectedOrder.shippingCost ?? 0) > 0
                      ? `${Number(selectedOrder.shippingCost).toLocaleString()} د.ع`
                      : <span className="text-green-500">مجاناً</span>}
                  </span>
                </div>

                {/* خصم الكوبون */}
                {Number(selectedOrder.discountTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>🎟️ خصم الكوبون {selectedOrder.couponId ? `(${selectedOrder.couponId})` : ''}:</span>
                    <span className="font-semibold">- {Number(selectedOrder.discountTotal).toLocaleString()} د.ع</span>
                  </div>
                )}

                {/* رصيد باقي مستخدم */}
                {Number(selectedOrder.cashbackUsed ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>💳 رصيد باقي مستخدم:</span>
                    <span className="font-semibold">- {Number(selectedOrder.cashbackUsed).toLocaleString()} د.ع</span>
                  </div>
                )}

                {/* نقاط ولاء مستخدمة */}
                {Number(selectedOrder.pointsUsed ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-purple-600">
                    <span>⭐ نقاط ولاء مستخدمة ({selectedOrder.pointsUsed} نقطة):</span>
                    <span className="font-semibold">- {Number(selectedOrder.pointsDiscount ?? 0).toLocaleString()} د.ع</span>
                  </div>
                )}

                {/* التقريب */}
                {getDisplayTotal(selectedOrder) !== Number(selectedOrder.total) && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>🔄 التقريب لأقرب 250:</span>
                    <span className="font-semibold">
                      {getDisplayTotal(selectedOrder).toLocaleString()} د.ع
                      {getDisplayTotal(selectedOrder) > Number(selectedOrder.total) && (
                        <span className="text-xs mr-1">(+{getDisplayTotal(selectedOrder) - Number(selectedOrder.total)} باقي)</span>
                      )}
                    </span>
                  </div>
                )}

                {/* خط فاصل */}
                <div className="border-t pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">💵 المبلغ المدفوع نقداً:</span>
                    <span className="text-2xl font-bold text-primary">
                      {getDisplayTotal(selectedOrder).toLocaleString()} د.ع
                    </span>
                  </div>
                </div>

                {/* نقاط مكتسبة */}
                {Number(selectedOrder.pointsEarned ?? 0) > 0 && (
                  <div className="flex justify-between text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800">
                    <span className="text-green-700 dark:text-green-400">🎁 نقاط ولاء مكتسبة:</span>
                    <span className="font-bold text-green-700 dark:text-green-400">+{selectedOrder.pointsEarned} نقطة</span>
                  </div>
                )}

                {/* باقي التقريب */}
                {Number(selectedOrder.roundingCashback ?? 0) > 0 && (
                  <div className="flex justify-between text-sm bg-blue-50 dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800">
                    <span className="text-blue-700 dark:text-blue-400">💰 باقي تقريب (يُضاف للمحفظة):</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">+{selectedOrder.roundingCashback} د.ع</span>
                  </div>
                )}
              </div>

              {selectedOrder.notes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">ملاحظات:</p>
                  <p className="text-sm text-yellow-700">{selectedOrder.notes}</p>
                </div>
              )}
              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>شكراً لتسوقكم من AQUAVO</p>
                <p>📞 +964 774 788 0673</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
