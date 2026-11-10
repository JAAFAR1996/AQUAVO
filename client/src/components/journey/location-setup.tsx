import { useId, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import type { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LocationLesson, type LocationChoice } from "./planning-lessons";

interface LocationSetupProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

const LOCATION_OPTIONS = [
    { value: "away-from-sunlight", label: "s4", desc: "s5" },
    { value: "stable-surface", label: "s6", desc: "s7" },
    { value: "near-power", label: "s8", desc: "s9" },
    { value: "quiet-area", label: "s10", desc: "s11" },
    { value: "easy-access", label: "s12", desc: "s13" },
    { value: "away-from-hvac", label: "s14", desc: "s15" },
] as const;

export function LocationSetup({ wizardData, updateData }: LocationSetupProps) {
    const { t } = useTranslation("tools");
    const id = useId();
    const [activeCheck, setActiveCheck] = useState<LocationChoice>(() =>
        LOCATION_OPTIONS.find((option) => wizardData.location.includes(option.value))?.value ?? "away-from-sunlight",
    );
    const checkedCount = LOCATION_OPTIONS.filter((option) => wizardData.location.includes(option.value)).length;
    return (
        <Card className="border-2">
            <CardContent className="space-y-6 p-4 text-start sm:p-6 md:p-8">
                <div className="space-y-2">
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
                        <MapPin className="h-7 w-7 text-primary" aria-hidden="true" />
                        {t("location-setup.s1")}
                    </h2>
                    <p className="text-muted-foreground">{t("location-setup.s2")}</p>
                </div>
                <fieldset className="space-y-4">
                    <legend className="mb-4 text-lg font-bold">{t("location-setup.s3")}</legend>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {LOCATION_OPTIONS.map((option) => {
                            const checked = wizardData.location.includes(option.value);
                            return <div key={option.value} className={cn("min-w-0 rounded-xl border-2 p-3", checked && "border-primary bg-primary/5")}>
                                <div className="flex items-start gap-3">
                                    <Checkbox id={`${id}-${option.value}`} checked={checked} className="mt-1"
                                        onCheckedChange={(value) => {
                                            setActiveCheck(option.value);
                                            updateData("location", value === true
                                                ? [...new Set([...wizardData.location, option.value])]
                                                : wizardData.location.filter((location) => location !== option.value));
                                        }} />
                                    <Label htmlFor={`${id}-${option.value}`} className="min-h-11 flex-1 cursor-pointer leading-relaxed">
                                        <span className="mb-1 flex items-center gap-2 font-bold text-foreground">
                                            {checked && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                                            {t(`location-setup.${option.label}`)}
                                        </span>
                                        <span className="text-sm font-normal text-muted-foreground">{t(`location-setup.${option.desc}`)}</span>
                                    </Label>
                                </div>
                                <button type="button" className="aqv-plan-inspect" aria-controls={`${id}-lesson`}
                                    aria-pressed={activeCheck === option.value} onClick={() => setActiveCheck(option.value)}>
                                    {t("journey-planning.location.inspect", { option: t(`location-setup.${option.label}`) })}
                                </button>
                            </div>;
                        })}
                    </div>
                </fieldset>
                <div id={`${id}-lesson`}>
                    <LocationLesson choice={activeCheck} tankLitres={wizardData.tankLiters} checkedCount={checkedCount} />
                </div>
                <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                    <div>
                        <h3 className="mb-1 font-bold text-foreground">{t("location-setup.s16")}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{t("location-setup.s17")}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
