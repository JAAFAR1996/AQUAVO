import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, ShoppingBag, Truck, ChevronDown, ChevronUp, Phone, MapPin, Calendar, FileText } from "lucide-react";
import { Order } from "@/lib/types";
import { formatIQD, formatDate } from "@/lib/utils";
import { InvoiceDialog } from "@/components/cart/invoice-dialog";
import { useQuery } from "@tanstack/react-query";

// Match admin dashboard status labels exactly
const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    confirmed: { label: "تم التأكيد", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    processing: { label: "جاري التجهيز", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
    shipped: { label: "تم التسليم للنقل", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
    delivered: { label: "تم التوصيل", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300" },
};

// Status step order for progress display
const statusSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

interface ProfileOrdersProps {
    orders?: Order[];
    isLoading: boolean;
}

export function ProfileOrders({ orders, isLoading }: ProfileOrdersProps) {
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

    const toggleOrder = (orderId: string) => {
        setExpandedOrder(prev => prev === orderId ? null : orderId);
    };

    const getStatusIndex = (status: string) => {
        const idx = statusSteps.indexOf(status);
        return idx >= 0 ? idx : 0;
    };

    // Prepare invoice data from order
    const getInvoiceData = (order: Order) => {
        const items = (order.items as any[]) || [];
        const loyalty = (order as any).loyalty;
        return {
            customerInfo: {
                name: (order as any).customerName || "",
                phone: (order as any).customerPhone || "",
                address: (order as any).shippingAddress || "",
                notes: (order as any).notes || "",
            },
            items: items.map((item: any) => ({
                id: item.productId || item.id || "",
                name: item.productName || item.name || item.productId || "منتج",
                quantity: item.quantity || 1,
                price: Number(item.priceAtPurchase || item.price || 0),
                image: item.image || "",
            })),
            total: Number(order.total) || 0,
            deliveryFee: Number((order as any).shippingCost) || 0,
            discount: Number((order as any).discountTotal) || 0,
            roundedTotal: loyalty?.roundedTotal,
            cashbackUsed: loyalty?.cashbackUsed ?? 0,
            pointsEarned: loyalty?.pointsEarned ?? 0,
            cashbackEarned: loyalty?.cashbackEarned ?? 0,
            status: order.status,
            paymentStatus: (order as any).paymentStatus,
            paymentMethod: (order as any).paymentMethod,
            orderNumber: (order as any).orderNumber || order.id.slice(0, 8),
            orderDate: new Date(order.createdAt),
        };
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        طلباتي الأخيرة
                    </CardTitle>
                    <CardDescription>عرض وتتبع جميع طلباتك</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                            <p className="mt-2 text-muted-foreground">جاري تحميل الطلبات...</p>
                        </div>
                    ) : !orders || (Array.isArray(orders) && orders.length === 0) ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>لا توجد طلبات سابقة</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order) => {
                                const isExpanded = expandedOrder === order.id;
                                const status = statusLabels[order.status] || statusLabels.pending;
                                const items = (order.items as any[]) || [];
                                const statusIdx = getStatusIndex(order.status);
                                const isCancelled = order.status === "cancelled";

                                return (
                                    <div
                                        key={order.id}
                                        className="border border-border/60 rounded-lg overflow-hidden transition-all"
                                    >
                                        {/* Order Header — Clickable */}
                                        <button
                                            onClick={() => toggleOrder(order.id)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-right"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Package className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">
                                                        #{(order as any).orderNumber || order.id.slice(0, 8)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(order.createdAt).toLocaleDateString("ar-IQ")} • {items.length} منتج
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-left">
                                                    <p className="font-bold text-primary text-sm">
                                                        {Number(order.total).toLocaleString()} د.ع
                                                    </p>
                                                    <Badge className={`${status.color} text-[10px] px-2 py-0`}>
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </button>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="border-t border-border/40 p-4 space-y-4 bg-muted/10">
                                                {/* Status Progress Bar */}
                                                {!isCancelled && (
                                                    <div className="flex items-center gap-1 px-2">
                                                        {statusSteps.map((step, idx) => {
                                                            const isActive = idx <= statusIdx;
                                                            const stepLabel = statusLabels[step]?.label || step;
                                                            return (
                                                                <div key={step} className="flex-1 flex flex-col items-center gap-1">
                                                                    <div
                                                                        className={`h-1.5 w-full rounded-full transition-all ${
                                                                            isActive
                                                                                ? idx === statusIdx
                                                                                    ? "bg-primary animate-pulse"
                                                                                    : "bg-primary"
                                                                                : "bg-muted"
                                                                        }`}
                                                                    />
                                                                    <span className={`text-[9px] ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                                                                        {stepLabel}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {isCancelled && (
                                                    <div className="text-center py-2 text-red-500 text-sm font-medium">
                                                        تم إلغاء هذا الطلب
                                                    </div>
                                                )}

                                                <Separator />

                                                {/* Products List */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-semibold text-muted-foreground">المنتجات</h4>
                                                    {items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between text-sm py-1.5">
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <span className="bg-primary/10 text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                                    {item.quantity}
                                                                </span>
                                                                <span className="line-clamp-1">
                                                                    {item.productName || item.name || item.productId}
                                                                </span>
                                                            </div>
                                                            {item.priceAtPurchase && (
                                                                <span className="text-muted-foreground text-xs mr-2">
                                                                    {Number(item.priceAtPurchase).toLocaleString()} د.ع
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Delivery Info */}
                                                {(order as any).shippingAddress && (
                                                    <>
                                                        <Separator />
                                                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                            <span>{(order as any).shippingAddress}</span>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Total + Actions */}
                                                <Separator />
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm">
                                                        <span className="text-muted-foreground">الإجمالي: </span>
                                                        <span className="font-bold text-primary">
                                                            {Number(order.total).toLocaleString()} د.ع
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setInvoiceOrder(order);
                                                        }}
                                                    >
                                                        <FileText className="w-3.5 h-3.5 ml-1" />
                                                        عرض الفاتورة
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link href="/order-tracking">
                            <Button variant="outline" className="gap-2">
                                <Truck className="w-4 h-4" />
                                تتبع طلب معين
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice Dialog */}
            <InvoiceDialog
                open={!!invoiceOrder}
                onOpenChange={(open) => {
                    if (!open) setInvoiceOrder(null);
                }}
                orderData={invoiceOrder ? getInvoiceData(invoiceOrder) : null}
            />
        </>
    );
}
