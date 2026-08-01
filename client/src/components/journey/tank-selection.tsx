import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Package, Ruler, Lightbulb, Info } from "lucide-react";
import { WizardData } from "@/types/journey";

interface TankSelectionProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

// Map presets to approximate liter values
const PRESET_TO_LITERS: Record<string, number> = {
    small: 40,
    medium: 100,
    large: 200,
    xlarge: 400,
};

export function TankSelection({ wizardData, updateData }: TankSelectionProps) {
    // Handle preset selection - also sets liters automatically
    const handlePresetSelect = (val: string) => {
        updateData("tankSize", val);
        updateData("tankLiters", PRESET_TO_LITERS[val] || 0);
    };

    // Handle manual liter input
    const handleLitersChange = (value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
            updateData("tankLiters", 0);
        } else if (num > 2000) {
            updateData("tankLiters", 2000);
        } else {
            updateData("tankLiters", num);
        }

        // Auto-select preset based on liters
        if (num <= 60) updateData("tankSize", "small");
        else if (num <= 150) updateData("tankSize", "medium");
        else if (num <= 300) updateData("tankSize", "large");
        else updateData("tankSize", "xlarge");
    };

    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Package className="h-7 w-7 text-primary" />
                        اختيار الحوض المناسب
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        الحوض هو أساس كل شيء. حجم الحوض يؤثر على استقرار المياه وعدد الأسماك.
                    </p>
                </div>

                {/* Manual Liter Input */}
                <div className="space-y-3">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Ruler className="h-5 w-5 text-primary" />
                        حجم الحوض (باللترات)
                    </Label>
                    <div className="flex items-center gap-3 max-w-xs">
                        <Input
                            type="number"
                            min={10}
                            max={2000}
                            value={wizardData.tankLiters || ""}
                            onChange={(e) => handleLitersChange(e.target.value)}
                            placeholder="مثال: 100"
                            className="text-center text-xl font-bold h-12 text-primary"
                        />
                        <span className="text-lg font-medium text-muted-foreground whitespace-nowrap">لتر</span>
                    </div>
                    {wizardData.tankLiters >= 10 && (
                        <p className="text-sm text-primary font-semibold">
                            {wizardData.tankLiters <= 30 && "حوض صغير — مناسب لأسماك البيتا"}
                            {wizardData.tankLiters > 30 && wizardData.tankLiters <= 80 && "حوض متوسط — خيار ممتاز للمبتدئين"}
                            {wizardData.tankLiters > 80 && wizardData.tankLiters <= 200 && "حوض كبير — مستقر وسهل الصيانة"}
                            {wizardData.tankLiters > 200 && "حوض ضخم — مناسب للمحترفين"}
                        </p>
                    )}
                </div>

                {/* Quick-Select Presets */}
                <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">أو اختر حجم سريع:</Label>
                    <RadioGroup value={wizardData.tankSize} onValueChange={handlePresetSelect}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { value: "small", label: "صغير (20-60 لتر)", desc: "مناسب للمبتدئين" },
                                { value: "medium", label: "متوسط (60-150 لتر)", desc: "الأكثر شيوعاً، مستقر", recommended: true },
                                { value: "large", label: "كبير (150-300 لتر)", desc: "مثالي، أسهل في الصيانة" },
                                { value: "xlarge", label: "كبير جداً (+300 لتر)", desc: "للمحترفين" }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                                    <Label
                                        htmlFor={option.value}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-lg"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">مُوصى به</Badge>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Package className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-foreground">{option.label}</div>
                                                <div className="text-sm text-muted-foreground">{option.desc}</div>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Tank Type */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">نوع الحوض</Label>
                    <RadioGroup value={wizardData.tankType} onValueChange={(val) => updateData("tankType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { value: "freshwater-community", label: "مجتمع المياه العذبة", desc: "أسماك متنوعة" },
                                { value: "planted", label: "حوض نباتي", desc: "نباتات كثيفة" },
                                { value: "species-specific", label: "نوع محدد", desc: "نوع واحد فقط" }
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                                    <Label
                                        htmlFor={option.value}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        <div className="font-bold text-foreground mb-1">{option.label}</div>
                                        <div className="text-sm text-muted-foreground">{option.desc}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Formula Tip */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">ما تعرف حجم حوضك؟</div>
                        <p className="text-sm text-muted-foreground text-right">
                            احسبه بالمعادلة: الطول × العرض × الارتفاع (بالسنتيمتر) ÷ 1000 = الحجم باللتر
                        </p>
                    </div>
                </div>

                {/* Pro Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                            الأحواض الأكبر (100+ لتر) أسهل في الصيانة. المياه الأكثر تعني تقلبات أقل في درجة الحرارة والمعايير الكيميائية.
                            لا تخف من البدء بحوض أكبر، فهو استثمار أفضل على المدى الطويل.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
