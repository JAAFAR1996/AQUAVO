import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Package, Truck, Home, ArrowRight, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// Proper interface for order data - replacing 'any' type
interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
}

interface ShippingAddress {
    address: string;
    city?: string;
    phone?: string;
}

interface OrderData {
    id: string;
    total: number;
    status?: string;
    items?: OrderItem[];
    shippingAddress?: ShippingAddress;
    createdAt?: string;
}

const getDeliveryEstimate = (address: string) => {
    if (!address) return "خلال 2-4 أيام عمل";
    // Assuming "Baghdad - ..." or "بغداد - ..." format or just checking for the word
    if (address.includes("بغداد") || address.toLowerCase().includes("baghdad")) {
        return "خلال 24 - 48 ساعة";
    }
    return "خلال 2 - 4 أيام عمل";
};

export default function OrderConfirmation() {
    const [, params] = useRoute("/order-confirmation/:id");
    const orderId = params?.id;
    const [copied, setCopied] = useState(false);

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

    const { data: order, isLoading } = useQuery({
        queryKey: [`/api/orders/${orderId}`],
        enabled: !!orderId,
    });

    const orderData = order as OrderData | undefined;

    const copyOrderNumber = () => {
        if (orderId) {
            navigator.clipboard.writeText(orderId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

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

    // If order not found or error (optional: handle better)
    if (!orderData && !isLoading) {
        // For demo/fallback purposes if API fails or we just have an ID
        return (
            <ConfirmationContent
                orderId={orderId || "unknown"}
                total={0} // Fallback
            />
        );
    }

    return (
        <ConfirmationContent
            orderId={orderId || "unknown"}
            total={orderData?.total ?? 0}
            itemsCount={orderData?.items?.length ?? 0}
            address={orderData?.shippingAddress?.address ?? ""}
        />
    );
}

function ConfirmationContent({ orderId, total, itemsCount, address }: { orderId: string, total: number, itemsCount?: number, address?: string }) {
    const [copied, setCopied] = useState(false);

    const copyOrderNumber = () => {
        navigator.clipboard.writeText(orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans">
            <Navbar />

            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg"
                >
                    <Card className="border-t-4 border-t-green-500 shadow-xl overflow-hidden">
                        <CardHeader className="text-center bg-green-50/50 pb-8 pt-10">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                                className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4"
                            >
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                            </motion.div>
                            <CardTitle className="text-2xl font-bold text-green-800">شكراً لطلبك!</CardTitle>
                            <CardDescription className="text-lg text-green-700 font-medium mt-2">
                                تم استلام طلبك بنجاح
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 p-6">
                            <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">رقم الطلب</p>
                                <div className="flex items-center justify-center gap-2" dir="ltr">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                        onClick={copyOrderNumber}
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                    <span className="font-mono font-bold text-lg text-slate-800 tracking-wider">#{orderId.slice(0, 8).toUpperCase()}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <Package className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <h4 className="font-semibold text-slate-900">حالة الطلب</h4>
                                        <p className="text-sm text-slate-500">جاري المعالجة</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="bg-purple-100 p-2 rounded-full">
                                        <Truck className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <h4 className="font-semibold text-slate-900">التوصيل المتوقع</h4>
                                        <p className="text-sm text-slate-500">{getDeliveryEstimate(address || "")}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3 pt-2">
                                <Link href="/order-tracking">
                                    <Button className="w-full h-12 text-lg" variant="default">
                                        <Truck className="w-5 h-5 ml-2" />
                                        تتبع طلبك
                                    </Button>
                                </Link>

                                <Link href="/">
                                    <Button className="w-full h-12 text-lg" variant="outline">
                                        <Home className="w-5 h-5 ml-2" />
                                        العودة للرئيسية
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
