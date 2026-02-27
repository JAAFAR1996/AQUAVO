import { useState, useMemo } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { MetaTags } from "@/components/seo/meta-tags";
import {
    Fish,
    Droplets,
    Thermometer,
    Lightbulb,
    ShoppingCart,
    ChevronRight,
    ChevronLeft,
    Check,
    Sparkles,
    Waves,
    UtensilsCrossed,
    Ruler,
    Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/types";

// Wizard steps (3 steps instead of 4)
const STEPS = [
    { id: 1, title: "حجم الحوض", icon: Ruler },
    { id: 2, title: "نوع أسماكك", icon: Fish },
    { id: 3, title: "التوصيات الذكية", icon: Sparkles },
];

// Quick-select preset tank sizes in liters
const PRESET_SIZES = [20, 50, 100, 150, 200, 300];

// Fish types the customer might OWN (not selling fish)
const FISH_TYPES = [
    { id: "goldfish", label: "أسماك ذهبية", icon: "🐠", description: "سهلة الرعاية، ألوان زاهية", difficulty: "مبتدئ", needsHeater: false },
    { id: "tropical", label: "أسماك استوائية", icon: "🐡", description: "ألوان متنوعة، ماء دافئ", difficulty: "متوسط", needsHeater: true },
    { id: "betta", label: "بيتا (السيامي)", icon: "🐟", description: "جميلة، تعيش منفردة", difficulty: "مبتدئ", needsHeater: true },
    { id: "cichlid", label: "سيكليد", icon: "🐠", description: "ألوان مذهلة، شخصية قوية", difficulty: "متقدم", needsHeater: true },
    { id: "community", label: "مجتمع متنوع", icon: "🐠", description: "أنواع متعددة متوافقة", difficulty: "متوسط", needsHeater: true },
    { id: "planted", label: "حوض نباتي", icon: "🌿", description: "نباتات + أسماك صغيرة", difficulty: "متوسط", needsHeater: true },
];

// Equipment recommendation rules based on tank size and fish type
// Maps to REAL product categories in the database
const RECOMMENDATION_GROUPS = [
    {
        key: "filtration",
        label: "💧 الفلتر المناسب",
        icon: Droplets,
        categoryKeywords: ["filtration", "فلتر", "filter"],
        getReason: (liters: number) => `فلتر مناسب لحوض ${liters} لتر`,
    },
    {
        key: "food",
        label: "🍽️ الأكل المناسب",
        icon: UtensilsCrossed,
        categoryKeywords: ["food", "أغذية", "أكل", "طعام", "أعلاف", "feed"],
        getReason: (_liters: number, fishLabel: string) => `طعام مناسب لـ${fishLabel}`,
    },
    {
        key: "heating",
        label: "🌡️ السخان",
        icon: Thermometer,
        categoryKeywords: ["heating", "سخان", "heater"],
        getReason: (liters: number) => `سخان مناسب لحوض ${liters} لتر`,
    },
    {
        key: "lighting",
        label: "💡 الإضاءة",
        icon: Lightbulb,
        categoryKeywords: ["lighting", "إضاءة", "light", "led"],
        getReason: (liters: number) => `إضاءة مناسبة لحوض ${liters} لتر`,
    },
    {
        key: "water-care",
        label: "🧪 العناية بالماء",
        icon: Waves,
        categoryKeywords: ["water-care", "water", "مكيف", "conditioner", "معالج"],
        getReason: () => "ضروري لصحة الأسماك وتهيئة الماء",
    },
];

// Get tank size label from liters
function getTankLabel(liters: number): string {
    if (liters <= 30) return "حوض صغير 🐟";
    if (liters <= 80) return "حوض متوسط 🐠";
    if (liters <= 200) return "حوض كبير 🐡";
    return "حوض ضخم 🐳";
}

export default function AquariumWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [tankLiters, setTankLiters] = useState<number>(0);
    const [fishType, setFishType] = useState<string>("");
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

    const { addItem } = useCart();
    const { toast } = useToast();

    // Fetch products from REAL database
    const { data: productsData, isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    const products = productsData?.products || [];

    // Calculate progress
    const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

    const selectedFish = FISH_TYPES.find(f => f.id === fishType);

    // Get recommended products grouped by category
    const recommendationsByGroup = useMemo(() => {
        if (!tankLiters || !fishType) return [];

        const groups = RECOMMENDATION_GROUPS
            // Filter out heater if fish doesn't need it
            .filter(group => {
                if (group.key === "heating" && selectedFish && !selectedFish.needsHeater) {
                    return false;
                }
                return true;
            })
            .map(group => {
                // Match products by category keywords
                const matchingProducts = products.filter((p: Product) => {
                    const cat = (p.category || "").toLowerCase();
                    const subcat = (p.subcategory || "").toLowerCase();
                    const name = (p.name || "").toLowerCase();

                    return group.categoryKeywords.some(keyword => {
                        const kw = keyword.toLowerCase();
                        return cat.includes(kw) || subcat.includes(kw) || name.includes(kw);
                    });
                });

                // Sort by rating, pick top 3
                const topProducts = matchingProducts
                    .sort((a: Product, b: Product) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
                    .slice(0, 3);

                return {
                    ...group,
                    products: topProducts,
                    reason: group.getReason(tankLiters, selectedFish?.label || ""),
                };
            })
            .filter(group => group.products.length > 0);

        return groups;
    }, [tankLiters, fishType, products, selectedFish]);

    // Flatten all recommended products
    const allRecommended = useMemo(
        () => recommendationsByGroup.flatMap(g => g.products),
        [recommendationsByGroup]
    );

    // Calculate total price
    const totalPrice = useMemo(() => {
        return allRecommended
            .filter(p => selectedProducts.has(p.id))
            .reduce((sum, p) => sum + Number(p.price), 0);
    }, [allRecommended, selectedProducts]);

    // Handle add all selected to cart
    const handleAddAllToCart = () => {
        const productsToAdd = allRecommended.filter(p => selectedProducts.has(p.id));
        productsToAdd.forEach(product => {
            addItem(product, 1);
        });
        toast({
            title: "🎉 تمت الإضافة!",
            description: `تم إضافة ${productsToAdd.length} منتجات إلى سلة التسوق`,
        });
    };

    // Toggle product selection
    const toggleProduct = (productId: string) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedProducts(newSelected);
    };

    // Select all products
    const selectAllProducts = () => {
        setSelectedProducts(new Set(allRecommended.map(p => p.id)));
    };

    // Navigation
    const canProceed = () => {
        switch (currentStep) {
            case 1: return tankLiters >= 10;
            case 2: return !!fishType;
            case 3: return selectedProducts.size > 0;
            default: return false;
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length && canProceed()) {
            setCurrentStep(currentStep + 1);
            // Auto-select all products when reaching recommendations step
            if (currentStep === 2) {
                setTimeout(() => selectAllProducts(), 100);
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Handle liter input change
    const handleLitersChange = (value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
            setTankLiters(0);
        } else if (num > 2000) {
            setTankLiters(2000);
        } else {
            setTankLiters(num);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
            <MetaTags
                title="مساعد إنشاء الحوض | AQUAVO"
                description="دليلك التفاعلي لإنشاء حوض أسماك مثالي. حدد الحجم واختر نوع أسماكك واحصل على توصيات مخصصة للمعدات والأكل."
            />
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                        <Sparkles className="w-4 h-4 ml-1" />
                        مساعد ذكي
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        🧙 مساعد إنشاء الحوض
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        حدد حجم حوضك ونوع أسماكك واحصل على توصيات مخصصة من منتجاتنا
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="max-w-3xl mx-auto mb-8">
                    <div className="flex justify-between mb-2">
                        {STEPS.map((step) => {
                            const Icon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;

                            return (
                                <div
                                    key={step.id}
                                    className={cn(
                                        "flex flex-col items-center gap-1 transition-all",
                                        isActive && "scale-110",
                                        isCompleted && "text-primary"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                                            isActive && "bg-primary text-white border-primary shadow-lg",
                                            isCompleted && "bg-primary/20 border-primary text-primary",
                                            !isActive && !isCompleted && "bg-muted border-muted-foreground/20"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <Icon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <span className="text-xs font-medium hidden sm:block">
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Step Content */}
                <Card className="max-w-3xl mx-auto shadow-xl border-primary/10">
                    <CardHeader className="text-center border-b bg-muted/30">
                        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                            {(() => {
                                const Icon = STEPS[currentStep - 1].icon;
                                return <Icon className="w-6 h-6 text-primary" />;
                            })()}
                            {STEPS[currentStep - 1].title}
                        </CardTitle>
                        <CardDescription>
                            الخطوة {currentStep} من {STEPS.length}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* ═══════════════════════════════════════════════ */}
                        {/* Step 1: Tank Size in Liters (manual input)     */}
                        {/* ═══════════════════════════════════════════════ */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                {/* Main input */}
                                <div className="text-center space-y-4">
                                    <label htmlFor="tank-liters" className="text-lg font-semibold block">
                                        كم حجم حوضك باللتر؟
                                    </label>
                                    <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
                                        <Input
                                            id="tank-liters"
                                            type="number"
                                            min={10}
                                            max={2000}
                                            value={tankLiters || ""}
                                            onChange={(e) => handleLitersChange(e.target.value)}
                                            placeholder="مثال: 100"
                                            className="text-center text-2xl font-bold h-14 text-primary"
                                        />
                                        <span className="text-lg font-medium text-muted-foreground whitespace-nowrap">لتر</span>
                                    </div>

                                    {/* Dynamic tank label */}
                                    {tankLiters >= 10 && (
                                        <p className="text-primary font-semibold text-lg animate-in fade-in">
                                            {getTankLabel(tankLiters)}
                                        </p>
                                    )}
                                </div>

                                {/* Quick-select preset buttons */}
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground text-center">أو اختر حجم سريع:</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {PRESET_SIZES.map((size) => (
                                            <Button
                                                key={size}
                                                variant={tankLiters === size ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setTankLiters(size)}
                                                className={cn(
                                                    "min-w-[70px] transition-all",
                                                    tankLiters === size && "shadow-lg scale-105"
                                                )}
                                            >
                                                {size}L
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Info tip */}
                                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-muted-foreground">
                                    <Info className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
                                    <p>
                                        إذا ما تعرف حجم حوضك باللتر، احسبه: الطول × العرض × الارتفاع (بالسنتيمتر) ÷ 1000
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════ */}
                        {/* Step 2: Fish Type (what fish do you OWN)       */}
                        {/* ═══════════════════════════════════════════════ */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <p className="text-center text-muted-foreground mb-4">
                                    شنو نوع الأسماك اللي عندك (أو تخطط تربيها)؟
                                </p>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {FISH_TYPES.map((fish) => (
                                        <div
                                            key={fish.id}
                                            onClick={() => setFishType(fish.id)}
                                            className={cn(
                                                "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                                                fishType === fish.id && "border-primary bg-primary/10 shadow-md"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 transition-all",
                                                fishType === fish.id
                                                    ? "bg-primary border-primary text-white"
                                                    : "border-muted-foreground/30"
                                            )}>
                                                {fishType === fish.id && <Check className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{fish.icon}</span>
                                                    <span className="font-bold">{fish.label}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {fish.description}
                                                </p>
                                                <Badge variant="outline" className="mt-2">
                                                    {fish.difficulty}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════ */}
                        {/* Step 3: Smart Recommendations from OUR products */}
                        {/* ═══════════════════════════════════════════════ */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                {/* Summary of choices */}
                                <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                                    <Badge variant="secondary" className="gap-1">
                                        <Ruler className="w-3 h-3" />
                                        {tankLiters} لتر
                                    </Badge>
                                    <Badge variant="secondary" className="gap-1">
                                        <Fish className="w-3 h-3" />
                                        {selectedFish?.label}
                                    </Badge>
                                </div>

                                {isLoading ? (
                                    <div className="text-center py-8">
                                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-muted-foreground">جاري تحميل المنتجات...</p>
                                    </div>
                                ) : recommendationsByGroup.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>لا توجد منتجات متطابقة حالياً</p>
                                        <p className="text-sm">جرب تغيير نوع الأسماك أو حجم الحوض</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <p className="text-muted-foreground text-sm">
                                                نرشحلك هالمنتجات بناءً على حوضك وأسماكك 👇
                                            </p>
                                            <Button variant="outline" size="sm" onClick={selectAllProducts}>
                                                تحديد الكل
                                            </Button>
                                        </div>

                                        {/* Products grouped by category */}
                                        {recommendationsByGroup.map((group) => {
                                            const GroupIcon = group.icon;
                                            return (
                                                <div key={group.key} className="space-y-3">
                                                    {/* Category header */}
                                                    <div className="flex items-center gap-2">
                                                        <GroupIcon className="w-5 h-5 text-primary" />
                                                        <h3 className="font-bold text-lg">{group.label}</h3>
                                                        <span className="text-xs text-muted-foreground">— {group.reason}</span>
                                                    </div>

                                                    {/* Products in this category */}
                                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                        {group.products.map((product) => (
                                                            <div
                                                                key={product.id}
                                                                onClick={() => toggleProduct(product.id)}
                                                                className={cn(
                                                                    "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50",
                                                                    selectedProducts.has(product.id) && "border-primary bg-primary/10"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                                                    selectedProducts.has(product.id)
                                                                        ? "bg-primary border-primary text-white"
                                                                        : "border-muted-foreground/30"
                                                                )}>
                                                                    {selectedProducts.has(product.id) && <Check className="w-3 h-3" />}
                                                                </div>
                                                                <img
                                                                    src={product.thumbnail || product.image || "/placeholder-product.svg"}
                                                                    alt={product.name}
                                                                    className="w-14 h-14 object-contain rounded-lg bg-white flex-shrink-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                                                                    <p className="text-primary font-bold text-sm">
                                                                        {Number(product.price).toLocaleString('en-US')} د.ع
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Total and add to cart */}
                                        {selectedProducts.size > 0 && (
                                            <Card className="bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/20">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">
                                                                المنتجات المختارة: {selectedProducts.size}
                                                            </p>
                                                            <p className="text-2xl font-bold text-primary">
                                                                {totalPrice.toLocaleString('en-US')} د.ع
                                                            </p>
                                                        </div>
                                                        <Button size="lg" onClick={handleAddAllToCart} className="gap-2">
                                                            <ShoppingCart className="w-5 h-5" />
                                                            أضف الكل للسلة
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-6 border-t">
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                className="gap-2"
                            >
                                <ChevronRight className="w-4 h-4" />
                                السابق
                            </Button>

                            {currentStep < STEPS.length ? (
                                <Button
                                    onClick={nextStep}
                                    disabled={!canProceed()}
                                    className="gap-2"
                                >
                                    التالي
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleAddAllToCart}
                                    disabled={selectedProducts.size === 0}
                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    إتمام الشراء
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Card - show selections made so far */}
                {(tankLiters >= 10 || fishType) && (
                    <Card className="max-w-3xl mx-auto mt-6 bg-muted/30">
                        <CardContent className="p-4">
                            <h4 className="font-semibold mb-3">📋 ملخص اختياراتك:</h4>
                            <div className="flex flex-wrap gap-2">
                                {tankLiters >= 10 && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Ruler className="w-3 h-3" />
                                        {tankLiters} لتر — {getTankLabel(tankLiters)}
                                    </Badge>
                                )}
                                {fishType && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Fish className="w-3 h-3" />
                                        {selectedFish?.label}
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>

            <Footer />
        </div>
    );
}
