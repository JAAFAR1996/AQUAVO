import { useState, useMemo } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
    Package,
    ShoppingCart,
    ChevronRight,
    ChevronLeft,
    Check,
    Sparkles,
    Waves,
    TreePine,
    Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/types";

// Wizard steps
const STEPS = [
    { id: 1, title: "حجم الحوض", icon: Droplets },
    { id: 2, title: "نوع الأسماك", icon: Fish },
    { id: 3, title: "الميزانية", icon: Package },
    { id: 4, title: "المعدات الموصى بها", icon: Sparkles },
];

// Tank sizes with recommendations
const TANK_SIZES = [
    { id: "small", label: "صغير", size: "20-40 لتر", liters: 30, description: "للمبتدئين - أسماك صغيرة" },
    { id: "medium", label: "متوسط", size: "50-100 لتر", liters: 75, description: "الأكثر شعبية - تنوع أكبر" },
    { id: "large", label: "كبير", size: "100-200 لتر", liters: 150, description: "للهواة - أسماك متنوعة" },
    { id: "xlarge", label: "ضخم", size: "200+ لتر", liters: 250, description: "للمحترفين - أسماك كبيرة" },
];

// Fish types
const FISH_TYPES = [
    { id: "goldfish", label: "أسماك ذهبية", icon: "🐠", description: "سهلة الرعاية، ألوان زاهية", difficulty: "مبتدئ" },
    { id: "tropical", label: "أسماك استوائية", icon: "🐡", description: "ألوان متنوعة، ماء دافئ", difficulty: "متوسط" },
    { id: "betta", label: "بيتا (السيامي)", icon: "🐟", description: "جميلة، تعيش منفردة", difficulty: "مبتدئ" },
    { id: "cichlid", label: "سيكليد", icon: "🐠", description: "ألوان مذهلة، شخصية قوية", difficulty: "متقدم" },
    { id: "community", label: "مجتمع متنوع", icon: "🐠", description: "أنواع متعددة متوافقة", difficulty: "متوسط" },
    { id: "planted", label: "حوض نباتي", icon: "🌿", description: "نباتات + أسماك صغيرة", difficulty: "متوسط" },
];

// Budget ranges
const BUDGET_RANGES = [
    { id: "budget", label: "اقتصادي", range: "50,000 - 100,000", min: 50000, max: 100000, description: "المعدات الأساسية" },
    { id: "standard", label: "معياري", range: "100,000 - 200,000", min: 100000, max: 200000, description: "جودة جيدة" },
    { id: "premium", label: "متميز", range: "200,000 - 400,000", min: 200000, max: 400000, description: "معدات احترافية" },
    { id: "luxury", label: "فاخر", range: "400,000+", min: 400000, max: 1000000, description: "أعلى جودة" },
];

// Equipment categories to recommend
const EQUIPMENT_CATEGORIES = [
    { category: "أحواض", icon: Waves, priority: 1 },
    { category: "فلاتر", icon: Droplets, priority: 2 },
    { category: "سخانات", icon: Thermometer, priority: 3 },
    { category: "إضاءة", icon: Lightbulb, priority: 4 },
    { category: "ديكور", icon: TreePine, priority: 5 },
    { category: "نباتات", icon: Leaf, priority: 6 },
];

