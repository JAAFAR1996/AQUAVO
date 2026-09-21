import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Waves, Info } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function SaltCalculator() {
  const { t } = useTranslation("tools");
    const { toast } = useToast();
    const [volume, setVolume] = useState("");
    const [currentSalinity, setCurrentSalinity] = useState("");
    const [targetSalinity, setTargetSalinity] = useState("");
    const [tankType, setTankType] = useState("reef");
    const [result, setResult] = useState<{ saltAmount: number; instructions: string } | null>(null);

    const calculate = () => {
        const v = parseFloat(volume);
        const current = parseFloat(currentSalinity);
        const target = parseFloat(targetSalinity);

        if (!v || isNaN(v) || isNaN(current) || isNaN(target)) {
            toast({ title: t("salt-calculator.s1"), description: t("salt-calculator.s2"), variant: "destructive" });
            return;
        }

        if (v > 0 && !isNaN(current) && !isNaN(target)) {
            // Salinity calculation: approximately 35g of salt per liter increases salinity by 1 ppt
            const difference = target - current;
            const saltNeeded = v * difference * 35; // grams

            let instructions = "";
            if (saltNeeded > 0) {
                instructions = t("salt-calculator.s3", { v0: Math.round(saltNeeded) });
            } else if (saltNeeded < 0) {
                instructions = t("salt-calculator.s4", { v0: Math.abs(Math.round((difference / target) * 100)) });
            } else {
                instructions = t("salt-calculator.s5");
            }

            setResult({
                saltAmount: Math.abs(Math.round(saltNeeded)),
                instructions,
            });
        }
    };

    const getSalinityRange = (type: string) => {
        switch (type) {
            case "reef":
                return "1.023-1.025 (35-35 ppt)";
            case "fowlr":
                return "1.020-1.025 (30-35 ppt)";
            case "brackish":
                return "1.005-1.015 (5-20 ppt)";
            default:
                return "";
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-right">
                    {t("salt-calculator.s6")}
                    <Waves className="h-6 w-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">{t("salt-calculator.s7")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="space-y-2">
                    <Label className="block text-right">{t("salt-calculator.s8")}</Label>
                    <Select value={tankType} onValueChange={setTankType}>
                        <SelectTrigger className="text-right" dir="rtl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                            <SelectItem value="reef" className="text-right">
                                {t("salt-calculator.s9")} {getSalinityRange("reef")}
                            </SelectItem>
                            <SelectItem value="fowlr" className="text-right">
                                {t("salt-calculator.s10")} {getSalinityRange("fowlr")}
                            </SelectItem>
                            <SelectItem value="brackish" className="text-right">
                                {t("salt-calculator.s11")} {getSalinityRange("brackish")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="block text-right">{t("salt-calculator.s12")}</Label>
                        <Input
                            type="number"
                            placeholder="200"
                            value={volume}
                            onChange={(e) => setVolume(e.target.value)}
                            className="text-right"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">{t("salt-calculator.s13")}</Label>
                        <Input
                            type="number"
                            placeholder="30"
                            step="0.5"
                            value={currentSalinity}
                            onChange={(e) => setCurrentSalinity(e.target.value)}
                            className="text-right"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">{t("salt-calculator.s14")}</Label>
                        <Input
                            type="number"
                            placeholder="35"
                            step="0.5"
                            value={targetSalinity}
                            onChange={(e) => setTargetSalinity(e.target.value)}
                            className="text-right"
                        />
                    </div>
                </div>

                <Alert className="bg-accent/10 border-accent/20">
                    <Info className="h-4 w-4 text-accent" />
                    <AlertDescription className="text-sm text-foreground text-right">
                        <strong>{t("salt-calculator.s15")}</strong> {t("salt-calculator.s16")}
                        <div className="mt-1">
                            {t("salt-calculator.s17")} <span dir="ltr" className="inline-block font-mono font-bold mx-1">1.025 sg = 35 ppt</span> {t("salt-calculator.s18")}
                        </div>
                    </AlertDescription>
                </Alert>

                <Button onClick={calculate} className="w-full text-lg h-12">
                    {t("salt-calculator.s19")}
                </Button>

                {result && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                            <p className="text-muted-foreground mb-2 text-center">{t("salt-calculator.s20")}</p>
                            <p className="text-4xl font-bold text-primary text-center">
                                {result.saltAmount} {t("salt-calculator.s21")}
                            </p>
                            <p className="text-sm text-muted-foreground text-center mt-2">
                                ({(result.saltAmount / 1000).toFixed(2)} {t("salt-calculator.s22")}
                            </p>
                        </div>

                        <Alert className="bg-primary/10 border-primary/20">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-foreground font-semibold">{t("salt-calculator.s23")}</AlertTitle>
                            <AlertDescription className="text-sm text-muted-foreground mt-2">
                                {result.instructions}
                            </AlertDescription>
                        </Alert>

                        <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm text-right">
                            <h4 className="font-semibold text-right">{t("salt-calculator.s24")}</h4>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-right">
                                <li>{t("salt-calculator.s25")}</li>
                                <li>{t("salt-calculator.s26")}</li>
                                <li>{t("salt-calculator.s27")}</li>
                                <li>{t("salt-calculator.s28")}</li>
                            </ul>
                        </div>
                        <Link href="/products?search=salt">
                            <Button className="w-full" variant="secondary">
                                {t("salt-calculator.s29")}
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}
