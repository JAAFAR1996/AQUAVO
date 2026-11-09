import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { badgeVariants } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Lightbulb, Ruler } from "lucide-react";
import { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";
import { geometricTankLiters } from "@/lib/tank-capacity";

interface TankSelectionProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

// Map presets to approximate liter values
const PRESET_TO_LITERS: Record<string, number> = {
    small: 40,
    medium: 100,
    large: 200,
    xlarge: 400,
};

export function TankSelection({ wizardData, updateData }: TankSelectionProps) {
    const { t, i18n } = useTranslation("tools");
    const [showDimensions, setShowDimensions] = useState(() => Boolean(
        wizardData.tankLengthCm || wizardData.tankWidthCm || wizardData.tankHeightCm,
    ));
    // Dimensions represent geometric capacity, not filled water volume.
    const updateDimension = (key: "tankLengthCm" | "tankWidthCm" | "tankHeightCm", input: string) => {
        const parsed = input.trim() === "" ? undefined : Number(input);
        const dimension = parsed !== undefined && Number.isFinite(parsed) && parsed > 0 && parsed <= 500 ? parsed : undefined;
        updateData(key, dimension);
        const length = key === "tankLengthCm" ? dimension : wizardData.tankLengthCm;
        const width = key === "tankWidthCm" ? dimension : wizardData.tankWidthCm;
        const height = key === "tankHeightCm" ? dimension : wizardData.tankHeightCm;
        if (length && width && height) {
            const volume = geometricTankLiters({ lengthCm: length, widthCm: width, heightCm: height });
            if (volume !== null) {
                updateData("tankLiters", volume);
                updateData("tankSize", volume <= 60 ? "small" : volume <= 150 ? "medium" : volume <= 300 ? "large" : "xlarge");
            }
        }
    };

    const clearDimensions = () => {
        updateData("tankLengthCm", undefined);
        updateData("tankWidthCm", undefined);
        updateData("tankHeightCm", undefined);
    };

    // Manual volume and presets should not leave conflicting dimension values.
    const handlePresetSelect = (val: string) => {
        clearDimensions();
        updateData("tankSize", val);
        updateData("tankLiters", PRESET_TO_LITERS[val] || 0);
    };

    // Handle manual liter input
    const handleLitersChange = (value: string) => {
        clearDimensions();
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
            updateData("tankLiters", 0);
        } else if (num > 2000) {
            updateData("tankLiters", 2000);
        } else {
            updateData("tankLiters", num);
        }

        // Auto-select preset based on liters
        if (num <= 60) updateData("tankSize", "small");
        else if (num <= 150) updateData("tankSize", "medium");
        else if (num <= 300) updateData("tankSize", "large");
        else updateData("tankSize", "xlarge");
    };

    return (
        <Card>
            <CardContent className="space-y-5 p-4 sm:p-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                        {t("tank-selection.s1")}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {t("tank-selection.s2")}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="journey-tank-liters" className="block text-sm font-bold">
                        {t("tank-selection.s3")}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="journey-tank-liters"
                            type="number"
                            inputMode="numeric"
                            min={10}
                            max={2000}
                            value={wizardData.tankLiters || ""}
                            onChange={(e) => handleLitersChange(e.target.value)}
                            placeholder={t("tank-selection.s4")}
                            className="max-w-40 text-center text-base font-semibold"
                        />
                        <span aria-hidden="true" className="whitespace-nowrap text-sm text-muted-foreground">
                            {t("tank-selection.s5")}
                        </span>
                    </div>
                    {wizardData.tankLiters >= 10 && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            {wizardData.tankLiters <= 30 && t("tank-selection.s6")}
                            {wizardData.tankLiters > 30 && wizardData.tankLiters <= 80 && t("tank-selection.s7")}
                            {wizardData.tankLiters > 80 && wizardData.tankLiters <= 200 && t("tank-selection.s8")}
                            {wizardData.tankLiters > 200 && t("tank-selection.s9")}
                        </p>
                    )}
                </div>

                <details
                    className="group rounded-lg border border-border"
                    open={showDimensions}
                    onToggle={(event) => setShowDimensions(event.currentTarget.open)}
                >
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2">
                            <Ruler aria-hidden="true" className="size-4 shrink-0 text-primary" />
                            {t("tank-dimensions.title")}
                        </span>
                        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" />
                    </summary>
                    <fieldset className="min-w-0 space-y-3 border-t border-border p-3">
                        <legend className="sr-only">{t("tank-dimensions.title")}</legend>
                        <p className="text-sm leading-relaxed text-muted-foreground">{t("tank-dimensions.intro")}</p>
                        <div className="grid max-w-md grid-cols-1 gap-2 min-[380px]:grid-cols-3">
                            {([
                                { key: "tankLengthCm" as const, label: t("tank-dimensions.length") },
                                { key: "tankWidthCm" as const, label: t("tank-dimensions.width") },
                                { key: "tankHeightCm" as const, label: t("tank-dimensions.height") },
                            ]).map(({ key, label }) => (
                                <div key={key} className="min-w-0 space-y-1.5">
                                    <Label htmlFor={key} className="block text-sm font-medium">{label}</Label>
                                    <Input
                                        id={key}
                                        type="number"
                                        inputMode="decimal"
                                        min="1"
                                        max="500"
                                        step="0.5"
                                        dir="ltr"
                                        value={wizardData[key] ?? ""}
                                        onChange={(event) => updateDimension(key, event.target.value)}
                                        className="min-w-0 text-center"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{t("tank-dimensions.disclaimer")}</p>
                    </fieldset>
                </details>

                <div className="space-y-2">
                    <p id="journey-tank-presets" className="text-sm font-semibold">{t("tank-selection.s10")}</p>
                    <RadioGroup value={wizardData.tankSize} onValueChange={handlePresetSelect} aria-labelledby="journey-tank-presets" dir={i18n.dir()}>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {[
                                { value: "small", label: t("tank-selection.s11"), desc: t("tank-selection.s12") },
                                { value: "medium", label: t("tank-selection.s13"), desc: t("tank-selection.s14"), recommended: true },
                                { value: "large", label: t("tank-selection.s15"), desc: t("tank-selection.s16") },
                                { value: "xlarge", label: t("tank-selection.s17"), desc: t("tank-selection.s18") }
                            ].map((option) => (
                                <div key={option.value} className="relative min-w-0">
                                    <RadioGroupItem
                                        value={option.value}
                                        id={option.value}
                                        className="peer absolute start-3 top-3.5 cursor-pointer"
                                        style={{ minWidth: 16, minHeight: 16 }}
                                    />
                                    <Label
                                        htmlFor={option.value}
                                        className={cn(
                                            "flex h-full min-h-11 cursor-pointer flex-col rounded-lg border py-2.5 pe-3 ps-9 transition-colors",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                                            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                                        )}
                                    >
                                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="font-bold leading-normal text-foreground">{option.label}</span>
                                            {option.recommended && (
                                                <span className={badgeVariants({ variant: "secondary" })}>{t("tank-selection.s19")}</span>
                                            )}
                                        </span>
                                        <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{option.desc}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2">
                    <p id="journey-tank-type" className="text-sm font-bold">{t("tank-selection.s20")}</p>
                    <RadioGroup
                        value={wizardData.tankType}
                        onValueChange={(val) => updateData("tankType", val)}
                        aria-labelledby="journey-tank-type"
                        dir={i18n.dir()}
                    >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                { value: "freshwater-community", label: t("tank-selection.s21"), desc: t("tank-selection.s22") },
                                { value: "planted", label: t("tank-selection.s23"), desc: t("tank-selection.s24") },
                                { value: "species-specific", label: t("tank-selection.s25"), desc: t("tank-selection.s26") }
                            ].map((option) => (
                                <div key={option.value} className="relative min-w-0">
                                    <RadioGroupItem
                                        value={option.value}
                                        id={option.value}
                                        className="peer absolute start-3 top-3.5 cursor-pointer"
                                        style={{ minWidth: 16, minHeight: 16 }}
                                    />
                                    <Label
                                        htmlFor={option.value}
                                        className={cn(
                                            "flex h-full min-h-11 cursor-pointer flex-col rounded-lg border py-2.5 pe-3 ps-9 transition-colors",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                                            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                                        )}
                                    >
                                        <span className="font-bold leading-normal text-foreground">{option.label}</span>
                                        <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{option.desc}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2 border-t border-border pt-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-semibold">{t("tank-selection.s27")}</span>
                        <span className="text-xs leading-relaxed text-muted-foreground">{t("tank-selection.s28")}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            <span className="me-1.5 font-semibold text-foreground">{t("tank-selection.s29")}</span>
                            {t("tank-selection.s30")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
