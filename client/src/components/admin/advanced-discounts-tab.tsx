import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Trash2, Loader2, Percent } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { addCsrfHeader } from "@/lib/csrf";

interface Discount {
    id: number;
    productId: number;
    type: string;
    value: number;
    startDate: string;
    endDate?: string;
}

interface Product {
    id: number;
    name: string;
}

export function AdvancedDiscountsTab() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newDiscount, setNewDiscount] = useState({
        productId: "",
        type: "percentage",
        value: "",
        startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDate: "",
    });

    const { data: discounts, isLoading } = useQuery<Discount[]>({
        queryKey: ["/api/admin/discounts"],
    });

    const { data: productsData } = useQuery<{ products: Product[] }>({
        queryKey: ["/api/products"],
    });

    // Extract products array from the response
    const products = productsData?.products || [];

    // Discount input interface
    interface DiscountInput {
        productId: number;
        type: string;
        value: number;
        startDate: string;
        endDate?: string;
    }

    const createMutation = useMutation({
        mutationFn: async (discountData: DiscountInput) => {
            const res = await fetch("/api/admin/discounts", {
                method: "POST",
                headers: addCsrfHeader({ "Content-Type": "application/json" }),
                credentials: "include",
                body: JSON.stringify(discountData),
            });
            if (!res.ok) throw new Error("Failed to create discount");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/discounts"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Refresh products too as they might show discount badge
            setIsDialogOpen(false);
            setNewDiscount({
                productId: "",
                type: "percentage",
                value: "",
                startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                endDate: "",
            });
            toast({ title: "تم إنشاء الخصم بنجاح" });
        },
        onError: () => {
            toast({ title: "فشل إنشاء الخصم", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/discounts/${id}`, {
                method: "DELETE",
                headers: addCsrfHeader(),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete discount");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/discounts"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({ title: "تم حذف الخصم بنجاح" });
        },
    });

    const handleSubmit = () => {
        if (!newDiscount.productId || !newDiscount.value) {
            toast({ title: "الرجاء ملء جميع الحقول المطلوبة", variant: "destructive" });
            return;
        }
        createMutation.mutate({
            ...newDiscount,
            productId: parseInt(newDiscount.productId),
            value: parseFloat(newDiscount.value),
        });
    };

    const getProductName = (id: number) => {
        return products?.find((p) => p.id === id)?.name || `المنتج #${id}`;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="h-5 w-5" />
                            إدارة الخصومات المتقدمة
                        </CardTitle>
                        <CardDescription>
                            إدارة الخصومات المرتبطة بمنتجات محددة مع تواريخ صلاحية
                        </CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 ml-2" />
                                إضافة خصم جديد
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>إضافة خصم جديد</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>اسم المنتج</Label>
                                    <Select
                                        value={newDiscount.productId}
                                        onValueChange={(val) => setNewDiscount({ ...newDiscount, productId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر المنتج" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products?.map((product) => (
                                                <SelectItem key={product.id} value={product.id.toString()}>
                                                    {product.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>نوع الخصم</Label>
                                        <Select
                                            value={newDiscount.type}
                                            onValueChange={(val) => setNewDiscount({ ...newDiscount, type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                                                <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>القيمة</Label>
                                        <Input
                                            type="number"
                                            value={newDiscount.value}
                                            onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                                            placeholder={newDiscount.type === "percentage" ? "10" : "5000"}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>تاريخ البدء</Label>
                                    <Input
                                        type="datetime-local"
                                        value={newDiscount.startDate}
                                        onChange={(e) => setNewDiscount({ ...newDiscount, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>تاريخ الانتهاء (اختياري)</Label>
                                    <Input
                                        type="datetime-local"
                                        value={newDiscount.endDate}
                                        onChange={(e) => setNewDiscount({ ...newDiscount, endDate: e.target.value })}
                                    />
                                </div>
                                <Button className="w-full mt-4" onClick={handleSubmit} disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "جاري الحفظ..." : "حفظ الخصم"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">المنتج</TableHead>
                                <TableHead className="text-right">نوع الخصم</TableHead>
                                <TableHead className="text-right">القيمة</TableHead>
                                <TableHead className="text-right">تاريخ البدء</TableHead>
                                <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                                <TableHead className="text-center">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {discounts?.map((discount) => (
                                <TableRow key={discount.id}>
                                    <TableCell className="font-medium">{getProductName(discount.productId)}</TableCell>
                                    <TableCell>
                                        <Badge variant={discount.type === "percentage" ? "default" : "secondary"}>
                                            {discount.type === "percentage" ? "نسبة مئوية" : "مبلغ ثابت"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-primary font-bold">
                                        {discount.type === "percentage" ? `${discount.value}%` : discount.value}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(discount.startDate), "dd/MM/yyyy HH:mm", { locale: ar })}
                                    </TableCell>
                                    <TableCell>
                                        {discount.endDate ? (
                                            format(new Date(discount.endDate), "dd/MM/yyyy HH:mm", { locale: ar })
                                        ) : (
                                            <span className="text-muted-foreground">دائم</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => deleteMutation.mutate(discount.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!discounts?.length && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        لا توجد خصومات نشطة
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
