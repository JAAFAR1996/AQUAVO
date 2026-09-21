import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfileExtra } from "@/lib/types";
import { useTranslation } from "react-i18next";

// Type for auth user
interface AuthUser {
    fullName?: string;
    email: string;
    phone?: string;
}

interface ProfileInfoProps {
    user: AuthUser;
    extraData: UserProfileExtra;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    onSave: () => void;
    onPhoneChange: (phone: string) => void;
    onBirthDateChange?: (date: string) => void;
}

export function ProfileInfo({
    user,
    extraData,
    isEditing,
    setIsEditing,
    onSave,
    onPhoneChange,
    onBirthDateChange,
}: ProfileInfoProps) {
  const { t } = useTranslation("account");
    const { toast } = useToast();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const handlePasswordChange = async () => {
        if (newPassword.length < 8) {
            toast({ title: t("profile-info.s1"), description: t("profile-info.s2"), variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: t("profile-info.s1"), description: t("profile-info.s3"), variant: "destructive" });
            return;
        }
        setIsSavingPassword(true);
        try {
            const res = await fetch("/api/user/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast({ title: t("profile-info.s1"), description: data.message || t("profile-info.s4"), variant: "destructive" });
                return;
            }
            toast({ title: t("profile-info.s5"), description: t("profile-info.s6") });
            setIsChangingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch {
            toast({ title: t("profile-info.s1"), description: t("profile-info.s7"), variant: "destructive" });
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t("profile-info.s8")}</CardTitle>
                        <CardDescription>{t("profile-info.s9")}</CardDescription>
                    </div>
                    <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        onClick={() => isEditing ? onSave() : setIsEditing(true)}
                        className="gap-2"
                    >
                        {isEditing ? (
                            <>
                                <Save className="w-4 h-4" />
                                {t("profile-info.s10")}
                            </>
                        ) : (
                            <>
                                <Edit className="w-4 h-4" />
                                {t("profile-info.s11")}
                            </>
                        )}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>{t("profile-info.s12")}</Label>
                            <Input
                                value={user.fullName || ""}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("profile-info.s13")}</Label>
                            <Input
                                type="email"
                                value={user.email}
                                disabled
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("profile-info.s14")}</Label>
                            <Input
                                type="tel"
                                value={extraData.phone || ""}
                                disabled={!isEditing}
                                dir="ltr"
                                onChange={(e) => onPhoneChange(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("profile-info.s15")}</Label>
                            <Input
                                type="date"
                                value={extraData.birthDate || ""}
                                disabled={!isEditing}
                                onChange={(e) => onBirthDateChange?.(e.target.value)}
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="pt-4 border-t">
                            <Button variant="outline" className="text-destructive" onClick={() => setIsEditing(false)}>
                                {t("profile-info.s16")}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Password Change Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            {t("profile-info.s17")}
                        </CardTitle>
                        <CardDescription>{t("profile-info.s18")}</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                    >
                        {isChangingPassword ? t("profile-info.s16") : t("profile-info.s19")}
                    </Button>
                </CardHeader>
                {isChangingPassword && (
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("profile-info.s20")}</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                dir="ltr"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("profile-info.s21")}</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                dir="ltr"
                                placeholder={t("profile-info.s22")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("profile-info.s23")}</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                dir="ltr"
                                placeholder={t("profile-info.s24")}
                            />
                        </div>
                        <Button onClick={handlePasswordChange} disabled={isSavingPassword} className="gap-2">
                            <Save className="w-4 h-4" />
                            {isSavingPassword ? t("profile-info.s25") : t("profile-info.s26")}
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
