import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Ticket,
    Plus,
    Pencil,
    Trash2,
    Calendar,
    AlertCircle,
    Copy,
    Percent,
    DollarSign,
    Truck,
    Users
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Coupon {
    id: string;
    code: string;
    type: "percentage" | "fixed" | "free_shipping";
    value: string;
    minOrderAmount?: string;
    maxUses?: number;
    usedCount: number;
    maxUsesPerUser?: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    description?: string;
    createdAt: string;
}

export function CouponsManagement() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState<Partial<Coupon>>({
        code: "",
        type: "percentage",
        value: "",
        minOrderAmount: "",
        maxUses: undefined,
        maxUsesPerUser: 1,
        startDate: "",
        endDate: "",
        isActive: true,
        description: "",
    });

    const fetchCoupons = async () => {
        try {
            const response = await fetch("/api/admin/coupons", {
                credentials: "include",
                headers: {
                    filters: JSON.stringify({}),
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCoupons(data);
            }
        } catch (error) {
            console.error("Error fetching coupons:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleCreateCoupon = async () => {
        try {
            const response = await fetch("/api/admin/coupons", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast({ title: "نجح", description: "تم إنشاء الكوبون بنجاح" });
                setIsDialogOpen(false);
                fetchCoupons();
            } else {
                const error = await response.json();
                toast({ title: "خطأ", description: error.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "خطأ", description: "فشل إنشاء الكوبون", variant: "destructive" });
        }
    };

    const handleUpdateCoupon = async () => {
        if (!selectedCoupon) return;
        try {
            const response = await fetch(`/api/admin/coupons/${selectedCoupon.id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast({ title: "نجح", description: "تم تحديث الكوبون بنجاح" });
                setIsDialogOpen(false);
                fetchCoupons();
            } else {
                const error = await response.json();
                toast({ title: "خطأ", description: error.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "خطأ", description: "فشل تحديث الكوبون", variant: "destructive" });
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الكوبون؟")) return;
        try {
            const response = await fetch(`/api/admin/coupons/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                toast({ title: "نجح", description: "تم حذف الكوبون بنجاح" });
                fetchCoupons();
            } else {
                toast({ title: "خطأ", description: "فشل حذف الكوبون", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "خطأ", description: "حدث خطأ أثناء الحذف", variant: "destructive" });
        }
    };

    const openCreateDialog = () => {
        setFormData({
            code: "",
            type: "percentage",
            value: "",
            minOrderAmount: "",
            maxUses: undefined,
            maxUsesPerUser: 1,
            startDate: "",
            endDate: "",
            isActive: true,
            description: "",
        });
        setIsEditMode(false);
        setIsDialogOpen(true);
    };

    const openEditDialog = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setFormData({
            ...coupon,
            startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : "",
            endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : "",
        });
        setIsEditMode(true);
        setIsDialogOpen(true);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "تم النسخ", description: "تم نسخ رمز الكوبون" });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">إدارة الكوبونات</h2>
                    <p className="text-muted-foreground">أنشئ وأدر كوبونات الخصم والعروض الترويجية</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                    <Plus className="ml-2 h-4 w-4" />
                    كوبون جديد
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الكوبونات</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{coupons.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الكوبونات النشطة</CardTitle>
                        <Percent className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{coupons.filter(c => c.isActive).length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الاستخدامات</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="border rounded-lg bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">الرمز</TableHead>
                            <TableHead className="text-right">النوع</TableHead>
                            <TableHead className="text-right">القيمة</TableHead>
                            <TableHead className="text-right">الاستخدامات</TableHead>
                            <TableHead className="text-right">الصلاحية</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell>
                            </TableRow>
                        ) : coupons.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    لا توجد كوبونات حالياً. أنشئ أول كوبون!
                                </TableCell>
                            </TableRow>
                        ) : (
                            coupons.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell className="font-mono font-bold">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-muted px-2 py-1 rounded select-all">{coupon.code}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(coupon.code)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {coupon.type === "percentage" && <Badge variant="outline">نسبة مئوية</Badge>}
                                        {coupon.type === "fixed" && <Badge variant="outline">مبلغ ثابت</Badge>}
                                        {coupon.type === "free_shipping" && <Badge variant="outline" className="bg-green-50 text-green-700">شحن مجاني</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.type === "percentage" ? `${coupon.value}%` :
                                            coupon.type === "free_shipping" ? "مجاني" :
                                                `${Number(coupon.value).toLocaleString()} د.ع`}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span>{coupon.usedCount} مستخدم</span>
                                            {coupon.maxUses && <span className="text-muted-foreground">من {coupon.maxUses}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground">
                                            {coupon.endDate ? (
                                                <span className={new Date(coupon.endDate) < new Date() ? "text-red-500" : ""}>
                                                    ينتهي: {format(new Date(coupon.endDate), "dd/MM/yyyy")}
                                                </span>
                                            ) : (
                                                <span className="text-green-600">دائم</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                                            {coupon.isActive ? "نشط" : "غير نشط"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEditDialog(coupon)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteCoupon(coupon.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? "تعديل الكوبون" : "إنشاء كوبون جديد"}</DialogTitle>
                        <DialogDescription>
                            قم بتعبئة تفاصيل الكوبون أدناه.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">رمز الكوبون *</Label>
                                <Input
                                    id="code"
                                    placeholder="مثال: SAVE20"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="font-mono uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">نوع الخصم</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: Coupon['type']) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]" align="start">
                                        <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                                        <SelectItem value="fixed">مبلغ ثابت (د.ع)</SelectItem>
                                        <SelectItem value="free_shipping">شحن مجاني</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {formData.type !== "free_shipping" && (
                            <div className="space-y-2">
                                <Label htmlFor="value">قيمة الخصم *</Label>
                                <div className="relative">
                                    <Input
                                        id="value"
                                        type="number"
                                        placeholder="0"
                                        value={formData.value}
                                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    />
                                    <div className="absolute left-3 top-2.5 text-muted-foreground">
                                        {formData.type === "percentage" ? <Percent className="h-4 w-4" /> : "د.ع"}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minAmount">الحد الأدنى للطلب</Label>
                                <Input
                                    id="minAmount"
                                    type="number"
                                    placeholder="اختياري"
                                    value={formData.minOrderAmount}
                                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxUses">أقصى عدد للاستخدام</Label>
                                <Input
                                    id="maxUses"
                                    type="number"
                                    placeholder="لا نهائي"
                                    value={formData.maxUses || ''}
                                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? Number(e.target.value) : undefined })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">تاريخ البدء</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">تاريخ الانتهاء</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>حالة الكوبون</Label>
                                <div className="text-xs text-muted-foreground">تفعيل أو إيقاف الكوبون</div>
                            </div>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">وصف الكوبون</Label>
                            <Input
                                id="description"
                                placeholder="وصف داخلي للإدارة (اختياري)"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={isEditMode ? handleUpdateCoupon : handleCreateCoupon}>
                            {isEditMode ? "حفظ التغييرات" : "إنشاء الكوبون"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
