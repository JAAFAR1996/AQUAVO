import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Package, Ruler, Lightbulb, Info } from "lucide-react";
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
  const { t } = useTranslation("tools");
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
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Package className="h-7 w-7 text-primary" />
                        {t("tank-selection.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {t("tank-selection.s2")}
                    </p>
                </div>

                {/* Manual Liter Input */}
                <div className="space-y-3">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Ruler className="h-5 w-5 text-primary" />
                        {t("tank-selection.s3")}
                    </Label>
                    <div className="flex items-center gap-3 max-w-xs">
                        <Input
                            type="number"
                            min={10}
                            max={2000}
                            value={wizardData.tankLiters || ""}
                            onChange={(e) => handleLitersChange(e.target.value)}
                            placeholder={t("tank-selection.s4")}
                            className="text-center text-xl font-bold h-12 text-primary"
                        />
                        <span className="text-lg font-medium text-muted-foreground whitespace-nowrap">{t("tank-selection.s5")}</span>
                    </div>
                    {wizardData.tankLiters >= 10 && (
                        <p className="text-sm text-primary font-semibold">
                            {wizardData.tankLiters <= 30 && t("tank-selection.s6")}
                            {wizardData.tankLiters > 30 && wizardData.tankLiters <= 80 && t("tank-selection.s7")}
                            {wizardData.tankLiters > 80 && wizardData.tankLiters <= 200 && t("tank-selection.s8")}
                            {wizardData.tankLiters > 200 && t("tank-selection.s9")}
                        </p>
                    )}
                </div>

                <fieldset className="space-y-3 rounded-2xl border border-border bg-card p-4">
                    <legend className="px-1 text-base font-bold">{t("tank-dimensions.title")}</legend>
                    <p className="text-sm leading-6 text-muted-foreground">{t("tank-dimensions.intro")}</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {([
                            { key: "tankLengthCm" as const, label: "length" },
                            { key: "tankWidthCm" as const, label: "width" },
                            { key: "tankHeightCm" as const, label: "height" },
                        ]).map(({ key, label }) => (
                            <div key={key} className="min-w-0 space-y-1.5">
                                <Label htmlFor={key} className="block text-xs font-medium sm:text-sm">{t(`tank-dimensions.${label}`)}</Label>
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
                                    className="h-12 min-w-0 text-center"
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{t("tank-dimensions.disclaimer")}</p>
                </fieldset>

                {/* Quick-Select Presets */}
                <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">{t("tank-selection.s10")}</Label>
                    <RadioGroup value={wizardData.tankSize} onValueChange={handlePresetSelect}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { value: "small", label: t("tank-selection.s11"), desc: t("tank-selection.s12") },
                                { value: "medium", label: t("tank-selection.s13"), desc: t("tank-selection.s14"), recommended: true },
                                { value: "large", label: t("tank-selection.s15"), desc: t("tank-selection.s16") },
                                { value: "xlarge", label: t("tank-selection.s17"), desc: t("tank-selection.s18") }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                                    <Label
                                        htmlFor={option.value}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-lg"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">{t("tank-selection.s19")}</Badge>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Package className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-foreground">{option.label}</div>
                                                <div className="text-sm text-muted-foreground">{option.desc}</div>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Tank Type */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">{t("tank-selection.s20")}</Label>
                    <RadioGroup value={wizardData.tankType} onValueChange={(val) => updateData("tankType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { value: "freshwater-community", label: t("tank-selection.s21"), desc: t("tank-selection.s22") },
                                { value: "planted", label: t("tank-selection.s23"), desc: t("tank-selection.s24") },
                                { value: "species-specific", label: t("tank-selection.s25"), desc: t("tank-selection.s26") }
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                                    <Label
                                        htmlFor={option.value}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        <div className="font-bold text-foreground mb-1">{option.label}</div>
                                        <div className="text-sm text-muted-foreground">{option.desc}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Formula Tip */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">{t("tank-selection.s27")}</div>
                        <p className="text-sm text-muted-foreground text-right">
                            {t("tank-selection.s28")}
                        </p>
                    </div>
                </div>

                {/* Pro Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">{t("tank-selection.s29")}</div>
                        <p className="text-sm text-muted-foreground text-right">
                            {t("tank-selection.s30")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
