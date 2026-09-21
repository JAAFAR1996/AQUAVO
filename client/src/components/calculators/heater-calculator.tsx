import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export function HeaterCalculator() {
  const { t: tr } = useTranslation("tools");
    const [volume, setVolume] = useState("");
    const [tempDiff, setTempDiff] = useState("");
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        const v = parseFloat(volume);
        const t = parseFloat(tempDiff);
        if (v && t) {
            // Basic rule of thumb: 1 watt per liter for up to 5C diff, more for higher
            // This is a simplified calculation
            setResult(v * (t / 5));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-right">{tr("heater-calculator.s1")}</CardTitle>
                <CardDescription className="text-right">{tr("heater-calculator.s2")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">{tr("heater-calculator.s3")}</Label>
                        <Input type="number" placeholder={tr("heater-calculator.s4")} value={volume} onChange={(e) => setVolume(e.target.value)} className="text-right" />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">{tr("heater-calculator.s5")}</Label>
                        <Select onValueChange={setTempDiff}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue placeholder={tr("heater-calculator.s6")} />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="5" className="text-right">{tr("heater-calculator.s7")}</SelectItem>
                                <SelectItem value="10" className="text-right">{tr("heater-calculator.s8")}</SelectItem>
                                <SelectItem value="15" className="text-right">{tr("heater-calculator.s9")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={calculate} className="w-full text-lg h-12">{tr("heater-calculator.s10")}</Button>

                {result && (
                    <div className="mt-6 p-6 bg-primary/5 rounded-xl text-center animate-in fade-in slide-in-from-top-2 border border-primary/10">
                        <p className="text-muted-foreground mb-2">{tr("heater-calculator.s11")}</p>
                        <p className="text-4xl font-bold text-primary">{Math.ceil(result / 50) * 50} {tr("heater-calculator.s12")}</p>
                        <p className="text-sm text-muted-foreground mt-2">{tr("heater-calculator.s13")} {Math.ceil(result / 100) * 50} {tr("heater-calculator.s14")}</p>
                        <Link href="/products?search=heater">
                            <Button className="mt-4 w-full" variant="secondary">
                                {tr("heater-calculator.s15")}
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
