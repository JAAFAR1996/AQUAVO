import { useRef, useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Waves, Sun, Gem, Droplets, Settings, Wind, Box, Activity, Trash2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CategoryScrollBarProps {
    categories: string[];
    selectedCategories: string[];
    onCategoryToggle: (category: string) => void;
    categoryCounts?: Map<string, number>;
}

interface CategoryConfig {
    label: string;
    icon: React.ElementType;
    includes: string[];
    color: string;
}

// Maps display group → actual DB category name variants (lowercase-compared)
const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    "سخانات": {
        label: "سخانات",
        icon: Flame,
        includes: [
            "heaters", "heating", "التحكم بالحرارة",
            "سخانات الحوض", "سخانات", "heater",
        ],
        color: "text-rose-500",
    },
    "فلاتر": {
        label: "فلاتر",
        icon: Waves,
        includes: [
            "filters", "filtration", "الفلترة والتنقية",
            "فلاتر المياه", "فلاتر", "water filters", "filter",
        ],
        color: "text-sky-500",
    },
    "مضخات وهواء": {
        label: "مضخات وهواء",
        icon: Wind,
        includes: [
            "التهوية والأكسجين", "مضخات الهواء", "مضخات",
            "pumps", "air pumps", "pump", "oxygen",
        ],
        color: "text-teal-500",
    },
    "إضاءة": {
        label: "إضاءة",
        icon: Sun,
        includes: [
            "lighting", "الإضاءة", "الإضاءة LED",
            "إضاءة", "led", "light",
        ],
        color: "text-yellow-400",
    },
    "أحواض": {
        label: "أحواض",
        icon: Box,
        includes: [
            "tanks", "أحواض", "aquariums", "tank", "حوض",
        ],
        color: "text-blue-500",
    },
    "أكل": {
        label: "أكل",
        icon: Droplets,
        includes: [
            "fish-food", "طعام الأسماك", "أغذية الأسماك",
            "غذاء", "طعام", "أغذية", "food", "fish food",
        ],
        color: "text-amber-500",
    },
    "علاجات ومحسنات": {
        label: "علاجات",
        icon: Gem,
        includes: [
            "water-treatment", "معالجة المياه", "معالجات المياه",
            "معالجات", "treatments", "water treatment", "conditioner",
        ],
        color: "text-cyan-400",
    },
    "فحص المي": {
        label: "فحص المي",
        icon: Activity,
        includes: [
            "monitoring", "الفحص والمراقبة", "فحص المياه",
            "اختبار المياه", "فحص", "testing", "test kits", "test",
        ],
        color: "text-green-400",
    },
    "تنظيف": {
        label: "تنظيف",
        icon: Trash2,
        includes: [
            "maintenance", "الصيانة والتنظيف", "تنظيف",
            "cleaning", "clean",
        ],
        color: "text-slate-400",
    },
    "إكسسوارات": {
        label: "إكسسوارات",
        icon: Settings,
        includes: [
            "accessories", "ملحقات ومستلزمات", "ملحقات", "إكسسوارات",
            "decoration", "خلفيات أحواض", "صخور", "substrate",
            "التربة والديكور", "التربية والديكور", "الديكورات", "ديكور",
            "decor", "breeding", "التفريخ والعزل", "misc",
        ],
        color: "text-violet-500",
    },
};

const CATEGORY_ORDER = [
    "سخانات", "فلاتر", "مضخات وهواء", "إضاءة",
    "أحواض", "أكل", "علاجات ومحسنات", "فحص المي", "تنظيف", "إكسسوارات",
];

