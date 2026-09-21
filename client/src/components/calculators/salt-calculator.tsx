import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Waves, Info } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function SaltCalculator() {
    const { toast } = useToast();
    const [volume, setVolume] = useState("");
    const [currentSalinity, setCurrentSalinity] = useState("");
    const [targetSalinity, setTargetSalinity] = useState("");
    const [tankType, setTankType] = useState("reef");
    const [result, setResult] = useState<{ saltAmount: number; instructions: string } | null>(null);

    const calculate = () => {
        const v = parseFloat(volume);
        const current = parseFloat(currentSalinity);
        const target = parseFloat(targetSalinity);

        if (!v || isNaN(v) || isNaN(current) || isNaN(target)) {
            toast({ title: "بيانات ناقصة", description: "يرجى إدخال حجم الحوض والملوحة الحالية والمطلوبة", variant: "destructive" });
            return;
        }

        if (v > 0 && !isNaN(current) && !isNaN(target)) {
            // Salinity calculation: approximately 35g of salt per liter increases salinity by 1 ppt
            const difference = target - current;
            const saltNeeded = v * difference * 35; // grams

            let instructions = "";
            if (saltNeeded > 0) {
                instructions = `أضف ${Math.round(saltNeeded)} جرام من ملح البحر تدريجياً على مدى عدة ساعات. قس الملوحة بعد كل إضافة.`;
            } else if (saltNeeded < 0) {
                instructions = `الملوحة الحالية أعلى من المطلوب. قم بتغيير ${Math.abs(Math.round((difference / target) * 100))}% من الماء بماء عذب مُعالج.`;
            } else {
                instructions = "الملوحة مثالية! لا حاجة لأي تعديلات.";
            }

            setResult({
                saltAmount: Math.abs(Math.round(saltNeeded)),
                instructions,
            });
        }
    };

    const getSalinityRange = (type: string) => {
        switch (type) {
            case "reef":
                return "1.023-1.025 (35-35 ppt)";
            case "fowlr":
                return "1.020-1.025 (30-35 ppt)";
            case "brackish":
                return "1.005-1.015 (5-20 ppt)";
            default:
                return "";
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-right">
                    حاسبة الملوحة
                    <Waves className="h-6 w-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">احسب كمية الملح المطلوبة للوصول إلى مستوى الملوحة المناسب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="space-y-2">
                    <Label className="block text-right">نوع الحوض</Label>
                    <Select value={tankType} onValueChange={setTankType}>
                        <SelectTrigger className="text-right" dir="rtl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                            <SelectItem value="reef" className="text-right">
                                Reef (شعاب مرجانية) - {getSalinityRange("reef")}
                            </SelectItem>
                            <SelectItem value="fowlr" className="text-right">
                                FOWLR (أسماك فقط) - {getSalinityRange("fowlr")}
                            </SelectItem>
                            <SelectItem value="brackish" className="text-right">
                                Brackish (مياه شبه مالحة) - {getSalinityRange("brackish")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="block text-right">حجم الحوض (لتر)</Label>
                        <Input
                            type="number"
                            placeholder="200"
                            value={volume}
                            onChange={(e) => setVolume(e.target.value)}
                            className="text-right"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">الملوحة الحالية (ppt)</Label>
                        <Input
                            type="number"
                            placeholder="30"
                            step="0.5"
                            value={currentSalinity}
                            onChange={(e) => setCurrentSalinity(e.target.value)}
                            className="text-right"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">الملوحة المطلوبة (ppt)</Label>
                        <Input
                            type="number"
                            placeholder="35"
                            step="0.5"
                            value={targetSalinity}
                            onChange={(e) => setTargetSalinity(e.target.value)}
                            className="text-right"
                        />
                    </div>
                </div>

                <Alert className="bg-accent/10 border-accent/20">
                    <Info className="h-4 w-4 text-accent" />
                    <AlertDescription className="text-sm text-foreground text-right">
                        <strong>مهم:</strong> استخدم مقياس ملوحة دقيق (Refractometer أو Hydrometer).
                        <div className="mt-1">
                            الملوحة النموذجية: <span dir="ltr" className="inline-block font-mono font-bold mx-1">1.025 sg = 35 ppt</span> للشعاب المرجانية.
                        </div>
                    </AlertDescription>
                </Alert>

                <Button onClick={calculate} className="w-full text-lg h-12">
                    احسب كمية الملح
                </Button>

                {result && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                            <p className="text-muted-foreground mb-2 text-center">كمية الملح المطلوبة</p>
                            <p className="text-4xl font-bold text-primary text-center">
                                {result.saltAmount} جرام
                            </p>
                            <p className="text-sm text-muted-foreground text-center mt-2">
                                ({(result.saltAmount / 1000).toFixed(2)} كيلوجرام)
                            </p>
                        </div>

                        <Alert className="bg-primary/10 border-primary/20">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-foreground font-semibold">إرشادات التطبيق</AlertTitle>
                            <AlertDescription className="text-sm text-muted-foreground mt-2">
                                {result.instructions}
                            </AlertDescription>
                        </Alert>

                        <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm text-right">
                            <h4 className="font-semibold text-right">نصائح مهمة:</h4>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-right">
                                <li>أذب الملح في ماء RO/DI نظيف في حاوية منفصلة</li>
                                <li>انتظر 24 ساعة قبل إضافة الماء للحوض</li>
                                <li>قس الملوحة بعد إذابة الملح بالكامل</li>
                                <li>غيّر الملوحة تدريجياً على عدة أيام لتجنب صدمة الأسماك</li>
                            </ul>
                        </div>
                        <Link href="/products?search=salt">
                            <Button className="w-full" variant="secondary">
                                تسوق أملاح بحرية
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}
