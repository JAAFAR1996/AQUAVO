import { useState, useMemo } from "react";
import { FishSpecies } from "@/data/freshwater-fish";
import { useFishData } from "@/hooks/use-fish-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Scale,
    Thermometer,
    Droplets,
    Fish,
    X,
    Plus,
    Check,
    AlertTriangle,
    XCircle,
    Search,
    Ruler,
    Users,
    Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FishComparisonToolProps {
    className?: string;
}

type CompatibilityLevel = "compatible" | "caution" | "incompatible";

interface CompatibilityResult {
    level: CompatibilityLevel;
    reasons: string[];
}

// Check compatibility between two fish
function checkCompatibility(fish1: FishSpecies, fish2: FishSpecies): CompatibilityResult {
    const reasons: string[] = [];
    let score = 0;

    // Temperature overlap
    const tempOverlap =
        fish1.waterParameters.tempMax >= fish2.waterParameters.tempMin &&
        fish2.waterParameters.tempMax >= fish1.waterParameters.tempMin;
    if (!tempOverlap) {
        reasons.push("درجات الحرارة المطلوبة غير متوافقة");
    } else {
        score += 2;
    }

    // pH overlap
    const phOverlap =
        fish1.waterParameters.phMax >= fish2.waterParameters.phMin &&
        fish2.waterParameters.phMax >= fish1.waterParameters.phMin;
    if (!phOverlap) {
        reasons.push("نطاق الحموضة (pH) غير متوافق");
    } else {
        score += 2;
    }

    // Temperament check
    if (fish1.temperament === "aggressive" || fish2.temperament === "aggressive") {
        if (fish1.temperament === "peaceful" || fish2.temperament === "peaceful") {
            reasons.push("سمكة عدوانية مع سمكة سلمية - خطر!");
            score -= 3;
        } else {
            reasons.push("الأسماك العدوانية قد تتشاجر");
            score -= 1;
        }
    } else if (fish1.temperament === "peaceful" && fish2.temperament === "peaceful") {
        score += 2;
    }

    // Size difference check
    const sizeRatio = Math.max(fish1.maxSize, fish2.maxSize) / Math.min(fish1.maxSize, fish2.maxSize);
    if (sizeRatio > 4) {
        reasons.push("فارق الحجم كبير جداً - السمكة الكبيرة قد تأكل الصغيرة");
        score -= 2;
    } else if (sizeRatio > 2.5) {
        reasons.push("فارق الحجم ملحوظ - راقب السلوك");
        score -= 1;
    }

    // Water hardness
    if (fish1.waterParameters.hardness !== fish2.waterParameters.hardness) {
        reasons.push("متطلبات صلابة المياه مختلفة");
        score -= 1;
    }

    // Check explicit compatibility
    const fish1AvoidList = fish1.compatibility.avoidWith.map(s => s.toLowerCase());
    const fish2AvoidList = fish2.compatibility.avoidWith.map(s => s.toLowerCase());

    if (fish1AvoidList.some(avoid =>
        fish2.commonName.toLowerCase().includes(avoid) ||
        fish2.category.toLowerCase().includes(avoid)
    )) {
        reasons.push(`${fish1.arabicName} لا يُنصح بوضعها مع ${fish2.arabicName}`);
        score -= 2;
    }

    if (fish2AvoidList.some(avoid =>
        fish1.commonName.toLowerCase().includes(avoid) ||
        fish1.category.toLowerCase().includes(avoid)
    )) {
        reasons.push(`${fish2.arabicName} لا يُنصح بوضعها مع ${fish1.arabicName}`);
        score -= 2;
    }

    // Determine level
    if (score >= 4) {
        return { level: "compatible", reasons: reasons.length ? reasons : ["متوافقة تماماً!"] };
    } else if (score >= 0) {
        return { level: "caution", reasons: reasons.length ? reasons : ["توافق جزئي"] };
    } else {
        return { level: "incompatible", reasons };
    }
}

