import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Droplets } from "lucide-react";
import type { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";
import { WaterSourceLesson, WaterTestExplorer } from "./environment-lessons";

interface WaterParametersProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function WaterParameters({ wizardData, updateData }: WaterParametersProps) {
  const { t, i18n } = useTranslation("tools");
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Droplets className="h-7 w-7 text-primary" />
                        {t("water-parameters.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {t("water-parameters.s2")}
                    </p>
                </div>

                {/* Water Source */}
                <div className="space-y-4">
                    <h3 id="journey-water-source" className="text-lg font-bold">{t("water-parameters.s3")}</h3>
                    <RadioGroup value={wizardData.waterSource} onValueChange={(val) => updateData("waterSource", val)} aria-labelledby="journey-water-source" dir={i18n.dir()}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "tap",
                                    label: t("water-parameters.s4"),
                                    desc: t("water-parameters.s5"),
                                    note: t("water-parameters.s6")
                                },
                                {
                                    value: "ro",
                                    label: t("water-parameters.s7"),
                                    desc: t("water-parameters.s8"),
                                    note: t("water-parameters.s9")
                                },
                                {
                                    value: "well",
                                    label: t("water-parameters.s10"),
                                    desc: t("water-parameters.s11"),
                                    note: t("water-parameters.s12")
                                }
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem value={option.value} id={`water-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`water-${option.value}`}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                                            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
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

                <WaterSourceLesson key={wizardData.waterSource} source={wizardData.waterSource} />
                <WaterTestExplorer />
                <p className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
                    {t("journey-environment.waterFinalNote")}
                </p>
            </CardContent>
        </Card>
    );
}
