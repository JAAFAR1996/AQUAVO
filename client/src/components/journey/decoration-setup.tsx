import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Mountain, Leaf } from "lucide-react";
import { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";

interface DecorationSetupProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function DecorationSetup({ wizardData, updateData }: DecorationSetupProps) {
  const { t } = useTranslation("tools");
    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Mountain className="h-7 w-7 text-primary" />
                        {t("decoration-setup.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        {t("decoration-setup.s2")}
                    </p>
                </div>

                {/* Substrate */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">{t("decoration-setup.s3")}</Label>
                    <RadioGroup value={wizardData.substrateType} onValueChange={(val) => updateData("substrateType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                {
                                    value: "gravel",
                                    label: t("decoration-setup.s4"),
                                    desc: t("decoration-setup.s5")
                                },
                                {
                                    value: "sand",
                                    label: t("decoration-setup.s6"),
                                    desc: t("decoration-setup.s7")
                                },
                                {
                                    value: "planted-substrate",
                                    label: t("decoration-setup.s8"),
                                    desc: t("decoration-setup.s9"),
                                    recommended: wizardData.tankType === "planted"
                                },
                                {
                                    value: "mixed",
                                    label: t("decoration-setup.s10"),
                                    desc: t("decoration-setup.s11")
                                }
                            ].map((option) => (
                                <div key={option.value} className="relative">
                                    <RadioGroupItem value={option.value} id={`substrate-${option.value}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`substrate-${option.value}`}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        )}
                                    >
                                        {option.recommended && (
                                            <Badge className="absolute -top-2 -right-2 bg-primary">{t("decoration-setup.s12")}</Badge>
                                        )}
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Mountain className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-foreground mb-1">{option.label}</div>
                                            <div className="text-sm text-muted-foreground">{option.desc}</div>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Decorations */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold">{t("decoration-setup.s13")}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { value: "live-plants", label: t("decoration-setup.s14"), benefit: t("decoration-setup.s15") },
                            { value: "driftwood", label: t("decoration-setup.s16"), benefit: t("decoration-setup.s17") },
                            { value: "rocks", label: t("decoration-setup.s18"), benefit: t("decoration-setup.s19") },
                            { value: "caves", label: t("decoration-setup.s20"), benefit: t("decoration-setup.s21") },
                            { value: "artificial-plants", label: t("decoration-setup.s22"), benefit: t("decoration-setup.s23") },
                            { value: "background", label: t("decoration-setup.s24"), benefit: t("decoration-setup.s25") }
                        ].map((option) => (
                            <div key={option.value} className="flex items-start space-x-3 space-x-reverse">
                                <Checkbox
                                    id={`decor-${option.value}`}
                                    checked={wizardData.decorations.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            updateData("decorations", [...wizardData.decorations, option.value]);
                                        } else {
                                            updateData("decorations", wizardData.decorations.filter(d => d !== option.value));
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor={`decor-${option.value}`}
                                    className="flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                            <Leaf className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-foreground">{option.label}</div>
                                            <div className="text-sm text-muted-foreground">{option.benefit}</div>
                                        </div>
                                    </div>
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Design Tips */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Leaf className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">{t("decoration-setup.s26")}</div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside text-right">
                            <li>{t("decoration-setup.s27")}</li>
                            <li>{t("decoration-setup.s28")}</li>
                            <li>{t("decoration-setup.s29")}</li>
                            <li>{t("decoration-setup.s30")}</li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
