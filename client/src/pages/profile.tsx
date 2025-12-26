import { useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
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
    Users
} from "lucide-react";

import { BackToTop } from "@/components/back-to-top";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { ProfileInfo } from "@/components/profile/profile-info";
import { ProfileOrders } from "@/components/profile/profile-orders";
import { ProfileAddresses } from "@/components/profile/profile-addresses";
import { ProfileLoyalty, tierLabels, getTierFromPoints } from "@/components/profile/profile-loyalty";
import { ProfileCoupons } from "@/components/profile/profile-coupons";
import { ProfileReferral } from "@/components/profile/profile-referral";
import { Address, UserProfileExtra } from "@/lib/types";

export default function Profile() {
    const { toast } = useToast();
    const { user, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);

    // Fetch orders
    const { data: orders, isLoading: isLoadingOrders } = useQuery({
        queryKey: ["/api/orders"],
        queryFn: async () => {
            const response = await fetch("/api/orders", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch orders");
            }
            return response.json();
        },
        enabled: !!user,
    });

    // Format member since date from user's createdAt
    const memberSinceDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : "ديسمبر 2025";

    // Mock extra user data that isn't in core auth yet (profile details)
    const [extraData, setExtraData] = useState<UserProfileExtra>({
        phone: user?.phone || "0770XXXXXXX",
        memberSince: memberSinceDate,
        avatar: "",
        addresses: [],
    });

    // Get loyalty points and calculate tier based on points
    const loyaltyPoints = user?.loyaltyPoints ?? 0;
    const loyaltyTier = getTierFromPoints(loyaltyPoints);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleSave = () => {
        setIsEditing(false);
        toast({
            title: "تم حفظ التغييرات",
            description: "تم تحديث بياناتك بنجاح",
        });
    };

    const handleAddAddress = (address: Address) => {
        setExtraData({
            ...extraData,
            addresses: [...extraData.addresses, address],
        });
    };

    const handleUpdateAddress = (updatedAddress: Address) => {
        setExtraData({
            ...extraData,
            addresses: extraData.addresses.map((addr) =>
                addr.id === updatedAddress.id ? updatedAddress : addr
            ),
        });
    };

    const handleDeleteAddress = (id: string) => {
        setExtraData({
            ...extraData,
            addresses: extraData.addresses.filter((addr) => addr.id !== id),
        });
        toast({
            title: "تم حذف العنوان",
            description: "تم حذف العنوان بنجاح",
        });
    };

    const handlePhoneChange = (phone: string) => {
        setExtraData({ ...extraData, phone });
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

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
                                        <h1 className="text-3xl font-bold mb-2">{user.fullName || "مستخدم جديد"}</h1>
                                        <p className="text-muted-foreground mb-3">عضو منذ {extraData.memberSince}</p>

                                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                            <Badge className={`${tierLabels[loyaltyTier].color} gap-1`}>
                                                {tierLabels[loyaltyTier].icon}
                                                عضو {tierLabels[loyaltyTier].label}
                                            </Badge>
                                            <Badge variant="outline" className="gap-1">
                                                <Gift className="w-3 h-3" />
                                                {loyaltyPoints} نقطة
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => logout()}>
                                            <LogOut className="w-4 h-4" />
                                            تسجيل الخروج
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Profile Tabs */}
                    <Tabs defaultValue="info" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                            <TabsTrigger value="info" className="py-3 gap-2">
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline">المعلومات</span>
                            </TabsTrigger>
                            <TabsTrigger value="orders" className="py-3 gap-2">
                                <Package className="w-4 h-4" />
                                <span className="hidden sm:inline">طلباتي</span>
                            </TabsTrigger>
                            <TabsTrigger value="addresses" className="py-3 gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="hidden sm:inline">العناوين</span>
                            </TabsTrigger>
                            <TabsTrigger value="loyalty" className="py-3 gap-2">
                                <Crown className="w-4 h-4" />
                                <span className="hidden sm:inline">الولاء</span>
                            </TabsTrigger>
                            <TabsTrigger value="referral" className="py-3 gap-2">
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">الدعوة</span>
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
                            />
                        </TabsContent>

                        {/* Orders Tab */}
                        <TabsContent value="orders">
                            <ProfileOrders orders={orders} isLoading={isLoadingOrders} />
                        </TabsContent>

                        {/* Addresses Tab */}
                        <TabsContent value="addresses">
                            <ProfileAddresses
                                addresses={extraData.addresses}
                                onAddAddress={handleAddAddress}
                                onUpdateAddress={handleUpdateAddress}
                                onDeleteAddress={handleDeleteAddress}
                            />
                        </TabsContent>

                        {/* Loyalty Tab */}
                        <TabsContent value="loyalty">
                            <ProfileLoyalty loyaltyPoints={loyaltyPoints} loyaltyTier={loyaltyTier} />
                        </TabsContent>

                        {/* Referral Tab */}
                        <TabsContent value="referral">
                            <ProfileReferral />
                        </TabsContent>

                    </Tabs>
                </div>
            </main>


            <BackToTop />
            <Footer />
        </div>
    );
}
