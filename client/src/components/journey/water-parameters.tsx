import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Droplets, Thermometer, TestTube, Package, AlertCircle } from "lucide-react";
import { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";

interface WaterParametersProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function WaterParameters({ wizardData, updateData }: WaterParametersProps) {
  const { t } = useTranslation("tools");
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
                    <Label className="text-lg font-bold">{t("water-parameters.s3")}</Label>
                    <RadioGroup value={wizardData.waterSource} onValueChange={(val) => updateData("waterSource", val)}>
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
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
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

                {/* Water Parameters Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                            <TestTube className="h-4 w-4 text-primary" />
                            {t("water-parameters.s13")}
                        </div>
                        <div className="text-2xl font-bold text-primary">6.5-7.5</div>
                        <div className="text-xs text-muted-foreground">{t("water-parameters.s14")}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                            <Thermometer className="h-4 w-4 text-primary" />
                            {t("water-parameters.s15")}
                        </div>
                        <div className="text-2xl font-bold text-primary">24-26°C</div>
                        <div className="text-xs text-muted-foreground">{t("water-parameters.s16")}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-primary" />
                            {t("water-parameters.s17")}
                        </div>
                        <div className="text-2xl font-bold text-primary">25%</div>
                        <div className="text-xs text-muted-foreground">{t("water-parameters.s18")}</div>
                    </div>
                </div>

                {/* Essential Products */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="h-5 w-5 text-amber-500" />
                        <div className="font-bold text-foreground">{t("water-parameters.s19")}</div>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li><strong>{t("water-parameters.s20")}</strong> {t("water-parameters.s21")}</li>
                        <li><strong>{t("water-parameters.s22")}</strong> {t("water-parameters.s23")}</li>
                        <li><strong>{t("water-parameters.s24")}</strong> {t("water-parameters.s25")}</li>
                        <li><strong>{t("water-parameters.s26")}</strong> {t("water-parameters.s27")}</li>
                    </ul>
                </div>

                {/* Warning */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">{t("water-parameters.s28")}</div>
                        <p className="text-sm text-muted-foreground text-right">
                            <strong>{t("water-parameters.s29")}</strong> {t("water-parameters.s30")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
