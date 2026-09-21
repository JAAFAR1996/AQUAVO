import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Beaker,
    Droplets,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Thermometer,
    Info,
    RefreshCw,
    TrendingUp,
    TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

// Water parameter ranges for freshwater aquariums
const FRESHWATER_RANGES = {
    ph: { min: 6.5, max: 7.5, danger_low: 6.0, danger_high: 8.0, unit: "" },
    ammonia: { min: 0, max: 0.02, danger_low: 0, danger_high: 0.25, unit: "ppm" },
    nitrite: { min: 0, max: 0.1, danger_low: 0, danger_high: 0.5, unit: "ppm" },
    nitrate: { min: 0, max: 40, danger_low: 0, danger_high: 80, unit: "ppm" },
    kh: { min: 4, max: 8, danger_low: 2, danger_high: 12, unit: "dKH" },
    gh: { min: 4, max: 12, danger_low: 2, danger_high: 18, unit: "dGH" },
    temperature: { min: 24, max: 28, danger_low: 20, danger_high: 32, unit: "°C" },
};

// Water parameter ranges for saltwater aquariums
const SALTWATER_RANGES = {
    ph: { min: 8.1, max: 8.4, danger_low: 7.8, danger_high: 8.6, unit: "" },
    ammonia: { min: 0, max: 0.02, danger_low: 0, danger_high: 0.25, unit: "ppm" },
    nitrite: { min: 0, max: 0.1, danger_low: 0, danger_high: 0.5, unit: "ppm" },
    nitrate: { min: 0, max: 20, danger_low: 0, danger_high: 40, unit: "ppm" },
    salinity: { min: 1.023, max: 1.025, danger_low: 1.020, danger_high: 1.028, unit: "sg" },
    calcium: { min: 400, max: 450, danger_low: 350, danger_high: 500, unit: "ppm" },
    magnesium: { min: 1250, max: 1350, danger_low: 1150, danger_high: 1450, unit: "ppm" },
    temperature: { min: 24, max: 27, danger_low: 22, danger_high: 30, unit: "°C" },
};

interface ParameterInput {
    name: string;
    nameAr: string;
    key: string;
    icon: React.ReactNode;
}

const FRESHWATER_PARAMS: ParameterInput[] = [
    { name: "pH", nameAr: i18next.t("tools:water-parameters-calculator.s1"), key: "ph", icon: <Beaker className="w-4 h-4" /> },
    { name: "Ammonia", nameAr: i18next.t("tools:water-parameters-calculator.s2"), key: "ammonia", icon: <AlertTriangle className="w-4 h-4" /> },
    { name: "Nitrite", nameAr: i18next.t("tools:water-parameters-calculator.s3"), key: "nitrite", icon: <AlertTriangle className="w-4 h-4" /> },
    { name: "Nitrate", nameAr: i18next.t("tools:water-parameters-calculator.s4"), key: "nitrate", icon: <Droplets className="w-4 h-4" /> },
    { name: "KH", nameAr: i18next.t("tools:water-parameters-calculator.s5"), key: "kh", icon: <Beaker className="w-4 h-4" /> },
    { name: "GH", nameAr: i18next.t("tools:water-parameters-calculator.s6"), key: "gh", icon: <Beaker className="w-4 h-4" /> },
    { name: "Temperature", nameAr: i18next.t("tools:water-parameters-calculator.s7"), key: "temperature", icon: <Thermometer className="w-4 h-4" /> },
];

const SALTWATER_PARAMS: ParameterInput[] = [
    { name: "pH", nameAr: i18next.t("tools:water-parameters-calculator.s1"), key: "ph", icon: <Beaker className="w-4 h-4" /> },
    { name: "Ammonia", nameAr: i18next.t("tools:water-parameters-calculator.s2"), key: "ammonia", icon: <AlertTriangle className="w-4 h-4" /> },
    { name: "Nitrite", nameAr: i18next.t("tools:water-parameters-calculator.s3"), key: "nitrite", icon: <AlertTriangle className="w-4 h-4" /> },
    { name: "Nitrate", nameAr: i18next.t("tools:water-parameters-calculator.s4"), key: "nitrate", icon: <Droplets className="w-4 h-4" /> },
    { name: "Salinity", nameAr: i18next.t("tools:water-parameters-calculator.s8"), key: "salinity", icon: <Droplets className="w-4 h-4" /> },
    { name: "Calcium", nameAr: i18next.t("tools:water-parameters-calculator.s9"), key: "calcium", icon: <Beaker className="w-4 h-4" /> },
    { name: "Magnesium", nameAr: i18next.t("tools:water-parameters-calculator.s10"), key: "magnesium", icon: <Beaker className="w-4 h-4" /> },
    { name: "Temperature", nameAr: i18next.t("tools:water-parameters-calculator.s7"), key: "temperature", icon: <Thermometer className="w-4 h-4" /> },
];

