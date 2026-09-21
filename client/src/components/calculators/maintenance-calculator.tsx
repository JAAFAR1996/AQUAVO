import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Bell, Clock, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function MaintenanceCalculator() {
  const { t } = useTranslation("tools");
    const { toast } = useToast();
    const [tankSize, setTankSize] = useState("");
    const [fishCount, setFishCount] = useState("");
    const [plantDensity, setPlantDensity] = useState("medium");
    const [filterType, setFilterType] = useState("canister");
    const [email, setEmail] = useState("");
    const [schedule, setSchedule] = useState<{
        weekly: string[];
        biweekly: string[];
        monthly: string[];
    } | null>(null);

    const generateSchedule = () => {
        const size = parseFloat(tankSize);
        const fish = parseInt(fishCount);
        if (!size || !fish) {
            toast({ title: t("maintenance-calculator.s1"), description: t("maintenance-calculator.s2"), variant: "destructive" });
            return;
        }

        // Calculate water change percentage based on bioload
        const bioloadFactor = fish / (size / 10); // Fish per 10 liters
        let waterChangePercent = 20;
        if (bioloadFactor > 1) waterChangePercent = 30;
        if (bioloadFactor > 2) waterChangePercent = 40;

        const weekly: string[] = [
            t("maintenance-calculator.s3", { v0: waterChangePercent, v1: Math.round(size * waterChangePercent / 100) }),
            t("maintenance-calculator.s4"),
            t("maintenance-calculator.s5"),
            t("maintenance-calculator.s6"),
        ];

        if (plantDensity === "heavy") {
            weekly.push(t("maintenance-calculator.s7"));
            weekly.push(t("maintenance-calculator.s8"));
        }

        const biweekly: string[] = [
            t("maintenance-calculator.s9"),
            t("maintenance-calculator.s10"),
            t("maintenance-calculator.s11"),
        ];

        if (filterType === "sponge") {
            biweekly.push(t("maintenance-calculator.s12"));
        }

        const monthly: string[] = [
            t("maintenance-calculator.s13"),
            t("maintenance-calculator.s14"),
            t("maintenance-calculator.s15"),
            t("maintenance-calculator.s16"),
        ];

        if (filterType === "canister") {
            monthly.push(t("maintenance-calculator.s17"));
        }

        if (plantDensity !== "none") {
            monthly.push(t("maintenance-calculator.s18"));
            monthly.push(t("maintenance-calculator.s19"));
        }

        setSchedule({ weekly, biweekly, monthly });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-right">
                    {t("maintenance-calculator.s20")}
                    <Calendar className="h-6 w-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">
                    {t("maintenance-calculator.s21")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">{t("maintenance-calculator.s22")}</Label>
                        <Input
                            type="number"
                            placeholder={t("maintenance-calculator.s23")}
                            value={tankSize}
                            onChange={(e) => setTankSize(e.target.value)}
                            className="text-right"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">{t("maintenance-calculator.s24")}</Label>
                        <Input
                            type="number"
                            placeholder={t("maintenance-calculator.s25")}
                            value={fishCount}
                            onChange={(e) => setFishCount(e.target.value)}
                            className="text-right"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="block text-right">{t("maintenance-calculator.s26")}</Label>
                        <Select value={plantDensity} onValueChange={setPlantDensity}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="none" className="text-right">{t("maintenance-calculator.s27")}</SelectItem>
                                <SelectItem value="light" className="text-right">{t("maintenance-calculator.s28")}</SelectItem>
                                <SelectItem value="medium" className="text-right">{t("maintenance-calculator.s29")}</SelectItem>
                                <SelectItem value="heavy" className="text-right">{t("maintenance-calculator.s30")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="block text-right">{t("maintenance-calculator.s31")}</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="sponge" className="text-right">{t("maintenance-calculator.s32")}</SelectItem>
                                <SelectItem value="hob" className="text-right">{t("maintenance-calculator.s33")}</SelectItem>
                                <SelectItem value="canister" className="text-right">{t("maintenance-calculator.s34")}</SelectItem>
                                <SelectItem value="internal" className="text-right">{t("maintenance-calculator.s35")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Email reminder opt-in */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm font-medium">{t("maintenance-calculator.s36")}</span>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled className="text-xs">
                            {t("maintenance-calculator.s37")}
                        </Button>
                        <Input
                            type="email"
                            placeholder={t("maintenance-calculator.s38")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-right"
                            disabled
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t("maintenance-calculator.s39")}
                    </p>
                </div>

                <Button onClick={generateSchedule} className="w-full text-lg h-12">
                    <Calendar className="h-5 w-5 ml-2" />
                    {t("maintenance-calculator.s40")}
                </Button>

                {schedule && (
                    <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                        {/* Weekly Tasks */}
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 justify-end">
                                {t("maintenance-calculator.s41")}
                                <Clock className="h-5 w-5 text-primary" />
                            </h4>
                            <ul className="space-y-2">
                                {schedule.weekly.map((task) => (
                                    <li key={task} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                        <span>{task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Biweekly Tasks */}
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 justify-end">
                                {t("maintenance-calculator.s42")}
                                <Clock className="h-5 w-5 text-primary" />
                            </h4>
                            <ul className="space-y-2">
                                {schedule.biweekly.map((task) => (
                                    <li key={task} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                        <span>{task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Monthly Tasks */}
                        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 justify-end">
                                {t("maintenance-calculator.s43")}
                                <Calendar className="h-5 w-5 text-accent" />
                            </h4>
                            <ul className="space-y-2">
                                {schedule.monthly.map((task) => (
                                    <li key={task} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent" />
                                        <span>{task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Alert className="bg-accent/10 border-accent/20">
                            <Info className="h-4 w-4 text-accent" />
                            <AlertDescription className="text-sm text-foreground text-right">
                                <strong>{t("maintenance-calculator.s44")}</strong> {t("maintenance-calculator.s45")}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
