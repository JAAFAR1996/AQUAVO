import { useEffect, useState, useMemo, useLayoutEffect, useRef } from "react";
import { Link, useRoute } from "wouter";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Crown,
    Gift,
    Home,
    MapPin,
    MessageCircle,
    Package,
    Phone,
    Printer,
    Star,
    Truck,
    User,
    Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDialog } from "@/components/cart/invoice-dialog";
import { formatIQD } from "@/lib/utils";
import { readStashedOrder } from "@/lib/order-stash";
import { ttqPurchase } from "@/lib/tiktok-pixel";
import { phTrackPurchase } from "@/lib/posthog";
import { metaTrackPurchase } from "@/lib/meta-pixel";
import { DELIVERY_DAYS } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useTranslation } from "react-i18next";
import { isolateNumericRanges as bidi } from "@shared/i18n/bidi";
import { i18next } from "@/i18n";

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
    paymentStatus?: string;
    paymentMethod?: string;
    paymentRecordStatus?: string | null;
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

const ORDER_STATUS_LABELS: Record<string, string> = {
    pending: i18next.t("orders:order-confirmation.s1"),
    confirmed: i18next.t("orders:order-confirmation.s2"),
    processing: i18next.t("orders:order-confirmation.s3"),
    shipped: i18next.t("orders:order-confirmation.s4"),
    delivered: i18next.t("orders:order-confirmation.s5"),
    cancelled: i18next.t("orders:order-confirmation.s6"),
    rejected: i18next.t("orders:order-confirmation.s7"),
    rejected_carrier: i18next.t("orders:order-confirmation.s8"),
    rejected_returned: i18next.t("orders:order-confirmation.s9"),
    returned: i18next.t("orders:order-confirmation.s10"),
    refunded: i18next.t("orders:order-confirmation.s11"),
};

const INTERRUPTED_STATUSES = new Set([
    "cancelled",
    "rejected",
    "rejected_carrier",
    "rejected_returned",
    "returned",
    "refunded",
]);

const getDeliveryEstimate = () => i18next.t("orders:order-confirmation.s12", { v0: DELIVERY_DAYS });

function getOrderStage(status?: string): number {
    switch (status) {
        case "confirmed":
        case "processing":
            return 1;
        case "shipped":
            return 2;
        case "delivered":
            return 3;
        default:
            return 0;
    }
}

function getPaymentLabel(orderData: OrderData | null): string {
    if (orderData?.paymentMethod !== "alqaseh" && orderData?.paymentMethod !== "wayl") return i18next.t("orders:order-confirmation.s13");

    switch (orderData.paymentStatus) {
        case "paid":
            return i18next.t("orders:order-confirmation.s14");
        case "failed":
        case "cancelled":
        case "expired":
            return i18next.t("orders:order-confirmation.s15");
        case "refunded":
            return i18next.t("orders:order-confirmation.s11");
        default:
            return i18next.t("orders:order-confirmation.s16");
    }
}

