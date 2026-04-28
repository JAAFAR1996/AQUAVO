import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Package, Truck, Home, Copy, Check, Printer, Star, Crown, Gift, MapPin, Phone, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { InvoiceDialog } from "@/components/cart/invoice-dialog";
import { formatIQD, formatDate } from "@/lib/utils";
import { ttqPurchase } from "@/lib/tiktok-pixel";

// Proper interface for order data
interface OrderItem {
    productId: string;
    productName?: string;
    quantity: number;
    priceAtPurchase?: string;
}

interface OrderData {
    id: string;
    orderNumber?: string;
    total: number;
    status?: string;
    items?: OrderItem[];
    shippingAddress?: string;
    customerName?: string;
    customerPhone?: string;
    shippingCost?: string;
    discountTotal?: string;
    createdAt?: string;
    loyalty?: {
        pointsEarned: number;
        cashbackEarned: number;
        cashbackUsed: number;
        roundedTotal: number;
        tier: string;
        tierUpgraded: boolean;
    };
}

const getDeliveryEstimate = (address: string) => {
    if (!address) return "خلال 2-4 أيام عمل";
    if (address.includes("بغداد") || address.toLowerCase().includes("baghdad")) {
        return "خلال 1 - 2 يوم عمل";
    }
    return "خلال 2 - 4 أيام عمل";
};

export default function OrderConfirmation() {
    const [, params] = useRoute("/order-confirmation/:id");
    const orderId = params?.id;

    // Trigger confetti on mount
    useEffect(() => {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ["#22c55e", "#10b981", "#34d399"]
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ["#22c55e", "#10b981", "#34d399"]
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, []);

    // TikTok Pixel: Purchase event once order data is loaded
    const { data: order, isLoading } = useQuery({
        queryKey: [`/api/orders/${orderId}`],
        enabled: !!orderId,
    });

    const orderData = order as OrderData | undefined;

    // Fire TikTok Purchase event when order loads successfully
    useEffect(() => {
        if (orderData && orderData.items && orderData.items.length > 0) {
            ttqPurchase({
                orderId: orderData.orderNumber || orderData.id,
                items: orderData.items.map(item => ({
                    id: item.productId,
                    name: item.productName || item.productId,
                    price: Number(item.priceAtPurchase || 0),
                    quantity: item.quantity,
                })),
                totalValue: orderData.total,
            });
        }
    }, [orderData?.id]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-8 space-y-4 text-center">
                            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                            <Skeleton className="h-8 w-48 mx-auto" />
                            <Skeleton className="h-4 w-64 mx-auto" />
                            <div className="space-y-2 mt-8">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </main>
                <Footer />
            </div>
        );
    }

    if (!orderData && !isLoading) {
        return (
            <ConfirmationContent
                orderId={orderId || "unknown"}
                orderData={null}
            />
        );
    }

    return (
        <ConfirmationContent
            orderId={orderId || "unknown"}
            orderData={orderData || null}
        />
    );
}

