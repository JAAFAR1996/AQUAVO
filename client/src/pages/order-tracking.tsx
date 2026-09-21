import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Home,
  Package,
  PackageCheck,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

interface CarrierTracking {
  carrier: string;
  status: string;
  statusId: string | null;
  hasIssue: boolean;
  providerUpdatedAt: string | null;
  lastSyncedAt: string;
  source: "alwaseet";
}

interface TrackingApiResponse {
  orderNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  shipping: CarrierTracking | null;
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  time: string | null;
  completed: boolean;
  current: boolean;
}

interface OrderDetails {
  orderNumber: string;
  orderDate: string;
  localStatus: string;
  shipping: CarrierTracking | null;
  timeline: TimelineItem[];
}

const STATUS_COPY: Record<string, { label: string; description: string }> = {
  pending: {
    label: i18next.t("orders:order-tracking.s1"),
    description: i18next.t("orders:order-tracking.s2"),
  },
  confirmed: {
    label: i18next.t("orders:order-tracking.s3"),
    description: i18next.t("orders:order-tracking.s4"),
  },
  processing: {
    label: i18next.t("orders:order-tracking.s5"),
    description: i18next.t("orders:order-tracking.s6"),
  },
  shipped: {
    label: i18next.t("orders:order-tracking.s7"),
    description: i18next.t("orders:order-tracking.s8"),
  },
  delivered: {
    label: i18next.t("orders:order-tracking.s9"),
    description: i18next.t("orders:order-tracking.s10"),
  },
  cancelled: {
    label: i18next.t("orders:order-tracking.s11"),
    description: i18next.t("orders:order-tracking.s12"),
  },
  rejected: {
    label: i18next.t("orders:order-tracking.s13"),
    description: i18next.t("orders:order-tracking.s14"),
  },
  rejected_carrier: {
    label: i18next.t("orders:order-tracking.s15"),
    description: i18next.t("orders:order-tracking.s16"),
  },
  rejected_returned: {
    label: i18next.t("orders:order-tracking.s17"),
    description: i18next.t("orders:order-tracking.s18"),
  },
  returned: {
    label: i18next.t("orders:order-tracking.s19"),
    description: i18next.t("orders:order-tracking.s20"),
  },
  refunded: {
    label: i18next.t("orders:order-tracking.s21"),
    description: i18next.t("orders:order-tracking.s22"),
  },
};

const TERMINAL_LOCAL_STATUSES = new Set([
  "delivered",
  "cancelled",
  "rejected",
  "rejected_carrier",
  "rejected_returned",
  "returned",
  "refunded",
]);

function formatOrderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return i18next.t("orders:order-tracking.s23");
  return date.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatEventTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusCopy(status: string) {
  return STATUS_COPY[status] ?? {
    label: i18next.t("orders:order-tracking.s24"),
    description: i18next.t("orders:order-tracking.s25"),
  };
}

function buildTimeline(data: TrackingApiResponse): TimelineItem[] {
  const localCopy = getStatusCopy(data.status);
  const terminal = TERMINAL_LOCAL_STATUSES.has(data.status);
  const receivedTime = formatEventTime(data.createdAt);
  const items: TimelineItem[] = [
    {
      id: "aquavo-received",
      title: i18next.t("orders:order-tracking.s26"),
      description: i18next.t("orders:order-tracking.s27"),
      time: receivedTime,
      completed: data.status !== "pending" || Boolean(data.shipping),
      current: data.status === "pending" && !data.shipping,
    },
  ];

  // A terminal AQUAVO state is newer business truth than an older carrier mirror.
  // Do not let a stale provider state make a returned/rejected order look active.
  if (data.shipping && !terminal) {
    items.push({
      id: "carrier-live",
      title: data.shipping.status,
      description: i18next.t("orders:order-tracking.s28", { v0: data.shipping.carrier }),
      time: formatEventTime(data.shipping.providerUpdatedAt ?? data.shipping.lastSyncedAt),
      completed: false,
      current: true,
    });
    return items;
  }

  if (data.status !== "pending") {
    items.push({
      id: "aquavo-current",
      title: localCopy.label,
      description: localCopy.description,
      time: formatEventTime(data.updatedAt),
      completed: terminal,
      current: !terminal,
    });
  }

  return items;
}

function currentDisplay(details: OrderDetails) {
  const terminal = TERMINAL_LOCAL_STATUSES.has(details.localStatus);
  if (terminal) {
    const copy = getStatusCopy(details.localStatus);
    return { label: copy.label, title: copy.label, helper: copy.description };
  }
  if (details.shipping) {
    return {
      label: details.shipping.status,
      title: details.shipping.status,
      helper: i18next.t("orders:order-tracking.s29", { v0: details.shipping.carrier }),
    };
  }
  const copy = getStatusCopy(details.localStatus);
  return {
    label: copy.label,
    title: copy.label,
    helper: details.localStatus === "shipped"
      ? i18next.t("orders:order-tracking.s30")
      : copy.description,
  };
}

