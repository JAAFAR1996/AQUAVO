import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Bell, Clock, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function MaintenanceCalculator() {
    const { toast } = useToast();
    const [tankSize, setTankSize] = useState("");
    const [fishCount, setFishCount] = useState("");
    const [plantDensity, setPlantDensity] = useState("medium");
    const [filterType, setFilterType] = useState("canister");
    const [email, setEmail] = useState("");
    const [schedule, setSchedule] = useState<{
        weekly: string[];
        biweekly: string[];
        monthly: string[];
    } | null>(null);

    const generateSchedule = () => {
        const size = parseFloat(tankSize);
        const fish = parseInt(fishCount);
        if (!size || !fish) {
            toast({ title: "بيانات ناقصة", description: "يرجى إدخال حجم الحوض وعدد الأسماك", variant: "destructive" });
            return;
        }

        // Calculate water change percentage based on bioload
        const bioloadFactor = fish / (size / 10); // Fish per 10 liters
        let waterChangePercent = 20;
        if (bioloadFactor > 1) waterChangePercent = 30;
        if (bioloadFactor > 2) waterChangePercent = 40;

        const weekly: string[] = [
            `تغيير ${waterChangePercent}% من الماء (${Math.round(size * waterChangePercent / 100)} لتر)`,
            "فحص درجة الحرارة والتأكد من ثباتها",
            "إزالة الأوراق الميتة والفضلات المرئية",
            "فحص الأسماك بصرياً للتأكد من صحتها",
        ];

        if (plantDensity === "heavy") {
            weekly.push("تقليم النباتات الزائدة");
            weekly.push("إضافة الأسمدة السائلة");
        }

        const biweekly: string[] = [
            "تنظيف زجاج الحوض من الداخل",
            "فحص معدات التسخين والإضاءة",
            "اختبار جودة المياه (pH, Ammonia, Nitrite, Nitrate)",
        ];

        if (filterType === "sponge") {
            biweekly.push("عصر إسفنجة الفلتر في ماء الحوض المُغيَّر");
        }

        const monthly: string[] = [
            "تنظيف الفلتر بعمق (لا تغسله بماء الصنبور!)",
            "فحص واستبدال الوسائط الفلترية إذا لزم الأمر",
            "تنظيف أنابيب التهوية والمضخات",
            "فحص صلاحية الأدوية والمستلزمات",
        ];

        if (filterType === "canister") {
            monthly.push("تنظيف المروحة وصمامات الفلتر الخارجي");
        }

        if (plantDensity !== "none") {
            monthly.push("فحص جذور النباتات واستبدال التالف منها");
            monthly.push("إضافة أقراص تغذية الجذور");
        }

        setSchedule({ weekly, biweekly, monthly });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-right">
                    جدول الصيانة الآلية
                    <Calendar className="h-6 w-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">
                    احصل على جدول صيانة مخصص بناءً على مواصفات حوضك
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">حجم الحوض (لتر)</Label>
                        <Input
                            type="number"
                            placeholder="مثال: 200"
                            value={tankSize}
                            onChange={(e) => setTankSize(e.target.value)}
                            className="text-right"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">عدد الأسماك</Label>
                        <Input
                            type="number"
                            placeholder="مثال: 15"
                            value={fishCount}
                            onChange={(e) => setFishCount(e.target.value)}
                            className="text-right"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">كثافة النباتات</Label>
                        <Select value={plantDensity} onValueChange={setPlantDensity}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="none" className="text-right">بدون نباتات</SelectItem>
                                <SelectItem value="light" className="text-right">نباتات قليلة</SelectItem>
                                <SelectItem value="medium" className="text-right">نباتات متوسطة</SelectItem>
                                <SelectItem value="heavy" className="text-right">نباتات كثيفة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">نوع الفلتر</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="sponge" className="text-right">فلتر إسفنجي</SelectItem>
                                <SelectItem value="hob" className="text-right">فلتر معلق (HOB)</SelectItem>
                                <SelectItem value="canister" className="text-right">فلتر خارجي (Canister)</SelectItem>
                                <SelectItem value="internal" className="text-right">فلتر داخلي</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Email reminder opt-in */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm font-medium">تذكيرات البريد الإلكتروني</span>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled className="text-xs">
                            تفعيل التذكيرات (قريباً)
                        </Button>
                        <Input
                            type="email"
                            placeholder="بريدك الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-right"
                            disabled
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        * سيتم إطلاق هذه الميزة قريباً
                    </p>
                </div>

                <Button onClick={generateSchedule} className="w-full text-lg h-12">
                    <Calendar className="h-5 w-5 ml-2" />
                    إنشاء جدول الصيانة
                </Button>

                {schedule && (
                    <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                        {/* Weekly Tasks */}
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 justify-end">
                                مهام أسبوعية
                                <Clock className="h-5 w-5 text-primary" />
                            </h4>
                            <ul className="space-y-2">
                                {schedule.weekly.map((task) => (
                                    <li key={task} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                        <span>{task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Biweekly Tasks */}
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 justify-end">
                                مهام كل أسبوعين
                                <Clock className="h-5 w-5 text-primary" />
                            </h4>
                            <ul className="space-y-2">
                                {schedule.biweekly.map((task) => (
                                    <li key={task} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                        <span>{task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Monthly Tasks */}
                        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 justify-end">
                                مهام شهرية
                                <Calendar className="h-5 w-5 text-accent" />
                            </h4>
                            <ul className="space-y-2">
                                {schedule.monthly.map((task) => (
                                    <li key={task} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent" />
                                        <span>{task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Alert className="bg-accent/10 border-accent/20">
                            <Info className="h-4 w-4 text-accent" />
                            <AlertDescription className="text-sm text-foreground text-right">
                                <strong>نصيحة:</strong> التزم بجدول الصيانة للحفاظ على بيئة صحية لأسماكك.
                                الصيانة المنتظمة تمنع معظم مشاكل الحوض!
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
