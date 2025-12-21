import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TestTube, Clock, Info, ArrowRight, AlertCircle } from "lucide-react";
import { WizardData } from "@/types/journey";

interface NitrogenCycleProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function NitrogenCycle({ wizardData, updateData }: NitrogenCycleProps) {
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <TestTube className="h-7 w-7 text-primary" />
                        دورة النيتروجين (التدوير)
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        أهم خطوة! بدونها ستموت أسماكك. الصبر هنا يساوي النجاح.
                    </p>
                </div>

                {/* Cycling Method */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">طريقة التدوير</Label>
                    <RadioGroup value={wizardData.cyclingMethod} onValueChange={(val) => updateData("cyclingMethod", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "fishless",
                                    label: "تدوير بدون أسماك (الأفضل)",
                                    desc: "باستخدام الأمونيا النقية أو طعام الأسماك",
                                    duration: "4-6 أسابيع",
                                    safety: "✓ آمن 100%",
                                    recommended: true
                                },
                                {
                                    value: "with-hardy-fish",
                                    label: "تدوير مع أسماك قوية",
                                    desc: "عدد قليل من الأسماك المقاومة",
                                    duration: "6-8 أسابيع",
                                    safety: "⚠️ مرهق للأسماك"
                                },
                                {
                                    value: "seeded",
                                    label: "تدوير بالبذر",
                                    desc: "باستخدام مادة فلتر من حوض قديم",
                                    duration: "2-3 أسابيع",
                                    safety: "✓ سريع وآمن"
                                },
                                {
                                    value: "bottled-bacteria",
                                    label: "بكتيريا معبأة",
                                    desc: "منتجات بكتيريا جاهزة",
                                    duration: "1-2 أسبوع",
                                    safety: "⚠️ نتائج متغيرة"
                                }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={`cycle-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`cycle-${option.value}`}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">مُوصى به</Badge>
                                        )}
                                        <div className="font-bold text-foreground mb-2">{option.label}</div>
                                        <div className="text-sm text-muted-foreground mb-3">{option.desc}</div>
                                        <div className="flex gap-4 text-xs">
                                            <Badge variant="outline">
                                                <Clock className="h-3 w-3 ml-1" />
                                                {option.duration}
                                            </Badge>
                                            <span className={cn(
                                                "font-bold",
                                                option.safety.includes('✓') ? "text-green-500" : "text-amber-500"
                                            )}>
                                                {option.safety}
                                            </span>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* The Nitrogen Cycle Explanation */}
                <div className="bg-gradient-to-br from-blue-500/10 to-green-500/10 border border-primary/20 rounded-xl p-6">
                    <h3 className="font-bold text-foreground mb-4 flex items-center justify-end gap-2 text-right">
                        ما هي دورة النيتروجين؟
                        <Info className="h-5 w-5 text-primary" />
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="bg-red-500/20 text-red-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">1</div>
                            <div>
                                <div className="font-bold text-foreground text-right">الأمونيا (NH₃)</div>
                                <div className="text-muted-foreground text-right">سامة جداً - من فضلات الأسماك والطعام المتحلل</div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-amber-500/20 text-amber-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">2</div>
                            <div>
                                <div className="font-bold text-foreground text-right">النيتريت (NO₂)</div>
                                <div className="text-muted-foreground text-right">سام أيضاً - تحوله بكتيريا Nitrosomonas</div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-green-500/20 text-green-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">3</div>
                            <div>
                                <div className="font-bold text-foreground text-right">النترات (NO₃)</div>
                                <div className="text-muted-foreground text-right">أقل سمية - تزيله النباتات وتغييرات الماء</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        الجدول الزمني المتوقع
                    </h3>
                    <div className="space-y-3">
                        {[
                            { week: "الأسبوع 1-2", event: "ارتفاع الأمونيا", status: "danger" },
                            { week: "الأسبوع 2-3", event: "ظهور النيتريت، انخفاض الأمونيا", status: "warning" },
                            { week: "الأسبوع 3-4", event: "ظهور النترات، انخفاض النيتريت", status: "info" },
                            { week: "الأسبوع 4-6", event: "اكتمال التدوير - جاهز للأسماك!", status: "success" }
                        ].map((phase, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                <div className={cn(
                                    "font-bold text-sm px-3 py-1 rounded-full",
                                    phase.status === "danger" && "bg-red-500/20 text-red-500",
                                    phase.status === "warning" && "bg-amber-500/20 text-amber-500",
                                    phase.status === "info" && "bg-blue-500/20 text-blue-500",
                                    phase.status === "success" && "bg-green-500/20 text-green-500"
                                )}>
                                    {phase.week}
                                </div>
                                <div className="text-sm text-foreground">{phase.event}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Critical Warning */}
                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-2 text-lg text-right">قاعدة ذهبية</div>
                        <p className="text-sm text-muted-foreground mb-3 text-right">
                            <strong>لا أمونيا + لا نيتريت = جاهز للأسماك</strong>
                        </p>
                        <p className="text-sm text-muted-foreground text-right">
                            اختبر الماء يومياً. عندما تصبح قراءات الأمونيا والنيتريت صفر لمدة 3-5 أيام متتالية،
                            حوضك جاهز أخيراً لاستقبال الأسماك. لا تتعجل هذه المرحلة!
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Missing Calendar import, adding it.
import { Calendar } from "lucide-react";
