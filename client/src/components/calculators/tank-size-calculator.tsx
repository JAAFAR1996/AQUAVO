import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TankSizeCalculator() {
    const [shape, setShape] = useState("rectangle");
    const [units, setUnits] = useState("cm");

    // Dimensions
    const [length, setLength] = useState("");
    const [width, setWidth] = useState("");
    const [height, setHeight] = useState("");
    const [diameter, setDiameter] = useState(""); // For cylinder/bowfront

    const [result, setResult] = useState<{ liters: number; gallons: number } | null>(null);

    const calculate = () => {
        let volumeLiters = 0;

        // Convert inputs to cm first
        const toCm = (val: string) => units === "inch" ? parseFloat(val) * 2.54 : parseFloat(val);

        const l = toCm(length);
        const w = toCm(width);
        const h = toCm(height);
        const d = toCm(diameter);

        if (shape === "rectangle") {
            if (l && w && h) {
                volumeLiters = (l * w * h) / 1000;
            }
        } else if (shape === "cube") {
            if (l) {
                volumeLiters = (l * l * l) / 1000;
            }
        } else if (shape === "cylinder") {
            if (d && h) {
                const radius = d / 2;
                volumeLiters = (Math.PI * radius * radius * h) / 1000;
            }
        } else if (shape === "bowfront") {
            if (l && w && h) {
                // Rectangle volume + 15% estimate for bow
                volumeLiters = (l * w * h) / 1000;
                volumeLiters *= 1.15;
            }
        }

        setResult({
            liters: Math.round(volumeLiters * 10) / 10,
            gallons: Math.round(volumeLiters * 0.264172 * 10) / 10
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-xl">
                    أدخل أبعاد الحوض
                    <Calculator className="w-6 h-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">
                    اختر شكل الحوض ووحدة القياس للحصول على النتيجة
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>وحدة القياس</Label>
                        <Select value={units} onValueChange={setUnits}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="cm">سنتيمتر (cm)</SelectItem>
                                <SelectItem value="inch">إنش (inch)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 text-right">
                        <Label>شكل الحوض</Label>
                        <Select value={shape} onValueChange={setShape}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="rectangle">مستطيل (Rectangle)</SelectItem>
                                <SelectItem value="cube">مكعب (Cube)</SelectItem>
                                <SelectItem value="cylinder">أسطواني (Cylinder)</SelectItem>
                                <SelectItem value="bowfront">مقدمة مقوسة (Bowfront)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4">
                    {(shape === "rectangle" || shape === "bowfront") && (
                        <>
                            <div className="space-y-2 text-right">
                                <Label>الطول ({units})</Label>
                                <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} className="text-right" />
                            </div>
                            <div className="space-y-2 text-right">
                                <Label>العرض ({units})</Label>
                                <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="text-right" />
                            </div>
                            <div className="space-y-2 text-right">
                                <Label>الارتفاع ({units})</Label>
                                <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="text-right" />
                            </div>
                        </>
                    )}

                    {shape === "cube" && (
                        <div className="space-y-2 text-right">
                            <Label>طول الضلع ({units})</Label>
                            <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} className="text-right" />
                        </div>
                    )}

                    {shape === "cylinder" && (
                        <>
                            <div className="space-y-2 text-right">
                                <Label>القطر ({units})</Label>
                                <Input type="number" value={diameter} onChange={(e) => setDiameter(e.target.value)} className="text-right" />
                            </div>
                            <div className="space-y-2 text-right">
                                <Label>الارتفاع ({units})</Label>
                                <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="text-right" />
                            </div>
                        </>
                    )}
                </div>

                <Button onClick={calculate} className="w-full text-lg h-12">احسب الحجم</Button>

                {result && (
                    <div className="mt-8 p-6 bg-primary/5 rounded-xl text-center border-2 border-primary/10 animate-in fade-in zoom-in duration-300">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-muted-foreground mb-1">الحجم باللتر</p>
                                <p className="text-4xl font-bold text-primary">{result.liters} L</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">الحجم بالجالون</p>
                                <p className="text-4xl font-bold text-accent">{result.gallons} Gal</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border">
                            <Alert className="bg-primary/10 border-primary/20 mb-4">
                                <Info className="h-4 w-4 text-primary" />
                                <AlertDescription className="text-sm text-foreground text-right">
                                    وزن الماء التقريبي: <strong>{result.liters} كجم</strong> (بدون احتساب الزجاج والديكور)
                                    <br />
                                    تأكد من أن الطاولة تتحمل هذا الوزن!
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
