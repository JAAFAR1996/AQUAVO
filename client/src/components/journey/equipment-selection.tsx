import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Filter, Thermometer, Lightbulb } from "lucide-react";
import { WizardData } from "@/types/journey";
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
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Filter className="h-7 w-7 text-primary" />
                        {t("equipment-selection.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {t("equipment-selection.s2")}
                    </p>
                </div>

                {/* Filter Selection */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Filter className="h-5 w-5 text-primary" />
                        {t("equipment-selection.s3")}
                    </Label>
                    <RadioGroup value={wizardData.filterType} onValueChange={(val) => updateData("filterType", val)}>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    value: "hob",
                                    label: t("equipment-selection.s4"),
                                    desc: t("equipment-selection.s5"),
                                    best: t("equipment-selection.s6")
                                },
                                {
                                    value: "canister",
                                    label: t("equipment-selection.s7"),
                                    desc: t("equipment-selection.s8"),
                                    best: t("equipment-selection.s9"),
                                    recommended: true
                                },
                                {
                                    value: "sponge",
                                    label: t("equipment-selection.s10"),
                                    desc: t("equipment-selection.s11"),
                                    best: t("equipment-selection.s12")
                                },
                                {
                                    value: "internal",
                                    label: t("equipment-selection.s13"),
                                    desc: t("equipment-selection.s14"),
                                    best: t("equipment-selection.s15")
                                }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={`filter-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`filter-${option.value}`}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all text-right",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">{t("equipment-selection.s16")}</Badge>
                                        )}
                                        <div className="flex-1 text-right">
                                            <div className="font-bold text-foreground mb-1 text-right">{option.label}</div>
                                            <div className="text-sm text-muted-foreground mb-2 text-right">{option.desc}</div>
                                            <Badge variant="outline" className="text-xs">{option.best}</Badge>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Heater Wattage */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Thermometer className="h-5 w-5 text-primary" />
                        {t("equipment-selection.s17")}
                    </Label>
                    <div className="space-y-3">
                        <Slider
                            value={[wizardData.heaterWattage]}
                            onValueChange={([val]) => updateData("heaterWattage", val)}
                            max={300}
                            min={25}
                            step={25}
                            className="w-full"
                        />
                        <div className="flex justify-between items-center flex-row-reverse">
                            <span className="text-sm text-muted-foreground">{t("equipment-selection.s18")}</span>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary">{wizardData.heaterWattage}</div>
                                <div className="text-xs text-muted-foreground">{t("equipment-selection.s19")}</div>
                            </div>
                            <span className="text-sm text-muted-foreground">{t("equipment-selection.s20")}</span>
                        </div>
                    </div>

                    {/* Heater recommendation */}
                    <div className="bg-muted/30 rounded-xl p-4">
                        <div className="font-bold text-sm mb-2 text-right">{t("equipment-selection.s21")}</div>
                        <div className="text-sm text-muted-foreground text-right">
                            {t("equipment-selection.s22")}
                            {wizardData.tankSize === "small" && t("equipment-selection.s23")}
                            {wizardData.tankSize === "medium" && t("equipment-selection.s24")}
                            {wizardData.tankSize === "large" && t("equipment-selection.s25")}
                            {wizardData.tankSize === "xlarge" && t("equipment-selection.s26")}
                        </div>
                        {/*
                          The rule above is a rule of thumb and is now labelled as one. It is kept because it
                          teaches the shopper the shape of the answer — but it must not be the last word, and
                          it can contradict the shelf: it prescribes 80W for an 80 litre tank while AQUAVO's
                          100W heater is rated by its manufacturer for 50–100 litres. The catalogue below is
                          the authority.
                        */}
                        <div className="mt-2 text-xs text-muted-foreground/80 text-right">
                            {t("equipment-selection.s27")}
                        </div>
                    </div>
                </div>

                {/* What AQUAVO actually stocks for the litres this customer entered. */}
                <div className="space-y-4 border-t border-border pt-6">
                    <TankFit litres={Number(wizardData.tankLiters) || 0} />
                </div>

                {/* Lighting */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        {t("equipment-selection.s28")}
                    </Label>
                    <RadioGroup value={wizardData.lightingType} onValueChange={(val) => updateData("lightingType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { value: "basic-led", label: t("equipment-selection.s29"), desc: t("equipment-selection.s30") },
                                { value: "planted-led", label: t("equipment-selection.s31"), desc: t("equipment-selection.s32"), recommended: wizardData.tankType === "planted" },
                                { value: "rgb-smart", label: t("equipment-selection.s33"), desc: t("equipment-selection.s34") },
                                { value: "none", label: t("equipment-selection.s35"), desc: t("equipment-selection.s36") }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={`light-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`light-${option.value}`}
                                        className={cn(
                                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">{t("equipment-selection.s37")}</Badge>
                                        )}
                                        <div className="font-bold text-foreground mb-1">{option.label}</div>
                                        <div className="text-sm text-muted-foreground">{option.desc}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Pro Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">{t("equipment-selection.s38")}</div>
                        <p className="text-sm text-muted-foreground text-right">
                            {t("equipment-selection.s39")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