type ParameterStatus = "safe" | "warning" | "danger";

interface AnalysisResult {
    key: string;
    value: number;
    status: ParameterStatus;
    message: string;
    recommendation?: string;
}

export function WaterParametersCalculator() {
  const { t } = useTranslation("tools");
    const [waterType, setWaterType] = useState<"freshwater" | "saltwater">("freshwater");
    const [values, setValues] = useState<Record<string, string>>({});
    const [results, setResults] = useState<AnalysisResult[]>([]);

    const params = waterType === "freshwater" ? FRESHWATER_PARAMS : SALTWATER_PARAMS;
    const ranges = waterType === "freshwater" ? FRESHWATER_RANGES : SALTWATER_RANGES;

    const updateValue = (key: string, value: string) => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    const analyze = () => {
        const analysisResults: AnalysisResult[] = [];

        params.forEach(param => {
            const rawValue = values[param.key];
            if (!rawValue) return;

            const value = parseFloat(rawValue);
            if (isNaN(value)) return;

            const range = (ranges as Record<string, typeof FRESHWATER_RANGES.ph>)[param.key];
            if (!range) return;

            let status: ParameterStatus = "safe";
            let message = "";
            let recommendation = "";

            if (value >= range.min && value <= range.max) {
                status = "safe";
                message = t("water-parameters-calculator.s11");
            } else if (value < range.danger_low || value > range.danger_high) {
                status = "danger";
                if (value < range.danger_low) {
                    message = t("water-parameters-calculator.s12");
                    recommendation = getRecommendation(param.key, "low", waterType);
                } else {
                    message = t("water-parameters-calculator.s13");
                    recommendation = getRecommendation(param.key, "high", waterType);
                }
            } else {
                status = "warning";
                if (value < range.min) {
                    message = t("water-parameters-calculator.s14");
                    recommendation = getRecommendation(param.key, "low", waterType);
                } else {
                    message = t("water-parameters-calculator.s15");
                    recommendation = getRecommendation(param.key, "high", waterType);
                }
            }

            analysisResults.push({
                key: param.key,
                value,
                status,
                message,
                recommendation
            });
        });

        setResults(analysisResults);
    };

    const getRecommendation = (key: string, direction: "low" | "high", type: "freshwater" | "saltwater"): string => {
        const recommendations: Record<string, Record<string, string>> = {
            ph: {
                low: t("water-parameters-calculator.s16"),
                high: t("water-parameters-calculator.s17")
            },
            ammonia: {
                low: t("water-parameters-calculator.s18"),
                high: t("water-parameters-calculator.s19")
            },
            nitrite: {
                low: t("water-parameters-calculator.s20"),
                high: t("water-parameters-calculator.s21")
            },
            nitrate: {
                low: t("water-parameters-calculator.s22"),
                high: t("water-parameters-calculator.s23")
            },
            temperature: {
                low: t("water-parameters-calculator.s24"),
                high: t("water-parameters-calculator.s25")
            },
            kh: {
                low: t("water-parameters-calculator.s26"),
                high: t("water-parameters-calculator.s27")
            },
            gh: {
                low: t("water-parameters-calculator.s28"),
                high: t("water-parameters-calculator.s29")
            },
            salinity: {
                low: t("water-parameters-calculator.s30"),
                high: t("water-parameters-calculator.s31")
            },
            calcium: {
                low: t("water-parameters-calculator.s32"),
                high: t("water-parameters-calculator.s33")
            },
            magnesium: {
                low: t("water-parameters-calculator.s34"),
                high: t("water-parameters-calculator.s35")
            }
        };

        return recommendations[key]?.[direction] || t("water-parameters-calculator.s36");
    };

    const overallStatus = useMemo(() => {
        if (results.length === 0) return null;
        const dangerCount = results.filter(r => r.status === "danger").length;
        const warningCount = results.filter(r => r.status === "warning").length;

        if (dangerCount > 0) return "danger";
        if (warningCount > 0) return "warning";
        return "safe";
    }, [results]);

    const clearAll = () => {
        setValues({});
        setResults([]);
    };

    const getStatusColor = (status: ParameterStatus) => {
        switch (status) {
            case "safe": return "text-primary bg-primary/10 border-primary/30";
            case "warning": return "text-amber-500 bg-amber-500/10 border-amber-500/30";
            case "danger": return "text-destructive bg-destructive/10 border-destructive/30";
        }
    };

    const getStatusIcon = (status: ParameterStatus) => {
        switch (status) {
            case "safe": return <CheckCircle2 className="w-5 h-5 text-primary" />;
            case "warning": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case "danger": return <XCircle className="w-5 h-5 text-destructive" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2 text-xl">
                    {t("water-parameters-calculator.s37")}
                    <Beaker className="w-6 h-6 text-primary" />
                </CardTitle>
                <CardDescription className="text-right">
                    {t("water-parameters-calculator.s38")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Water Type Selection */}
                <div className="flex justify-center">
                    <Tabs value={waterType} onValueChange={(v) => { setWaterType(v as "freshwater" | "saltwater"); setValues({}); setResults([]); }}>
                        <TabsList className="grid grid-cols-2 w-64">
                            <TabsTrigger value="freshwater">{t("water-parameters-calculator.s39")}</TabsTrigger>
                            <TabsTrigger value="saltwater">{t("water-parameters-calculator.s40")}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Parameter Inputs */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {params.map(param => {
                        const range = (ranges as Record<string, typeof FRESHWATER_RANGES.ph>)[param.key];
                        return (
                            <div key={param.key} className="space-y-2 text-right">
                                <Label className="flex items-center justify-end gap-2">
                                    {param.nameAr}
                                    {param.icon}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder={`${range?.min} - ${range?.max}`}
                                    value={values[param.key] || ""}
                                    onChange={(e) => updateValue(param.key, e.target.value)}
                                    className="text-right"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t("water-parameters-calculator.s41")} {range?.min} - {range?.max} {range?.unit}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <Button onClick={analyze} className="flex-1 h-12 text-lg gap-2">
                        <Beaker className="w-5 h-5" />
                        {t("water-parameters-calculator.s42")}
                    </Button>
                    <Button onClick={clearAll} variant="outline" className="h-12 gap-2">
                        <RefreshCw className="w-5 h-5" />
                        {t("water-parameters-calculator.s43")}
                    </Button>
                </div>

                {/* Results Section */}
                {results.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Overall Status */}
                        <Card className={cn(
                            "border-2",
                            overallStatus === "safe" && "border-primary bg-primary/10",
                            overallStatus === "warning" && "border-amber-500 bg-amber-500/10",
                            overallStatus === "danger" && "border-destructive bg-destructive/10"
                        )}>
                            <CardContent className="p-6 text-center">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    {overallStatus === "safe" && <CheckCircle2 className="w-10 h-10 text-primary" />}
                                    {overallStatus === "warning" && <AlertTriangle className="w-10 h-10 text-amber-500" />}
                                    {overallStatus === "danger" && <XCircle className="w-10 h-10 text-destructive" />}
                                </div>
                                <h3 className="text-xl font-bold">
                                    {overallStatus === "safe" && t("water-parameters-calculator.s44")}
                                    {overallStatus === "warning" && t("water-parameters-calculator.s45")}
                                    {overallStatus === "danger" && t("water-parameters-calculator.s46")}
                                </h3>
                            </CardContent>
                        </Card>

                        {/* Individual Results */}
                        <div className="grid gap-3 md:grid-cols-2">
                            {results.map(result => {
                                const param = params.find(p => p.key === result.key);
                                return (
                                    <Card key={result.key} className={cn("border", getStatusColor(result.status))}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(result.status)}
                                                    <Badge variant="outline">{result.value}</Badge>
                                                </div>
                                                <span className="font-bold">{param?.nameAr}</span>
                                            </div>
                                            <p className="text-sm text-right mb-2">{result.message}</p>
                                            {result.recommendation && (
                                                <Alert className="mt-2">
                                                    <Info className="h-4 w-4" />
                                                    <AlertDescription className="text-right text-xs">
                                                        {result.recommendation}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Info Box */}
                {results.length === 0 && (
                    <Alert className="bg-primary/5 border-primary/20">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-right">
                            <strong>{t("water-parameters-calculator.s47")}</strong> {t("water-parameters-calculator.s48")}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
