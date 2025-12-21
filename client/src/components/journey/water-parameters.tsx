import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Droplets, Thermometer, TestTube, Package, AlertCircle } from "lucide-react";
import { WizardData } from "@/types/journey";

interface WaterParametersProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function WaterParameters({ wizardData, updateData }: WaterParametersProps) {
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Droplets className="h-7 w-7 text-primary" />
                        إعداد المياه
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        جودة المياه هي أهم عامل لصحة الأسماك
                    </p>
                </div>

                {/* Water Source */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">مصدر المياه</Label>
                    <RadioGroup value={wizardData.waterSource} onValueChange={(val) => updateData("waterSource", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "tap",
                                    label: "ماء الصنبور",
                                    desc: "الأكثر شيوعاً - يحتاج معالج كلور",
                                    note: "✓ سهل ومتوفر"
                                },
                                {
                                    value: "ro",
                                    label: "ماء RO (التناضح العكسي)",
                                    desc: "نقي جداً - مثالي للأسماك الحساسة",
                                    note: "⚠️ يحتاج إعادة معادن"
                                },
                                {
                                    value: "well",
                                    label: "ماء البئر",
                                    desc: "يحتاج اختبار للمعادن الثقيلة",
                                    note: "⚠️ افحص الجودة أولاً"
                                }
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem value={option.value} id={`water-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`water-${option.value}`}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        <div className="font-bold text-foreground mb-1">{option.label}</div>
                                        <div className="text-sm text-muted-foreground mb-2">{option.desc}</div>
                                        <div className="text-xs text-primary">{option.note}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Water Parameters Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                            <TestTube className="h-4 w-4 text-primary" />
                            pH المثالي
                        </div>
                        <div className="text-2xl font-bold text-primary">6.5-7.5</div>
                        <div className="text-xs text-muted-foreground">للأسماك الاستوائية</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                            <Thermometer className="h-4 w-4 text-primary" />
                            درجة الحرارة
                        </div>
                        <div className="text-2xl font-bold text-primary">24-26°C</div>
                        <div className="text-xs text-muted-foreground">نطاق آمن</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-primary" />
                            تغيير الماء
                        </div>
                        <div className="text-2xl font-bold text-primary">25%</div>
                        <div className="text-xs text-muted-foreground">كل أسبوع</div>
                    </div>
                </div>

                {/* Essential Products */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="h-5 w-5 text-amber-500" />
                        <div className="font-bold text-foreground">منتجات أساسية للمياه</div>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li><strong>معالج الكلور:</strong> ضروري لماء الصنبور (مثل Seachem Prime)</li>
                        <li><strong>بكتيريا مفيدة:</strong> تسريع دورة النيتروجين</li>
                        <li><strong>اختبار المياه:</strong> لقياس الأمونيا والنيترات والنيتريت</li>
                        <li><strong>منظم pH:</strong> إذا كان الماء حمضي/قلوي جداً</li>
                    </ul>
                </div>

                {/* Warning */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">تحذير حيوي</div>
                        <p className="text-sm text-muted-foreground text-right">
                            <strong>لا تضف الأسماك مباشرة!</strong> يجب أن يكتمل تدوير الحوض أولاً (الخطوة التالية).
                            إضافة الأسماك بدون تدوير كامل = موت محتم للأسماك بسبب التسمم بالأمونيا.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
