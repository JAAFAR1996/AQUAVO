import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Package, CheckCircle2, Lightbulb } from "lucide-react";
import { WizardData } from "@/types/journey";

interface MaintenanceScheduleProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function MaintenanceSchedule({ wizardData, updateData }: MaintenanceScheduleProps) {
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-7 w-7 text-primary" />
                        جدول الصيانة
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        الصيانة المنتظمة = حوض صحي ومزدهر
                    </p>
                </div>

                {/* Maintenance Preference */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">كم من الوقت يمكنك تخصيصه للصيانة؟</Label>
                    <RadioGroup value={wizardData.maintenancePreference} onValueChange={(val) => updateData("maintenancePreference", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "minimal",
                                    label: "صيانة قليلة (15 دقيقة/أسبوع)",
                                    desc: "نظام بسيط، نباتات قليلة، أسماك قليلة",
                                    tasks: "تغيير ماء، تغذية، فحص بصري"
                                },
                                {
                                    value: "moderate",
                                    label: "صيانة معتدلة (30-45 دقيقة/أسبوع)",
                                    desc: "التوازن المثالي لمعظم الناس",
                                    tasks: "تغيير ماء، تنظيف فلتر شهري، تقليم نباتات"
                                },
                                {
                                    value: "intensive",
                                    label: "صيانة مكثفة (ساعة+/أسبوع)",
                                    desc: "حوض نباتي غني، كثافة سمكية عالية",
                                    tasks: "تغيير ماء متكرر، تسميد، تقليم، اختبارات"
                                }
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem value={option.value} id={`maint-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`maint-${option.value}`}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        <div className="font-bold text-foreground mb-1">{option.label}</div>
                                        <div className="text-sm text-muted-foreground mb-2">{option.desc}</div>
                                        <div className="text-xs text-primary">المهام: {option.tasks}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Maintenance Schedule */}
                <div className="space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        جدول الصيانة الموصى به
                    </h3>

                    {/* Daily */}
                    <div className="border-r-4 border-blue-500 bg-blue-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-blue-500">يومي</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>إطعام الأسماك (1-2 مرة، كمية تؤكل في 2-3 دقائق)</li>
                            <li>فحص بصري للأسماك (سلوك غريب، علامات مرض)</li>
                            <li>فحص درجة الحرارة</li>
                            <li>تأكد من عمل جميع المعدات</li>
                        </ul>
                    </div>

                    {/* Weekly */}
                    <div className="border-r-4 border-green-500 bg-green-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-green-500">أسبوعي</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>تغيير 20-30% من الماء</li>
                            <li>تنظيف زجاج الحوض من الطحالب</li>
                            <li>شفط الحصى (Gravel Vacuum)</li>
                            <li>اختبار معايير المياه (pH، أمونيا، نيتريت، نترات)</li>
                            <li>تقليم النباتات الزائدة</li>
                        </ul>
                    </div>

                    {/* Monthly */}
                    <div className="border-r-4 border-amber-500 bg-amber-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-amber-500">شهري</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>تنظيف/استبدال وسائط الفلتر</li>
                            <li>فحص وتنظيف السخان</li>
                            <li>فحص الأنابيب والخراطيم</li>
                            <li>تنظيف الإضاءة</li>
                        </ul>
                    </div>

                    {/* Quarterly */}
                    <div className="border-r-4 border-purple-500 bg-purple-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-purple-500">كل 3 أشهر</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>تنظيف عميق للفلتر</li>
                            <li>استبدال الكربون المنشط</li>
                            <li>فحص جميع المعدات الكهربائية</li>
                            <li>إعادة ترتيب الديكور حسب الحاجة</li>
                        </ul>
                    </div>
                </div>

                {/* Essential Tools */}
                <div className="bg-muted/30 rounded-xl p-6">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        أدوات الصيانة الأساسية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {[
                            "سطل مخصص للحوض (5-10 لتر)",
                            "خرطوم للسحب (Siphon)",
                            "مكشطة طحالب",
                            "شبكة لالتقاط الأسماك",
                            "طقم اختبار المياه",
                            "ملقط طويل (للنباتات)",
                            "مقص للتقليم",
                            "معالج ماء (Seachem Prime)"
                        ].map((tool, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-muted-foreground">{tool}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pro Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                            حدد يوماً ثابتاً في الأسبوع لتغيير الماء - اجعله روتيناً! الانتظام أهم من الكمال.
                            تغيير ماء صغير منتظم أفضل بكثير من تغيير ماء كبير نادر. استخدم منبهاً على هاتفك لتذكيرك.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
