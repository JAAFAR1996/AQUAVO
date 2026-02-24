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
import { Package, Search, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addCsrfHeader } from "@/lib/csrf";

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
  items: OrderItem[];
  totalAmount: number;
  status: string;
  shippingAddress?: string;
  trackingNumber?: string;
  orderNumber?: string;
  shippingCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const ORDER_STATUSES = {
  pending: { label: "قيد الانتظار", variant: "destructive" as const, color: "bg-red-500 hover:bg-red-600" },
  confirmed: { label: "تم التأكيد", variant: "default" as const, color: "bg-blue-500 hover:bg-blue-600" },
  processing: { label: "جاري التجهيز", variant: "secondary" as const, color: "bg-yellow-500 hover:bg-yellow-600 text-black" },
  shipped: { label: "تم التسليم للنقل", variant: "secondary" as const, color: "bg-orange-500 hover:bg-orange-600 text-white" },
  delivered: { label: "تم التوصيل للزبون", variant: "default" as const, color: "bg-green-500 hover:bg-green-600" },
  cancelled: { label: "ملغي", variant: "destructive" as const, color: "bg-gray-500 hover:bg-gray-600" },
};

export function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/admin/orders", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Authentication or authorization failed
          console.error("Unauthorized access to orders");
          toast({
            title: "غير مصرح",
            description: "يرجى تسجيل الدخول كمدير للوصول إلى الطلبات",
            variant: "destructive",
          });
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
      toast({
        title: "خطأ",
        description: "فشل تحميل الطلبات. يرجى التحقق من تسجيل الدخول.",
        variant: "destructive",
      });
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
          toast({
            title: "غير مصرح",
            description: "يرجى تسجيل الدخول كمدير",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to update order");
      }

      toast({
        title: "نجح",
        description: "تم تحديث حالة الطلب بنجاح",
      });
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "خطأ",
        description: "فشل تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.pending;
  };

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
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
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
              <TableHead className="text-right">المبلغ الإجمالي</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  جاري التحميل...
                </TableCell>
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
                        <p className="text-sm text-gray-500">{order.customerEmail || "غير محدد"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {order.totalAmount?.toLocaleString()} د.ع
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} border-none`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Process Flow Buttons */}
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-yellow-500 hover:bg-yellow-600 text-black"
                            onClick={() => handleStatusChange(order.id, 'processing')}
                          >
                            بدء التجهيز ⚡
                          </Button>
                        )}

                        {order.status === 'processing' && (
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => handleStatusChange(order.id, 'shipped')}
                          >
                            تسليم للنقل 🚚
                          </Button>
                        )}

                        {order.status === 'shipped' && (
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleStatusChange(order.id, 'delivered')}
                          >
                            تم التوصيل ✅
                          </Button>
                        )}

                        {order.status === 'delivered' && (
                          <span className="text-green-600 font-bold px-3 py-1 border border-green-200 rounded-md bg-green-50">
                            مكتمل
                          </span>
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

      {/* Order Detail Dialog - Professional Invoice */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">
                  فاتورة الطلب
                </DialogTitle>
                <DialogDescription>
                  رقم الطلب: <span className="text-primary font-mono font-bold">{selectedOrder?.orderNumber || selectedOrder?.id.slice(0, 8)}</span>
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="print:hidden"
              >
                🖨️ طباعة
              </Button>
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 print:text-black">
              {/* Store Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-primary">AQUAVO</h2>
                <p className="text-sm text-muted-foreground">متجر أدوات ومستلزمات الأحواض المائية</p>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">معلومات العميل</h3>
                  <p className="font-medium">{selectedOrder.customerName || "غير محدد"}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail || "غير محدد"}</p>
                  {selectedOrder.shippingAddress && (
                    <p className="text-sm mt-1">{selectedOrder.shippingAddress}</p>
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">تفاصيل الطلب</h3>
                  <p className="text-sm">التاريخ: {new Date(selectedOrder.createdAt).toLocaleDateString('en-GB')}</p>
                  <p className="text-sm">الوقت: {new Date(selectedOrder.createdAt).toLocaleTimeString('en-GB')}</p>
                  <Badge className={getStatusInfo(selectedOrder.status).color + " mt-2"}>
                    {getStatusInfo(selectedOrder.status).label}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  المنتجات المطلوبة
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
                      {selectedOrder.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center">{Number(item.price).toLocaleString('en-US')} د.ع</TableCell>
                          <TableCell className="text-left font-semibold">
                            {(item.price * item.quantity).toLocaleString()} د.ع
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                {selectedOrder.shippingCost && selectedOrder.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">تكلفة الشحن:</span>
                    <span>{selectedOrder.shippingCost.toLocaleString()} د.ع</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                  <span className="font-bold text-lg">المبلغ الإجمالي:</span>
                  <span className="text-3xl font-bold text-primary">
                    {selectedOrder.totalAmount?.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">ملاحظات:</p>
                  <p className="text-sm text-yellow-700">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Tracking */}
              {selectedOrder.trackingNumber && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800">رقم التتبع:</p>
                  <p className="text-lg font-mono text-blue-700">{selectedOrder.trackingNumber}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>شكراً لتسوقكم من AQUAVO</p>
                <p>للاستفسارات: info@aquavoiq.com</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
