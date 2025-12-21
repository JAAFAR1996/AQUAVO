import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Fish, Calculator, AlertCircle, Lightbulb } from "lucide-react";
import { WizardData } from "@/types/journey";

interface FishSelectionProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function FishSelection({ wizardData, updateData }: FishSelectionProps) {
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Fish className="h-7 w-7 text-primary" />
                        اختيار الأسماك
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        اختر أسماكاً متوافقة ولا تزدحم حوضك
                    </p>
                </div>

                {/* Fish Types */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">أنواع الأسماك المهتم بها</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { value: "community", label: "أسماك المجتمع", examples: "Tetras, Guppies, Mollies" },
                            { value: "cichlids", label: "سيكليد", examples: "Angelfish, Rams, Discus" },
                            { value: "bottom-dwellers", label: "أسماك القاع", examples: "Corydoras, Plecos, Loaches" },
                            { value: "schooling", label: "أسماك السرب", examples: "Neon Tetras, Rasboras" },
                            { value: "centerpiece", label: "سمكة مركزية", examples: "Betta, Gourami, Angelfish" },
                            { value: "shrimp-snails", label: "جمبري وحلزون", examples: "Cherry Shrimp, Nerite Snails" }
                        ].map((option) => (
                            <div key={option.value} className="flex items-start space-x-3 space-x-reverse">
                                <Checkbox
                                    id={`fish-${option.value}`}
                                    checked={wizardData.fishTypes.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            updateData("fishTypes", [...wizardData.fishTypes, option.value]);
                                        } else {
                                            updateData("fishTypes", wizardData.fishTypes.filter(f => f !== option.value));
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor={`fish-${option.value}`}
                                    className="flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
                                >
                                    <div className="mb-2">
                                        <div className="font-bold text-foreground">{option.label}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">أمثلة: {option.examples}</div>
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stocking Level */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">مستوى الكثافة السمكية</Label>
                    <RadioGroup value={wizardData.stockingLevel} onValueChange={(val) => updateData("stockingLevel", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "light",
                                    label: "خفيف (مُوصى به للمبتدئين)",
                                    desc: "~1 سم من السمك لكل 2 لتر ماء",
                                    benefit: "✓ أسهل في الصيانة، مياه أكثر استقراراً"
                                },
                                {
                                    value: "moderate",
                                    label: "معتدل",
                                    desc: "~1 سم من السمك لكل 1.5 لتر ماء",
                                    benefit: "متوازن بين الجمال والصيانة"
                                },
                                {
                                    value: "heavy",
                                    label: "كثيف (للخبراء فقط)",
                                    desc: "~1 سم من السمك لكل 1 لتر ماء",
                                    benefit: "⚠️ يحتاج فلترة قوية وصيانة يومية"
                                }
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem value={option.value} id={`stock-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`stock-${option.value}`}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        <div className="font-bold text-foreground mb-1">{option.label}</div>
                                        <div className="text-sm text-muted-foreground mb-2">{option.desc}</div>
                                        <div className="text-xs text-primary">{option.benefit}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Stocking Calculator */}
                <div className="bg-muted/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calculator className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-foreground">حاسبة الكثافة التقريبية</h3>
                    </div>
                    {wizardData.tankSize && wizardData.stockingLevel && (
                        <div className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                                بناءً على اختياراتك:
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-1">حوضك</div>
                                    <div className="text-lg font-bold text-primary">
                                        {wizardData.tankSize === "small" && "~40 لتر"}
                                        {wizardData.tankSize === "medium" && "~100 لتر"}
                                        {wizardData.tankSize === "large" && "~200 لتر"}
                                        {wizardData.tankSize === "xlarge" && "~400 لتر"}
                                    </div>
                                </div>
                                <div className="bg-background rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-1">يمكنك إضافة</div>
                                    <div className="text-lg font-bold text-primary">
                                        {wizardData.tankSize === "small" && wizardData.stockingLevel === "light" && "~10-15 سمكة صغيرة"}
                                        {wizardData.tankSize === "small" && wizardData.stockingLevel === "moderate" && "~15-20 سمكة صغيرة"}
                                        {wizardData.tankSize === "medium" && wizardData.stockingLevel === "light" && "~20-30 سمكة صغيرة"}
                                        {wizardData.tankSize === "medium" && wizardData.stockingLevel === "moderate" && "~30-40 سمكة صغيرة"}
                                        {wizardData.tankSize === "large" && wizardData.stockingLevel === "light" && "~40-60 سمكة صغيرة"}
                                        {wizardData.tankSize === "large" && wizardData.stockingLevel === "moderate" && "~60-80 سمكة صغيرة"}
                                        {wizardData.tankSize === "xlarge" && "أكثر من 100 سمكة صغيرة"}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                * هذه أرقام تقريبية للأسماك الصغيرة (2-3 سم). الأسماك الكبيرة تحتاج مساحة أكثر.
                            </p>
                        </div>
                    )}
                </div>

                {/* Compatibility Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">التوافق مهم جداً!</div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside text-right">
                            <li>لا تخلط أسماك عدوانية مع أسماك سلمية</li>
                            <li>تأكد من توافق متطلبات المياه (pH، درجة الحرارة)</li>
                            <li>بعض الأسماك تأكل الجمبري الصغير</li>
                            <li>استخدم أداة "مكتشف الأسماك" لمساعدة أفضل</li>
                        </ul>
                    </div>
                </div>

                {/* Pro Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                            أضف الأسماك تدريجياً! 3-5 أسماك كل أسبوعين. هذا يعطي البكتيريا المفيدة وقتاً للتكيف مع الحمل البيولوجي الجديد.
                            لا تضف كل الأسماك دفعة واحدة - حتى لو كان حوضك مدوّر!
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
