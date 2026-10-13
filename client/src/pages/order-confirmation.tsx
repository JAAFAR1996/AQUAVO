import { useEffect, useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Copy,
    Gift,
    Home,
    MessageCircle,
    Package,
    Printer,
    Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDialog } from "@/components/cart/invoice-dialog";
import { OrderReceiptPrinter } from "@/components/cart/order-receipt-printer";
import { formatIQD } from "@/lib/utils";
import { readStashedOrder } from "@/lib/order-stash";
import { ttqPurchase } from "@/lib/tiktok-pixel";
import { phTrackPurchase } from "@/lib/posthog";
import { metaTrackPurchase } from "@/lib/meta-pixel";
import { trackPurchase } from "@/lib/analytics";
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
            trackPurchase({
                orderId: full.orderNumber || full.id,
                total: Number(full.total ?? 0),
                items: full.items.map(item => ({
                    id: item.productId,
                    name: item.productName || item.productId,
                    price: Number(item.priceAtPurchase || 0),
                    quantity: item.quantity,
                })),
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
                title={statusInterrupted ? t("order-confirmation.s24") : t("order-confirmation.s33")}
                description={statusInterrupted ? t("order-confirmation.s57") : t("order-confirmation.s34")}
                noIndex={true}
            />

            <main className="mx-auto w-full max-w-[800px] px-4 py-6 sm:px-6 sm:py-10" dir={i18next.dir()}>
                <div className="space-y-6 sm:space-y-8">
                    {/* Compact confirmation: the animated receipt is the visual centerpiece. */}
                    <section
                        aria-labelledby="order-confirmation-title"
                        className="rounded-2xl border border-primary/20 bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-6"
                    >
                        <div className="flex items-start gap-3 sm:gap-4">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                                <CheckCircle2 className="h-6 w-6" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className={\`mb-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold \${statusTone}\`}>
                                    {statusLabel}
                                </div>
                                <h1 id="order-confirmation-title" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                    {statusInterrupted ? t("order-confirmation.s56") : t("order-confirmation.s33")}
                                </h1>
                                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                    {statusInterrupted ? t("order-confirmation.s57") : t("order-confirmation.s35")}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                            <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/35 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">{t("order-confirmation.s37")}</p>
                                    <bdi dir="ltr" className="mt-1 block truncate font-mono text-sm font-bold text-foreground">
                                        #{displayNumber}
                                    </bdi>
                                </div>
                                <button
                                    type="button"
                                    onClick={copyOrderNumber}
                                    aria-label={copied ? t("order-confirmation.s38") : t("order-confirmation.s39")}
                                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                            {!statusInterrupted && (
                                <div className="flex items-center gap-3 rounded-xl bg-muted/35 px-3 py-2.5">
                                    <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">{t("order-confirmation.s40")}</p>
                                        <p className="mt-0.5 text-sm font-bold text-foreground">{getDeliveryEstimate()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {!statusInterrupted && items.length > 0 && (
                        <OrderReceiptPrinter
                            orderNumber={displayNumber}
                            items={items}
                            subtotal={subtotal}
                            deliveryFee={shippingCost}
                            discount={discountAmount}
                            total={Number(total)}
                            paymentLabel={paymentLabel}
                            dateLabel={createdAtLabel}
                        />
                    )}

                    {/* One clear action group immediately after the receipt. */}
                    <section aria-labelledby="order-next-actions" className="mx-auto max-w-2xl rounded-2xl border border-border bg-card px-4 py-5 sm:px-6">
                        <h2 id="order-next-actions" className="text-base font-bold text-foreground">
                            {t("order-confirmation.s54")}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {statusInterrupted ? t("order-confirmation.s57") : t("order-confirmation.s55")}
                        </p>
                        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                            <Button asChild className="min-h-12 w-full text-sm font-bold">
                                <Link href="/order-tracking" className="flex items-center justify-center gap-2">
                                    <Truck className="h-4 w-4" aria-hidden="true" />
                                    {t("order-confirmation.s73")}
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-12 w-full gap-2 text-sm font-semibold"
                                onClick={() => setInvoiceOpen(true)}
                            >
                                <Printer className="h-4 w-4" aria-hidden="true" />
                                {t("order-confirmation.s74")}
                            </Button>
                        </div>
                        <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-5">
                            <WhatsAppLink
                                source="order_confirmation"
                                orderNumber={orderData?.orderNumber ?? orderId}
                                message={whatsappText}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                                {t("order-confirmation.s75")}
                            </WhatsAppLink>
                            <Link
                                href="/products"
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <Home className="h-4 w-4" aria-hidden="true" />
                                {t("order-confirmation.s23")}
                            </Link>
                        </div>
                    </section>

                    {/* All existing order information remains available without competing with the receipt. */}
                    <details className="group mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-card">
                        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:px-6 [&::-webkit-details-marker]:hidden">
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-foreground">{t("order-confirmation.s42")}</h2>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("order-confirmation.s77")}</p>
                            </div>
                            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                        </summary>

                        <div className="space-y-6 border-t border-border px-4 py-5 sm:px-6 sm:py-6">
                            {items.length > 0 && (
                                <section aria-labelledby="order-items-title">
                                    <h3 id="order-items-title" className="mb-3 text-sm font-bold text-foreground">{t("order-confirmation.s43")}</h3>
                                    <ul className="divide-y divide-border/70">
                                        {items.map((item, idx) => (
                                            <li key={\`\${item.productId}-\${item.variantId || idx}\`} className="flex items-center gap-3 py-3">
                                                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted/30">
                                                    {item.image ? (
                                                        <img
                                                            src={item.image}
                                                            alt={item.productName || t("order-confirmation.s46")}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                            width={48}
                                                            height={48}
                                                        />
                                                    ) : <Package className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold leading-5 text-foreground">{bidi(item.productName || item.productId)}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {item.variantLabel ? \`\${item.variantLabel} · \` : ""}{t("order-confirmation.s47")} {item.quantity}
                                                    </p>
                                                </div>
                                                {item.priceAtPurchase != null && (
                                                    <bdi dir="ltr" className="shrink-0 text-xs font-semibold text-foreground sm:text-sm">
                                                        {formatIQD(Number(item.priceAtPurchase) * item.quantity)}
                                                    </bdi>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <section aria-labelledby="order-shipping-title" className="border-t border-border pt-5">
                                <h3 id="order-shipping-title" className="mb-3 text-sm font-bold text-foreground">{t("order-confirmation.s48")}</h3>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <dt className="text-muted-foreground">{t("order-confirmation.s50")}</dt>
                                        <dd className="font-medium text-foreground">{paymentLabel}</dd>
                                    </div>
                                    {!statusInterrupted && (
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <dt className="text-muted-foreground">{t("order-confirmation.s40")}</dt>
                                            <dd className="font-medium text-foreground">{getDeliveryEstimate()}</dd>
                                        </div>
                                    )}
                                    {customerName && (
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <dt className="text-muted-foreground">{t("order-confirmation.s51")}</dt>
                                            <dd dir="auto" className="ph-no-capture break-words font-medium text-foreground" data-clarity-mask="True">{customerName}</dd>
                                        </div>
                                    )}
                                    {customerPhone && (
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <dt className="text-muted-foreground">{t("order-confirmation.s52")}</dt>
                                            <dd dir="ltr" className="ph-no-capture font-medium text-foreground" data-clarity-mask="True">{customerPhone}</dd>
                                        </div>
                                    )}
                                    {address && (
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <dt className="text-muted-foreground">{t("order-confirmation.s53")}</dt>
                                            <dd dir="auto" className="ph-no-capture max-w-full break-words font-medium text-foreground" data-clarity-mask="True">{address}</dd>
                                        </div>
                                    )}
                                </dl>
                            </section>

                            <section aria-labelledby="order-financial-title" className="border-t border-border pt-5">
                                <h3 id="order-financial-title" className="mb-3 text-sm font-bold text-foreground">{t("order-confirmation.s67")}</h3>
                                <dl className="space-y-3 text-sm">
                                    {subtotal > 0 && (
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="text-muted-foreground">{t("order-confirmation.s69")}</dt>
                                            <dd dir="ltr" className="font-medium text-foreground">{formatIQD(subtotal)}</dd>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-muted-foreground">{t("order-confirmation.s31")}</dt>
                                        <dd dir="ltr" className="font-medium text-foreground">
                                            {shippingCost === 0 ? t("order-confirmation.s70") : formatIQD(shippingCost)}
                                        </dd>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="text-muted-foreground">{t("order-confirmation.s71")}</dt>
                                            <dd dir="ltr" className="font-medium text-primary">-{formatIQD(discountAmount)}</dd>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                                        <dt className="font-bold text-foreground">{t("order-confirmation.s72")}</dt>
                                        <dd dir="ltr" className="text-lg font-bold text-foreground">{formatIQD(total)}</dd>
                                    </div>
                                </dl>
                            </section>

                            <section aria-labelledby="order-progress-title" className="border-t border-border pt-5">
                                <h3 id="order-progress-title" className="mb-3 text-sm font-bold text-foreground">{t("order-confirmation.s54")}</h3>
                                {statusInterrupted ? (
                                    <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-foreground">
                                        {t("order-confirmation.s56")} {statusLabel}. {t("order-confirmation.s57")}
                                    </p>
                                ) : (
                                    <ol className="grid gap-2 sm:grid-cols-3">
                                        {flowSteps.map((step, index) => {
                                            const StepIcon = step.icon;
                                            const completed = progressStage > index;
                                            const current = progressStage === index;
                                            return (
                                                <li
                                                    key={step.title}
                                                    aria-current={current ? "step" : undefined}
                                                    className={\`rounded-xl border px-3 py-3 \${completed || current ? "border-primary/25 bg-primary/5" : "border-border bg-muted/20"}\`}
                                                >
                                                    <StepIcon className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
                                                    <p className="text-xs font-semibold text-foreground">{step.title}</p>
                                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                            </section>

                            {loyalty && (loyalty.pointsEarned > 0 || loyalty.cashbackEarned > 0) && (
                                <section aria-labelledby="order-rewards-title" className="border-t border-border pt-5">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                                        <h3 id="order-rewards-title" className="text-sm font-bold text-foreground">{t("order-confirmation.s58")}</h3>
                                    </div>
                                    <p className="mb-3 text-xs text-muted-foreground">{t("order-confirmation.s59")}</p>
                                    <dl className="space-y-2 text-sm">
                                        {loyalty.pointsEarned > 0 && (
                                            <div className="flex items-center justify-between gap-2">
                                                <dt className="text-muted-foreground">{t("order-confirmation.s60")}</dt>
                                                <dd className="font-semibold text-foreground">+{loyalty.pointsEarned}</dd>
                                            </div>
                                        )}
                                        {loyalty.cashbackEarned > 0 && (
                                            <div className="flex items-center justify-between gap-2">
                                                <dt className="text-muted-foreground">{t("order-confirmation.s61")}</dt>
                                                <dd className="font-semibold text-foreground">+{loyalty.cashbackEarned}</dd>
                                            </div>
                                        )}
                                    </dl>
                                    {loyalty.tierUpgraded && (
                                        <p className="mt-3 text-sm font-medium text-primary">
                                            {t("order-confirmation.s62")} {loyalty.tier === "diamond" ? t("order-confirmation.s63") : loyalty.tier === "gold" ? t("order-confirmation.s64") : loyalty.tier === "silver" ? t("order-confirmation.s65") : t("order-confirmation.s66")}
                                        </p>
                                    )}
                                </section>
                            )}
                        </div>
                    </details>
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

