import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfileExtra } from "@/lib/types";

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
    const { toast } = useToast();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const handlePasswordChange = async () => {
        if (newPassword.length < 8) {
            toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
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
                toast({ title: "خطأ", description: data.message || "فشل تغيير كلمة المرور", variant: "destructive" });
                return;
            }
            toast({ title: "تم بنجاح", description: "تم تغيير كلمة المرور بنجاح" });
            setIsChangingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch {
            toast({ title: "خطأ", description: "حدث خطأ، يرجى المحاولة مرة أخرى", variant: "destructive" });
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>المعلومات الشخصية</CardTitle>
                        <CardDescription>إدارة بياناتك الشخصية</CardDescription>
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
                                حفظ
                            </>
                        ) : (
                            <>
                                <Edit className="w-4 h-4" />
                                تعديل
                            </>
                        )}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>الاسم الكامل</Label>
                            <Input
                                value={user.fullName || ""}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>البريد الإلكتروني</Label>
                            <Input
                                type="email"
                                value={user.email}
                                disabled
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>رقم الهاتف</Label>
                            <Input
                                type="tel"
                                value={extraData.phone || ""}
                                disabled={!isEditing}
                                dir="ltr"
                                onChange={(e) => onPhoneChange(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>تاريخ الميلاد</Label>
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
                                إلغاء
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
                            كلمة المرور
                        </CardTitle>
                        <CardDescription>تغيير كلمة مرور حسابك</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                    >
                        {isChangingPassword ? "إلغاء" : "تغيير"}
                    </Button>
                </CardHeader>
                {isChangingPassword && (
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>كلمة المرور الحالية</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                dir="ltr"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>كلمة المرور الجديدة</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                dir="ltr"
                                placeholder="8 أحرف على الأقل"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>تأكيد كلمة المرور</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                dir="ltr"
                                placeholder="أعد كتابة كلمة المرور الجديدة"
                            />
                        </div>
                        <Button onClick={handlePasswordChange} disabled={isSavingPassword} className="gap-2">
                            <Save className="w-4 h-4" />
                            {isSavingPassword ? "جاري الحفظ..." : "حفظ كلمة المرور"}
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
