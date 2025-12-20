import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    Thermometer,
    Wind,
    Lightbulb,
    Package,
    Pill,
    Droplets,
    FlaskConical,
    Sparkles,
    Waves,
    Leaf,
    Brush,
    Gauge,
    Box,
    Palette,
    Mountain,
    Image,
    Trees,
    LucideIcon,
} from "lucide-react";

interface CategoryCardProps {
    name: string;
    icon: LucideIcon;
    color: string;
    isSelected: boolean;
    onClick: () => void;
}

/**
 * Single category card component
 */
const CategoryCard = ({ name, icon: Icon, color, isSelected, onClick }: CategoryCardProps) => (
    <Card
        onClick={onClick}
        className={cn(
            "cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg",
            isSelected
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-muted/50"
        )}
    >
        <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                color
            )}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-center">{name}</span>
        </CardContent>
    </Card>
);

/**
 * Category configuration with icons and colors
 */
const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
    "إضاءات": { icon: Lightbulb, color: "bg-yellow-500" },
    "طعام الأسماك": { icon: Package, color: "bg-orange-500" },
    "الأدوية": { icon: Pill, color: "bg-red-500" },
    "معالجة المياه": { icon: Droplets, color: "bg-blue-500" },
    "مجموعات الاختبار": { icon: FlaskConical, color: "bg-purple-500" },
    "الملح والمعادن": { icon: Sparkles, color: "bg-cyan-500" },
    "البكتيريا النافعة": { icon: Waves, color: "bg-green-500" },
    "مكافحة الطحالب": { icon: Leaf, color: "bg-emerald-500" },
    "فيتامينات المياه العذبة": { icon: Droplets, color: "bg-teal-500" },
    "مكملات غذائية": { icon: Package, color: "bg-amber-500" },
    "اكسسوارات": { icon: Brush, color: "bg-pink-500" },
    "ادوات فلتر": { icon: Wind, color: "bg-slate-500" },
    "أجهزة القياس والحرارة": { icon: Gauge, color: "bg-indigo-500" },
    "سخانات": { icon: Thermometer, color: "bg-red-600" },
    "فلاتر ماء": { icon: Wind, color: "bg-blue-600" },
    "مضخات هواء": { icon: Wind, color: "bg-sky-500" },
    "ديكور": { icon: Palette, color: "bg-violet-500" },
    "صخور": { icon: Mountain, color: "bg-stone-500" },
    "خلفيات أحواض": { icon: Image, color: "bg-rose-500" },
    "ترب نباتية": { icon: Trees, color: "bg-lime-600" },
};

/**
 * Get icon and color for a category
 */
const getCategoryConfig = (categoryName: string) => {
    return CATEGORY_CONFIG[categoryName] || { icon: Box, color: "bg-gray-500" };
};

interface CategoryCardsGridProps {
    /** Available categories from API */
    categories: string[];
    /** Currently selected categories */
    selectedCategories: string[];
    /** Callback when category is selected/deselected */
    onCategoryToggle: (category: string) => void;
}

/**
 * Grid of category cards for filtering products
 */
export function CategoryCardsGrid({
    categories,
    selectedCategories,
    onCategoryToggle,
}: CategoryCardsGridProps) {
    if (categories.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-right">تصفح حسب الفئة</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {categories.map((category) => {
                    const { icon, color } = getCategoryConfig(category);
                    const isSelected = selectedCategories.includes(category);
                    return (
                        <CategoryCard
                            key={category}
                            name={category}
                            icon={icon}
                            color={color}
                            isSelected={isSelected}
                            onClick={() => onCategoryToggle(category)}
                        />
                    );
                })}
            </div>
            {selectedCategories.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground text-right">
                    الفئات المحددة: {selectedCategories.join(", ")}
                </div>
            )}
        </div>
    );
}

export default CategoryCardsGrid;
