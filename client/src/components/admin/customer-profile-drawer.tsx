import { useQuery } from "@tanstack/react-query";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Phone, Mail, MapPin, Calendar, ShoppingCart, Eye, Search, Star, Heart, Clock, TrendingUp, TrendingDown, Minus, Monitor, Smartphone, Package, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

interface CustomerProfileDrawerProps {
    userId: string | null;
    onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:    { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-700" },
    confirmed:  { label: "مؤكد",         color: "bg-blue-100 text-blue-700" },
    processing: { label: "قيد التجهيز",  color: "bg-purple-100 text-purple-700" },
    shipped:    { label: "تم الشحن",      color: "bg-cyan-100 text-cyan-700" },
    delivered:  { label: "تم التسليم",    color: "bg-green-100 text-green-700" },
    cancelled:  { label: "ملغي",          color: "bg-red-100 text-red-700" },
};

const SOURCE_LABELS: Record<string, string> = {
    facebook: "فيسبوك", instagram: "انستغرام", tiktok: "تيك توك",
    google: "Google", youtube: "يوتيوب", whatsapp: "واتساب",
    telegram: "تيليغرام", direct: "مباشر", other: "أخرى",
};

function fmt(n: number) {
    return new Intl.NumberFormat("ar-IQ").format(Math.round(n));
}
function fmtTime(seconds: number) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return m > 0 ? `${m}د ${s}ث` : `${s}ث`;
}
function fmtDate(d: string | Date | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("ar-IQ", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CustomerProfileDrawer({ userId, onClose }: CustomerProfileDrawerProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["admin-customer-profile", userId],
        queryFn: async () => {
            const res = await fetch(`/api/admin/users/${userId}/profile`, { credentials: "include" });
            if (!res.ok) throw new Error("فشل تحميل ملف العميل");
            return res.json();
        },
        enabled: !!userId,
    });

    const repurchaseConfig = {
        high:    { label: "احتمالية شراء عالية", icon: <TrendingUp className="w-4 h-4" />, color: "text-green-600 bg-green-50 border-green-200" },
        medium:  { label: "احتمالية شراء متوسطة", icon: <Minus className="w-4 h-4" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
        low:     { label: "احتمالية شراء منخفضة", icon: <TrendingDown className="w-4 h-4" />, color: "text-red-600 bg-red-50 border-red-200" },
        unknown: { label: "لا توجد بيانات كافية", icon: <AlertTriangle className="w-4 h-4" />, color: "text-gray-500 bg-gray-50 border-gray-200" },
    };

    return (
        <Sheet open={!!userId} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent
                side="left"
                className="w-full sm:max-w-2xl overflow-y-auto p-0"
                dir="rtl"
            >
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}
                {error && (
                    <div className="flex items-center justify-center h-full text-destructive">
                        فشل تحميل ملف العميل
                    </div>
                )}
                {data && (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b bg-gradient-to-l from-primary/5 to-transparent">
                            <SheetHeader className="text-right">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                                        {(data.user.fullName || data.user.email || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <SheetTitle className="text-xl font-bold">{data.user.fullName || "مجهول"}</SheetTitle>
                                        <SheetDescription className="mt-1 space-y-1">
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span dir="ltr">{data.user.email}</span>
                                            </div>
                                            {data.user.phone && (
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    <span dir="ltr">{data.user.phone}</span>
                                                </div>
                                            )}
                                            {data.user.birthDate && (
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>عيد الميلاد: {fmtDate(data.user.birthDate)}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>انضم في {fmtDate(data.user.createdAt)}</span>
                                            </div>
                                        </SheetDescription>

                                        {/* Repurchase prediction badge */}
                                        <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full border text-sm font-semibold ${repurchaseConfig[data.stats.repurchaseLikelihood as keyof typeof repurchaseConfig]?.color}`}>
                                            {repurchaseConfig[data.stats.repurchaseLikelihood as keyof typeof repurchaseConfig]?.icon}
                                            {repurchaseConfig[data.stats.repurchaseLikelihood as keyof typeof repurchaseConfig]?.label}
                                        </div>
                                    </div>
                                </div>
                            </SheetHeader>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 divide-x divide-x-reverse border-b">
                            {[
                                { label: "إجمالي الإنفاق", value: fmt(data.stats.totalSpent) + " د.ع", icon: <ShoppingCart className="w-4 h-4 text-green-500" /> },
                                { label: "الطلبات", value: data.stats.totalOrders, icon: <Package className="w-4 h-4 text-blue-500" /> },
                                { label: "الزيارات", value: data.stats.totalPageViews, icon: <Eye className="w-4 h-4 text-purple-500" /> },
                                { label: "آخر نشاط", value: data.stats.daysSinceLastActivity !== null ? `${data.stats.daysSinceLastActivity} يوم` : "—", icon: <Activity className="w-4 h-4 text-amber-500" /> },
                            ].map((stat, i) => (
                                <div key={i} className="flex flex-col items-center p-3 text-center">
                                    <div className="mb-1">{stat.icon}</div>
                                    <p className="text-lg font-bold leading-tight">{stat.value}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="summary" dir="rtl" className="flex-1">
                            <TabsList className="w-full rounded-none border-b h-auto p-0 bg-transparent justify-start overflow-x-auto">
                                {[
                                    { value: "summary",  label: "ملخص" },
                                    { value: "orders",   label: "الطلبات" },
                                    { value: "journey",  label: "رحلة الزيارات" },
                                    { value: "browse",   label: "التصفح" },
                                    { value: "ai",       label: "تحليل AI" },
                                ].map(t => (
                                    <TabsTrigger
                                        key={t.value}
                                        value={t.value}
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary shrink-0 px-4 py-3"
                                    >
                                        {t.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* ── Summary Tab ── */}
                            <TabsContent value="summary" className="p-4 space-y-4">
                                {/* Spending breakdown */}
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">الإنفاق والطلبات</CardTitle></CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <Row label="إجمالي الإنفاق" value={fmt(data.stats.totalSpent) + " د.ع"} />
                                        <Row label="متوسط قيمة الطلب" value={fmt(data.stats.averageOrderValue) + " د.ع"} />
                                        <Row label="الطلبات المكتملة" value={`${data.stats.completedOrders} / ${data.stats.totalOrders}`} />
                                        <Row label="المفضلة" value={data.stats.totalFavorites} />
                                        <Row label="بالسلة الآن" value={data.stats.cartItems} />
                                        <Row label="المراجعات" value={data.stats.totalReviews} />
                                    </CardContent>
                                </Card>

                                {/* Activity breakdown */}
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">نشاط الموقع</CardTitle></CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <Row label="مجموع الزيارات" value={data.stats.totalPageViews} />
                                        <Row label="وقت على الموقع" value={fmtTime(data.stats.totalTimeOnSite)} />
                                        <Row label="عمليات البحث" value={data.stats.totalSearches} />
                                        <Row label="منتجات شوفها" value={data.stats.totalProductViews} />
                                    </CardContent>
                                </Card>

                                {/* Device & source */}
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">الأجهزة والمصادر</CardTitle></CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                                            <span>موبايل</span>
                                            <span className="font-bold mr-auto">{data.stats.devices.mobile}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Monitor className="w-4 h-4 text-muted-foreground" />
                                            <span>كمبيوتر</span>
                                            <span className="font-bold mr-auto">{data.stats.devices.desktop}</span>
                                        </div>
                                        {data.stats.topSources.slice(0, 4).map((s: { source: string; count: number }) => (
                                            <Row key={s.source} label={SOURCE_LABELS[s.source] ?? s.source} value={s.count} />
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Addresses */}
                                {data.addresses.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-sm">العناوين المستخدمة</CardTitle></CardHeader>
                                        <CardContent className="space-y-2">
                                            {data.addresses.map((addr: Record<string, string>, i: number) => (
                                                <div key={i} className="flex items-start gap-2 text-sm border rounded-lg p-2">
                                                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                                    <div>
                                                        {addr.fullName && <p className="font-medium">{addr.fullName}</p>}
                                                        <p className="text-muted-foreground">
                                                            {[addr.governorate, addr.city, addr.district, addr.street, addr.nearestLandmark]
                                                                .filter(Boolean).join(" — ")}
                                                        </p>
                                                        {addr.phone && <p dir="ltr" className="text-xs text-muted-foreground">{addr.phone}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Top pages */}
                                {data.topPages.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-sm">أكثر الصفحات زيارة</CardTitle></CardHeader>
                                        <CardContent className="space-y-1.5">
                                            {data.topPages.slice(0, 8).map((p: { path: string; count: number }, i: number) => {
                                                const max = data.topPages[0].count;
                                                return (
                                                    <div key={p.path} className="flex items-center gap-2 text-sm">
                                                        <span className="text-xs text-muted-foreground w-4 text-center">{i + 1}</span>
                                                        <span className="font-mono text-xs flex-1 truncate" dir="ltr">{p.path}</span>
                                                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(p.count / max) * 100}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold w-5 text-left">{p.count}</span>
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* ── Orders Tab ── */}
                            <TabsContent value="orders" className="p-4 space-y-3">
                                {data.orders.length === 0 ? (
                                    <EmptyState label="لا توجد طلبات بعد" />
                                ) : data.orders.map((o: any) => {
                                    const cfg = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
                                    const items: any[] = Array.isArray(o.items) ? o.items : (typeof o.items === "string" ? JSON.parse(o.items) : []);
                                    return (
                                        <Card key={o.id} className="overflow-hidden">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-sm" dir="ltr">#{o.orderNumber ?? o.id.slice(0, 8)}</p>
                                                        <p className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</p>
                                                    </div>
                                                    <div className="text-left space-y-1">
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                                                        <p className="text-sm font-bold text-green-600 text-left">{fmt(o.total)} د.ع</p>
                                                    </div>
                                                </div>
                                                {/* Order items */}
                                                <div className="space-y-1 border-t pt-2">
                                                    {items.map((item: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground truncate flex-1">{item.name ?? item.productName ?? "منتج"}</span>
                                                            <span className="font-medium mr-2">×{item.quantity}</span>
                                                            <span className="font-bold mr-2">{fmt(Number(item.price ?? item.priceAtPurchase ?? 0))} د.ع</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Shipping address */}
                                                {o.shippingAddress && (() => {
                                                    try {
                                                        const addr = typeof o.shippingAddress === "string" ? JSON.parse(o.shippingAddress) : o.shippingAddress;
                                                        return (
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-2">
                                                                <MapPin className="w-3 h-3 shrink-0" />
                                                                <span>{[addr.governorate, addr.city, addr.district].filter(Boolean).join(" — ")}</span>
                                                            </div>
                                                        );
                                                    } catch { return null; }
                                                })()}
                                                {o.source && (
                                                    <p className="text-xs text-muted-foreground border-t pt-2">
                                                        المصدر: {SOURCE_LABELS[o.source] ?? o.source}
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </TabsContent>

                            {/* ── Journey Tab ── */}
                            <TabsContent value="journey" className="p-4 space-y-3">
                                {data.journey.length === 0 ? (
                                    <EmptyState label="لا توجد بيانات زيارة مسجلة" />
                                ) : (
                                    <>
                                        <p className="text-xs text-muted-foreground">{data.journey.length} زيارة مسجلة — آخر 200 زيارة</p>
                                        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                                            {data.journey.map((v: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-xs border rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
                                                    <div className="w-2 h-2 rounded-full bg-primary/50 shrink-0" />
                                                    <span className="font-mono flex-1 truncate" dir="ltr">{v.pagePath}</span>
                                                    {v.duration > 0 && (
                                                        <span className="text-amber-600 font-medium shrink-0">{fmtTime(v.duration)}</span>
                                                    )}
                                                    {v.deviceType === "mobile"
                                                        ? <Smartphone className="w-3 h-3 text-muted-foreground shrink-0" />
                                                        : <Monitor className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    }
                                                    <span className="text-muted-foreground shrink-0 text-[10px]">
                                                        {new Date(v.timestamp).toLocaleString("ar-IQ", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* ── Browse Tab ── */}
                            <TabsContent value="browse" className="p-4 space-y-4">
                                {/* Searches */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Search className="w-4 h-4" />
                                            سجل البحث ({data.searches.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {data.searches.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-2">لا توجد عمليات بحث مسجلة</p>
                                        ) : (
                                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                {data.searches.map((s: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs">
                                                        <span className="font-medium flex-1">{s.query}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.noResults ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                                                            {s.noResults ? "بدون نتائج" : `${s.resultsCount} نتيجة`}
                                                        </span>
                                                        <span className="text-muted-foreground text-[10px]">
                                                            {new Date(s.createdAt).toLocaleDateString("ar-IQ")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Top searches */}
                                {data.topSearches.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-sm">أكثر ما بحث عنه</CardTitle></CardHeader>
                                        <CardContent className="space-y-1.5">
                                            {data.topSearches.map((s: { term: string; count: number }) => (
                                                <div key={s.term} className="flex items-center gap-2 text-sm">
                                                    <span className="flex-1">{s.term}</span>
                                                    <Badge variant="secondary">{s.count}×</Badge>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Product views */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Eye className="w-4 h-4" />
                                            المنتجات اللي شوفها ({data.productViews.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {data.productViews.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-2">لا توجد بيانات</p>
                                        ) : (
                                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                {data.productViews.map((v: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs">
                                                        <span className="flex-1 font-medium truncate">{v.productName ?? "منتج"}</span>
                                                        {v.viewDuration > 0 && <span className="text-amber-600">{fmtTime(v.viewDuration)}</span>}
                                                        <span className="text-muted-foreground text-[10px]">
                                                            {new Date(v.viewedAt).toLocaleDateString("ar-IQ")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Favorites */}
                                {data.favorites.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Heart className="w-4 h-4 text-red-500" />
                                                المفضلة ({data.favorites.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            {data.favorites.map((f: any) => (
                                                <div key={f.productId} className="flex items-center gap-2 text-sm">
                                                    <span className="flex-1 font-medium truncate">{f.productName ?? "منتج"}</span>
                                                    <span className="text-xs text-muted-foreground">{f.productCategory}</span>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Cart */}
                                {data.cart.length > 0 && (
                                    <Card className="border-amber-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                                                <ShoppingCart className="w-4 h-4" />
                                                بالسلة الآن ({data.cart.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-1.5">
                                            {data.cart.map((c: any) => (
                                                <div key={c.productId} className="flex items-center gap-2 text-sm">
                                                    <span className="flex-1 font-medium truncate">{c.productName ?? "منتج"}</span>
                                                    {c.variantLabel && <span className="text-xs text-muted-foreground">{c.variantLabel}</span>}
                                                    <Badge variant="secondary">×{c.quantity}</Badge>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Reviews */}
                                {data.reviews.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Star className="w-4 h-4 text-amber-500" />
                                                مراجعاته ({data.reviews.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {data.reviews.map((r: any, i: number) => (
                                                <div key={i} className="border rounded-lg p-3 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-sm truncate">{r.productName ?? "منتج"}</span>
                                                        <div className="flex items-center gap-0.5">
                                                            {Array.from({ length: 5 }).map((_, si) => (
                                                                <Star key={si} className={`w-3 h-3 ${si < r.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {r.title && <p className="text-sm font-medium">{r.title}</p>}
                                                    {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === "approved" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                                                        {r.status === "approved" ? "منشور" : "قيد المراجعة"}
                                                    </span>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* ── AI Analysis Tab ── */}
                            <TabsContent value="ai" className="p-4 space-y-4">
                                {/* Repurchase prediction */}
                                <Card className={`border ${repurchaseConfig[data.stats.repurchaseLikelihood as keyof typeof repurchaseConfig]?.color.split(" ").pop()}`}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">توقع الشراء المستقبلي</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full font-bold ${repurchaseConfig[data.stats.repurchaseLikelihood as keyof typeof repurchaseConfig]?.color}`}>
                                            {repurchaseConfig[data.stats.repurchaseLikelihood as keyof typeof repurchaseConfig]?.icon}
                                            {repurchaseConfig[data.stats.repurchaseLikelihood as keyof typeof repurchaseConfig]?.label}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {data.stats.repurchaseLikelihood === "high" && "العميل نشط وأمل عالي بطلب قريب."}
                                            {data.stats.repurchaseLikelihood === "medium" && "العميل شرى قبل — يحتاج تشجيع بكوبون أو تذكير."}
                                            {data.stats.repurchaseLikelihood === "low" && "العميل ما طلب أو ما كان نشط — خطر مغادرة عالي."}
                                            {data.stats.repurchaseLikelihood === "unknown" && "ما في بيانات طلبات كافية للتحليل."}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Churn prediction */}
                                {data.churnPrediction ? (
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-sm">تحليل خطر المغادرة</CardTitle></CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span>نسبة المغادرة</span>
                                                        <span className="font-bold">{data.churnPrediction.churnScore}%</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${(data.churnPrediction.churnScore ?? 0) > 60 ? "bg-red-500" : (data.churnPrediction.churnScore ?? 0) > 30 ? "bg-amber-500" : "bg-green-500"}`}
                                                            style={{ width: `${data.churnPrediction.churnScore ?? 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <Badge variant={data.churnPrediction.riskLevel === "high" ? "destructive" : data.churnPrediction.riskLevel === "medium" ? "secondary" : "default"}>
                                                    {data.churnPrediction.riskLevel === "high" ? "خطر عالي" : data.churnPrediction.riskLevel === "medium" ? "خطر متوسط" : "آمن"}
                                                </Badge>
                                            </div>
                                            {data.churnPrediction.actionPlan && (
                                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">خطة العمل المقترحة</p>
                                                    <p className="text-xs text-blue-600 dark:text-blue-400">{data.churnPrediction.actionPlan}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card>
                                        <CardContent className="py-4 text-center text-sm text-muted-foreground">
                                            لا يوجد تحليل مغادرة بعد — يُحدَّث تلقائياً عند تشغيل جدولة AI
                                        </CardContent>
                                    </Card>
                                )}

                                {/* AI Profile */}
                                {data.aiProfile ? (
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-sm">ملف العميل الذكي</CardTitle></CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            {data.aiProfile.aiSummary && (
                                                <p className="text-muted-foreground bg-muted/30 rounded-lg p-3 text-xs leading-relaxed">
                                                    {data.aiProfile.aiSummary}
                                                </p>
                                            )}
                                            {data.aiProfile.preferredCategories?.length > 0 && (
                                                <div>
                                                    <p className="font-medium mb-1 text-xs">الفئات المفضلة</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.aiProfile.preferredCategories.map((c: string) => (
                                                            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {data.aiProfile.engagementLevel && (
                                                <Row label="مستوى التفاعل" value={data.aiProfile.engagementLevel} />
                                            )}
                                            {data.aiProfile.sentimentScore !== null && data.aiProfile.sentimentScore !== undefined && (
                                                <Row label="درجة الرضا" value={`${Math.round(data.aiProfile.sentimentScore * 100)}%`} />
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card>
                                        <CardContent className="py-4 text-center text-sm text-muted-foreground">
                                            ما في ملف AI بعد — يُبنى تلقائياً عند تفاعل العميل
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Customer profile loyalty */}
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">برنامج الولاء</CardTitle></CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <Row label="نقاط الولاء" value={fmt(data.user.loyaltyPoints ?? 0)} />
                                        <Row label="نقاط معلقة" value={fmt(data.user.pendingLoyaltyPoints ?? 0)} />
                                        <Row label="مستوى العضوية" value={
                                            data.user.loyaltyTier === "diamond" ? "الماسي" :
                                            data.user.loyaltyTier === "gold" ? "الذهبي" :
                                            data.user.loyaltyTier === "silver" ? "الفضي" : "البرونزي"
                                        } />
                                        <Row label="الكاشباك المتاح" value={fmt(data.user.cashbackBalance ?? 0) + " د.ع"} />
                                        <Row label="إجمالي المشتريات التراكمي" value={fmt(data.user.totalSpent ?? 0) + " د.ع"} />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

function Row({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <CheckCircle2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">{label}</p>
        </div>
    );
}
