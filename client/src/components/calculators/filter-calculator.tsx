import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplets, Info } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export function FilterCalculator() {
  const { t } = useTranslation("tools");
    const [volume, setVolume] = useState("");
    const [fishType, setFishType] = useState("medium");
    const [result, setResult] = useState<{ min: number; max: number; recommended: number } | null>(null);

    const calculate = () => {
        const v = parseFloat(volume);
        if (v) {
            // Rule of thumb: filter should turn over 4-10x tank volume per hour
            // Depends on fish type and bioload
            let multiplier = 4;
            if (fishType === "light") multiplier = 4;
            else if (fishType === "medium") multiplier = 6;
            else if (fishType === "heavy") multiplier = 8;

            setResult({
                min: v * 4,
                max: v * 10,
                recommended: v * multiplier,
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-right">
                    {t("filter-calculator.s1")}
                    <Droplets className="h-6 w-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">{t("filter-calculator.s2")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">{t("filter-calculator.s3")}</Label>
                        <Input
                            type="number"
                            placeholder={t("filter-calculator.s4")}
                            value={volume}
                            onChange={(e) => setVolume(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">{t("filter-calculator.s5")}</Label>
                        <Select value={fishType} onValueChange={setFishType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="light" className="text-right">{t("filter-calculator.s6")}</SelectItem>
                                <SelectItem value="medium" className="text-right">{t("filter-calculator.s7")}</SelectItem>
                                <SelectItem value="heavy" className="text-right">{t("filter-calculator.s8")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Alert className="bg-primary/10 border-primary/20">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm text-foreground text-right">
                        <strong>{t("filter-calculator.s9")}</strong> {t("filter-calculator.s10")}
                    </AlertDescription>
                </Alert>

                <Button onClick={calculate} className="w-full text-lg h-12">
                    {t("filter-calculator.s11")}
                </Button>

                {result && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-6 bg-primary/5 rounded-xl text-center border border-primary/20">
                            <p className="text-muted-foreground mb-2">{t("filter-calculator.s12")}</p>
                            <p className="text-4xl font-bold text-primary">{result.recommended} {t("filter-calculator.s13")}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground mb-1">{t("filter-calculator.s14")}</p>
                                <p className="text-2xl font-semibold">{result.min} {t("filter-calculator.s13")}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground mb-1">{t("filter-calculator.s15")}</p>
                                <p className="text-2xl font-semibold">{result.max} {t("filter-calculator.s13")}</p>
                            </div>
                        </div>
                        <Alert className="bg-primary/5 border-primary/10">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-sm text-muted-foreground text-right">
                                {t("filter-calculator.s16")} {result.recommended} {t("filter-calculator.s17")}
                            </AlertDescription>
                        </Alert>
                        <Link href="/products?search=filter">
                            <Button className="w-full" variant="secondary">
                                {t("filter-calculator.s18")}
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