export function CategoryScrollBar({
    categories,
    selectedCategories,
    onCategoryToggle,
    categoryCounts,
}: CategoryScrollBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // Map each raw DB category to a display group
    const organizedCategories = useMemo(() => {
        const used = new Set<string>();
        const result: { key: string; config: CategoryConfig; rawCategories: string[]; totalCount: number }[] = [];

        for (const key of CATEGORY_ORDER) {
            const config = CATEGORY_CONFIG[key];
            if (!config) continue;

            const matchingRaw = categories.filter(cat =>
                !used.has(cat) &&
                config.includes.some(inc => cat.toLowerCase() === inc.toLowerCase() || cat === inc)
            );

            if (matchingRaw.length > 0) {
                matchingRaw.forEach(c => used.add(c));
                let totalCount = 0;
                if (categoryCounts) {
                    matchingRaw.forEach(cat => { totalCount += categoryCounts.get(cat) || 0; });
                }
                result.push({ key, config, rawCategories: matchingRaw, totalCount });
            }
        }

        // Fallback: show any DB categories not matched above
        const unmatched = categories.filter(c => !used.has(c));
        unmatched.forEach(cat => {
            const count = categoryCounts?.get(cat) || 0;
            result.push({
                key: cat,
                config: { label: cat, icon: Settings, includes: [cat], color: "text-muted-foreground" },
                rawCategories: [cat],
                totalCount: count,
            });
        });

        return result;
    }, [categories, categoryCounts]);

    const isGroupSelected = (rawCategories: string[]) =>
        rawCategories.some(cat => selectedCategories.includes(cat));

    // Single-select behavior: clicking a group deselects all others first
    const toggleGroup = (rawCategories: string[]) => {
        const isSelected = isGroupSelected(rawCategories);
        // Clear all current selections
        selectedCategories.forEach(cat => onCategoryToggle(cat));
        if (!isSelected) {
            rawCategories.forEach(cat => onCategoryToggle(cat));
        }
    };

    const clearAll = () => {
        selectedCategories.forEach(cat => onCategoryToggle(cat));
    };

    const checkScrollPosition = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const isRTL = document.documentElement.dir === "rtl";
        if (isRTL) {
            setShowRightArrow(scrollLeft < 0);
            setShowLeftArrow(scrollLeft > -(scrollWidth - clientWidth));
        } else {
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScrollPosition();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", checkScrollPosition, { passive: true });
        window.addEventListener("resize", checkScrollPosition);
        return () => {
            el.removeEventListener("scroll", checkScrollPosition);
            window.removeEventListener("resize", checkScrollPosition);
        };
    }, [categories]);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const amount = 220;
        const isRTL = document.documentElement.dir === "rtl";
        scrollRef.current.scrollBy({
            left: isRTL
                ? direction === "right" ? -amount : amount
                : direction === "left" ? -amount : amount,
            behavior: "smooth",
        });
    };

    if (organizedCategories.length === 0) return null;

    const allSelected = selectedCategories.length === 0;

    return (
        <div className="bg-background border-b border-border/40">
            {/* ── MOBILE: horizontal chip scroll ── */}
            <div
                className="sm:hidden flex items-center gap-2 overflow-x-auto py-3 px-3"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {/* All */}
                <button
                    onClick={clearAll}
                    className={cn(
                        "flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[56px]",
                        allSelected
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-muted/50 border-border/40 text-muted-foreground"
                    )}
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-[11px] font-medium leading-none">الكل</span>
                </button>

                {organizedCategories.map(({ key, config, rawCategories, totalCount }) => {
                    const Icon = config.icon;
                    const isSelected = isGroupSelected(rawCategories);
                    return (
                        <button
                            key={key}
                            onClick={() => toggleGroup(rawCategories)}
                            className={cn(
                                "flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[56px]",
                                isSelected
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-muted/50 border-border/40 text-muted-foreground"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", !isSelected && config.color)} />
                            <span className="text-[11px] font-medium leading-none whitespace-nowrap">
                                {config.label}
                                {totalCount > 0 && !isSelected && (
                                    <span className="mr-0.5 rounded-full bg-[#0B1E28] px-1 py-px text-[#F6F4EF]">
                                        ({totalCount})
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── DESKTOP: scrollable pill row ── */}
            <div className="hidden sm:block relative">
                {showLeftArrow && (
                    <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1">
                        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="التمرير لعرض الفئات السابقة"
                            className="relative h-8 w-8 rounded-full bg-background/90 shadow border border-border/50"
                            onClick={() => scroll("left")}
                        >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
                )}
                {showRightArrow && (
                    <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1">
                        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="التمرير لعرض الفئات التالية"
                            className="relative h-8 w-8 rounded-full bg-background/90 shadow border border-border/50"
                            onClick={() => scroll("right")}
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
                )}

                <div
                    ref={scrollRef}
                    className="flex items-center gap-2 overflow-x-auto py-3 px-4"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {/* All */}
                    <button
                        onClick={clearAll}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
                            allSelected
                                ? "bg-primary text-white border-primary shadow-md"
                                : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>الكل</span>
                    </button>

                    <div className="w-px h-6 bg-border/40 flex-shrink-0" />

                    {organizedCategories.map(({ key, config, rawCategories, totalCount }) => {
                        const Icon = config.icon;
                        const isSelected = isGroupSelected(rawCategories);
                        return (
                            <button
                                key={key}
                                onClick={() => toggleGroup(rawCategories)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                                    isSelected
                                        ? "bg-primary text-white border-primary shadow-md"
                                        : "bg-muted/40 border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : config.color)} />
                                <span>{config.label}</span>
                                {totalCount > 0 && (
                                    <span className={cn(
                                        "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                                        isSelected ? "bg-[#075F6B] text-[#F6F4EF]" : "bg-[#0B1E28] text-[#F6F4EF]"
                                    )}>
                                        {totalCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
