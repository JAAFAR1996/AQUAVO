import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Star, Trash2, MessageSquare, CheckCircle2, XCircle, Clock, Crown, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Review = {
    id: string;
    userId: string | null;
    productId: string;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: string;
    status: string;        // "pending" | "approved"
    productName?: string;
    userName?: string;
    userTier?: string;     // "guest" | "bronze" | "silver" | "gold" | "platinum"
    isGuest?: boolean;
};

// Maps tier name → badge colors
const tierConfig: Record<string, { label: string; className: string }> = {
    platinum: { label: "بلاتيني", className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-300" },
    gold:     { label: "ذهبي",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300" },
    silver:   { label: "فضي",    className: "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300 border-slate-300" },
    bronze:   { label: "برونزي", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300" },
    guest:    { label: "زائر",   className: "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-300" },
};

function TierBadge({ tier }: { tier: string }) {
    const cfg = tierConfig[tier] ?? tierConfig.bronze;
    return (
        <Badge
            variant="outline"
            className={`text-[10px] h-5 px-1.5 gap-1 font-medium border ${cfg.className}`}
        >
            {tier === "guest" ? <User className="w-2.5 h-2.5" /> : <Crown className="w-2.5 h-2.5" />}
            {cfg.label}
        </Badge>
    );
}

function StarRow({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < rating ? "fill-current" : "opacity-20"}`} />
            ))}
        </div>
    );
}

export default function ReviewsManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: reviews = [], isLoading } = useQuery<Review[]>({
        queryKey: ["/api/admin/reviews"],
    });

    const pending  = reviews.filter(r => r.status === "pending");
    const approved = reviews.filter(r => r.status === "approved");

    // ── Mutations ────────────────────────────────────────────────
    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("POST", `/api/admin/reviews/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
            toast({ title: "✅ تمت الموافقة على المراجعة" });
        },
        onError: () => toast({ title: "فشل الموافقة", variant: "destructive" }),
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("POST", `/api/admin/reviews/${id}/reject`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
            toast({ title: "🗑️ تم رفض المراجعة وحذفها" });
        },
        onError: () => toast({ title: "فشل الرفض", variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/reviews/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
            toast({ title: "تم حذف المراجعة بنجاح" });
        },
        onError: () => toast({ title: "فشل حذف المراجعة", variant: "destructive" }),
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-6 w-6" />
                    إدارة المراجعات
                    {pending.length > 0 && (
                        <Badge className="bg-amber-500 text-white text-xs ml-1">
                            {pending.length} بانتظار الموافقة
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    راجع تعليقات العملاء — وافق أو ارفض قبل نشرها
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pending">
                    <TabsList className="mb-4">
                        <TabsTrigger value="pending" className="gap-2">
                            <Clock className="h-4 w-4" />
                            بانتظار الموافقة
                            {pending.length > 0 && (
                                <span className="bg-amber-500 text-white rounded-full text-[10px] px-1.5 py-0.5 font-bold">
                                    {pending.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            معتمدة ({approved.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ── PENDING TAB ── */}
                    <TabsContent value="pending">
                        <ReviewTable
                            reviews={pending}
                            showApprove
                            onApprove={(id) => approveMutation.mutate(id)}
                            onReject={(id) => rejectMutation.mutate(id)}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            isPending={approveMutation.isPending || rejectMutation.isPending}
                            emptyText="لا توجد مراجعات بانتظار الموافقة 🎉"
                        />
                    </TabsContent>

                    {/* ── APPROVED TAB ── */}
                    <TabsContent value="approved">
                        <ReviewTable
                            reviews={approved}
                            showApprove={false}
                            onApprove={() => {}}
                            onReject={() => {}}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            isPending={deleteMutation.isPending}
                            emptyText="لا توجد مراجعات معتمدة حالياً"
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────
// Shared table component
// ─────────────────────────────────────────────────────────
interface ReviewTableProps {
    reviews: Review[];
    showApprove: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onDelete: (id: string) => void;
    isPending: boolean;
    emptyText: string;
}

function ReviewTable({ reviews, showApprove, onApprove, onReject, onDelete, isPending, emptyText }: ReviewTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">التقييم</TableHead>
                        <TableHead className="text-right w-[35%]">التعليق</TableHead>
                        <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reviews.map((review) => (
                        <TableRow key={review.id}>
                            {/* Product */}
                            <TableCell className="font-medium text-sm">
                                {review.productName || `#${review.productId.slice(0, 8)}`}
                            </TableCell>

                            {/* Author + Tier */}
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium">{review.userName || "زائر"}</span>
                                    <TierBadge tier={review.userTier || "guest"} />
                                </div>
                            </TableCell>

                            {/* Rating */}
                            <TableCell>
                                <StarRow rating={review.rating} />
                            </TableCell>

                            {/* Comment */}
                            <TableCell>
                                <div className="space-y-0.5">
                                    {review.title && (
                                        <p className="text-xs font-semibold text-foreground">{review.title}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {review.comment || "—"}
                                    </p>
                                </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell>
                                <div className="flex justify-center items-center gap-1.5">
                                    {showApprove && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs"
                                                onClick={() => onApprove(review.id)}
                                                disabled={isPending}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                قبول
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1 border-red-300 text-red-600 hover:bg-red-50 h-8 px-2.5 text-xs"
                                                onClick={() => onReject(review.id)}
                                                disabled={isPending}
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                                رفض
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:text-red-500 hover:bg-red-500/10"
                                        onClick={() => onDelete(review.id)}
                                        disabled={isPending}
                                        title="حذف"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}

                    {reviews.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                {emptyText}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
