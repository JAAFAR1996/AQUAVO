import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save } from "lucide-react";
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
}

export function ProfileInfo({
    user,
    extraData,
    isEditing,
    setIsEditing,
    onSave,
    onPhoneChange
}: ProfileInfoProps) {
    return (
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
    );
}
