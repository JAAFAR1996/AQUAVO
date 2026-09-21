import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Package, CheckCircle2, Lightbulb } from "lucide-react";
import { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";

interface MaintenanceScheduleProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function MaintenanceSchedule({ wizardData, updateData }: MaintenanceScheduleProps) {
  const { t } = useTranslation("tools");
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-7 w-7 text-primary" />
                        {t("maintenance-schedule.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {t("maintenance-schedule.s2")}
                    </p>
                </div>

                {/* Maintenance Preference */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">{t("maintenance-schedule.s3")}</Label>
                    <RadioGroup value={wizardData.maintenancePreference} onValueChange={(val) => updateData("maintenancePreference", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "minimal",
                                    label: t("maintenance-schedule.s4"),
                                    desc: t("maintenance-schedule.s5"),
                                    tasks: t("maintenance-schedule.s6")
                                },
                                {
                                    value: "moderate",
                                    label: t("maintenance-schedule.s7"),
                                    desc: t("maintenance-schedule.s8"),
                                    tasks: t("maintenance-schedule.s9")
                                },
                                {
                                    value: "intensive",
                                    label: t("maintenance-schedule.s10"),
                                    desc: t("maintenance-schedule.s11"),
                                    tasks: t("maintenance-schedule.s12")
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
                                        <div className="text-xs text-primary">{t("maintenance-schedule.s13")} {option.tasks}</div>
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
                        {t("maintenance-schedule.s14")}
                    </h3>

                    {/* Daily */}
                    <div className="border-r-4 border-blue-500 bg-blue-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-blue-500">{t("maintenance-schedule.s15")}</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>{t("maintenance-schedule.s16")}</li>
                            <li>{t("maintenance-schedule.s17")}</li>
                            <li>{t("maintenance-schedule.s18")}</li>
                            <li>{t("maintenance-schedule.s19")}</li>
                        </ul>
                    </div>

                    {/* Weekly */}
                    <div className="border-r-4 border-green-500 bg-green-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-green-500">{t("maintenance-schedule.s20")}</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>{t("maintenance-schedule.s21")}</li>
                            <li>{t("maintenance-schedule.s22")}</li>
                            <li>{t("maintenance-schedule.s23")}</li>
                            <li>{t("maintenance-schedule.s24")}</li>
                            <li>{t("maintenance-schedule.s25")}</li>
                        </ul>
                    </div>

                    {/* Monthly */}
                    <div className="border-r-4 border-amber-500 bg-amber-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-amber-500">{t("maintenance-schedule.s26")}</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>{t("maintenance-schedule.s27")}</li>
                            <li>{t("maintenance-schedule.s28")}</li>
                            <li>{t("maintenance-schedule.s29")}</li>
                            <li>{t("maintenance-schedule.s30")}</li>
                        </ul>
                    </div>

                    {/* Quarterly */}
                    <div className="border-r-4 border-purple-500 bg-purple-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                            <Badge className="bg-purple-500">{t("maintenance-schedule.s31")}</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>{t("maintenance-schedule.s32")}</li>
                            <li>{t("maintenance-schedule.s33")}</li>
                            <li>{t("maintenance-schedule.s34")}</li>
                            <li>{t("maintenance-schedule.s35")}</li>
                        </ul>
                    </div>
                </div>

                {/* Essential Tools */}
                <div className="bg-muted/30 rounded-xl p-6">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {t("maintenance-schedule.s36")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {[
                            t("maintenance-schedule.s37"),
                            t("maintenance-schedule.s38"),
                            t("maintenance-schedule.s39"),
                            t("maintenance-schedule.s40"),
                            t("maintenance-schedule.s41"),
                            t("maintenance-schedule.s42"),
                            t("maintenance-schedule.s43"),
                            t("maintenance-schedule.s44")
                        ].map((tool) => (
                            <div key={tool} className="flex items-center gap-2">
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
                        <div className="font-bold text-foreground mb-1 text-right">{t("maintenance-schedule.s45")}</div>
                        <p className="text-sm text-muted-foreground text-right">
                            {t("maintenance-schedule.s46")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
