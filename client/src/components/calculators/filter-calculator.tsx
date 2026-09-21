import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplets, Info } from "lucide-react";
import { Link } from "wouter";

export function FilterCalculator() {
    const [volume, setVolume] = useState("");
    const [fishType, setFishType] = useState("medium");
    const [result, setResult] = useState<{ min: number; max: number; recommended: number } | null>(null);

    const calculate = () => {
        const v = parseFloat(volume);
        if (v) {
            // Rule of thumb: filter should turn over 4-10x tank volume per hour
            // Depends on fish type and bioload
            let multiplier = 4;
            if (fishType === "light") multiplier = 4;
            else if (fishType === "medium") multiplier = 6;
            else if (fishType === "heavy") multiplier = 8;

            setResult({
                min: v * 4,
                max: v * 10,
                recommended: v * multiplier,
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-right">
                    حاسبة الفلترة
                    <Droplets className="h-6 w-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">احسب معدل التدفق المناسب للفلتر بناءً على حجم الحوض ونوع الأسماك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">حجم الحوض (لتر)</Label>
                        <Input
                            type="number"
                            placeholder="مثال: 200"
                            value={volume}
                            onChange={(e) => setVolume(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">كثافة الأسماك (Bioload)</Label>
                        <Select value={fishType} onValueChange={setFishType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="light" className="text-right">خفيفة (أسماك صغيرة - نباتات كثيرة)</SelectItem>
                                <SelectItem value="medium" className="text-right">متوسطة (حوض مجتمعي عادي)</SelectItem>
                                <SelectItem value="heavy" className="text-right">كثيفة (أسماك كبيرة - حوض مزدحم)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Alert className="bg-primary/10 border-primary/20">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm text-foreground text-right">
                        <strong>نصيحة:</strong> الفلتر الجيد يجب أن يدور الماء 4-10 مرات في الساعة.
                        للأسماك الكبيرة والمنتجة للفضلات، استخدم معدل أعلى.
                    </AlertDescription>
                </Alert>

                <Button onClick={calculate} className="w-full text-lg h-12">
                    احسب النتيجة
                </Button>

                {result && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-6 bg-primary/5 rounded-xl text-center border border-primary/20">
                            <p className="text-muted-foreground mb-2">معدل التدفق الموصى به</p>
                            <p className="text-4xl font-bold text-primary">{result.recommended} لتر/ساعة</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground mb-1">الحد الأدنى</p>
                                <p className="text-2xl font-semibold">{result.min} لتر/ساعة</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground mb-1">الحد الأقصى</p>
                                <p className="text-2xl font-semibold">{result.max} لتر/ساعة</p>
                            </div>
                        </div>
                        <Alert className="bg-primary/5 border-primary/10">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-sm text-muted-foreground text-right">
                                اختر فلتر بمعدل تدفق {result.recommended} لتر/ساعة أو أعلى. إذا كان حوضك يحتوي على
                                أسماك حساسة للتيار، يمكنك استخدام صمام تحكم في التدفق.
                            </AlertDescription>
                        </Alert>
                        <Link href="/products?search=filter">
                            <Button className="w-full" variant="secondary">
                                تسوق فلاتر مناسبة
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
