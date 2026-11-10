import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Package } from "lucide-react";
import type { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";
import { JourneyLesson, LessonChoices, LessonSource } from "./journey-lesson";
import { MaintenancePreferenceLesson, MaintenanceWalkthrough, WaterChangeLesson } from "./care-lessons";

interface MaintenanceScheduleProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function MaintenanceSchedule({ wizardData, updateData }: MaintenanceScheduleProps) {
    const { t } = useTranslation("tools");
    type Routine = "daily" | "weekly" | "needed";
    const [routine, setRoutine] = useState<Routine>("daily");
    return <Card className="border-2">
        <CardContent className="space-y-7 p-6 md:p-8">
            <header className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl"><Calendar className="h-7 w-7 text-primary" aria-hidden="true" />{t("maintenance-schedule.s1")}</h2>
                <p className="text-muted-foreground">{t("journey-care.maintenance.intro")}</p>
            </header>
            <div className="space-y-3">
                <Label className="text-lg font-bold">{t("maintenance-schedule.s3")}</Label>
                <RadioGroup value={wizardData.maintenancePreference} onValueChange={(value) => updateData("maintenancePreference", value)}>
                    {(["minimal", "moderate", "intensive"] as const).map((value) => <div key={value}>
                        <RadioGroupItem value={value} id={`maint-${value}`} className="peer sr-only" />
                        <Label htmlFor={`maint-${value}`} className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-colors hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                            <span className="font-semibold">{t(`journey-care.maintenance.${value}.title`)}</span>
                            <span className="text-sm leading-relaxed text-muted-foreground">{t(`journey-care.maintenance.${value}.card`)}</span>
                        </Label>
                    </div>)}
                </RadioGroup>
                <MaintenancePreferenceLesson value={wizardData.maintenancePreference} />
            </div>
            <WaterChangeLesson tankLiters={wizardData.tankLiters} />
            <MaintenanceWalkthrough />
            <JourneyLesson title={t("journey-care.routine.title")} summary={t("journey-care.routine.intro")}
                footer={<LessonSource label={t("journey-care.sources")} sources={[{ label: "Aqueon — Aquarium water basics", href: "https://www.aqueon.com/articles/aquarium-water-basics" }]} />}>
                <LessonChoices label={t("journey-care.routine.choose")} value={routine} onChange={(value) => setRoutine(value as Routine)}
                    options={(["daily", "weekly", "needed"] as const).map((id) => ({ id, label: t(`journey-care.routine.${id}.title`) }))} />
                <p className="aqv-lesson-readout" aria-live="polite">{t(`journey-care.routine.${routine}.body`)}</p>
            </JourneyLesson>
            <details className="rounded-xl border border-border p-4">
                <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold"><Package size={18} aria-hidden="true" />{t("maintenance-schedule.s36")}</summary>
                <p className="mt-3 text-sm leading-loose text-muted-foreground">{t("journey-care.maintenance.tools")}</p>
            </details>
        </CardContent>
    </Card>;
}
