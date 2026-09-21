import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Address } from "@/lib/types";

interface ProfileAddressesProps {
    addresses: Address[];
    onAddAddress: (address: Address) => void;
    onUpdateAddress: (address: Address) => void;
    onDeleteAddress: (id: string) => void;
}

export function ProfileAddresses({
    addresses,
    onAddAddress,
    onUpdateAddress,
    onDeleteAddress
}: ProfileAddressesProps) {
    const { toast } = useToast();
    const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [newAddress, setNewAddress] = useState<Partial<Address>>({ label: "", address: "", phone: "" });

    const handleDialogClose = () => {
        setIsAddressDialogOpen(false);
        setEditingAddress(null);
        setNewAddress({ label: "", address: "", phone: "" });
    };

    const handleEditClick = (address: Address) => {
        setEditingAddress(address);
        setNewAddress({ label: address.label, address: address.address, phone: address.phone || "" });
        setIsAddressDialogOpen(true);
    };

    const handleSave = () => {
        if (!newAddress.label || !newAddress.address) {
            toast({
                title: "خطأ",
                description: "يرجى ملء جميع الحقول المطلوبة",
                variant: "destructive",
            });
            return;
        }

        if (editingAddress) {
            onUpdateAddress({
                ...editingAddress,
                label: newAddress.label!,
                address: newAddress.address!,
                phone: newAddress.phone,
            });
            toast({ title: "تم تحديث العنوان", description: "تم تحديث عنوانك بنجاح" });
        } else {
            onAddAddress({
                id: Date.now().toString(),
                label: newAddress.label!,
                address: newAddress.address!,
                phone: newAddress.phone,
                isDefault: addresses.length === 0,
            });
            toast({ title: "تم إضافة العنوان", description: "تم حفظ عنوانك الجديد بنجاح" });
        }
        handleDialogClose();
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        عناوين التوصيل
                    </CardTitle>
                    <CardDescription>إدارة عناوين التوصيل المحفوظة</CardDescription>
                </div>
                <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2" onClick={handleDialogClose}>
                            <MapPin className="w-4 h-4" />
                            إضافة عنوان
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingAddress ? "تعديل العنوان" : "إضافة عنوان جديد"}</DialogTitle>
                            <DialogDescription>
                                أضف تفاصيل عنوان التوصيل الجديد
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="label">اسم العنوان *</Label>
                                <Input
                                    id="label"
                                    placeholder="مثال: المنزل، العمل، العنوان الرئيسي"
                                    value={newAddress.label}
                                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">العنوان التفصيلي *</Label>
                                <Textarea
                                    id="address"
                                    placeholder="المدينة، المنطقة، الشارع، رقم البناية..."
                                    value={newAddress.address}
                                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">رقم الهاتف</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="07XXXXXXXX"
                                    value={newAddress.phone}
                                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleDialogClose}>
                                إلغاء
                            </Button>
                            <Button onClick={handleSave}>
                                {editingAddress ? "تحديث" : "إضافة"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {addresses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>لا توجد عناوين محفوظة</p>
                        <p className="text-sm mt-1">أضف عنوان توصيل للبدء</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {addresses.map((address) => (
                            <div
                                key={address.id}
                                className={`p-4 rounded-lg border-2 ${address.isDefault ? "border-primary bg-primary/5" : "border-border"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant={address.isDefault ? "default" : "outline"}>
                                        {address.label}
                                    </Badge>
                                    {address.isDefault && (
                                        <Badge variant="secondary" className="gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            الافتراضي
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">{address.address}</p>
                                {address.phone && (
                                    <p className="text-sm text-muted-foreground" dir="ltr">📞 {address.phone}</p>
                                )}
                                <div className="mt-3 flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(address)}>
                                        تعديل
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => onDeleteAddress(address.id)}
                                    >
                                        حذف
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
