import { useRef, useState, useEffect, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Waves,
    Sun,
    Gem,
    Droplets,
    Settings,
    Wind,
    Box,
    Activity,
    Trash2,
    Flame,
} from "lucide-react";
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

// These legacy/owner-rejected categories must never be rendered, even if an
// old server/CDN response briefly contains them.
const HIDDEN_CATEGORY_NAMES = new Set([
    "Filter media",
    "air-pumps",
    "maintenance/cleaning",
    "measurement",
    "substrates",
    "الأدوات",
    "الإكسسوارات",
    "المضخات وتدوير المياه",
]);

// Maps display group → actual product category values.
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
        includes: ["tanks", "أحواض", "aquariums", "tank", "حوض"],
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
        color: "text-muted-foreground dark:text-slate-400",
    },
    "تربة وديكور": {
        label: "تربة وديكور",
        icon: Gem,
        includes: ["تربة وديكور"],
        color: "text-amber-600",
    },
    "العزل والتفريخ": {
        label: "العزل والتفريخ",
        icon: Settings,
        includes: ["العزل والتفريخ"],
        color: "text-violet-500",
    },
};

const CATEGORY_ORDER = [
    "سخانات",
    "فلاتر",
    "مضخات وهواء",
    "إضاءة",
    "أحواض",
    "أكل",
    "علاجات ومحسنات",
    "فحص المي",
    "تنظيف",
    "تربة وديكور",
    "العزل والتفريخ",
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

    const organizedCategories = useMemo(() => {
        // Do not render empty database categories. This prevents legacy rows from
        // becoming visible chips while still allowing all live product groups.
        const visibleCategories = categories.filter(category => {
            if (!category || HIDDEN_CATEGORY_NAMES.has(category)) return false;
            if (!categoryCounts) return true;
            return (categoryCounts.get(category) ?? 0) > 0;
        });

        const used = new Set<string>();
        const result: Array<{
            key: string;
            config: CategoryConfig;
            rawCategories: string[];
            totalCount: number;
        }> = [];

        for (const key of CATEGORY_ORDER) {
            const config = CATEGORY_CONFIG[key];
            if (!config) continue;

            const matchingRaw = visibleCategories.filter(category =>
                !used.has(category) &&
                config.includes.some(include =>
                    category.toLowerCase() === include.toLowerCase() || category === include
                )
            );

            if (matchingRaw.length === 0) continue;

            matchingRaw.forEach(category => used.add(category));
            const totalCount = matchingRaw.reduce(
                (sum, category) => sum + (categoryCounts?.get(category) ?? 0),
                0,
            );
            result.push({ key, config, rawCategories: matchingRaw, totalCount });
        }

        // Keep any legitimate new live category visible without reintroducing
        // rejected or zero-product legacy rows.
        visibleCategories
            .filter(category => !used.has(category))
            .forEach(category => {
                result.push({
                    key: category,
                    config: {
                        label: category,
                        icon: Settings,
                        includes: [category],
                        color: "text-muted-foreground",
                    },
                    rawCategories: [category],
                    totalCount: categoryCounts?.get(category) ?? 0,
                });
            });

        return result;
    }, [categories, categoryCounts]);

    const isGroupSelected = (rawCategories: string[]) =>
        rawCategories.some(category => selectedCategories.includes(category));

    const toggleGroup = (rawCategories: string[]) => {
        const isSelected = isGroupSelected(rawCategories);
        selectedCategories.forEach(category => onCategoryToggle(category));
        if (!isSelected) {
            rawCategories.forEach(category => onCategoryToggle(category));
        }
    };

    const clearAll = () => {
        selectedCategories.forEach(category => onCategoryToggle(category));
    };

    const checkScrollPosition = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const isRTL = document.documentElement.dir === "rtl";

        if (isRTL) {
            setShowRightArrow(scrollLeft > -(scrollWidth - clientWidth - 10));
            setShowLeftArrow(scrollLeft < 0);
        } else {
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScrollPosition();
        const element = scrollRef.current;
        if (!element) return;

        element.addEventListener("scroll", checkScrollPosition, { passive: true });
        window.addEventListener("resize", checkScrollPosition);
        return () => {
            element.removeEventListener("scroll", checkScrollPosition);
            window.removeEventListener("resize", checkScrollPosition);
        };
    }, [categories]);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const isRTL = document.documentElement.dir === "rtl";
        scrollRef.current.scrollBy({
            left: isRTL
                ? direction === "right" ? -220 : 220
                : direction === "left" ? -220 : 220,
            behavior: "smooth",
        });
    };

    if (organizedCategories.length === 0) return null;

    const allSelected = selectedCategories.length === 0;

    return (
        <div className="bg-background border-b border-border/40">
            <div
                className="sm:hidden flex items-center gap-2 overflow-x-auto py-3 px-3"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <button
                    onClick={clearAll}
                    className={cn(
                        "flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[56px]",
                        allSelected
                            ? "bg-primary text-foreground dark:text-white border-primary shadow-sm"
                            : "bg-muted/50 border-border/40 text-muted-foreground",
                    )}
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-[11px] font-medium leading-[1.4]">الكل</span>
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
                                    ? "bg-primary text-foreground dark:text-white border-primary shadow-sm"
                                    : "bg-muted/50 border-border/40 text-muted-foreground",
                            )}
                        >
                            <Icon className={cn("w-4 h-4", !isSelected && config.color)} />
                            <span className="text-[11px] font-medium leading-[1.4] whitespace-nowrap">
                                {config.label}
                                {totalCount > 0 && !isSelected && (
                                    <span className="mr-0.5 rounded-full bg-card dark:bg-[#0B1E28] px-1 py-px text-foreground dark:text-[#F6F4EF]">
                                        ({totalCount})
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

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
                    <button
                        onClick={clearAll}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 min-h-11",
                            allSelected
                                ? "bg-primary text-foreground dark:text-white border-primary shadow-md"
                                : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground",
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
                                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 min-h-11",
                                    isSelected
                                        ? "bg-primary text-foreground dark:text-white border-primary shadow-md"
                                        : "bg-muted/40 border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                )}
                            >
                                <Icon className={cn(
                                    "w-3.5 h-3.5",
                                    isSelected ? "text-foreground dark:text-white" : config.color,
                                )} />
                                <span>{config.label}</span>
                                {totalCount > 0 && (
                                    <span className={cn(
                                        "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                                        isSelected
                                            ? "bg-[#075F6B] text-[#F6F4EF]"
                                            : "bg-card dark:bg-[#0B1E28] text-foreground dark:text-[#F6F4EF]",
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