export default function AquariumWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [tankSize, setTankSize] = useState<string>("");
    const [fishType, setFishType] = useState<string>("");
    const [budget, setBudget] = useState<string>("");
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

    const { addItem } = useCart();
    const { toast } = useToast();

    // Fetch products
    const { data: productsData } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    const products = productsData?.products || [];

    // Calculate progress
    const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

    // Get recommended products based on selections
    const recommendedProducts = useMemo(() => {
        if (!tankSize || !fishType || !budget) return [];

        const selectedTank = TANK_SIZES.find(t => t.id === tankSize);
        const selectedBudget = BUDGET_RANGES.find(b => b.id === budget);

        if (!selectedTank || !selectedBudget) return [];

        // Filter products by category and price
        const categorizedProducts: Record<string, Product[]> = {};

        EQUIPMENT_CATEGORIES.forEach(eq => {
            const categoryProducts = products.filter((p: Product) => {
                const matchesCategory = p.category?.includes(eq.category) ||
                    p.name?.includes(eq.category.slice(0, -1));
                const matchesPrice = p.price <= selectedBudget.max / 3; // Each item shouldn't exceed 1/3 of budget
                return matchesCategory && matchesPrice && (p.stock ?? 0) > 0;
            });

            if (categoryProducts.length > 0) {
                // Sort by rating and pick best
                categorizedProducts[eq.category] = categoryProducts
                    .sort((a: Product, b: Product) => (b.rating || 0) - (a.rating || 0))
                    .slice(0, 2);
            }
        });

        // Flatten and return
        return Object.values(categorizedProducts).flat();
    }, [tankSize, fishType, budget, products]);

    // Calculate total price
    const totalPrice = useMemo(() => {
        return recommendedProducts
            .filter(p => selectedProducts.has(p.id))
            .reduce((sum, p) => sum + p.price, 0);
    }, [recommendedProducts, selectedProducts]);

    // Handle add all to cart
    const handleAddAllToCart = () => {
        const productsToAdd = recommendedProducts.filter(p => selectedProducts.has(p.id));

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
        setSelectedProducts(new Set(recommendedProducts.map(p => p.id)));
    };

    // Navigation
    const canProceed = () => {
        switch (currentStep) {
            case 1: return !!tankSize;
            case 2: return !!fishType;
            case 3: return !!budget;
            case 4: return selectedProducts.size > 0;
            default: return false;
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length && canProceed()) {
            setCurrentStep(currentStep + 1);
            // Auto-select all products when reaching step 4
            if (currentStep === 3) {
                selectAllProducts();
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
            <MetaTags
                title="مساعد إنشاء الحوض | AQUAVO"
                description="دليلك التفاعلي لإنشاء حوض أسماك مثالي. اختر الحجم والنوع والميزانية واحصل على توصيات مخصصة."
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
                        أجب على بضعة أسئلة واحصل على توصيات مخصصة لحوضك
                    </p>
                </div>

                {/* Progress */}
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
                        {/* Step 1: Tank Size */}
                        {currentStep === 1 && (
                            <RadioGroup value={tankSize} onValueChange={setTankSize} className="grid gap-4">
                                {TANK_SIZES.map((tank) => (
                                    <Label
                                        key={tank.id}
                                        htmlFor={tank.id}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                                            tankSize === tank.id && "border-primary bg-primary/10"
                                        )}
                                    >
                                        <RadioGroupItem value={tank.id} id={tank.id} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{tank.label}</span>
                                                <Badge variant="secondary">{tank.size}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {tank.description}
                                            </p>
                                        </div>
                                        <Droplets className="w-8 h-8 text-blue-500" />
                                    </Label>
                                ))}
                            </RadioGroup>
                        )}

                        {/* Step 2: Fish Type */}
                        {currentStep === 2 && (
                            <RadioGroup value={fishType} onValueChange={setFishType} className="grid gap-4 md:grid-cols-2">
                                {FISH_TYPES.map((fish) => (
                                    <Label
                                        key={fish.id}
                                        htmlFor={fish.id}
                                        className={cn(
                                            "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                                            fishType === fish.id && "border-primary bg-primary/10"
                                        )}
                                    >
                                        <RadioGroupItem value={fish.id} id={fish.id} className="mt-1" />
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
                                    </Label>
                                ))}
                            </RadioGroup>
                        )}

                        {/* Step 3: Budget */}
                        {currentStep === 3 && (
                            <RadioGroup value={budget} onValueChange={setBudget} className="grid gap-4">
                                {BUDGET_RANGES.map((b) => (
                                    <Label
                                        key={b.id}
                                        htmlFor={b.id}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                                            budget === b.id && "border-primary bg-primary/10"
                                        )}
                                    >
                                        <RadioGroupItem value={b.id} id={b.id} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{b.label}</span>
                                                <Badge variant="secondary">{b.range} د.ع</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {b.description}
                                            </p>
                                        </div>
                                        <Package className="w-8 h-8 text-green-500" />
                                    </Label>
                                ))}
                            </RadioGroup>
                        )}

                        {/* Step 4: Recommended Products */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-muted-foreground">
                                        اخترنا لك {recommendedProducts.length} منتج بناءً على اختياراتك
                                    </p>
                                    <Button variant="outline" size="sm" onClick={selectAllProducts}>
                                        تحديد الكل
                                    </Button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {recommendedProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            onClick={() => toggleProduct(product.id)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50",
                                                selectedProducts.has(product.id) && "border-primary bg-primary/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                selectedProducts.has(product.id)
                                                    ? "bg-primary border-primary text-white"
                                                    : "border-muted-foreground/30"
                                            )}>
                                                {selectedProducts.has(product.id) && <Check className="w-4 h-4" />}
                                            </div>
                                            <img
                                                src={product.thumbnail || product.image || "/placeholder-product.svg"}
                                                alt={product.name}
                                                className="w-16 h-16 object-contain rounded-lg bg-white"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold truncate">{product.name}</h4>
                                                <p className="text-sm text-muted-foreground">{product.category}</p>
                                                <p className="text-primary font-bold">
                                                    {Number(product.price).toLocaleString('en-US')} د.ع
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {recommendedProducts.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>لا توجد منتجات متطابقة مع اختياراتك</p>
                                        <p className="text-sm">جرب تغيير الميزانية أو حجم الحوض</p>
                                    </div>
                                )}

                                {selectedProducts.size > 0 && (
                                    <Card className="bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
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

                {/* Summary Card */}
                {(tankSize || fishType || budget) && (
                    <Card className="max-w-3xl mx-auto mt-6 bg-muted/30">
                        <CardContent className="p-4">
                            <h4 className="font-semibold mb-3">📋 ملخص اختياراتك:</h4>
                            <div className="flex flex-wrap gap-2">
                                {tankSize && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Droplets className="w-3 h-3" />
                                        {TANK_SIZES.find(t => t.id === tankSize)?.label}
                                    </Badge>
                                )}
                                {fishType && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Fish className="w-3 h-3" />
                                        {FISH_TYPES.find(f => f.id === fishType)?.label}
                                    </Badge>
                                )}
                                {budget && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Package className="w-3 h-3" />
                                        {BUDGET_RANGES.find(b => b.id === budget)?.label}
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
