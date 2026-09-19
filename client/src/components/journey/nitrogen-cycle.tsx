import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TestTube, Clock, Info, ArrowRight, AlertCircle, Calendar } from "lucide-react";
import { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";

interface NitrogenCycleProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function NitrogenCycle({ wizardData, updateData }: NitrogenCycleProps) {
  const { t } = useTranslation("tools");
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <TestTube className="h-7 w-7 text-primary" />
                        {t("nitrogen-cycle.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {t("nitrogen-cycle.s2")}
                    </p>
                </div>

                {/* Cycling Method */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">{t("nitrogen-cycle.s3")}</Label>
                    <RadioGroup value={wizardData.cyclingMethod} onValueChange={(val) => updateData("cyclingMethod", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "fishless",
                                    label: t("nitrogen-cycle.s4"),
                                    desc: t("nitrogen-cycle.s5"),
                                    duration: t("nitrogen-cycle.s6"),
                                    safety: t("nitrogen-cycle.s7"),
                                    safe: true,
                                    recommended: true
                                },
                                {
                                    value: "with-hardy-fish",
                                    label: t("nitrogen-cycle.s8"),
                                    desc: t("nitrogen-cycle.s9"),
                                    duration: t("nitrogen-cycle.s10"),
                                    safety: t("nitrogen-cycle.s11"),
                                    safe: false
                                },
                                {
                                    value: "seeded",
                                    label: t("nitrogen-cycle.s12"),
                                    desc: t("nitrogen-cycle.s13"),
                                    duration: t("nitrogen-cycle.s14"),
                                    safety: t("nitrogen-cycle.s15"),
                                    safe: true
                                },
                                {
                                    value: "bottled-bacteria",
                                    label: t("nitrogen-cycle.s16"),
                                    desc: t("nitrogen-cycle.s17"),
                                    duration: t("nitrogen-cycle.s18"),
                                    safety: t("nitrogen-cycle.s19"),
                                    safe: false
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
                                            <Badge className="absolute -top-2 -right-2 bg-primary">{t("nitrogen-cycle.s20")}</Badge>
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
                                                option.safe ? "text-green-500" : "text-amber-500"
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
                        {t("nitrogen-cycle.s21")}
                        <Info className="h-5 w-5 text-primary" />
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="bg-red-500/20 text-red-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">1</div>
                            <div>
                                <div className="font-bold text-foreground text-right">{t("nitrogen-cycle.s22")}</div>
                                <div className="text-muted-foreground text-right">{t("nitrogen-cycle.s23")}</div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-amber-500/20 text-amber-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">2</div>
                            <div>
                                <div className="font-bold text-foreground text-right">{t("nitrogen-cycle.s24")}</div>
                                <div className="text-muted-foreground text-right">{t("nitrogen-cycle.s25")}</div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-green-500/20 text-green-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">3</div>
                            <div>
                                <div className="font-bold text-foreground text-right">{t("nitrogen-cycle.s26")}</div>
                                <div className="text-muted-foreground text-right">{t("nitrogen-cycle.s27")}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {t("nitrogen-cycle.s28")}
                    </h3>
                    <div className="space-y-3">
                        {[
                            { week: t("nitrogen-cycle.s29"), event: t("nitrogen-cycle.s30"), status: "danger" },
                            { week: t("nitrogen-cycle.s31"), event: t("nitrogen-cycle.s32"), status: "warning" },
                            { week: t("nitrogen-cycle.s33"), event: t("nitrogen-cycle.s34"), status: "info" },
                            { week: t("nitrogen-cycle.s35"), event: t("nitrogen-cycle.s36"), status: "success" }
                        ].map((phase) => (
                            <div key={phase.week} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
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
                        <div className="font-bold text-foreground mb-2 text-lg text-right">{t("nitrogen-cycle.s37")}</div>
                        <p className="text-sm text-muted-foreground mb-3 text-right">
                            <strong>{t("nitrogen-cycle.s38")}</strong>
                        </p>
                        <p className="text-sm text-muted-foreground text-right">
                            {t("nitrogen-cycle.s39")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