function ConfirmationContent({ orderId, orderData }: { orderId: string; orderData: OrderData | null }) {
    const [copied, setCopied] = useState(false);
    const [invoiceOpen, setInvoiceOpen] = useState(false);

    const displayNumber = orderData?.orderNumber || orderId.slice(0, 8).toUpperCase();
    const customerName = orderData?.customerName || "";
    const customerPhone = orderData?.customerPhone || "";
    const address = orderData?.shippingAddress || "";
    const total = orderData?.total ?? 0;
    const items = orderData?.items || [];
    const loyalty = orderData?.loyalty;
    const createdAt = orderData?.createdAt ? new Date(orderData.createdAt) : new Date();

    const copyOrderNumber = () => {
        navigator.clipboard.writeText(orderData?.orderNumber || orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Calculate breakdown from order data
    const shippingCost = Number(orderData?.shippingCost || 0);
    const discountAmount = Number(orderData?.discountTotal || 0);
    const subtotal = items.reduce((sum, item) => sum + (Number(item.priceAtPurchase || 0) * item.quantity), 0);

    // Prepare invoice data from real order data
    const invoiceData = {
        customerInfo: {
            name: customerName,
            phone: customerPhone,
            address: address,
            notes: ""
        },
        items: items.map(item => ({
            id: item.productId,
            name: item.productName || item.productId,
            quantity: item.quantity,
            price: item.priceAtPurchase ? Number(item.priceAtPurchase) : 0,
        })),
        total: total,
        subtotal: subtotal,
        deliveryFee: shippingCost,
        discount: discountAmount,
        roundedTotal: orderData?.loyalty?.roundedTotal,
        cashbackUsed: orderData?.loyalty?.cashbackUsed ?? 0,
        pointsEarned: orderData?.loyalty?.pointsEarned ?? 0,
        cashbackEarned: orderData?.loyalty?.cashbackEarned ?? 0,
        status: orderData?.status,
        orderNumber: orderData?.orderNumber || orderId,
        orderDate: createdAt,
    };

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans">
            <MetaTags
                title="تأكيد الطلب"
                description="شكراً لطلبك! تم استلام طلبك بنجاح في AQUAVO"
                noIndex={true}
            />
            <Navbar />

            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg"
                >
                    <Card className="border-t-4 border-t-green-500 shadow-xl overflow-hidden">
                        <CardHeader className="text-center bg-green-50/50 dark:bg-green-950/20 pb-6 pt-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                                className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-3"
                            >
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </motion.div>
                            <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-300">شكراً لطلبك!</CardTitle>
                            <CardDescription className="text-base text-green-700 dark:text-green-400 font-medium mt-1">
                                تم استلام طلبك بنجاح
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-5 p-6">
                            {/* رقم الطلب */}
                            <div className="bg-muted/40 rounded-lg p-4 text-center border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1">رقم الطلب</p>
                                <div className="flex items-center justify-center gap-2" dir="ltr">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={copyOrderNumber}
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </Button>
                                    <span className="font-mono font-bold text-lg tracking-wider">#{displayNumber}</span>
                                </div>
                            </div>

                            {/* معلومات التوصيل */}
                            <div className="border border-border/50 rounded-lg p-4 space-y-3">
                                {customerName && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="bg-primary/10 p-1.5 rounded-full">
                                            <Package className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-muted-foreground">المستلم: </span>
                                            <span className="font-medium">{customerName}</span>
                                        </div>
                                    </div>
                                )}
                                {customerPhone && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="bg-primary/10 p-1.5 rounded-full">
                                            <Phone className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-muted-foreground">الهاتف: </span>
                                            <span className="font-medium" dir="ltr">{customerPhone}</span>
                                        </div>
                                    </div>
                                )}
                                {address && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="bg-primary/10 p-1.5 rounded-full">
                                            <MapPin className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-muted-foreground">العنوان: </span>
                                            <span className="font-medium">{address}</span>
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">التوصيل المتوقع</span>
                                    </div>
                                    <span className="font-medium">{getDeliveryEstimate(address)}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">تاريخ الطلب</span>
                                    </div>
                                    <span className="font-medium">{formatDate(createdAt)}</span>
                                </div>

                                {/* Products Breakdown */}
                                {items.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-muted-foreground mb-2">🛒 {items.length} منتجات</p>
                                            {items.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span className="bg-primary/10 text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{item.quantity}</span>
                                                        <span className="line-clamp-1">{item.productName || item.productId}</span>
                                                    </div>
                                                    <span className="text-muted-foreground text-xs font-mono mr-2">
                                                        {formatIQD(Number(item.priceAtPurchase || 0) * item.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {total > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">المجموع الفرعي</span>
                                                <span>{formatIQD(subtotal)}</span>
                                            </div>
                                            {shippingCost > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">🚚 التوصيل</span>
                                                    <span>{formatIQD(shippingCost)}</span>
                                                </div>
                                            )}
                                            {shippingCost === 0 && subtotal > 0 && (
                                                <div className="flex items-center justify-between text-green-600">
                                                    <span>🚚 التوصيل</span>
                                                    <span>مجاني ✨</span>
                                                </div>
                                            )}
                                            {discountAmount > 0 && (
                                                <div className="flex items-center justify-between text-green-600">
                                                    <span>🎁 الخصم</span>
                                                    <span>-{formatIQD(discountAmount)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold">المبلغ الكلي</span>
                                            <span className="text-xl font-bold text-primary">{formatIQD(total)}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">💰 الدفع نقداً عند الاستلام</p>
                                    </>
                                )}
                            </div>

                            {/* Loyalty Points Earned */}
                            {loyalty && (loyalty.pointsEarned > 0 || loyalty.cashbackEarned > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="border border-primary/20 rounded-lg p-4"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <Gift className="w-4 h-4 text-primary" />
                                        <span className="font-semibold text-sm text-primary">مكافآت هذا الطلب</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {loyalty.pointsEarned > 0 && (
                                            <div className="bg-muted/40 rounded-lg p-3 text-center">
                                                <Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                                                <p className="text-lg font-bold text-primary">+{loyalty.pointsEarned}</p>
                                                <p className="text-xs text-muted-foreground">نقطة ولاء</p>
                                            </div>
                                        )}
                                        {loyalty.cashbackEarned > 0 && (
                                            <div className="bg-muted/40 rounded-lg p-3 text-center">
                                                <Crown className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                                                <p className="text-lg font-bold text-purple-600">+{loyalty.cashbackEarned}</p>
                                                <p className="text-xs text-muted-foreground">نقطة باقي</p>
                                            </div>
                                        )}
                                    </div>
                                    {loyalty.tierUpgraded && (
                                        <div className="mt-3 text-center bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                                            <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                                                🎉 تهانينا! ترقيت للمستوى {loyalty.tier === 'diamond' ? '💎 الماسي' : loyalty.tier === 'gold' ? '🥇 الذهبي' : loyalty.tier === 'silver' ? '🥈 الفضي' : '🥉 البرونزي'}!
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* الأزرار */}
                            <div className="space-y-2.5 pt-1">
                                <Link href="/order-tracking">
                                    <Button className="w-full h-11" variant="default">
                                        <Truck className="w-4 h-4 ml-2" />
                                        تتبع طلبك
                                    </Button>
                                </Link>

                                <Button
                                    className="w-full h-11"
                                    variant="outline"
                                    onClick={() => setInvoiceOpen(true)}
                                >
                                    <Printer className="w-4 h-4 ml-2" />
                                    طباعة الفاتورة
                                </Button>

                                <Link href="/">
                                    <Button className="w-full h-11" variant="ghost">
                                        <Home className="w-4 h-4 ml-2" />
                                        العودة للرئيسية
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>

            <InvoiceDialog
                open={invoiceOpen}
                onOpenChange={setInvoiceOpen}
                orderData={invoiceData}
            />

            <Footer />
        </div>
    );
}
