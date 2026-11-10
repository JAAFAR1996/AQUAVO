import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TestTube } from "lucide-react";
import type { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";
import { CycleMethodLesson, NitrogenExplorer, WaterReadinessChecklist } from "./environment-lessons";

interface NitrogenCycleProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function NitrogenCycle({ wizardData, updateData }: NitrogenCycleProps) {
    const { t, i18n } = useTranslation("tools");
    const methods = [
        { value: "fishless", label: t("nitrogen-cycle.s4"), desc: t("nitrogen-cycle.s5"), recommended: true },
        { value: "with-hardy-fish", label: t("journey-environment.fishAlreadyPresent"), desc: t("nitrogen-cycle.s9") },
        { value: "seeded", label: t("nitrogen-cycle.s12"), desc: t("nitrogen-cycle.s13") },
        { value: "bottled-bacteria", label: t("nitrogen-cycle.s16"), desc: t("nitrogen-cycle.s17") },
    ];

    return <Card className="border-2">
        <CardContent className="p-6 md:p-8 space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                    <TestTube className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
                    {t("nitrogen-cycle.s1")}
                </h2>
                <p className="text-muted-foreground text-lg">{t("nitrogen-cycle.s2")}</p>
            </div>

            <div className="space-y-4">
                <h3 id="journey-cycle-method" className="text-lg font-bold">{t("nitrogen-cycle.s3")}</h3>
                <RadioGroup value={wizardData.cyclingMethod} onValueChange={(value) => updateData("cyclingMethod", value)}
                    aria-labelledby="journey-cycle-method" dir={i18n.dir()}>
                    <div className="grid grid-cols-1 gap-3">
                        {methods.map((option) => <div key={option.value} className="relative">
                            <RadioGroupItem value={option.value} id={`cycle-${option.value}`} className="peer sr-only" />
                            <Label htmlFor={`cycle-${option.value}`} className={cn(
                                "flex min-h-11 flex-col gap-2 rounded-xl border-2 p-4 cursor-pointer transition-colors",
                                "hover:border-primary/50 hover:bg-primary/5",
                                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                            )}>
                                <span className="flex flex-wrap items-center gap-2 font-bold text-foreground">
                                    {option.label}
                                    {option.recommended && <Badge variant="secondary">{t("journey-environment.newTankPreference")}</Badge>}
                                </span>
                                <span className="text-sm font-normal leading-relaxed text-muted-foreground">{option.desc}</span>
                            </Label>
                        </div>)}
                    </div>
                </RadioGroup>
                <CycleMethodLesson key={wizardData.cyclingMethod} method={wizardData.cyclingMethod} />
            </div>

            <NitrogenExplorer />
            <WaterReadinessChecklist />
        </CardContent>
    </Card>;
}