export function FishComparisonTool({ className }: FishComparisonToolProps) {
    const [selectedFish, setSelectedFish] = useState<FishSpecies[]>([]);
    const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: freshwaterFish = [] } = useFishData();
    const maxFish = 4;

    // Filter fish for selection
    const filteredFish = useMemo(() => {
        if (!searchQuery) return freshwaterFish;
        const query = searchQuery.toLowerCase();
        return freshwaterFish.filter(
            (fish) =>
                fish.arabicName.toLowerCase().includes(query) ||
                fish.commonName.toLowerCase().includes(query)
        );
    }, [searchQuery, freshwaterFish]);

    const addFish = (fish: FishSpecies) => {
        if (selectedFish.length < maxFish && !selectedFish.find((f) => f.id === fish.id)) {
            setSelectedFish([...selectedFish, fish]);
        }
        setIsSelectDialogOpen(false);
        setSearchQuery("");
    };

    const removeFish = (fishId: string) => {
        setSelectedFish(selectedFish.filter((f) => f.id !== fishId));
    };

    // Calculate pairwise compatibility
    const compatibilityMatrix = useMemo(() => {
        const matrix: Map<string, CompatibilityResult> = new Map();
        for (let i = 0; i < selectedFish.length; i++) {
            for (let j = i + 1; j < selectedFish.length; j++) {
                const key = `${selectedFish[i].id}-${selectedFish[j].id}`;
                matrix.set(key, checkCompatibility(selectedFish[i], selectedFish[j]));
            }
        }
        return matrix;
    }, [selectedFish]);

    // Overall compatibility
    const overallCompatibility = useMemo(() => {
        if (selectedFish.length < 2) return null;
        const results = Array.from(compatibilityMatrix.values());
        if (results.some((r) => r.level === "incompatible")) return "incompatible";
        if (results.some((r) => r.level === "caution")) return "caution";
        return "compatible";
    }, [compatibilityMatrix, selectedFish.length]);

    const getCompatibilityIcon = (level: CompatibilityLevel) => {
        switch (level) {
            case "compatible":
                return <Check className="h-5 w-5 text-green-500" />;
            case "caution":
                return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case "incompatible":
                return <XCircle className="h-5 w-5 text-red-500" />;
        }
    };

    const getCompatibilityBadge = (level: CompatibilityLevel) => {
        switch (level) {
            case "compatible":
                return <Badge className="bg-green-500 hover:bg-green-600">متوافقة ✓</Badge>;
            case "caution":
                return <Badge className="bg-amber-500 hover:bg-amber-600">حذر ⚠</Badge>;
            case "incompatible":
                return <Badge className="bg-red-500 hover:bg-red-600">غير متوافقة ✗</Badge>;
        }
    };

    const getCareLevelArabic = (level: string) => {
        switch (level) {
            case "beginner": return "مبتدئ";
            case "intermediate": return "متوسط";
            case "advanced": return "متقدم";
            default: return level;
        }
    };

    const getTemperamentArabic = (temp: string) => {
        switch (temp) {
            case "peaceful": return "سلمي";
            case "semi-aggressive": return "شبه عدواني";
            case "aggressive": return "عدواني";
            default: return temp;
        }
    };

    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-right">
                    <Scale className="h-5 w-5 text-primary" />
                    أداة مقارنة الأسماك
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Selected Fish */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {selectedFish.map((fish) => (
                        <div
                            key={fish.id}
                            className="flex items-center gap-2 bg-muted/50 rounded-full pl-2 pr-4 py-1"
                        >
                            <button
                                onClick={() => removeFish(fish.id)}
                                className="p-1 hover:bg-destructive/20 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </button>
                            <img
                                src={fish.image}
                                alt={fish.arabicName}
                                className="w-8 h-8 rounded-full object-contain bg-white"
                            />
                            <span className="font-medium text-sm">{fish.arabicName}</span>
                        </div>
                    ))}

                    {selectedFish.length < maxFish && (
                        <Dialog open={isSelectDialogOpen} onOpenChange={setIsSelectDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-full gap-1">
                                    <Plus className="h-4 w-4" />
                                    إضافة سمكة
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-right">اختر سمكة للمقارنة</DialogTitle>
                                </DialogHeader>
                                <div className="relative mb-4">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ابحث عن سمكة..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pr-10 text-right"
                                        dir="rtl"
                                    />
                                </div>
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-2">
                                        {filteredFish.map((fish) => {
                                            const isSelected = selectedFish.some((f) => f.id === fish.id);
                                            return (
                                                <button
                                                    key={fish.id}
                                                    onClick={() => !isSelected && addFish(fish)}
                                                    disabled={isSelected}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right",
                                                        isSelected
                                                            ? "bg-muted/50 opacity-50 cursor-not-allowed"
                                                            : "hover:bg-muted"
                                                    )}
                                                >
                                                    <img
                                                        src={fish.image}
                                                        alt={fish.arabicName}
                                                        className="w-12 h-12 rounded-lg object-contain bg-white"
                                                    />
                                                    <div className="flex-1 text-right">
                                                        <p className="font-medium">{fish.arabicName}</p>
                                                        <p className="text-sm text-muted-foreground italic">
                                                            {fish.scientificName}
                                                        </p>
                                                    </div>
                                                    {isSelected && <Check className="h-5 w-5 text-primary" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Overall Compatibility */}
                {overallCompatibility && (
                    <div className="mb-6 p-4 rounded-xl bg-muted/30 border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">التوافق الإجمالي:</span>
                            {getCompatibilityBadge(overallCompatibility)}
                        </div>
                    </div>
                )}

                {/* Compatibility Matrix */}
                {selectedFish.length >= 2 && (
                    <div className="mb-6">
                        <h4 className="font-medium mb-3 text-right">مصفوفة التوافق</h4>
                        <div className="space-y-3">
                            {Array.from(compatibilityMatrix.entries()).map(([key, result]) => {
                                const [id1, id2] = key.split("-");
                                const fish1 = selectedFish.find((f) => f.id === id1);
                                const fish2 = selectedFish.find((f) => f.id === id2);
                                if (!fish1 || !fish2) return null;

                                return (
                                    <div
                                        key={key}
                                        className={cn(
                                            "p-3 rounded-lg border",
                                            result.level === "compatible" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                                            result.level === "caution" && "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
                                            result.level === "incompatible" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <img src={fish1.image} alt="" className="w-8 h-8 rounded-full object-contain bg-white" />
                                                <span className="font-medium text-sm">{fish1.arabicName}</span>
                                            </div>
                                            {getCompatibilityIcon(result.level)}
                                            <div className="flex items-center gap-2">
                                                <img src={fish2.image} alt="" className="w-8 h-8 rounded-full object-contain bg-white" />
                                                <span className="font-medium text-sm">{fish2.arabicName}</span>
                                            </div>
                                        </div>
                                        <ul className="text-sm text-muted-foreground space-y-1 text-right">
                                            {result.reasons.map((reason, i) => (
                                                <li key={i}>• {reason}</li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Comparison Table */}
                {selectedFish.length >= 1 && (
                    <>
                        <Separator className="my-6" />
                        <h4 className="font-medium mb-4 text-right">جدول المقارنة</h4>
                        <div className="overflow-x-auto">
                            <table role="table" className="w-full text-sm">
                                <caption className="sr-only">جدول مقارنة خصائص الأسماك</caption>
                                <thead>
                                    <tr className="border-b">
                                        <th scope="col" className="text-right p-3 font-medium text-muted-foreground">الخاصية</th>
                                        {selectedFish.map((fish) => (
                                            <th key={fish.id} scope="col" className="p-3 text-center min-w-[120px]">
                                                <div className="flex flex-col items-center gap-2">
                                                    <img
                                                        src={fish.image}
                                                        alt={fish.arabicName}
                                                        className="w-12 h-12 rounded-lg object-contain bg-muted"
                                                    />
                                                    <span className="font-medium">{fish.arabicName}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b">
                                        <td className="p-3 text-right flex items-center gap-2">
                                            <Ruler className="h-4 w-4 text-muted-foreground" />
                                            الحجم (سم)
                                        </td>
                                        {selectedFish.map((fish) => (
                                            <td key={fish.id} className="p-3 text-center">
                                                {fish.minSize} - {fish.maxSize}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 text-right flex items-center gap-2">
                                            <Thermometer className="h-4 w-4 text-muted-foreground" />
                                            الحرارة (°م)
                                        </td>
                                        {selectedFish.map((fish) => (
                                            <td key={fish.id} className="p-3 text-center">
                                                {fish.waterParameters.tempMin} - {fish.waterParameters.tempMax}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 text-right flex items-center gap-2">
                                            <Droplets className="h-4 w-4 text-muted-foreground" />
                                            الحموضة (pH)
                                        </td>
                                        {selectedFish.map((fish) => (
                                            <td key={fish.id} className="p-3 text-center">
                                                {fish.waterParameters.phMin} - {fish.waterParameters.phMax}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 text-right flex items-center gap-2">
                                            <Fish className="h-4 w-4 text-muted-foreground" />
                                            حجم الحوض (لتر)
                                        </td>
                                        {selectedFish.map((fish) => (
                                            <td key={fish.id} className="p-3 text-center">{fish.minTankSize}+</td>
                                        ))}
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 text-right flex items-center gap-2">
                                            <Heart className="h-4 w-4 text-muted-foreground" />
                                            مستوى الرعاية
                                        </td>
                                        {selectedFish.map((fish) => (
                                            <td key={fish.id} className="p-3 text-center">
                                                <Badge variant="outline">{getCareLevelArabic(fish.careLevel)}</Badge>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 text-right flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            الطباع
                                        </td>
                                        {selectedFish.map((fish) => (
                                            <td key={fish.id} className="p-3 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        fish.temperament === "peaceful" && "border-green-500 text-green-600",
                                                        fish.temperament === "semi-aggressive" && "border-amber-500 text-amber-600",
                                                        fish.temperament === "aggressive" && "border-red-500 text-red-600"
                                                    )}
                                                >
                                                    {getTemperamentArabic(fish.temperament)}
                                                </Badge>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 text-right">العمر (سنة)</td>
                                        {selectedFish.map((fish) => (
                                            <td key={fish.id} className="p-3 text-center">{fish.lifespan}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {selectedFish.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Scale className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>أضف سمكتين أو أكثر لبدء المقارنة</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
