import { useEffect, useState, useMemo, useLayoutEffect, useRef } from "react";
import { Link, useRoute } from "wouter";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Truck, Home, Copy, Check, Printer, Star, Crown, Gift, MapPin, Phone, MessageCircle, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDialog } from "@/components/cart/invoice-dialog";
import { formatIQD } from "@/lib/utils";
import { readStashedOrder } from "@/lib/order-stash";
import { ttqPurchase } from "@/lib/tiktok-pixel";
import { phTrackPurchase } from "@/lib/posthog";
import { metaTrackPurchase } from "@/lib/meta-pixel";
import { DELIVERY_DAYS, WHATSAPP_URL } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";

interface OrderItem {
    productId: string;
    productName?: string;
    quantity: number;
    priceAtPurchase?: string;
    variantId?: string;
    variantLabel?: string;
    image?: string;
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

const getDeliveryEstimate = () => {
    return `خلال ${DELIVERY_DAYS}`;
};

export default function OrderConfirmation() {
    const [, params] = useRoute("/order-confirmation/:id");
    const orderId = params?.id;

    const { data: order, isLoading } = useQuery({
        queryKey: [`/api/orders/${orderId}`],
        enabled: !!orderId,
        retry: false,
    });

    const stashed = useMemo(() => readStashedOrder(orderId) as OrderData | undefined, [orderId]);
    const orderData = (order as OrderData | undefined) ?? stashed;
    const loading = isLoading;

    useEffect(() => {
        const full = order as OrderData | undefined;
        if (full && full.items && full.items.length > 0) {
            // Second Purchase call site, on purpose: a customer can land here directly from a stashed
            // order or reload the page, and the checkout-path event would then never have fired. The
            // helper dedups on order id, so the pair is a safety net rather than a double count.
            phTrackPurchase({
                orderId: full.orderNumber || full.id,
                totalValue: Number(full.total ?? 0),
                numItems: full.items.reduce((sum, i) => sum + (i.quantity ?? 0), 0),
                productIds: full.items.map((i) => i.productId),
                sourcePage: "order_confirmation",
            });
            ttqPurchase({
                orderId: full.orderNumber || full.id,
                items: full.items.map(item => ({
                    id: item.productId,
                    name: item.productName || item.productId,
                    price: Number(item.priceAtPurchase || 0),
                    quantity: item.quantity,
                })),
                totalValue: full.total,
            });
            metaTrackPurchase({
                orderId: full.orderNumber || full.id,
                totalIQD: full.total,
                productIds: full.items.map(item => item.productId),
                numItems: full.items.reduce((sum, item) => sum + item.quantity, 0),
                phone: full.customerPhone,
            });
        }
    }, [(order as OrderData | undefined)?.id]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col bg-background">
                <main className="flex-1 flex items-start justify-center py-12 px-4">
                    <div
                        dir="rtl"
                        role="status"
                        aria-live="polite"
                        aria-label="جار تحميل تفاصيل الطلب"
                        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
                    >
                        <div className="h-1.5 w-full bg-gradient-to-l from-primary to-primary/70" />
                        <div className="p-5 sm:p-6 space-y-5">
                            <div className="flex flex-col items-center gap-3">
                                <Skeleton className="h-12 w-28" />
                                <Skeleton className="h-7 w-40" />
                                <Skeleton className="h-4 w-56" />
                            </div>
                            <Skeleton className="h-16 w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-3.5 w-24" />
                                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5">
                                    <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="h-4 w-16 shrink-0" />
                                </div>
                            </div>
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <div className="grid grid-cols-2 gap-2">
                                <Skeleton className="h-14 w-full rounded-lg" />
                                <Skeleton className="h-14 w-full rounded-lg" />
                                <Skeleton className="col-span-2 h-14 w-full rounded-lg" />
                            </div>
                            <div className="space-y-2.5 pt-1">
                                <Skeleton className="h-11 w-full rounded-md" />
                                <Skeleton className="h-11 w-full rounded-md" />
                                <Skeleton className="h-11 w-full rounded-md" />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!orderData && !loading) {
        return (
            <div className="flex-1 flex flex-col bg-background">
                <MetaTags
                    title="تحقق من حالة الطلب"
                    description="لخصوصيتك، استخدم رقم الطلب وآخر أربعة أرقام من الهاتف للتحقق من الحالة."
                    noIndex
                />
                <main className="flex flex-1 items-center justify-center px-4 py-12">
                    <Card className="w-full max-w-lg border-t-4 border-t-primary">
                        <CardHeader className="text-center">
                            <CardTitle role="heading" aria-level={1}>نحتاج نتحقق من الطلب</CardTitle>
                            <CardDescription>
                                إذا فتحت الرابط بجهاز ثاني، استخدم رقم الطلب وآخر 4 أرقام من الهاتف حتى نحافظ على معلوماتك.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Button asChild className="min-h-11">
                                <Link href="/order-tracking">روح لتتبع الطلب الآمن</Link>
                            </Button>
                            <Button asChild variant="outline" className="min-h-11">
                                <Link href="/products">ارجع للمنتجات</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
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

    const shippingCost = Number(orderData?.shippingCost || 0);
    const discountAmount = Number(orderData?.discountTotal || 0);
    const subtotal = items.reduce((sum, item) => sum + (Number(item.priceAtPurchase || 0) * item.quantity), 0);

    const invoiceData = {
        customerInfo: {
            name: customerName,
            phone: customerPhone,
            address: address,
            notes: ""
        },
        items: items.map(item => ({
            id: item.variantId ? `${item.productId}-${item.variantId}` : item.productId,
            name: item.productName || item.productId,
            quantity: item.quantity,
            price: item.priceAtPurchase ? Number(item.priceAtPurchase) : 0,
            image: item.image,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
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

    const itemsText = items
        .map(item => {
            const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
            return `• ${item.productName || item.productId}${variant} × ${item.quantity}`;
        })
        .join("\n");
    const whatsappText =
        `مرحباً، أحتاج مساعدة بخصوص طلبي رقم ${displayNumber}\n` +
        (itemsText ? `\n${itemsText}\n` : "") +
        (total > 0 ? `\nالمبلغ الكلي: ${formatIQD(total)} (الدفع عند الاستلام)` : "");
    // Message text is passed to WhatsAppLink, which builds the href and records the handoff.

    const cardRef = useRef<HTMLDivElement>(null);
    const markRef = useRef<HTMLImageElement>(null);
    const numRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
    const factsRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !("animate" in Element.prototype)) return;
        const anims: Animation[] = [];
        const run = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
            if (el) anims.push(el.animate(kf, { fill: "both", ...opts }));
        };
        run(cardRef.current, [{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "scale(1)" }], { duration: 120, easing: "cubic-bezier(0.22,1,0.36,1)" });
        run(numRef.current, [{ opacity: 0, transform: "translateX(6px)", filter: "blur(3px)" }, { opacity: 1, transform: "translateX(0)", filter: "blur(0px)" }], { duration: 130, delay: 120, easing: "cubic-bezier(0.2,0.8,0.2,1)" });
        run(headingRef.current, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 170, delay: 150, easing: "cubic-bezier(0.2,0.8,0.2,1)" });
        run(markRef.current, [{ opacity: 0.4, transform: "scale(0.94) rotate(-4deg)" }, { opacity: 1, transform: "scale(1) rotate(0deg)" }], { duration: 310, delay: 250, easing: "cubic-bezier(0.16,1,0.3,1)" });
        rowRefs.current.forEach((row, i) => run(row, [{ opacity: 0, transform: "translateX(10px) scale(0.98)" }, { opacity: 1, transform: "translateX(0) scale(1)" }], { duration: 240, delay: 520 + i * 70, easing: "cubic-bezier(0.22,1,0.36,1)" }));
        run(factsRef.current, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 200, delay: 880, easing: "cubic-bezier(0.2,0.8,0.2,1)" });
        return () => anims.forEach((a) => a.cancel());
    }, [orderId]);

    return (
        <div className="flex-1 flex flex-col bg-background font-sans">
            <MetaTags
                title="طلبك مسجّل"
                description="تم تسجيل طلبك بنجاح في AQUAVO"
                noIndex={true}
            />

            <main className="flex-1 flex items-start justify-center py-12 px-4">
                <div
                    ref={cardRef}
                    dir="rtl"
                    className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
                >
                    <div className="h-1.5 w-full bg-gradient-to-l from-primary to-primary/70" />
                    <div className="p-5 sm:p-6">
                        <div className="flex justify-center">
                            <img ref={markRef} src="/brand/aquavo-v2-icon.svg" alt="AQUAVO" className="h-12 w-auto" />
                        </div>
                        <div ref={headingRef} className="mt-3 text-center" role="status" aria-live="polite">
                            <h1 role="heading" aria-level={1} className="text-2xl font-bold text-foreground">طلبك مسجّل</h1>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                تم تسجيل الطلب بنجاح. إحنا نجهزه ونتواصل وياك إذا احتجنا معلومة إضافية.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div ref={numRef} className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
                                <p className="text-xs text-muted-foreground">رقم الطلب</p>
                                <div className="mt-1 flex items-center justify-center gap-2" dir="ltr">
                                    <button
                                        type="button"
                                        onClick={copyOrderNumber}
                                        aria-label="نسخ رقم الطلب"
                                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                    <span className="font-mono text-lg font-bold tracking-wider text-primary">#{displayNumber}</span>
                                </div>
                            </div>

                            {items.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                        <Package className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>{items.length} منتجات</span>
                                    </div>
                                    {items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            ref={(el) => { rowRefs.current[idx] = el; }}
                                            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5"
                                        >
                                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.productName || ""} className="h-full w-full object-cover" loading="lazy" />
                                                ) : (
                                                    <span className="grid h-full w-full place-items-center text-xs text-primary">{item.quantity}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">{item.productName || item.productId}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                                    {item.variantLabel && <span className="rounded bg-muted px-1.5 py-0.5">{item.variantLabel}</span>}
                                                    <span>الكمية: {item.quantity}</span>
                                                </div>
                                            </div>
                                            {item.priceAtPurchase != null && (
                                                <span className="shrink-0 font-mono text-sm text-foreground">{formatIQD(Number(item.priceAtPurchase) * item.quantity)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div ref={factsRef} className="space-y-3">
                                {total > 0 && (
                                    <div className="rounded-xl bg-muted/40 p-4">
                                        <div className="space-y-1.5 text-sm">
                                            {subtotal > 0 && (
                                                <div className="flex items-center justify-between text-muted-foreground"><span>المجموع الفرعي</span><span className="text-foreground">{formatIQD(subtotal)}</span></div>
                                            )}
                                            {shippingCost > 0 && (
                                                <div className="flex items-center justify-between text-muted-foreground"><span>التوصيل</span><span className="text-foreground">{formatIQD(shippingCost)}</span></div>
                                            )}
                                            {shippingCost === 0 && subtotal > 0 && (
                                                <div className="flex items-center justify-between text-primary"><span>التوصيل</span><span>مجاني</span></div>
                                            )}
                                            {discountAmount > 0 && (
                                                <div className="flex items-center justify-between text-primary"><span>الخصم</span><span>-{formatIQD(discountAmount)}</span></div>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                                            <span className="font-bold text-foreground">المبلغ الكلي</span>
                                            <span className="text-2xl font-bold text-primary">{formatIQD(total)}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <Fact icon={<Wallet className="h-4 w-4" />} label="الدفع" value="نقداً عند الاستلام" />
                                    <Fact icon={<Truck className="h-4 w-4" />} label="التوصيل المتوقع" value={getDeliveryEstimate()} />
                                    {customerName && <Fact icon={<Package className="h-4 w-4" />} label="المستلم" value={customerName} />}
                                    {customerPhone && <Fact icon={<Phone className="h-4 w-4" />} label="الهاتف" value={customerPhone} ltr />}
                                    {address && <Fact icon={<MapPin className="h-4 w-4" />} label="العنوان" value={address} full />}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-background p-4">
                                <h2 className="text-sm font-bold text-foreground">شنو يصير بعدين؟</h2>
                                <ol className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
                                    <li>1. نراجع تفاصيل الطلب ونجهزه.</li>
                                    <li>2. نتواصل وياك إذا احتجنا توضيح عن العنوان أو المنتج.</li>
                                    <li>3. الدفع يكون عند الاستلام، والتوصيل خلال {DELIVERY_DAYS}.</li>
                                </ol>
                            </div>

                            {loyalty && (loyalty.pointsEarned > 0 || loyalty.cashbackEarned > 0) && (
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Gift className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold text-primary">مكافآت هذا الطلب</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {loyalty.pointsEarned > 0 && (
                                            <div className="rounded-lg bg-muted/40 p-3 text-center">
                                                <Star className="mx-auto mb-1 h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                                                <p className="text-lg font-bold text-primary">+{loyalty.pointsEarned}</p>
                                                <p className="text-xs text-muted-foreground">نقطة ولاء</p>
                                            </div>
                                        )}
                                        {loyalty.cashbackEarned > 0 && (
                                            <div className="rounded-lg bg-muted/40 p-3 text-center">
                                                <Crown className="mx-auto mb-1 h-4 w-4 text-purple-500 dark:text-purple-300" />
                                                <p className="text-lg font-bold text-purple-600 dark:text-purple-300">+{loyalty.cashbackEarned}</p>
                                                <p className="text-xs text-muted-foreground">نقطة باقي</p>
                                            </div>
                                        )}
                                    </div>
                                    {loyalty.tierUpgraded && (
                                        <div className="mt-3 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-2 text-center">
                                            <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                                                تهانينا! ترقيت للمستوى {loyalty.tier === "diamond" ? "الماسي" : loyalty.tier === "gold" ? "الذهبي" : loyalty.tier === "silver" ? "الفضي" : "البرونزي"}!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2.5 pt-1">
                                <Link href="/order-tracking">
                                    <Button className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                        <Truck className="ml-2 h-4 w-4" />
                                        تتبع طلبك
                                    </Button>
                                </Link>
                                <Button
                                    className="h-11 w-full"
                                    variant="outline"
                                    onClick={() => setInvoiceOpen(true)}
                                >
                                    <Printer className="ml-2 h-4 w-4" />
                                    طباعة الفاتورة
                                </Button>
                                <WhatsAppLink
                                    source="order_confirmation"
                                    orderNumber={orderData?.orderNumber ?? orderId}
                                    message={whatsappText}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent font-semibold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/5"
                                >
                                    <MessageCircle className="h-4 w-4 text-primary" />
                                    تحتاج مساعدة؟ احچي ويانه
                                </WhatsAppLink>
                                <Link href="/">
                                    <Button className="h-11 w-full text-muted-foreground hover:bg-muted hover:text-foreground" variant="ghost">
                                        <Home className="ml-2 h-4 w-4" />
                                        العودة للرئيسية
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <InvoiceDialog
                open={invoiceOpen}
                onOpenChange={setInvoiceOpen}
                orderData={invoiceData}
            />
        </div>
    );
}

function Fact({ icon, label, value, ltr, full }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean; full?: boolean }) {
    return (
        <div className={`flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 ${full ? "col-span-2" : ""}`}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span>
            <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="truncate text-xs font-medium text-foreground" dir={ltr ? "ltr" : undefined}>{value}</div>
            </div>
        </div>
    );
}
