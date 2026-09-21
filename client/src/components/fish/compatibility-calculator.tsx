import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Fish,
    AlertTriangle,
    Check,
    X,
    Thermometer,
    Droplets,
    Scale,
    Users,
    Search,
    Trash2,
    Sparkles,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

// Fish species data with compatibility info
interface FishSpecies {
    id: string;
    name: string;
    nameEn: string;
    temperament: "peaceful" | "semi-aggressive" | "aggressive";
    minTemp: number;
    maxTemp: number;
    minPH: number;
    maxPH: number;
    minSize: number; // adult size in cm
    maxSize: number;
    schooling: boolean;
    minSchoolSize?: number;
    incompatibleWith: string[];
    image?: string;
}

const FISH_SPECIES: FishSpecies[] = [
    {
        id: "goldfish",
        name: i18next.t("tools:compatibility-calculator.s1"),
        nameEn: "Goldfish",
        temperament: "peaceful",
        minTemp: 18,
        maxTemp: 24,
        minPH: 6.5,
        maxPH: 8.0,
        minSize: 10,
        maxSize: 30,
        schooling: false,
        incompatibleWith: ["betta", "tetra", "guppy"],
    },
    {
        id: "betta",
        name: i18next.t("tools:compatibility-calculator.s2"),
        nameEn: "Betta",
        temperament: "aggressive",
        minTemp: 24,
        maxTemp: 28,
        minPH: 6.5,
        maxPH: 7.5,
        minSize: 5,
        maxSize: 7,
        schooling: false,
        incompatibleWith: ["betta", "guppy", "goldfish"],
    },
    {
        id: "guppy",
        name: i18next.t("tools:compatibility-calculator.s3"),
        nameEn: "Guppy",
        temperament: "peaceful",
        minTemp: 22,
        maxTemp: 28,
        minPH: 6.8,
        maxPH: 7.8,
        minSize: 3,
        maxSize: 5,
        schooling: true,
        minSchoolSize: 5,
        incompatibleWith: ["betta", "goldfish", "cichlid"],
    },
    {
        id: "tetra",
        name: i18next.t("tools:compatibility-calculator.s4"),
        nameEn: "Neon Tetra",
        temperament: "peaceful",
        minTemp: 20,
        maxTemp: 26,
        minPH: 6.0,
        maxPH: 7.0,
        minSize: 2,
        maxSize: 4,
        schooling: true,
        minSchoolSize: 6,
        incompatibleWith: ["goldfish", "cichlid", "betta"],
    },
    {
        id: "angelfish",
        name: i18next.t("tools:compatibility-calculator.s5"),
        nameEn: "Angelfish",
        temperament: "semi-aggressive",
        minTemp: 24,
        maxTemp: 28,
        minPH: 6.0,
        maxPH: 7.5,
        minSize: 10,
        maxSize: 15,
        schooling: false,
        incompatibleWith: ["tetra", "guppy"],
    },
    {
        id: "cichlid",
        name: i18next.t("tools:compatibility-calculator.s6"),
        nameEn: "African Cichlid",
        temperament: "aggressive",
        minTemp: 24,
        maxTemp: 28,
        minPH: 7.5,
        maxPH: 8.5,
        minSize: 10,
        maxSize: 20,
        schooling: false,
        incompatibleWith: ["guppy", "tetra", "betta", "angelfish"],
    },
    {
        id: "molly",
        name: i18next.t("tools:compatibility-calculator.s7"),
        nameEn: "Molly",
        temperament: "peaceful",
        minTemp: 22,
        maxTemp: 28,
        minPH: 7.0,
        maxPH: 8.5,
        minSize: 4,
        maxSize: 10,
        schooling: true,
        minSchoolSize: 4,
        incompatibleWith: ["betta"],
    },
    {
        id: "pleco",
        name: i18next.t("tools:compatibility-calculator.s8"),
        nameEn: "Pleco",
        temperament: "peaceful",
        minTemp: 22,
        maxTemp: 28,
        minPH: 6.5,
        maxPH: 7.5,
        minSize: 10,
        maxSize: 40,
        schooling: false,
        incompatibleWith: [],
    },
    {
        id: "corydoras",
        name: i18next.t("tools:compatibility-calculator.s9"),
        nameEn: "Corydoras",
        temperament: "peaceful",
        minTemp: 22,
        maxTemp: 26,
        minPH: 6.0,
        maxPH: 7.5,
        minSize: 3,
        maxSize: 7,
        schooling: true,
        minSchoolSize: 6,
        incompatibleWith: [],
    },
    {
        id: "discus",
        name: i18next.t("tools:compatibility-calculator.s10"),
        nameEn: "Discus",
        temperament: "peaceful",
        minTemp: 26,
        maxTemp: 30,
        minPH: 5.5,
        maxPH: 7.0,
        minSize: 15,
        maxSize: 20,
        schooling: true,
        minSchoolSize: 5,
        incompatibleWith: ["cichlid", "goldfish"],
    },
];

