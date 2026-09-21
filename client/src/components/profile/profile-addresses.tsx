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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("account");
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
                title: t("profile-addresses.s1"),
                description: t("profile-addresses.s2"),
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
            toast({ title: t("profile-addresses.s3"), description: t("profile-addresses.s4") });
        } else {
            onAddAddress({
                id: Date.now().toString(),
                label: newAddress.label!,
                address: newAddress.address!,
                phone: newAddress.phone,
                isDefault: addresses.length === 0,
            });
            toast({ title: t("profile-addresses.s5"), description: t("profile-addresses.s6") });
        }
        handleDialogClose();
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {t("profile-addresses.s7")}
                    </CardTitle>
                    <CardDescription>{t("profile-addresses.s8")}</CardDescription>
                </div>
                <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2" onClick={handleDialogClose}>
                            <MapPin className="w-4 h-4" />
                            {t("profile-addresses.s9")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingAddress ? t("profile-addresses.s10") : t("profile-addresses.s11")}</DialogTitle>
                            <DialogDescription>
                                {t("profile-addresses.s12")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="label">{t("profile-addresses.s13")}</Label>
                                <Input
                                    id="label"
                                    placeholder={t("profile-addresses.s14")}
                                    value={newAddress.label}
                                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">{t("profile-addresses.s15")}</Label>
                                <Textarea
                                    id="address"
                                    placeholder={t("profile-addresses.s16")}
                                    value={newAddress.address}
                                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t("profile-addresses.s17")}</Label>
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
                                {t("profile-addresses.s18")}
                            </Button>
                            <Button onClick={handleSave}>
                                {editingAddress ? t("profile-addresses.s19") : t("profile-addresses.s20")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {addresses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{t("profile-addresses.s21")}</p>
                        <p className="text-sm mt-1">{t("profile-addresses.s22")}</p>
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
                                            {t("profile-addresses.s23")}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">{address.address}</p>
                                {address.phone && (
                                    <p className="text-sm text-muted-foreground" dir="ltr">📞 {address.phone}</p>
                                )}
                                <div className="mt-3 flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(address)}>
                                        {t("profile-addresses.s24")}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => onDeleteAddress(address.id)}
                                    >
                                        {t("profile-addresses.s25")}
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
