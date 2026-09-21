import { useState } from "react";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    User,
    MapPin,
    Package,
    LogOut,
    Crown,
    Gift,
    Users,
    Ticket,
} from "lucide-react";

import { BackToTop } from "@/components/back-to-top";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

import { useAuth } from "@/contexts/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLoyaltyBalance } from "@/hooks/use-loyalty";

import { ProfileInfo } from "@/components/profile/profile-info";
import { ProfileOrders } from "@/components/profile/profile-orders";
import { ProfileAddresses } from "@/components/profile/profile-addresses";
import { ProfileLoyalty, tierLabels, getTierFromPoints } from "@/components/profile/profile-loyalty";
import { ProfileCoupons } from "@/components/profile/profile-coupons";
import { ProfileReferral } from "@/components/profile/profile-referral";
import { ProfileNotifications } from "@/components/profile/profile-notifications";
import { Address, UserProfileExtra } from "@/lib/types";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const { t } = useTranslation("account");
    const { toast } = useToast();
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    // Read ?tab= from URL to open correct tab (e.g. from navbar "طلباتي" link)
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    const [activeTab, setActiveTab] = useState(urlTab || "info");

    // Fetch orders
    const { data: orders, isLoading: isLoadingOrders } = useQuery({
        queryKey: ["/api/orders"],
        queryFn: async () => {
            const response = await fetch("/api/orders", { credentials: "include" });
            if (!response.ok) throw new Error("Failed to fetch orders");
            return response.json();
        },
        enabled: !!user,
    });

    // Fetch addresses from API — map DB fields (addressLine1/city) to frontend Address shape
    const { data: apiAddresses = [], refetch: refetchAddresses } = useQuery<Address[]>({
        queryKey: ["/api/user/addresses"],
        queryFn: async () => {
            const res = await fetch("/api/user/addresses", { credentials: "include" });
            if (!res.ok) return [];
            const rows = await res.json();
            return rows.map((r: any) => ({
                id: r.id,
                label: r.label || "",
                address: r.addressLine1 || r.address || "",
                phone: r.phone,
                isDefault: r.isDefault,
            }));
        },
        enabled: !!user,
    });

    // Format member since date from user's createdAt
    const memberSinceDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("ar-IQ", { month: "long", year: "numeric" })
        : t("profile.s1");

    const [extraData, setExtraData] = useState<UserProfileExtra>({
        phone: user?.phone || "",
        memberSince: memberSinceDate,
        avatar: "",
        addresses: [],
        birthDate: user?.birthDate ? new Date(user.birthDate).toISOString().split("T")[0] : "",
    });

    // Get real loyalty data from API (same source as loyalty tab)
    const { data: loyaltyBalance } = useLoyaltyBalance(!!user);
    const loyaltyPoints = loyaltyBalance?.loyaltyPoints ?? user?.loyaltyPoints ?? 0;
    const loyaltyTier = (loyaltyBalance?.tier as string) ?? getTierFromPoints(loyaltyPoints);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleSave = async () => {
        try {
            const res = await fetch("/api/user", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    phone: extraData.phone,
                    birthDate: extraData.birthDate || null,
                }),
            });
            if (!res.ok) throw new Error("Failed to update profile");
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            setIsEditing(false);
            toast({ title: t("profile.s2"), description: t("profile.s3") });
        } catch {
            toast({ title: t("profile.s4"), description: t("profile.s5"), variant: "destructive" });
        }
    };

    const handleAddAddress = async (address: Address) => {
        try {
            const res = await fetch("/api/user/addresses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    label: address.label,
                    addressLine1: address.address,
                    city: t("profile.s6"),
                    isDefault: address.isDefault ?? false,
                }),
            });
            if (!res.ok) throw new Error("Failed to add address");
            await refetchAddresses();
            toast({ title: t("profile.s7"), description: t("profile.s8") });
        } catch {
            toast({ title: t("profile.s4"), description: t("profile.s9"), variant: "destructive" });
        }
    };

    const handleUpdateAddress = async (updatedAddress: Address) => {
        try {
            const res = await fetch(`/api/user/addresses/${updatedAddress.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    label: updatedAddress.label,
                    addressLine1: updatedAddress.address,
                    city: t("profile.s6"),
                    phone: updatedAddress.phone,
                    isDefault: updatedAddress.isDefault,
                }),
            });
            if (!res.ok) throw new Error("Failed to update address");
            await refetchAddresses();
            toast({ title: t("profile.s10"), description: t("profile.s11") });
        } catch {
            toast({ title: t("profile.s4"), description: t("profile.s12"), variant: "destructive" });
        }
    };

    const handleDeleteAddress = async (id: string) => {
        try {
            const res = await fetch(`/api/user/addresses/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete address");
            await refetchAddresses();
            toast({ title: t("profile.s13"), description: t("profile.s14") });
        } catch {
            toast({ title: t("profile.s4"), description: t("profile.s15"), variant: "destructive" });
        }
    };

    const handlePhoneChange = (phone: string) => {
        setExtraData({ ...extraData, phone });
    };

    const handleBirthDateChange = (birthDate: string) => {
        setExtraData({ ...extraData, birthDate });
    };

    return (
        <div className="flex-1 flex flex-col bg-background">
            <MetaTags
                title={t("profile.s16")}
                description={t("profile.s17")}
                noIndex={true}
            />

            <main id="main-content" className="flex-1 py-8">
                <div className="container mx-auto px-4">
                    {/* Profile Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Card className="bg-gradient-to-br from-primary/10 via-cyan-500/10 to-teal-500/10 border-0">
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                                        <AvatarImage src={extraData.avatar} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                                            {(user.fullName || user.email).charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 text-center md:text-right">
                                        <h1 className="text-3xl font-bold mb-2">{user.fullName || t("profile.s18")}</h1>
                                        <p className="text-muted-foreground mb-3">{t("profile.s19")} {extraData.memberSince}</p>

                                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                            <Badge className={`${tierLabels[loyaltyTier].color} gap-1`}>
                                                {tierLabels[loyaltyTier].icon}
                                                {t("profile.s20")} {tierLabels[loyaltyTier].label}
                                            </Badge>
                                            <Badge variant="outline" className="gap-1">
                                                <Gift className="w-3 h-3" />
                                                {loyaltyPoints} {t("profile.s21")}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => logout()}>
                                            <LogOut className="w-4 h-4" />
                                            {t("profile.s22")}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Profile Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-6 h-auto p-1">
                            <TabsTrigger value="info" className="py-3 gap-2">
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("profile.s23")}</span>
                            </TabsTrigger>
                            <TabsTrigger value="orders" className="py-3 gap-2">
                                <Package className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("profile.s24")}</span>
                            </TabsTrigger>
                            <TabsTrigger value="addresses" className="py-3 gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("profile.s25")}</span>
                            </TabsTrigger>
                            <TabsTrigger value="loyalty" className="py-3 gap-2">
                                <Crown className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("profile.s26")}</span>
                            </TabsTrigger>
                            <TabsTrigger value="coupons" className="py-3 gap-2">
                                <Ticket className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("profile.s27")}</span>
                            </TabsTrigger>
                            <TabsTrigger value="referral" className="py-3 gap-2">
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("profile.s28")}</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Personal Info Tab */}
                        <TabsContent value="info">
                            <ProfileInfo
                                user={user}
                                extraData={extraData}
                                isEditing={isEditing}
                                setIsEditing={setIsEditing}
                                onSave={handleSave}
                                onPhoneChange={handlePhoneChange}
                                onBirthDateChange={handleBirthDateChange}
                            />
                            <ProfileNotifications />
                        </TabsContent>

                        {/* Orders Tab */}
                        <TabsContent value="orders">
                            <ProfileOrders orders={orders} isLoading={isLoadingOrders} />
                        </TabsContent>

                        {/* Addresses Tab */}
                        <TabsContent value="addresses">
                            <ProfileAddresses
                                addresses={apiAddresses}
                                onAddAddress={handleAddAddress}
                                onUpdateAddress={handleUpdateAddress}
                                onDeleteAddress={handleDeleteAddress}
                            />
                        </TabsContent>

                        {/* Loyalty Tab */}
                        <TabsContent value="loyalty">
                            <ProfileLoyalty loyaltyPoints={loyaltyPoints} loyaltyTier={loyaltyTier} />
                        </TabsContent>

                        {/* Coupons Tab */}
                        <TabsContent value="coupons">
                            <ProfileCoupons />
                        </TabsContent>

                        {/* Referral Tab */}
                        <TabsContent value="referral">
                            <ProfileReferral />
                        </TabsContent>

                    </Tabs>
                </div>
            </main>


            <BackToTop />
        </div>
    );
}