interface CompatibilityResult {
    fish1: FishSpecies;
    fish2: FishSpecies;
    compatible: boolean;
    issues: string[];
}

export function CompatibilityCalculator() {
  const { t } = useTranslation("tools");
    const [selectedFish, setSelectedFish] = useState<string[]>([]);
    const [tankSize, setTankSize] = useState<number>(100);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter fish based on search
    const filteredFish = useMemo(() => {
        if (!searchQuery) return FISH_SPECIES;
        const query = searchQuery.toLowerCase();
        return FISH_SPECIES.filter(
            f => f.name.includes(searchQuery) ||
                f.nameEn.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // Add/remove fish from selection
    const toggleFish = (fishId: string) => {
        if (selectedFish.includes(fishId)) {
            setSelectedFish(selectedFish.filter(f => f !== fishId));
        } else {
            setSelectedFish([...selectedFish, fishId]);
        }
    };

    // Clear all selections
    const clearAll = () => {
        setSelectedFish([]);
    };

    // Calculate compatibility between all selected fish
    const compatibilityResults = useMemo((): CompatibilityResult[] => {
        const results: CompatibilityResult[] = [];
        const selected = selectedFish.map(id => FISH_SPECIES.find(f => f.id === id)!).filter(Boolean);

        for (let i = 0; i < selected.length; i++) {
            for (let j = i + 1; j < selected.length; j++) {
                const fish1 = selected[i];
                const fish2 = selected[j];
                const issues: string[] = [];

                // Check direct incompatibility
                if (fish1.incompatibleWith.includes(fish2.id) || fish2.incompatibleWith.includes(fish1.id)) {
                    issues.push(t("compatibility-calculator.s11", { v0: fish1.name, v1: fish2.name }));
                }

                // Check temperature overlap
                const tempOverlap = !(fish1.maxTemp < fish2.minTemp || fish2.maxTemp < fish1.minTemp);
                if (!tempOverlap) {
                    issues.push(t("compatibility-calculator.s12", { v0: fish1.name, v1: fish1.minTemp, v2: fish1.maxTemp, v3: fish2.name, v4: fish2.minTemp, v5: fish2.maxTemp }));
                }

                // Check pH overlap
                const phOverlap = !(fish1.maxPH < fish2.minPH || fish2.maxPH < fish1.minPH);
                if (!phOverlap) {
                    issues.push(t("compatibility-calculator.s13", { v0: fish1.name, v1: fish1.minPH, v2: fish1.maxPH, v3: fish2.name, v4: fish2.minPH, v5: fish2.maxPH }));
                }

                // Check size difference (big fish might eat small ones)
                if (fish1.maxSize > fish2.minSize * 3 || fish2.maxSize > fish1.minSize * 3) {
                    issues.push(t("compatibility-calculator.s14"));
                }

                // Check temperament
                if (fish1.temperament === "aggressive" || fish2.temperament === "aggressive") {
                    const aggressiveFish = fish1.temperament === "aggressive" ? fish1 : fish2;
                    const otherFish = fish1.temperament === "aggressive" ? fish2 : fish1;
                    if (otherFish.temperament === "peaceful") {
                        issues.push(t("compatibility-calculator.s15", { v0: aggressiveFish.name, v1: otherFish.name }));
                    }
                }

                results.push({
                    fish1,
                    fish2,
                    compatible: issues.length === 0,
                    issues,
                });
            }
        }

        return results;
    }, [selectedFish]);

    // Calculate tank capacity
    const tankCapacity = useMemo(() => {
        const selected = selectedFish.map(id => FISH_SPECIES.find(f => f.id === id)!).filter(Boolean);
        let totalInches = 0;
        let warnings: string[] = [];

        selected.forEach(fish => {
            const avgSize = (fish.minSize + fish.maxSize) / 2;
            totalInches += avgSize;

            if (fish.schooling && fish.minSchoolSize) {
                warnings.push(t("compatibility-calculator.s16", { v0: fish.name, v1: fish.minSchoolSize }));
            }
        });

        // Rule: 1 cm of fish per 1 liter is a rough guideline
        const capacityUsed = (totalInches / tankSize) * 100;

        return {
            totalFishSize: totalInches,
            capacityUsed: Math.min(capacityUsed, 100),
            isOverstocked: capacityUsed > 80,
            warnings,
        };
    }, [selectedFish, tankSize]);

    // Overall compatibility
    const overallCompatibility = useMemo(() => {
        if (compatibilityResults.length === 0) return null;
        const incompatible = compatibilityResults.filter(r => !r.compatible);
        if (incompatible.length === 0) return "compatible";
        if (incompatible.length < compatibilityResults.length / 2) return "caution";
        return "incompatible";
    }, [compatibilityResults]);

    const getTemperamentColor = (temp: FishSpecies["temperament"]) => {
        switch (temp) {
            case "peaceful": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "semi-aggressive": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "aggressive": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 border-blue-500/20">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Fish className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{t("compatibility-calculator.s17")}</h1>
                            <p className="text-muted-foreground">{t("compatibility-calculator.s18")}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Fish Selection */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    {t("compatibility-calculator.s19")}
                                </span>
                                {selectedFish.length > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearAll}>
                                        <Trash2 className="w-4 h-4 ml-1" />
                                        {t("compatibility-calculator.s20")}
                                    </Button>
                                )}
                            </CardTitle>
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("compatibility-calculator.s21")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pr-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 md:grid-cols-2">
                                {filteredFish.map((fish) => (
                                    <div
                                        key={fish.id}
                                        onClick={() => toggleFish(fish.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                                            selectedFish.includes(fish.id) && "border-primary bg-primary/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                            selectedFish.includes(fish.id)
                                                ? "bg-primary border-primary text-white"
                                                : "border-muted-foreground/30"
                                        )}>
                                            {selectedFish.includes(fish.id) && <Check className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{fish.name}</span>
                                                <span className="text-xs text-muted-foreground">({fish.nameEn})</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className={cn("text-xs", getTemperamentColor(fish.temperament))}>
                                                    {fish.temperament === "peaceful" ? t("compatibility-calculator.s22") :
                                                        fish.temperament === "semi-aggressive" ? t("compatibility-calculator.s23") : t("compatibility-calculator.s24")}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {fish.minSize}-{fish.maxSize} {t("compatibility-calculator.s25")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tank Size */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Droplets className="w-5 h-5" />
                                {t("compatibility-calculator.s26")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="number"
                                    value={tankSize}
                                    onChange={(e) => setTankSize(Number(e.target.value))}
                                    min={10}
                                    max={1000}
                                    className="w-32"
                                />
                                <span className="text-muted-foreground">{t("compatibility-calculator.s27")}</span>
                                <div className="flex-1">
                                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all",
                                                tankCapacity.capacityUsed > 80 ? "bg-red-500" :
                                                    tankCapacity.capacityUsed > 60 ? "bg-yellow-500" : "bg-green-500"
                                            )}
                                            style={{ width: `${tankCapacity.capacityUsed}%` }}
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {tankCapacity.capacityUsed.toFixed(0)}{t("compatibility-calculator.s28")}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Panel */}
                <div className="space-y-4">
                    {/* Overall Result */}
                    {selectedFish.length >= 2 && overallCompatibility && (
                        <Card className={cn(
                            "border-2",
                            overallCompatibility === "compatible" && "border-green-500 bg-green-50 dark:bg-green-900/20",
                            overallCompatibility === "caution" && "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
                            overallCompatibility === "incompatible" && "border-red-500 bg-red-50 dark:bg-red-900/20"
                        )}>
                            <CardContent className="p-6 text-center">
                                <div className={cn(
                                    "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4",
                                    overallCompatibility === "compatible" && "bg-green-100 dark:bg-green-800",
                                    overallCompatibility === "caution" && "bg-yellow-100 dark:bg-yellow-800",
                                    overallCompatibility === "incompatible" && "bg-red-100 dark:bg-red-800"
                                )}>
                                    {overallCompatibility === "compatible" && <Check className="w-8 h-8 text-green-600" />}
                                    {overallCompatibility === "caution" && <AlertTriangle className="w-8 h-8 text-yellow-600" />}
                                    {overallCompatibility === "incompatible" && <X className="w-8 h-8 text-red-600" />}
                                </div>
                                <h3 className="text-xl font-bold">
                                    {overallCompatibility === "compatible" && t("compatibility-calculator.s29")}
                                    {overallCompatibility === "caution" && t("compatibility-calculator.s30")}
                                    {overallCompatibility === "incompatible" && t("compatibility-calculator.s31")}
                                </h3>
                            </CardContent>
                        </Card>
                    )}

                    {/* Detailed Results */}
                    {compatibilityResults.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Info className="w-5 h-5" />
                                    {t("compatibility-calculator.s32")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {compatibilityResults.map((result) => (
                                    <div
                                        key={`${result.fish1.id}-${result.fish2.id}`}
                                        className={cn(
                                            "p-3 rounded-lg border",
                                            result.compatible
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-200"
                                                : "bg-red-50 dark:bg-red-900/20 border-red-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {result.compatible ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <X className="w-4 h-4 text-red-600" />
                                            )}
                                            <span className="font-medium text-sm">
                                                {result.fish1.name} + {result.fish2.name}
                                            </span>
                                        </div>
                                        {result.issues.length > 0 && (
                                            <ul className="text-xs text-muted-foreground space-y-1">
                                                {result.issues.map((issue) => (
                                                    <li key={issue} className="flex items-start gap-1">
                                                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                                        {issue}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Warnings */}
                    {tankCapacity.warnings.length > 0 && (
                        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    {t("compatibility-calculator.s33")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm">
                                    {tankCapacity.warnings.map((warning) => (
                                        <li key={warning} className="flex items-start gap-2">
                                            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                            {warning}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty State */}
                    {selectedFish.length < 2 && (
                        <Card className="border-dashed">
                            <CardContent className="p-6 text-center text-muted-foreground">
                                <Fish className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>{t("compatibility-calculator.s34")}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
