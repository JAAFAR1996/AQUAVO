import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, CheckCircle2, AlertCircle, Calculator } from "lucide-react";
import { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";

interface LocationSetupProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function LocationSetup({ wizardData, updateData }: LocationSetupProps) {
  const { t } = useTranslation("tools");
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <MapPin className="h-7 w-7 text-primary" />
                        {t("location-setup.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {t("location-setup.s2")}
                    </p>
                </div>

                <div className="space-y-4">
                    <Label className="text-lg font-bold">{t("location-setup.s3")}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                value: "away-from-sunlight",
                                label: t("location-setup.s4"),
                                desc: t("location-setup.s5"),
                                good: true
                            },
                            {
                                value: "stable-surface",
                                label: t("location-setup.s6"),
                                desc: t("location-setup.s7"),
                                good: true
                            },
                            {
                                value: "near-power",
                                label: t("location-setup.s8"),
                                desc: t("location-setup.s9"),
                                good: true
                            },
                            {
                                value: "quiet-area",
                                label: t("location-setup.s10"),
                                desc: t("location-setup.s11"),
                                good: true
                            },
                            {
                                value: "easy-access",
                                label: t("location-setup.s12"),
                                desc: t("location-setup.s13"),
                                good: true
                            },
                            {
                                value: "away-from-hvac",
                                label: t("location-setup.s14"),
                                desc: t("location-setup.s15"),
                                good: true
                            }
                        ].map((option) => (
                            <div key={option.value} className="flex items-start space-x-3 space-x-reverse">
                                <Checkbox
                                    id={option.value}
                                    checked={wizardData.location.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            updateData("location", [...wizardData.location, option.value]);
                                        } else {
                                            updateData("location", wizardData.location.filter(l => l !== option.value));
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor={option.value}
                                    className="flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
                                >
                                    <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                                        {option.good && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                        {option.label}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">{t("location-setup.s16")}</div>
                        <p className="text-sm text-muted-foreground text-right">
                            {t("location-setup.s17")}
                        </p>
                    </div>
                </div>

                {/* Calculation helper */}
                <div className="bg-muted/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calculator className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-foreground">{t("location-setup.s18")}</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("location-setup.s19")}</span>
                            <span className="font-bold">{t("location-setup.s20")}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("location-setup.s21")}</span>
                            <span className="font-bold">{t("location-setup.s22")}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("location-setup.s23")}</span>
                            <span className="font-bold">{t("location-setup.s24")}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