export default function OrderTracking() {
  const { t } = useTranslation("orders");
  const [orderNumber, setOrderNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrderDetails(null);

    const normalizedOrderNumber = orderNumber.trim();
    if (!normalizedOrderNumber) {
      setError(t("order-tracking.s31"));
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/orders/track/${encodeURIComponent(normalizedOrderNumber)}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(t("order-tracking.s32"));
      }

      const data = (await response.json()) as TrackingApiResponse;
      setOrderDetails({
        orderNumber: data.orderNumber?.trim() || normalizedOrderNumber,
        orderDate: formatOrderDate(data.createdAt),
        localStatus: data.status,
        shipping: data.shipping,
        timeline: buildTimeline(data),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("order-tracking.s33"));
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: TimelineItem) => {
    if (status.completed) return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />;
    if (status.current) return <Truck className="h-5 w-5 text-primary" aria-hidden="true" />;
    return <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
  };

  const display = orderDetails ? currentDisplay(orderDetails) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background font-sans" data-testid="order-tracking-page">
      <section className="border-b bg-gradient-to-b from-primary/[0.06] to-background py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto flex max-w-2xl flex-col items-center"
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/[0.07] px-4 py-1.5 text-sm text-primary">
              <Package className="ml-2 h-4 w-4" aria-hidden="true" />
              {t("order-tracking.s34")}
            </Badge>
            <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t("order-tracking.s35")}</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              {t("order-tracking.s36")}
            </p>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 max-w-2xl"
          >
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-5 md:p-7">
                <form onSubmit={handleSearch} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="order-number" className="text-sm font-semibold text-foreground/85">{t("order-tracking.s37")}</label>
                    <div className="relative">
                      <Package className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="order-number"
                        type="text"
                        placeholder={t("order-tracking.s38")}
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        className="h-12 border-border/80 pr-12 text-base shadow-none focus-visible:border-primary"
                        autoComplete="off"
                        required
                        data-testid="input-order-number"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700" role="alert">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <p className="text-sm font-medium leading-6">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full text-base font-bold shadow-sm"
                    disabled={isSearching}
                    data-testid="button-track-order"
                  >
                    {isSearching ? (
                      <>
                        <span className="ml-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                        {t("order-tracking.s39")}
                      </>
                    ) : (
                      <>
                        <Search className="ml-2 h-5 w-5" aria-hidden="true" />
                        {t("order-tracking.s40")}
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-5 border-t pt-5">
                  <p className="text-center text-sm leading-6 text-muted-foreground">
                    {t("order-tracking.s41")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {orderDetails && display && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-5xl"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <Card className="overflow-hidden border-border/70 shadow-sm">
                  <CardContent className="p-0">
                    <div className="border-b bg-muted/[0.18] p-5 md:p-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="mb-1 text-sm text-muted-foreground">{t("order-tracking.s37")}</p>
                          <h2 className="break-all text-xl font-bold tracking-tight md:text-2xl" dir="ltr">
                            {orderDetails.orderNumber}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("order-tracking.s42")} <span dir="ltr">{orderDetails.orderDate}</span>
                          </p>
                        </div>
                        <Badge className="w-fit max-w-full border-0 bg-primary/10 px-3.5 py-2 text-sm font-bold text-primary hover:bg-primary/10">
                          <Truck className="ml-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{display.label}</span>
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5 md:p-7">
                      <h3 className="mb-6 text-lg font-bold">{t("order-tracking.s43")}</h3>
                      <div className="relative space-y-1">
                        <div className="absolute bottom-6 right-5 top-6 w-px bg-border" aria-hidden="true" />
                        {orderDetails.timeline.map((status) => (
                          <div key={status.id} className="relative flex gap-4 py-4">
                            <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${
                              status.completed
                                ? "border-emerald-200 bg-emerald-50"
                                : status.current
                                  ? "border-primary/35 bg-primary/10 ring-4 ring-primary/[0.08]"
                                  : "border-border bg-background"
                            }`}>
                              {getStatusIcon(status)}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <h4 className={`font-bold ${status.current ? "text-primary" : "text-foreground"}`}>
                                  {status.title}
                                </h4>
                                {status.time && <time className="text-xs text-muted-foreground">{status.time}</time>}
                              </div>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{status.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="h-fit border-border/70 shadow-sm">
                  <CardContent className="p-5 md:p-6">
                    <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                      <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
                      {t("order-tracking.s44")}
                    </h3>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-primary/10 bg-primary/[0.045] p-4">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">{t("order-tracking.s45")}</p>
                        <p className="font-bold leading-6 text-primary">{display.title}</p>
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{display.helper}</p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-4">
                        <p className="mb-1 text-xs text-muted-foreground">{t("order-tracking.s46")}</p>
                        <p className="font-semibold">{orderDetails.shipping?.carrier ?? t("order-tracking.s47")}</p>
                      </div>

                      {orderDetails.shipping && (
                        <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-4">
                          <p className="mb-1 text-xs text-muted-foreground">{t("order-tracking.s48")}</p>
                          <p className="font-semibold">{formatEventTime(orderDetails.shipping.lastSyncedAt) ?? t("order-tracking.s49")}</p>
                        </div>
                      )}

                      {orderDetails.shipping?.hasIssue && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <p className="text-sm leading-6">
                            {t("order-tracking.s50")}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {!orderDetails && !error && (
            <motion.section
              className="mx-auto mt-10 max-w-4xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="mb-7 flex items-center justify-center gap-2 text-center text-xl font-bold md:text-2xl">
                <ChevronLeft className="h-5 w-5 text-primary" aria-hidden="true" />
                {t("order-tracking.s51")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: ShoppingBag, title: t("order-tracking.s52"), desc: t("order-tracking.s53") },
                  { icon: PackageCheck, title: t("order-tracking.s5"), desc: t("order-tracking.s54") },
                  { icon: Truck, title: t("order-tracking.s46"), desc: t("order-tracking.s55") },
                  { icon: Home, title: t("order-tracking.s56"), desc: t("order-tracking.s57") },
                ].map((step) => (
                  <Card key={step.title} className="border-border/60 shadow-none">
                    <CardContent className="p-5 text-center">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/[0.08]">
                        <step.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="mb-1 font-bold">{step.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{step.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>
    </div>
  );
}
