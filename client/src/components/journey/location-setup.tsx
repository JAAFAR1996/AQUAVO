import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, CheckCircle2, AlertCircle, Calculator } from "lucide-react";
import { WizardData } from "@/types/journey";

interface LocationSetupProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function LocationSetup({ wizardData, updateData }: LocationSetupProps) {
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <MapPin className="h-7 w-7 text-primary" />
                        موقع ومكان الحوض
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        الموقع الصحيح يمنع الكثير من المشاكل المستقبلية
                    </p>
                </div>

                <div className="space-y-4">
                    <Label className="text-lg font-bold">اختر مواصفات الموقع (يمكنك اختيار أكثر من خيار)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                value: "away-from-sunlight",
                                label: "بعيد عن أشعة الشمس المباشرة",
                                desc: "يمنع نمو الطحالب الزائد",
                                good: true
                            },
                            {
                                value: "stable-surface",
                                label: "سطح مستقر ومتين",
                                desc: "يتحمل وزن الحوض المملوء",
                                good: true
                            },
                            {
                                value: "near-power",
                                label: "قريب من مصدر كهرباء",
                                desc: "للفلتر والسخان والإضاءة",
                                good: true
                            },
                            {
                                value: "quiet-area",
                                label: "منطقة هادئة",
                                desc: "بعيداً عن الضوضاء",
                                good: true
                            },
                            {
                                value: "easy-access",
                                label: "سهل الوصول",
                                desc: "للصيانة الدورية",
                                good: true
                            },
                            {
                                value: "away-from-hvac",
                                label: "بعيد عن التكييف والتهوية",
                                desc: "لاستقرار درجة الحرارة",
                                good: true
                            }
                        ].map((option) => (
                            <div key={option.value} className="flex items-start space-x-3 space-x-reverse">
                                <Checkbox
                                    id={option.value}
                                    checked={wizardData.location.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            updateData("location", [...wizardData.location, option.value]);
                                        } else {
                                            updateData("location", wizardData.location.filter(l => l !== option.value));
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor={option.value}
                                    className="flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
                                >
                                    <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                                        {option.good && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                        {option.label}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">تحذير مهم</div>
                        <p className="text-sm text-muted-foreground text-right">
                            تأكد من أن السطح يتحمل الوزن! حوض 100 لتر يزن حوالي 120 كجم عند امتلائه بالماء والحصى والديكور.
                            استخدم حاملاً مخصصاً للأحواض أو طاولة قوية جداً.
                        </p>
                    </div>
                </div>

                {/* Calculation helper */}
                <div className="bg-muted/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calculator className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-foreground">حاسبة الوزن</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">حوض 60 لتر:</span>
                            <span className="font-bold">~75 كجم</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">حوض 100 لتر:</span>
                            <span className="font-bold">~120 كجم</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">حوض 200 لتر:</span>
                            <span className="font-bold">~240 كجم</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
