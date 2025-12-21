import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Filter, Thermometer, Lightbulb } from "lucide-react";
import { WizardData } from "@/types/journey";

interface EquipmentSelectionProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function EquipmentSelection({ wizardData, updateData }: EquipmentSelectionProps) {
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Filter className="h-7 w-7 text-primary" />
                        المعدات الأساسية
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        الفلتر والسخان والإضاءة - الثلاثي الذهبي لأي حوض ناجح
                    </p>
                </div>

                {/* Filter Selection */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Filter className="h-5 w-5 text-primary" />
                        نوع الفلتر
                    </Label>
                    <RadioGroup value={wizardData.filterType} onValueChange={(val) => updateData("filterType", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "hob",
                                    label: "فلتر خارجي معلق (HOB)",
                                    desc: "سهل التركيب، مثالي للأحواض الصغيرة والمتوسطة",
                                    best: "20-150 لتر"
                                },
                                {
                                    value: "canister",
                                    label: "فلتر كانستر",
                                    desc: "قوي جداً، صامت، مثالي للأحواض الكبيرة",
                                    best: "100+ لتر",
                                    recommended: true
                                },
                                {
                                    value: "sponge",
                                    label: "فلتر إسفنجي",
                                    desc: "لطيف، رائع لصغار الأسماك",
                                    best: "حتى 60 لتر"
                                },
                                {
                                    value: "internal",
                                    label: "فلتر داخلي",
                                    desc: "بسيط واقتصادي",
                                    best: "20-100 لتر"
                                }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={`filter-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`filter-${option.value}`}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all text-right",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">الأفضل</Badge>
                                        )}
                                        <div className="flex-1 text-right">
                                            <div className="font-bold text-foreground mb-1 text-right">{option.label}</div>
                                            <div className="text-sm text-muted-foreground mb-2 text-right">{option.desc}</div>
                                            <Badge variant="outline" className="text-xs">{option.best}</Badge>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Heater Wattage */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Thermometer className="h-5 w-5 text-primary" />
                        قدرة السخان (واط)
                    </Label>
                    <div className="space-y-3">
                        <Slider
                            value={[wizardData.heaterWattage]}
                            onValueChange={([val]) => updateData("heaterWattage", val)}
                            max={300}
                            min={25}
                            step={25}
                            className="w-full"
                        />
                        <div className="flex justify-between items-center flex-row-reverse">
                            <span className="text-sm text-muted-foreground">25 واط</span>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary">{wizardData.heaterWattage}</div>
                                <div className="text-xs text-muted-foreground">واط</div>
                            </div>
                            <span className="text-sm text-muted-foreground">300 واط</span>
                        </div>
                    </div>

                    {/* Heater recommendation */}
                    <div className="bg-muted/30 rounded-xl p-4">
                        <div className="font-bold text-sm mb-2 text-right">التوصية:</div>
                        <div className="text-sm text-muted-foreground text-right">
                            القاعدة العامة: 1 واط لكل لتر من الماء
                            {wizardData.tankSize === "small" && " (25-60 واط للأحواض الصغيرة)"}
                            {wizardData.tankSize === "medium" && " (50-100 واط للأحواض المتوسطة)"}
                            {wizardData.tankSize === "large" && " (150-200 واط للأحواض الكبيرة)"}
                            {wizardData.tankSize === "xlarge" && " (200-300 واط للأحواض الكبيرة جداً)"}
                        </div>
                    </div>
                </div>

                {/* Lighting */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        نوع الإضاءة
                    </Label>
                    <RadioGroup value={wizardData.lightingType} onValueChange={(val) => updateData("lightingType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { value: "basic-led", label: "LED بسيط", desc: "للأسماك فقط" },
                                { value: "planted-led", label: "LED للنباتات", desc: "مع إضاءة كاملة الطيف", recommended: wizardData.tankType === "planted" },
                                { value: "rgb-smart", label: "LED ذكي RGB", desc: "مع تحكم بالألوان" },
                                { value: "none", label: "لا إضاءة حالياً", desc: "سأضيفها لاحقاً" }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={`light-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`light-${option.value}`}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">مُوصى به</Badge>
                                        )}
                                        <div className="font-bold text-foreground mb-1">{option.label}</div>
                                        <div className="text-sm text-muted-foreground">{option.desc}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Pro Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                            لا تبخل على الفلتر! هو أهم قطعة معدات في حوضك. اختر فلتراً بتدفق 4-6 أضعاف حجم الحوض في الساعة.
                            للنباتات الحية، الإضاءة الجيدة ضرورية - ابحث عن 30-50 لومن لكل لتر.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
