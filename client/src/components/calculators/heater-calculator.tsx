import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

export function HeaterCalculator() {
    const [volume, setVolume] = useState("");
    const [tempDiff, setTempDiff] = useState("");
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        const v = parseFloat(volume);
        const t = parseFloat(tempDiff);
        if (v && t) {
            // Basic rule of thumb: 1 watt per liter for up to 5C diff, more for higher
            // This is a simplified calculation
            setResult(v * (t / 5));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-right">حاسبة قوة السخان</CardTitle>
                <CardDescription className="text-right">احسب القوة المناسبة (واط) لسخان حوضك بناءً على الحجم وفرق درجة الحرارة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">حجم الحوض (لتر)</Label>
                        <Input type="number" placeholder="مثال: 100" value={volume} onChange={(e) => setVolume(e.target.value)} className="text-right" />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">فرق درجة الحرارة المطلوب (C°)</Label>
                        <Select onValueChange={setTempDiff}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue placeholder="اختر الفرق" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="5" className="text-right">5 درجات (غرفة دافئة)</SelectItem>
                                <SelectItem value="10" className="text-right">10 درجات (غرفة باردة)</SelectItem>
                                <SelectItem value="15" className="text-right">15 درجة (غرفة باردة جداً)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={calculate} className="w-full text-lg h-12">احسب النتيجة</Button>

                {result && (
                    <div className="mt-6 p-6 bg-primary/5 rounded-xl text-center animate-in fade-in slide-in-from-top-2 border border-primary/10">
                        <p className="text-muted-foreground mb-2">القوة المقترحة</p>
                        <p className="text-4xl font-bold text-primary">{Math.ceil(result / 50) * 50} واط</p>
                        <p className="text-sm text-muted-foreground mt-2">* نقترح استخدام سخانين بقوة {Math.ceil(result / 100) * 50} واط للأمان</p>
                        <Link href="/products?search=heater">
                            <Button className="mt-4 w-full" variant="secondary">
                                تسوق سخانات مناسبة
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