export default function OrderConfirmation() {
  const { t } = useTranslation("orders");
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
            <div className="flex-1 bg-background">
                <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8" dir="rtl">
                    <div role="status" aria-live="polite" aria-label={t("order-confirmation.s17")} className="space-y-6">
                        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                            <div className="h-1.5 w-full bg-primary" />
                            <div className="p-5 sm:p-7 lg:p-8">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-start gap-4">
                                        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-8 w-52" />
                                            <Skeleton className="h-4 w-72 max-w-full" />
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:w-[500px]">
                                        <Skeleton className="h-20 rounded-2xl" />
                                        <Skeleton className="h-20 rounded-2xl" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                            <div className="space-y-6">
                                <Skeleton className="h-64 rounded-3xl" />
                                <Skeleton className="h-56 rounded-3xl" />
                                <Skeleton className="h-48 rounded-3xl" />
                            </div>
                            <Skeleton className="h-[430px] rounded-3xl" />
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
                    title={t("order-confirmation.s18")}
                    description={t("order-confirmation.s19")}
                    noIndex
                />
                <main className="flex flex-1 items-center justify-center px-4 py-12">
                    <Card className="w-full max-w-lg border-t-4 border-t-primary">
                        <CardHeader className="text-center">
                            <CardTitle role="heading" aria-level={1}>{t("order-confirmation.s20")}</CardTitle>
                            <CardDescription>
                                {t("order-confirmation.s21")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Button asChild className="min-h-11">
                                <Link href="/order-tracking">{t("order-confirmation.s22")}</Link>
                            </Button>
                            <Button asChild variant="outline" className="min-h-11">
                                <Link href="/products">{t("order-confirmation.s23")}</Link>
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
  const { t } = useTranslation("orders");
    const [copied, setCopied] = useState(false);
    const [invoiceOpen, setInvoiceOpen] = useState(false);

    const displayNumber = orderData?.orderNumber || orderId.slice(0, 8).toUpperCase();
    const customerName = orderData?.customerName || "";
    const customerPhone = orderData?.customerPhone || "";
    const address = orderData?.shippingAddress || "";
    const total = orderData?.total ?? 0;
    const items = orderData?.items || [];
    const loyalty = orderData?.loyalty;
    const status = orderData?.status || "pending";
    const statusLabel = ORDER_STATUS_LABELS[status] || t("order-confirmation.s24");
    const statusInterrupted = INTERRUPTED_STATUSES.has(status);
    const progressStage = getOrderStage(status);
    const paymentLabel = getPaymentLabel(orderData);
    const createdAt = orderData?.createdAt ? new Date(orderData.createdAt) : new Date();
    const createdAtLabel = Number.isNaN(createdAt.getTime())
        ? ""
        : createdAt.toLocaleString("ar-IQ", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
        });

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
        paymentStatus: orderData?.paymentStatus,
        paymentMethod: orderData?.paymentMethod,
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
        t("order-confirmation.s25", { v0: displayNumber }) +
        (itemsText ? `\n${itemsText}\n` : "") +
        (total > 0 ? t("order-confirmation.s26", { v0: formatIQD(total), v1: paymentLabel }) : "");

    const pageRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
    const factsRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !("animate" in Element.prototype)) return;

        const anims: Animation[] = [];
        const run = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
            if (el) anims.push(el.animate(kf, { fill: "both", ...opts }));
        };

        run(pageRef.current, [{ opacity: 0 }, { opacity: 1 }], {
            duration: 160,
            easing: "ease-out",
        });
        run(heroRef.current, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], {
            duration: 220,
            delay: 50,
            easing: "cubic-bezier(0.22,1,0.36,1)",
        });
        rowRefs.current.forEach((row, index) => run(row, [
            { opacity: 0, transform: "translateY(5px)" },
            { opacity: 1, transform: "translateY(0)" },
        ], {
            duration: 190,
            delay: 120 + index * 45,
            easing: "cubic-bezier(0.22,1,0.36,1)",
        }));
        run(factsRef.current, [{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], {
            duration: 200,
            delay: 200,
            easing: "cubic-bezier(0.22,1,0.36,1)",
        });

        return () => anims.forEach((animation) => animation.cancel());
    }, [orderId]);

    const statusTone = statusInterrupted
        ? "border-destructive/20 bg-destructive/10 text-destructive"
        : status === "delivered"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-primary/20 bg-primary/10 text-primary";

    const flowSteps = [
        {
            title: t("order-confirmation.s27"),
            description: t("order-confirmation.s28"),
            icon: CheckCircle2,
        },
        {
            title: t("order-confirmation.s29"),
            description: t("order-confirmation.s30"),
            icon: Package,
        },
        {
            title: t("order-confirmation.s31"),
            description: t("order-confirmation.s32", { v0: getDeliveryEstimate() }),
            icon: Truck,
        },
    ];

    return (
        <div className="flex-1 bg-background font-sans">
            <MetaTags
                title={t("order-confirmation.s33")}
                description={t("order-confirmation.s34")}
                noIndex={true}
            />

            <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8" dir="rtl">
                <div ref={pageRef} className="space-y-6">
                    <section
                        ref={heroRef}
                        aria-labelledby="order-confirmation-title"
                        className="overflow-hidden rounded-3xl border border-primary/20 bg-card text-card-foreground shadow-sm"
                    >
                        <div className="h-1.5 w-full bg-gradient-to-l from-primary via-primary to-primary/70" />
                        <div className="p-5 sm:p-7 lg:p-8">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary sm:h-16 sm:w-16">
                                        <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2} aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className={`mb-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
                                            {statusLabel}
                                        </div>
                                        <h1 id="order-confirmation-title" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                            {t("order-confirmation.s33")}
                                        </h1>
                                        <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                                            {t("order-confirmation.s35")}
                                        </p>
                                        <p className="mt-1 text-xs leading-6 text-muted-foreground sm:text-sm">
                                            {t("order-confirmation.s36")}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px] lg:shrink-0">
                                    <div className="rounded-2xl border border-border bg-muted/35 p-4">
                                        <p className="text-xs font-medium text-muted-foreground">{t("order-confirmation.s37")}</p>
                                        <div className="mt-1.5 flex items-center justify-between gap-3">
                                            <bdi className="min-w-0 truncate font-mono text-base font-bold tracking-wide text-foreground sm:text-lg" dir="ltr">
                                                #{displayNumber}
                                            </bdi>
                                            <button
                                                type="button"
                                                onClick={copyOrderNumber}
                                                aria-label={copied ? t("order-confirmation.s38") : t("order-confirmation.s39")}
                                                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-border bg-muted/35 p-4">
                                        <div className="flex items-start gap-3">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                                <Clock className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">{t("order-confirmation.s40")}</p>
                                                <p className="mt-0.5 text-base font-bold text-foreground">{getDeliveryEstimate()}</p>
                                                {createdAtLabel && <p className="mt-0.5 text-xs text-muted-foreground">{t("order-confirmation.s41")} {createdAtLabel}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                        <div className="space-y-6">
                            {items.length > 0 && (
                                <section aria-labelledby="order-items-title" className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                                    <div className="mb-4 flex items-center justify-between gap-4">
                                        <div>
                                            <h2 id="order-items-title" className="text-lg font-bold text-foreground sm:text-xl">{t("order-confirmation.s42")}</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">{t("order-confirmation.s43")}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                            {items.length} {items.length === 1 ? t("order-confirmation.s44") : t("order-confirmation.s45")}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {items.map((item, idx) => (
                                            <div
                                                key={`${item.productId}-${item.variantId || idx}`}
                                                ref={(el) => { rowRefs.current[idx] = el; }}
                                                className="flex items-center gap-4 rounded-2xl border border-border bg-muted/25 p-3 sm:p-4"
                                            >
                                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-20 sm:w-20">
                                                    {item.image ? (
                                                        <img
                                                            src={item.image}
                                                            alt={item.productName || t("order-confirmation.s46")}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <span className="grid h-full w-full place-items-center text-sm font-bold text-primary">{item.quantity}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold leading-6 text-foreground sm:text-base">
                                                        {bidi(item.productName || item.productId)}
                                                    </p>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                                                        {item.variantLabel && (
                                                            <span className="rounded-lg border border-border bg-background px-2 py-1">{item.variantLabel}</span>
                                                        )}
                                                        <span>{t("order-confirmation.s47")} {item.quantity}</span>
                                                    </div>
                                                </div>
                                                {item.priceAtPurchase != null && (
                                                    <bdi className="shrink-0 text-sm font-bold text-foreground sm:text-base">
                                                        {formatIQD(Number(item.priceAtPurchase) * item.quantity)}
                                                    </bdi>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section ref={factsRef} aria-labelledby="delivery-details-title" className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                                <div className="mb-4">
                                    <h2 id="delivery-details-title" className="text-lg font-bold text-foreground sm:text-xl">{t("order-confirmation.s48")}</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">{t("order-confirmation.s49")}</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Fact icon={<Wallet className="h-5 w-5" />} label={t("order-confirmation.s50")} value={paymentLabel} />
                                    <Fact icon={<Clock className="h-5 w-5" />} label={t("order-confirmation.s40")} value={getDeliveryEstimate()} />
                                    {customerName && <Fact icon={<User className="h-5 w-5" />} label={t("order-confirmation.s51")} value={customerName} sensitive />}
                                    {customerPhone && <Fact icon={<Phone className="h-5 w-5" />} label={t("order-confirmation.s52")} value={customerPhone} ltr sensitive />}
                                    {address && <Fact icon={<MapPin className="h-5 w-5" />} label={t("order-confirmation.s53")} value={address} full sensitive />}
                                </div>
                            </section>

                            <section aria-labelledby="next-steps-title" className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                                <div className="mb-4">
                                    <h2 id="next-steps-title" className="text-lg font-bold text-foreground sm:text-xl">{t("order-confirmation.s54")}</h2>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        {t("order-confirmation.s55")}
                                    </p>
                                </div>

                                {statusInterrupted ? (
                                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                                        <p className="font-semibold text-foreground">{t("order-confirmation.s56")} {statusLabel}</p>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                            {t("order-confirmation.s57")}
                                        </p>
                                    </div>
                                ) : (
                                    <ol className="grid gap-3 sm:grid-cols-3">
                                        {flowSteps.map((step, index) => {
                                            const StepIcon = step.icon;
                                            const completed = progressStage > index;
                                            const current = progressStage === index;
                                            const active = completed || current;
                                            return (
                                                <li
                                                    key={step.title}
                                                    aria-current={current ? "step" : undefined}
                                                    className={`rounded-2xl border p-4 ${active ? "border-primary/25 bg-primary/5" : "border-border bg-muted/20"}`}
                                                >
                                                    <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                                        {completed ? <Check className="h-5 w-5" aria-hidden="true" /> : <StepIcon className="h-5 w-5" aria-hidden="true" />}
                                                    </div>
                                                    <p className="text-sm font-bold text-foreground">{step.title}</p>
                                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                            </section>

                            {loyalty && (loyalty.pointsEarned > 0 || loyalty.cashbackEarned > 0) && (
                                <section aria-labelledby="order-rewards-title" className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                                            <Gift className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h2 id="order-rewards-title" className="font-bold text-foreground">{t("order-confirmation.s58")}</h2>
                                            <p className="text-xs text-muted-foreground">{t("order-confirmation.s59")}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {loyalty.pointsEarned > 0 && (
                                            <div className="rounded-2xl border border-border bg-card p-4 text-center">
                                                <Star className="mx-auto mb-1 h-5 w-5 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
                                                <p className="text-xl font-bold text-primary">+{loyalty.pointsEarned}</p>
                                                <p className="text-xs text-muted-foreground">{t("order-confirmation.s60")}</p>
                                            </div>
                                        )}
                                        {loyalty.cashbackEarned > 0 && (
                                            <div className="rounded-2xl border border-border bg-card p-4 text-center">
                                                <Crown className="mx-auto mb-1 h-5 w-5 text-purple-500 dark:text-purple-300" aria-hidden="true" />
                                                <p className="text-xl font-bold text-purple-600 dark:text-purple-300">+{loyalty.cashbackEarned}</p>
                                                <p className="text-xs text-muted-foreground">{t("order-confirmation.s61")}</p>
                                            </div>
                                        )}
                                    </div>
                                    {loyalty.tierUpgraded && (
                                        <div className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-center">
                                            <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                                                {t("order-confirmation.s62")} {loyalty.tier === "diamond" ? t("order-confirmation.s63") : loyalty.tier === "gold" ? t("order-confirmation.s64") : loyalty.tier === "silver" ? t("order-confirmation.s65") : t("order-confirmation.s66")}!
                                            </p>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        <aside className="lg:sticky lg:top-24">
                            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                                <div className="p-5 sm:p-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground">{t("order-confirmation.s67")}</h2>
                                            <p className="mt-1 text-xs text-muted-foreground">{t("order-confirmation.s68")}</p>
                                        </div>
                                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                                            <Wallet className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                    </div>

                                    {total > 0 && (
                                        <div className="mt-5 space-y-3 text-sm">
                                            {subtotal > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                                    <span>{t("order-confirmation.s69")}</span>
                                                    <bdi className="font-medium text-foreground">{formatIQD(subtotal)}</bdi>
                                                </div>
                                            )}
                                            {shippingCost > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                                    <span>{t("order-confirmation.s31")}</span>
                                                    <bdi className="font-medium text-foreground">{formatIQD(shippingCost)}</bdi>
                                                </div>
                                            )}
                                            {shippingCost === 0 && subtotal > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                                    <span>{t("order-confirmation.s31")}</span>
                                                    <span className="font-semibold text-primary">{t("order-confirmation.s70")}</span>
                                                </div>
                                            )}
                                            {discountAmount > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                                    <span>{t("order-confirmation.s71")}</span>
                                                    <bdi className="font-semibold text-primary">-{formatIQD(discountAmount)}</bdi>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                                                <span className="font-bold text-foreground">{t("order-confirmation.s72")}</span>
                                                <bdi className="text-2xl font-bold text-primary">{formatIQD(total)}</bdi>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-5 rounded-2xl bg-muted/35 p-3.5">
                                        <p className="text-xs text-muted-foreground">{t("order-confirmation.s50")}</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{paymentLabel}</p>
                                    </div>
                                </div>

                                <div className="border-t border-border bg-muted/15 p-5 sm:p-6">
                                    <div className="space-y-3">
                                        <Button asChild className="min-h-12 w-full text-sm font-bold">
                                            <Link href="/order-tracking">
                                                <Truck className="ml-2 h-4 w-4" aria-hidden="true" />
                                                {t("order-confirmation.s73")}
                                            </Link>
                                        </Button>
                                        <Button
                                            className="min-h-12 w-full text-sm font-semibold"
                                            variant="outline"
                                            onClick={() => setInvoiceOpen(true)}
                                        >
                                            <Printer className="ml-2 h-4 w-4" aria-hidden="true" />
                                            {t("order-confirmation.s74")}
                                        </Button>
                                        <WhatsAppLink
                                            source="order_confirmation"
                                            orderNumber={orderData?.orderNumber ?? orderId}
                                            message={whatsappText}
                                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                                            {t("order-confirmation.s75")}
                                        </WhatsAppLink>
                                        <Button asChild className="min-h-11 w-full text-muted-foreground hover:bg-muted hover:text-foreground" variant="ghost">
                                            <Link href="/">
                                                <Home className="ml-2 h-4 w-4" aria-hidden="true" />
                                                {t("order-confirmation.s76")}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </aside>
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

function Fact({ icon, label, value, ltr, full, sensitive }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean; full?: boolean; sensitive?: boolean }) {
    return (
        <div className={`flex min-h-20 items-start gap-3 rounded-2xl border border-border bg-muted/25 p-4 ${full ? "sm:col-span-2" : ""}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
                <div
                    className={`mt-1 break-words text-sm font-semibold leading-6 text-foreground${sensitive ? " ph-no-capture" : ""}`}
                    dir={ltr ? "ltr" : "auto"}
                    {...(sensitive ? { "data-clarity-mask": "True" } : {})}
                >
                    {value}
                </div>
            </div>
        </div>
    );
}
