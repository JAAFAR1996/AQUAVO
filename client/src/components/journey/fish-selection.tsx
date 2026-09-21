import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Fish,
    Calculator,
    AlertCircle,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    Utensils,
    Thermometer,
    Droplets,
    Ruler,
    Clock,
    Users,
    Star,
    Check,
    Info,
} from "lucide-react";
import { WizardData } from "@/types/journey";
import {
    FISH_CATEGORIES,
    getSpeciesById,
    getDifficultyColor,
    getDifficultyLabel,
    type FishCategory,
    type FishSpeciesInfo,
} from "./fish-species-data";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

interface FishSelectionProps {
    wizardData: WizardData;
    updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

export function FishSelection({ wizardData, updateData }: FishSelectionProps) {
  const { t } = useTranslation("tools");
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [showFeedingFor, setShowFeedingFor] = useState<string | null>(null);

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const toggleSpecies = (speciesId: string) => {
        const current = wizardData.selectedSpecies || [];
        const isSelected = current.includes(speciesId);

        if (isSelected) {
            updateData("selectedSpecies", current.filter((id) => id !== speciesId));
        } else {
            updateData("selectedSpecies", [...current, speciesId]);
        }
    };

    const selectedSpeciesData = getSpeciesById(wizardData.selectedSpecies || []);

    // Calculate tank compatibility info
    const getCompatibilitySummary = () => {
        if (selectedSpeciesData.length === 0) return null;

        const minTemp = Math.max(...selectedSpeciesData.map((s) => {
            const low = parseInt(s.temperatureRange.split("-")[0]);
            return low;
        }));
        const maxTemp = Math.min(...selectedSpeciesData.map((s) => {
            const high = parseInt(s.temperatureRange.split("-")[1]);
            return high;
        }));

        const minTankSize = Math.max(...selectedSpeciesData.map((s) => s.tankMinLiters));

        return { minTemp, maxTemp, minTankSize };
    };

    const compatibility = getCompatibilitySummary();

    return (
        <Card className="border-2 border-primary/20 shadow-lg">
            <CardContent className="p-6 md:p-8 space-y-8">
                {/* Header */}
                <div className="space-y-3 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto">
                        <Fish className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-foreground">
                        {t("fish-selection.s1")}
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        {t("fish-selection.s2")}
                    </p>
                </div>

                {/* Selection Summary Bar */}
                {selectedSpeciesData.length > 0 && (
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary" />
                                <span className="font-bold text-foreground">
                                    {t("fish-selection.s3")} {selectedSpeciesData.length} {t("fish-selection.s4")}
                                </span>
                            </div>
                            {compatibility && (
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Thermometer className="h-3 w-3" />
                                        {compatibility.minTemp}-{compatibility.maxTemp}°C
                                    </span>
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Droplets className="h-3 w-3" />
                                        {t("fish-selection.s5")} {compatibility.minTankSize} {t("fish-selection.s6")}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedSpeciesData.map((species) => (
                                <Badge
                                    key={species.id}
                                    variant="secondary"
                                    className="gap-1 px-3 py-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    onClick={() => toggleSpecies(species.id)}
                                >
                                    <span>{species.nameAr}</span>
                                    <span className="text-[10px] opacity-60">×</span>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Fish Categories */}
                <div className="space-y-4">
                    {FISH_CATEGORIES.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            isExpanded={expandedCategories.includes(category.id)}
                            onToggle={() => toggleCategory(category.id)}
                            selectedSpecies={wizardData.selectedSpecies || []}
                            onToggleSpecies={toggleSpecies}
                            showFeedingFor={showFeedingFor}
                            onShowFeeding={setShowFeedingFor}
                            tankLiters={wizardData.tankLiters}
                        />
                    ))}
                </div>

                {/* Stocking Level */}
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        {t("fish-selection.s7")}
                    </Label>
                    <RadioGroup
                        value={wizardData.stockingLevel}
                        onValueChange={(val) => updateData("stockingLevel", val)}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                {
                                    value: "light",
                                    label: t("fish-selection.s8"),
                                    desc: t("fish-selection.s9"),
                                    badge: t("fish-selection.s10"),
                                    badgeColor: "bg-green-500/10 text-green-500",
                                },
                                {
                                    value: "moderate",
                                    label: t("fish-selection.s11"),
                                    desc: t("fish-selection.s12"),
                                    badge: t("fish-selection.s13"),
                                    badgeColor: "bg-amber-500/10 text-amber-500",
                                },
                                {
                                    value: "heavy",
                                    label: t("fish-selection.s14"),
                                    desc: t("fish-selection.s15"),
                                    badge: t("fish-selection.s16"),
                                    badgeColor: "bg-red-500/10 text-red-500",
                                },
                            ].map((option) => (
                                <div key={option.value}>
                                    <RadioGroupItem
                                        value={option.value}
                                        id={`stock-${option.value}`}
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor={`stock-${option.value}`}
                                        className={cn(
                                            "flex flex-col items-center text-center p-5 rounded-2xl border-2 cursor-pointer transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]",
                                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-md"
                                        )}
                                    >
                                        <div className="font-bold text-foreground mb-1">
                                            {option.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-2">
                                            {option.desc}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn("text-[10px]", option.badgeColor)}
                                        >
                                            {option.badge}
                                        </Badge>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                </div>

                {/* Stocking Calculator */}
                {wizardData.tankSize && wizardData.stockingLevel && (
                    <div className="bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl p-6 border">
                        <div className="flex items-center gap-2 mb-4">
                            <Calculator className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-foreground">
                                {t("fish-selection.s17")}
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background rounded-xl p-4 text-center">
                                <div className="text-xs text-muted-foreground mb-2">{t("fish-selection.s18")}</div>
                                <div className="text-xl font-black text-primary">
                                    {wizardData.tankLiters > 0
                                        ? t("fish-selection.s19", { v0: wizardData.tankLiters })
                                        : <>
                                            {wizardData.tankSize === "small" && t("fish-selection.s20")}
                                            {wizardData.tankSize === "medium" && t("fish-selection.s21")}
                                            {wizardData.tankSize === "large" && t("fish-selection.s22")}
                                            {wizardData.tankSize === "xlarge" && t("fish-selection.s23")}
                                        </>
                                    }
                                </div>
                            </div>
                            <div className="bg-background rounded-xl p-4 text-center">
                                <div className="text-xs text-muted-foreground mb-2">
                                    {t("fish-selection.s24")}
                                </div>
                                <div className="text-xl font-black text-primary">
                                    {wizardData.tankSize === "small" && wizardData.stockingLevel === "light" && t("fish-selection.s25")}
                                    {wizardData.tankSize === "small" && wizardData.stockingLevel === "moderate" && t("fish-selection.s26")}
                                    {wizardData.tankSize === "small" && wizardData.stockingLevel === "heavy" && t("fish-selection.s27")}
                                    {wizardData.tankSize === "medium" && wizardData.stockingLevel === "light" && t("fish-selection.s28")}
                                    {wizardData.tankSize === "medium" && wizardData.stockingLevel === "moderate" && t("fish-selection.s29")}
                                    {wizardData.tankSize === "medium" && wizardData.stockingLevel === "heavy" && t("fish-selection.s30")}
                                    {wizardData.tankSize === "large" && wizardData.stockingLevel === "light" && t("fish-selection.s31")}
                                    {wizardData.tankSize === "large" && wizardData.stockingLevel === "moderate" && t("fish-selection.s32")}
                                    {wizardData.tankSize === "large" && wizardData.stockingLevel === "heavy" && t("fish-selection.s33")}
                                    {wizardData.tankSize === "xlarge" && t("fish-selection.s34")}
                                </div>
                            </div>
                        </div>
                        {selectedSpeciesData.length > 0 && compatibility && (
                            <div className="mt-4 bg-background rounded-xl p-4">
                                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    {t("fish-selection.s35")}
                                </div>
                                {compatibility.minTankSize > (wizardData.tankLiters || 0) && wizardData.tankLiters > 0 && (
                                    <div className="text-sm text-destructive font-bold flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        {t("fish-selection.s36")}{compatibility.minTankSize} {t("fish-selection.s37")}
                                    </div>
                                )}
                                {compatibility.minTemp > compatibility.maxTemp && (
                                    <div className="text-sm text-destructive font-bold flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        {t("fish-selection.s38")}
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">
                            {t("fish-selection.s39")}
                        </p>
                    </div>
                )}

                {/* Compatibility Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-2 text-right">
                            {t("fish-selection.s40")}
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside text-right">
                            <li>{t("fish-selection.s41")}</li>
                            <li>{t("fish-selection.s42")}</li>
                            <li>{t("fish-selection.s43")}</li>
                            <li>{t("fish-selection.s44")}</li>
                        </ul>
                    </div>
                </div>

                {/* Pro Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-bold text-foreground mb-1 text-right">
                            {t("fish-selection.s45")}
                        </div>
                        <p className="text-sm text-muted-foreground text-right">
                            {t("fish-selection.s46")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================
// Category Card Component
// ============================================================
interface CategoryCardProps {
    category: FishCategory;
    isExpanded: boolean;
    onToggle: () => void;
    selectedSpecies: string[];
    onToggleSpecies: (id: string) => void;
    showFeedingFor: string | null;
    onShowFeeding: (id: string | null) => void;
    tankLiters: number;
}

function CategoryCard({
    category,
    isExpanded,
    onToggle,
    selectedSpecies,
    onToggleSpecies,
    showFeedingFor,
    onShowFeeding,
    tankLiters,
}: CategoryCardProps) {
  const { t } = useTranslation("tools");
    const selectedInCategory = category.species.filter((s) =>
        selectedSpecies.includes(s.id)
    );
    const colorMap: Record<string, string> = {
        blue: "from-blue-500/15 to-blue-500/5 border-blue-500/30 hover:border-blue-500/50",
        orange: "from-orange-500/15 to-orange-500/5 border-orange-500/30 hover:border-orange-500/50",
        amber: "from-amber-500/15 to-amber-500/5 border-amber-500/30 hover:border-amber-500/50",
        cyan: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50",
        purple: "from-purple-500/15 to-purple-500/5 border-purple-500/30 hover:border-purple-500/50",
        yellow: "from-yellow-500/15 to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50",
        pink: "from-pink-500/15 to-pink-500/5 border-pink-500/30 hover:border-pink-500/50",
    };

    return (
        <div
            className={cn(
                "rounded-2xl border-2 overflow-hidden transition-all duration-300",
                isExpanded ? "bg-gradient-to-br shadow-lg" : "bg-card hover:shadow-md",
                colorMap[category.color] || colorMap.blue
            )}
        >
            {/* Category Header */}
            <button
                className="w-full flex items-center justify-between p-5 text-right"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <Fish className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                        <div className="font-bold text-lg text-foreground">
                            {category.nameAr}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {category.description}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {selectedInCategory.length > 0 && (
                        <Badge variant="default" className="text-xs">
                            {selectedInCategory.length} {t("fish-selection.s47")}
                        </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {category.species.length} {t("fish-selection.s48")}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            </button>

            {/* Species Grid */}
            {isExpanded && (
                <div className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.species.map((species) => (
                            <SpeciesCard
                                key={species.id}
                                species={species}
                                isSelected={selectedSpecies.includes(species.id)}
                                onToggle={() => onToggleSpecies(species.id)}
                                showFeeding={showFeedingFor === species.id}
                                onToggleFeeding={() =>
                                    onShowFeeding(
                                        showFeedingFor === species.id ? null : species.id
                                    )
                                }
                                tankLiters={tankLiters}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Species Card Component
// ============================================================
interface SpeciesCardProps {
    species: FishSpeciesInfo;
    isSelected: boolean;
    onToggle: () => void;
    showFeeding: boolean;
    onToggleFeeding: () => void;
    tankLiters: number;
}

function SpeciesCard({
    species,
    isSelected,
    onToggle,
    showFeeding,
    onToggleFeeding,
    tankLiters,
}: SpeciesCardProps) {
  const { t } = useTranslation("tools");
    const tooSmallTank = tankLiters > 0 && tankLiters < species.tankMinLiters;

    return (
        <div
            className={cn(
                "rounded-xl border-2 overflow-hidden transition-all duration-200",
                isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                    : "border-border bg-background hover:border-primary/30 hover:shadow-sm"
            )}
        >
            {/* Species Header - Clickable to select */}
            <button
                className="w-full p-4 text-right"
                onClick={onToggle}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                        {/* Selection indicator */}
                        <div
                            className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                isSelected
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/30"
                            )}
                        >
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                        <div>
                            <div className="font-bold text-foreground">{species.nameAr}</div>
                            <div className="text-xs text-muted-foreground">
                                {species.nameEn}
                            </div>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn("text-[10px] flex-shrink-0", getDifficultyColor(species.difficulty))}
                    >
                        {getDifficultyLabel(species.difficulty)}
                    </Badge>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-2 mt-3 mr-9">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                        <Thermometer className="h-2.5 w-2.5" />
                        {species.temperatureRange}
                    </span>
                    <span className={cn("text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full",
                        tooSmallTank
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted/50 text-muted-foreground"
                    )}>
                        <Droplets className="h-2.5 w-2.5" />
                        {species.tankMinLiters}{t("fish-selection.s49")}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                        <Ruler className="h-2.5 w-2.5" />
                        {species.maxSizeCm} {t("fish-selection.s50")}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                        <Clock className="h-2.5 w-2.5" />
                        {species.lifespan}
                    </span>
                    {species.schooling && species.minGroupSize && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                            <Users className="h-2.5 w-2.5" />
                            {species.minGroupSize}{t("fish-selection.s51")}
                        </span>
                    )}
                </div>
            </button>

            {/* Feeding Info Toggle */}
            {isSelected && (
                <div className="border-t">
                    <button
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFeeding();
                        }}
                    >
                        <span className="flex items-center gap-2 font-bold text-primary">
                            <Utensils className="h-4 w-4" />
                            {t("fish-selection.s52")}
                        </span>
                        {showFeeding ? (
                            <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-primary" />
                        )}
                    </button>

                    {/* Expanded Feeding Info */}
                    {showFeeding && (
                        <div className="px-4 pb-4 space-y-3">
                            <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl p-4 space-y-3">
                                {/* Food Types */}
                                <div>
                                    <div className="text-xs font-bold text-foreground mb-1.5">
                                        {t("fish-selection.s53")}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {species.feedingInfo.foodTypes.map((type) => (
                                            <Badge
                                                key={type}
                                                variant="outline"
                                                className="text-[10px] bg-background"
                                            >
                                                {getFoodTypeLabel(type)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Frequency */}
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground">
                                        {species.feedingInfo.frequencyPerDay === 0
                                            ? t("fish-selection.s54")
                                            : t("fish-selection.s55", { v0: species.feedingInfo.frequencyPerDay, v1: species.feedingInfo.frequencyPerDay > 2 ? t("fish-selection.timesMany") : t("fish-selection.timesTwo") })
                                        }
                                    </span>
                                </div>

                                {/* Tips */}
                                <div className="bg-background rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {species.feedingInfo.tips}
                                        </p>
                                    </div>
                                </div>

                                {/* Compatibility Note */}
                                <div className="text-[11px] text-muted-foreground/70 flex items-start gap-1.5">
                                    <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                    {species.compatibilityNotes}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Helper: Food type label in Arabic
// ============================================================
function getFoodTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        flakes: i18next.t("tools:fish-selection.s56"),
        pellets: i18next.t("tools:fish-selection.s57"),
        frozen: i18next.t("tools:fish-selection.s58"),
        live: i18next.t("tools:fish-selection.s59"),
        algae: i18next.t("tools:fish-selection.s60"),
        vegetables: i18next.t("tools:fish-selection.s61"),
        spirulina: i18next.t("tools:fish-selection.s62"),
    };
    return labels[type] || type;
}
