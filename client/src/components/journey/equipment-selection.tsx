import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Filter, Thermometer, Lightbulb } from "lucide-react";
import type { WizardData } from "@/types/journey";
import { TankFit } from "./tank-fit";
import { useTranslation } from "react-i18next";

interface EquipmentSelectionProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function EquipmentSelection({ wizardData, updateData }: EquipmentSelectionProps) {
    const { t } = useTranslation("tools");
    return (
        <Card className="border-2">
            <CardContent className="space-y-8 p-6 text-start md:p-8">
                <div className="space-y-2">
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
                        <Filter className="h-7 w-7 text-primary" aria-hidden="true" />
                        {t("equipment-selection.s1")}
                    </h2>
                    <p className="text-lg text-muted-foreground">{t("equipment-selection.s2")}</p>
                </div>

                <fieldset className="space-y-4">
                    <legend className="mb-4 text-lg font-bold">{t("equipment-selection.s3")}</legend>
                    <RadioGroup value={wizardData.filterType} onValueChange={(value) => updateData("filterType", value)}>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {[
                                { value: "unknown", label: t("equipment-selection.chooseHelp"), desc: t("equipment-selection.chooseHelpBody") },
                                { value: "hob", label: t("equipment-selection.s4"), desc: t("equipment-selection.s5") },
                                { value: "canister", label: t("equipment-selection.s7"), desc: t("equipment-selection.s8") },
                                { value: "sponge", label: t("equipment-selection.s10"), desc: t("equipment-selection.s11") },
                                { value: "internal", label: t("equipment-selection.s13"), desc: t("equipment-selection.s14") },
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={`filter-${option.value}`} className="peer sr-only" />
                                    <Label htmlFor={`filter-${option.value}`} className={cn(
                                        "flex h-full cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 text-start transition-colors",
                                        "hover:border-primary/50 hover:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                                    )}>
                                        <span className="font-bold text-foreground">{option.label}</span>
                                        <span className="text-sm font-normal text-muted-foreground">{option.desc}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                    {wizardData.filterType === "sponge" && (
                        <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">{t("equipment-selection.spongeRequirements")}</p>
                    )}
                </fieldset>

                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                        <Thermometer className="h-5 w-5 text-primary" aria-hidden="true" />
                        {t("equipment-selection.s17")}
                    </h3>
                    <p className="text-sm text-muted-foreground" id="heater-guidance">{t("equipment-selection.heaterGuidance")}</p>
                    <Label htmlFor="journey-heater-wattage">{t("equipment-selection.knownWattage")}</Label>
                    <div className="flex items-center gap-2">
                        <Input id="journey-heater-wattage" type="number" inputMode="numeric" min={0} max={5000}
                            value={wizardData.heaterWattage > 0 ? wizardData.heaterWattage : ""}
                            placeholder={t("equipment-selection.wattagePlaceholder")} aria-describedby="heater-guidance"
                            onChange={(event) => {
                                const value = event.target.value === "" ? 0 : Number(event.target.value);
                                if (Number.isFinite(value) && value >= 0 && value <= 5000) updateData("heaterWattage", value);
                            }} className="max-w-xs" />
                        <span className="text-sm text-muted-foreground">{t("equipment-selection.s19")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("equipment-selection.heaterUnconfirmed")}</p>
                </section>

                <fieldset className="space-y-4">
                    <legend className="mb-4 text-lg font-bold">{t("equipment-selection.s28")}</legend>
                    <RadioGroup value={wizardData.lightingType} onValueChange={(value) => updateData("lightingType", value)}>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {[
                                { value: "basic-led", label: t("equipment-selection.s29"), desc: t("equipment-selection.s30") },
                                { value: "planted-led", label: t("equipment-selection.s31"), desc: t("equipment-selection.s32") },
                                { value: "rgb-smart", label: t("equipment-selection.s33"), desc: t("equipment-selection.s34") },
                                { value: "none", label: t("equipment-selection.s35"), desc: t("equipment-selection.s36") },
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem value={option.value} id={`light-${option.value}`} className="peer sr-only" />
                                    <Label htmlFor={`light-${option.value}`} className={cn(
                                        "flex h-full cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 text-start transition-colors",
                                        "hover:border-primary/50 hover:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                                    )}>
                                        <span className="font-bold text-foreground">{option.label}</span>
                                        <span className="text-sm font-normal text-muted-foreground">{option.desc}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </fieldset>

                <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{t("equipment-selection.s39")}</p>
                </div>

                <div className="border-t border-border pt-6">
                    <TankFit litres={wizardData.tankLiters} wizardData={wizardData} />
                </div>
            </CardContent>
        </Card>
    );
}
