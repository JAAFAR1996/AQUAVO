import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { WaterRippleButton } from "@/components/effects/water-ripple-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Lightbulb,
  Droplets,
  Thermometer,
  Filter,
  Package,
  Fish,
  Calendar,
  ShoppingCart,
  Info,
  AlertCircle,
  Sparkles,
  Calculator,
  Ruler,
  Mountain,
  Leaf,
  TestTube,
  Clock,
  RotateCcw,
  Save,
  Cloud,
  CloudOff
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";

// Wizard data types
interface WizardData {
  tankSize: string;
  tankType: string;
  location: string[];
  filterType: string;
  heaterWattage: number;
  lightingType: string;
  substrateType: string;
  decorations: string[];
  waterSource: string;
  cyclingMethod: string;
  fishTypes: string[];
  stockingLevel: string;
  maintenancePreference: string;
}

// Step definitions
const STEPS = [
  { id: "tank", title: "اختيار الحوض", icon: Package },
  { id: "location", title: "الموقع", icon: MapPin },
  { id: "equipment", title: "المعدات", icon: Filter },
  { id: "decor", title: "الديكور", icon: Mountain },
  { id: "water", title: "المياه", icon: Droplets },
  { id: "cycling", title: "التدوير", icon: TestTube },
  { id: "fish", title: "الأسماك", icon: Fish },
  { id: "maintenance", title: "الصيانة", icon: Calendar },
  { id: "summary", title: "الملخص", icon: ShoppingCart }
];

export default function Journey() {
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem("wizardStep");
    return saved ? parseInt(saved) : 0;
  });

  const [wizardData, setWizardData] = useState<WizardData>(() => {
    const saved = localStorage.getItem("wizardData");
    return saved ? JSON.parse(saved) : {
      tankSize: "",
      tankType: "",
      location: [],
      filterType: "",
      heaterWattage: 0,
      lightingType: "",
      substrateType: "",
      decorations: [],
      waterSource: "",
      cyclingMethod: "",
      fishTypes: [],
      stockingLevel: "",
      maintenancePreference: ""
    };
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  // Fetch saved plan from database
  const { data: savedPlan } = useQuery({
    queryKey: ["journey-plan"],
    queryFn: async () => {
      const res = await fetch("/api/journey/plans");
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    },
  });

  // Mutation for saving to database
  const savePlanMutation = useMutation({
    mutationFn: async (planData: WizardData & { currentStep: number }) => {
      const res = await fetch("/api/journey/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });
      return res.json();
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/journey/plans", { method: "DELETE" });
      return res.json();
    },
  });

  const { addItem } = useCart();
  const { toast } = useToast();

  // Load saved plan from database on mount
  useEffect(() => {
    if (savedPlan && !wizardData.tankSize) {
      setWizardData({
        tankSize: savedPlan.tankSize || "",
        tankType: savedPlan.tankType || "",
        location: savedPlan.location || [],
        filterType: savedPlan.filterType || "",
        heaterWattage: savedPlan.heaterWattage || 0,
        lightingType: savedPlan.lightingType || "",
        substrateType: savedPlan.substrateType || "",
        decorations: savedPlan.decorations || [],
        waterSource: savedPlan.waterSource || "",
        cyclingMethod: savedPlan.cyclingMethod || "",
        fishTypes: savedPlan.fishTypes || [],
        stockingLevel: savedPlan.stockingLevel || "",
        maintenancePreference: savedPlan.maintenancePreference || "",
      });
      setCurrentStep(savedPlan.currentStep || 0);
    }
  }, [savedPlan]);

  // Save to localStorage (fallback)
  useEffect(() => {
    localStorage.setItem("wizardStep", currentStep.toString());
    localStorage.setItem("wizardData", JSON.stringify(wizardData));
  }, [currentStep, wizardData]);

  // Auto-save to database with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (wizardData.tankSize) {
        savePlanMutation.mutate({ ...wizardData, currentStep });
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [wizardData, currentStep]);

  // Check if user has saved progress
  const hasSavedProgress = currentStep > 0 || wizardData.tankSize !== "";

  // Reset journey
  const resetJourney = () => {
    setCurrentStep(0);
    setWizardData({
      tankSize: "",
      tankType: "",
      location: [],
      filterType: "",
      heaterWattage: 0,
      lightingType: "",
      substrateType: "",
      decorations: [],
      waterSource: "",
      cyclingMethod: "",
      fishTypes: [],
      stockingLevel: "",
      maintenancePreference: ""
    });
    localStorage.removeItem("wizardStep");
    localStorage.removeItem("wizardData");
    deletePlanMutation.mutate();
  };

  const updateData = (field: keyof WizardData, value: any) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return wizardData.tankSize && wizardData.tankType;
      case 1: return wizardData.location.length > 0;
      case 2: return wizardData.filterType && wizardData.heaterWattage > 0 && wizardData.lightingType;
      case 3: return wizardData.substrateType && wizardData.decorations.length > 0;
      case 4: return wizardData.waterSource;
      case 5: return wizardData.cyclingMethod;
      case 6: return wizardData.fishTypes.length > 0 && wizardData.stockingLevel;
      case 7: return wizardData.maintenancePreference;
      default: return true;
    }
  };

  const addRecommendedProductsToCart = () => {
    const recommendations = getRecommendedProducts();
    let addedCount = 0;

    recommendations.forEach(product => {
      if (product) {
        addItem(product);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast({
        title: "تمت الإضافة بنجاح!",
        description: `تم إضافة ${addedCount} منتج إلى سلة التسوق`,
      });
    }
  };

  const getRecommendedProducts = useCallback(() => {
    if (!productsData?.products) return [];

    const products = productsData.products;
    const recommendations: any[] = [];

    // 1. Filter recommendation based on type and tank size
    if (wizardData.filterType) {
      const filterProducts = products.filter((p: any) =>
        p.category?.toLowerCase().includes("filter") ||
        p.subcategory?.toLowerCase().includes("filter")
      );

      if (wizardData.filterType === "canister") {
        const canisterFilter = filterProducts.find((p: any) =>
          p.name?.toLowerCase().includes("canister") ||
          p.name?.toLowerCase().includes("eheim") ||
          p.specifications?.type?.toLowerCase() === "canister"
        );
        if (canisterFilter) recommendations.push(canisterFilter);
      } else if (wizardData.filterType === "hob") {
        const hobFilter = filterProducts.find((p: any) =>
          p.name?.toLowerCase().includes("hob") ||
          p.name?.toLowerCase().includes("hang")
        );
        if (hobFilter) recommendations.push(hobFilter);
      } else {
        if (filterProducts[0]) recommendations.push(filterProducts[0]);
      }
    }

    // 2. Heater based on wattage
    if (wizardData.heaterWattage > 0) {
      const heaters = products.filter((p: any) =>
        p.category?.toLowerCase().includes("heater") ||
        p.subcategory?.toLowerCase().includes("heater") ||
        p.name?.toLowerCase().includes("heater")
      );
      if (heaters.length) recommendations.push(heaters[0]);
    }

    // 3. Lighting based on type
    if (wizardData.lightingType && wizardData.lightingType !== "none") {
      const lights = products.filter((p: any) =>
        p.category?.toLowerCase().includes("light") ||
        p.subcategory?.toLowerCase().includes("light") ||
        p.name?.toLowerCase().includes("led")
      );

      if (wizardData.lightingType === "planted-led") {
        const plantLight = lights.find((p: any) =>
          p.name?.toLowerCase().includes("plant") ||
          p.specifications?.forPlants
        );
        if (plantLight) recommendations.push(plantLight);
        else if (lights[0]) recommendations.push(lights[0]);
      } else if (lights[0]) {
        recommendations.push(lights[0]);
      }
    }

    // 4. Substrate based on type
    if (wizardData.substrateType) {
      const substrates = products.filter((p: any) =>
        p.category?.toLowerCase().includes("substrate") ||
        p.subcategory?.toLowerCase().includes("substrate") ||
        p.name?.toLowerCase().includes("gravel") ||
        p.name?.toLowerCase().includes("sand")
      );
      if (substrates[0]) recommendations.push(substrates[0]);
    }

    // 5. Plants for planted tank or live-plants decoration
    if (wizardData.tankType === "planted" || wizardData.decorations.includes("live-plants")) {
      const plants = products.filter((p: any) =>
        p.category?.toLowerCase().includes("plant") ||
        p.name?.toLowerCase().includes("anubias") ||
        p.name?.toLowerCase().includes("java")
      );
      recommendations.push(...plants.slice(0, 2));
    }

    // 6. Water conditioner - essential for everyone
    const conditioners = products.filter((p: any) =>
      p.category?.toLowerCase().includes("water") ||
      p.name?.toLowerCase().includes("prime") ||
      p.name?.toLowerCase().includes("seachem") ||
      p.name?.toLowerCase().includes("conditioner")
    );
    if (conditioners[0]) recommendations.push(conditioners[0]);

    // 7. Decorations
    if (wizardData.decorations.includes("driftwood")) {
      const driftwood = products.find((p: any) =>
        p.name?.toLowerCase().includes("driftwood") ||
        p.name?.toLowerCase().includes("wood")
      );
      if (driftwood) recommendations.push(driftwood);
    }

    if (wizardData.decorations.includes("rocks")) {
      const rocks = products.find((p: any) =>
        p.name?.toLowerCase().includes("rock") ||
        p.name?.toLowerCase().includes("stone")
      );
      if (rocks) recommendations.push(rocks);
    }

    // Remove duplicates and limit to 8 products
    const uniqueRecommendations = Array.from(new Map(recommendations.map((p: any) => [p.id, p])).values());
    return uniqueRecommendations.slice(0, 8);
  }, [productsData, wizardData]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300" dir="rtl">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-md border border-primary/30 px-6 py-2 rounded-full text-primary font-bold">
            <Sparkles className="h-5 w-5" />
            <span>دليلك الشامل</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            معالج إنشاء الحوض المثالي
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            سنساعدك في كل خطوة لإنشاء حوض أسماك صحي وجميل - من الحوض الفارغ إلى النظام البيئي المزدهر
          </p>

          {/* Saved Progress Indicator */}
          {hasSavedProgress && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium">
                {savePlanMutation.isPending ? (
                  <>
                    <Cloud className="h-4 w-4 animate-pulse" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    تقدمك محفوظ في السحابة
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetJourney}
                className="text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 ml-1" />
                ابدأ من جديد
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="max-w-5xl mx-auto mb-12">
          <div className="relative">
            {/* Background bar */}
            <div className="absolute top-5 right-0 w-full h-1 bg-muted rounded-full" />

            {/* Progress bar - RTL: starts from right */}
            <motion.div
              className="absolute top-5 right-0 h-1 bg-primary rounded-full origin-right"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />

            {/* Steps */}
            <div className="relative flex justify-between">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center"
                  >
                    <motion.button
                      className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-full border-4 flex items-center justify-center bg-background transition-all duration-300",
                        isCompleted ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                          isCurrent ? "border-primary text-primary shadow-lg shadow-primary/25 scale-110" :
                            "border-muted text-muted-foreground"
                      )}
                      onClick={() => setCurrentStep(index)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label={`الخطوة ${index + 1}: ${step.title}`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                      ) : (
                        <StepIcon className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </motion.button>

                    <div className="mt-2 text-center hidden lg:block min-w-[80px]">
                      <span className={cn(
                        "text-xs font-bold block transition-colors",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 0: Tank Selection */}
              {currentStep === 0 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Package className="h-7 w-7 text-primary" />
                        اختيار الحوض المناسب
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        الحوض هو أساس كل شيء. حجم الحوض يؤثر على استقرار المياه وعدد الأسماك.
                      </p>
                    </div>

                    {/* Tank Size */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold flex items-center gap-2">
                        <Ruler className="h-5 w-5 text-primary" />
                        حجم الحوض (باللترات)
                      </Label>
                      <RadioGroup value={wizardData.tankSize} onValueChange={(val) => updateData("tankSize", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { value: "small", label: "صغير (20-60 لتر)", desc: "مناسب للمبتدئين" },
                            { value: "medium", label: "متوسط (60-150 لتر)", desc: "الأكثر شيوعاً، مستقر", recommended: true },
                            { value: "large", label: "كبير (150-300 لتر)", desc: "مثالي، أسهل في الصيانة" },
                            { value: "xlarge", label: "كبير جداً (+300 لتر)", desc: "للمحترفين" }
                          ].map((option) => (
                            <div key={option.value} className="relative">
                              <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                              <Label
                                htmlFor={option.value}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-lg"
                                )}
                              >
                                {option.recommended && (
                                  <Badge className="absolute -top-2 -right-2 bg-primary">مُوصى به</Badge>
                                )}
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Package className="w-6 h-6 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-foreground">{option.label}</div>
                                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                                  </div>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Tank Type */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">نوع الحوض</Label>
                      <RadioGroup value={wizardData.tankType} onValueChange={(val) => updateData("tankType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { value: "freshwater-community", label: "مجتمع المياه العذبة", desc: "أسماك متنوعة" },
                            { value: "planted", label: "حوض نباتي", desc: "نباتات كثيفة" },
                            { value: "species-specific", label: "نوع محدد", desc: "نوع واحد فقط" }
                          ].map((option) => (
                            <div key={option.value}>
                              <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                              <Label
                                htmlFor={option.value}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                <div className="font-bold text-foreground mb-1">{option.label}</div>
                                <div className="text-sm text-muted-foreground">{option.desc}</div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Pro Tip */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                          الأحواض الأكبر (100+ لتر) أسهل في الصيانة! المياه الأكثر تعني تقلبات أقل في درجة الحرارة والمعايير الكيميائية.
                          لا تخف من البدء بحوض أكبر - إنه استثمار أفضل على المدى الطويل.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 1: Location */}
              {currentStep === 1 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <MapPin className="h-7 w-7 text-primary" />
                        موقع ومكان الحوض
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        الموقع الصحيح يمنع الكثير من المشاكل المستقبلية
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-lg font-bold">اختر مواصفات الموقع (يمكنك اختيار أكثر من خيار)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            value: "away-from-sunlight",
                            label: "بعيد عن أشعة الشمس المباشرة",
                            desc: "يمنع نمو الطحالب الزائد",
                            good: true
                          },
                          {
                            value: "stable-surface",
                            label: "سطح مستقر ومتين",
                            desc: "يتحمل وزن الحوض المملوء",
                            good: true
                          },
                          {
                            value: "near-power",
                            label: "قريب من مصدر كهرباء",
                            desc: "للفلتر والسخان والإضاءة",
                            good: true
                          },
                          {
                            value: "quiet-area",
                            label: "منطقة هادئة",
                            desc: "بعيداً عن الضوضاء",
                            good: true
                          },
                          {
                            value: "easy-access",
                            label: "سهل الوصول",
                            desc: "للصيانة الدورية",
                            good: true
                          },
                          {
                            value: "away-from-hvac",
                            label: "بعيد عن التكييف والتهوية",
                            desc: "لاستقرار درجة الحرارة",
                            good: true
                          }
                        ].map((option) => (
                          <div key={option.value} className="flex items-start space-x-3 space-x-reverse">
                            <Checkbox
                              id={option.value}
                              checked={wizardData.location.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateData("location", [...wizardData.location, option.value]);
                                } else {
                                  updateData("location", wizardData.location.filter(l => l !== option.value));
                                }
                              }}
                            />
                            <Label
                              htmlFor={option.value}
                              className="flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
                            >
                              <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                                {option.good && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {option.label}
                              </div>
                              <div className="text-sm text-muted-foreground">{option.desc}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">تحذير مهم</div>
                        <p className="text-sm text-muted-foreground text-right">
                          تأكد من أن السطح يتحمل الوزن! حوض 100 لتر يزن حوالي 120 كجم عند امتلائه بالماء والحصى والديكور.
                          استخدم حاملاً مخصصاً للأحواض أو طاولة قوية جداً.
                        </p>
                      </div>
                    </div>

                    {/* Calculation helper */}
                    <div className="bg-muted/30 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Calculator className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-foreground">حاسبة الوزن</h3>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">حوض 60 لتر:</span>
                          <span className="font-bold">~75 كجم</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">حوض 100 لتر:</span>
                          <span className="font-bold">~120 كجم</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">حوض 200 لتر:</span>
                          <span className="font-bold">~240 كجم</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Equipment */}
              {currentStep === 2 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Filter className="h-7 w-7 text-primary" />
                        المعدات الأساسية
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        الفلتر والسخان والإضاءة - الثلاثي الذهبي لأي حوض ناجح
                      </p>
                    </div>

                    {/* Filter Selection */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold flex items-center gap-2">
                        <Filter className="h-5 w-5 text-primary" />
                        نوع الفلتر
                      </Label>
                      <RadioGroup value={wizardData.filterType} onValueChange={(val) => updateData("filterType", val)}>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              value: "hob",
                              label: "فلتر خارجي معلق (HOB)",
                              desc: "سهل التركيب، مثالي للأحواض الصغيرة والمتوسطة",
                              best: "20-150 لتر"
                            },
                            {
                              value: "canister",
                              label: "فلتر كانستر",
                              desc: "قوي جداً، صامت، مثالي للأحواض الكبيرة",
                              best: "100+ لتر",
                              recommended: true
                            },
                            {
                              value: "sponge",
                              label: "فلتر إسفنجي",
                              desc: "لطيف، رائع لصغار الأسماك",
                              best: "حتى 60 لتر"
                            },
                            {
                              value: "internal",
                              label: "فلتر داخلي",
                              desc: "بسيط واقتصادي",
                              best: "20-100 لتر"
                            }
                          ].map((option) => (
                            <div key={option.value} className="relative">
                              <RadioGroupItem value={option.value} id={`filter-${option.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`filter-${option.value}`}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all text-right",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                {option.recommended && (
                                  <Badge className="absolute -top-2 -right-2 bg-primary">الأفضل</Badge>
                                )}
                                <div className="flex-1 text-right">
                                  <div className="font-bold text-foreground mb-1 text-right">{option.label}</div>
                                  <div className="text-sm text-muted-foreground mb-2 text-right">{option.desc}</div>
                                  <Badge variant="outline" className="text-xs">{option.best}</Badge>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Heater Wattage */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold flex items-center gap-2">
                        <Thermometer className="h-5 w-5 text-primary" />
                        قدرة السخان (واط)
                      </Label>
                      <div className="space-y-3">
                        <Slider
                          value={[wizardData.heaterWattage]}
                          onValueChange={([val]) => updateData("heaterWattage", val)}
                          max={300}
                          min={25}
                          step={25}
                          className="w-full"
                        />
                        <div className="flex justify-between items-center flex-row-reverse">
                          <span className="text-sm text-muted-foreground">25 واط</span>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-primary">{wizardData.heaterWattage}</div>
                            <div className="text-xs text-muted-foreground">واط</div>
                          </div>
                          <span className="text-sm text-muted-foreground">300 واط</span>
                        </div>
                      </div>

                      {/* Heater recommendation */}
                      <div className="bg-muted/30 rounded-xl p-4">
                        <div className="font-bold text-sm mb-2 text-right">التوصية:</div>
                        <div className="text-sm text-muted-foreground text-right">
                          القاعدة العامة: 1 واط لكل لتر من الماء
                          {wizardData.tankSize === "small" && " (25-60 واط للأحواض الصغيرة)"}
                          {wizardData.tankSize === "medium" && " (50-100 واط للأحواض المتوسطة)"}
                          {wizardData.tankSize === "large" && " (150-200 واط للأحواض الكبيرة)"}
                          {wizardData.tankSize === "xlarge" && " (200-300 واط للأحواض الكبيرة جداً)"}
                        </div>
                      </div>
                    </div>

                    {/* Lighting */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        نوع الإضاءة
                      </Label>
                      <RadioGroup value={wizardData.lightingType} onValueChange={(val) => updateData("lightingType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { value: "basic-led", label: "LED بسيط", desc: "للأسماك فقط" },
                            { value: "planted-led", label: "LED للنباتات", desc: "مع إضاءة كاملة الطيف", recommended: wizardData.tankType === "planted" },
                            { value: "rgb-smart", label: "LED ذكي RGB", desc: "مع تحكم بالألوان" },
                            { value: "none", label: "لا إضاءة حالياً", desc: "سأضيفها لاحقاً" }
                          ].map((option) => (
                            <div key={option.value} className="relative">
                              <RadioGroupItem value={option.value} id={`light-${option.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`light-${option.value}`}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                {option.recommended && (
                                  <Badge className="absolute -top-2 -right-2 bg-primary">مُوصى به</Badge>
                                )}
                                <div className="font-bold text-foreground mb-1">{option.label}</div>
                                <div className="text-sm text-muted-foreground">{option.desc}</div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Pro Tip */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                          لا تبخل على الفلتر! هو أهم قطعة معدات في حوضك. اختر فلتراً بتدفق 4-6 أضعاف حجم الحوض في الساعة.
                          للنباتات الحية، الإضاءة الجيدة ضرورية - ابحث عن 30-50 لومن لكل لتر.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Decoration */}
              {currentStep === 3 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Mountain className="h-7 w-7 text-primary" />
                        الديكور والركيزة
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        أنشئ بيئة طبيعية وجميلة لأسماكك
                      </p>
                    </div>

                    {/* Substrate */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">نوع الركيزة (القاع)</Label>
                      <RadioGroup value={wizardData.substrateType} onValueChange={(val) => updateData("substrateType", val)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            {
                              value: "gravel",
                              label: "حصى عادي",
                              desc: "سهل التنظيف، متعدد الألوان"
                            },
                            {
                              value: "sand",
                              label: "رمل",
                              desc: "طبيعي، رائع للأسماك القاعية"
                            },
                            {
                              value: "planted-substrate",
                              label: "تربة للنباتات",
                              desc: "غنية بالمغذيات للنباتات الحية",
                              recommended: wizardData.tankType === "planted"
                            },
                            {
                              value: "mixed",
                              label: "مختلط",
                              desc: "رمل + حصى أو رمل + تربة"
                            }
                          ].map((option) => (
                            <div key={option.value} className="relative">
                              <RadioGroupItem value={option.value} id={`substrate-${option.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`substrate-${option.value}`}
                                className={cn(
                                  "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                {option.recommended && (
                                  <Badge className="absolute -top-2 -right-2 bg-primary">مُوصى به</Badge>
                                )}
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <Mountain className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-bold text-foreground mb-1">{option.label}</div>
                                  <div className="text-sm text-muted-foreground">{option.desc}</div>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Decorations */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">عناصر الديكور (اختر ما تريد)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { value: "live-plants", label: "نباتات حية", benefit: "تنقي الماء" },
                          { value: "driftwood", label: "خشب طبيعي", benefit: "مظهر طبيعي" },
                          { value: "rocks", label: "صخور وأحجار", benefit: "أماكن اختباء" },
                          { value: "caves", label: "كهوف", benefit: "ملاجئ آمنة" },
                          { value: "artificial-plants", label: "نباتات صناعية", benefit: "بدون صيانة" },
                          { value: "background", label: "خلفية", benefit: "عمق بصري" }
                        ].map((option) => (
                          <div key={option.value} className="flex items-start space-x-3 space-x-reverse">
                            <Checkbox
                              id={`decor-${option.value}`}
                              checked={wizardData.decorations.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateData("decorations", [...wizardData.decorations, option.value]);
                                } else {
                                  updateData("decorations", wizardData.decorations.filter(d => d !== option.value));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`decor-${option.value}`}
                              className="flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                  <Leaf className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-bold text-foreground">{option.label}</div>
                                  <div className="text-sm text-muted-foreground">{option.benefit}</div>
                                </div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Design Tips */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                      <Leaf className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصائح التصميم</div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside text-right">
                          <li>اترك مساحة سباحة مفتوحة في المقدمة</li>
                          <li>ضع النباتات والديكورات الطويلة في الخلف</li>
                          <li>استخدم قاعدة الثلث - لا تملأ أكثر من ثلثي القاع</li>
                          <li>النباتات الحية تساعد في تنقية الماء بشكل طبيعي</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Water Parameters */}
              {currentStep === 4 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Droplets className="h-7 w-7 text-primary" />
                        إعداد المياه
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        جودة المياه هي أهم عامل لصحة الأسماك
                      </p>
                    </div>

                    {/* Water Source */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">مصدر المياه</Label>
                      <RadioGroup value={wizardData.waterSource} onValueChange={(val) => updateData("waterSource", val)}>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              value: "tap",
                              label: "ماء الصنبور",
                              desc: "الأكثر شيوعاً - يحتاج معالج كلور",
                              note: "✓ سهل ومتوفر"
                            },
                            {
                              value: "ro",
                              label: "ماء RO (التناضح العكسي)",
                              desc: "نقي جداً - مثالي للأسماك الحساسة",
                              note: "⚠️ يحتاج إعادة معادن"
                            },
                            {
                              value: "well",
                              label: "ماء البئر",
                              desc: "يحتاج اختبار للمعادن الثقيلة",
                              note: "⚠️ افحص الجودة أولاً"
                            }
                          ].map((option) => (
                            <div key={option.value}>
                              <RadioGroupItem value={option.value} id={`water-${option.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`water-${option.value}`}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                <div className="font-bold text-foreground mb-1">{option.label}</div>
                                <div className="text-sm text-muted-foreground mb-2">{option.desc}</div>
                                <div className="text-xs text-primary">{option.note}</div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Water Parameters Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                          <TestTube className="h-4 w-4 text-primary" />
                          pH المثالي
                        </div>
                        <div className="text-2xl font-bold text-primary">6.5-7.5</div>
                        <div className="text-xs text-muted-foreground">للأسماك الاستوائية</div>
                      </div>

                      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-primary" />
                          درجة الحرارة
                        </div>
                        <div className="text-2xl font-bold text-primary">24-26°C</div>
                        <div className="text-xs text-muted-foreground">نطاق آمن</div>
                      </div>

                      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-sm flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-primary" />
                          تغيير الماء
                        </div>
                        <div className="text-2xl font-bold text-primary">25%</div>
                        <div className="text-xs text-muted-foreground">كل أسبوع</div>
                      </div>
                    </div>

                    {/* Essential Products */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-5 w-5 text-amber-500" />
                        <div className="font-bold text-foreground">منتجات أساسية للمياه</div>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li><strong>معالج الكلور:</strong> ضروري لماء الصنبور (مثل Seachem Prime)</li>
                        <li><strong>بكتيريا مفيدة:</strong> تسريع دورة النيتروجين</li>
                        <li><strong>اختبار المياه:</strong> لقياس الأمونيا والنيترات والنيتريت</li>
                        <li><strong>منظم pH:</strong> إذا كان الماء حمضي/قلوي جداً</li>
                      </ul>
                    </div>

                    {/* Warning */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">تحذير حيوي</div>
                        <p className="text-sm text-muted-foreground text-right">
                          <strong>لا تضف الأسماك مباشرة!</strong> يجب أن يكتمل تدوير الحوض أولاً (الخطوة التالية).
                          إضافة الأسماك بدون تدوير كامل = موت محتم للأسماك بسبب التسمم بالأمونيا.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 5: Cycling */}
              {currentStep === 5 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <TestTube className="h-7 w-7 text-primary" />
                        دورة النيتروجين (التدوير)
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        أهم خطوة! بدونها ستموت أسماكك. الصبر هنا يساوي النجاح.
                      </p>
                    </div>

                    {/* Cycling Method */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">طريقة التدوير</Label>
                      <RadioGroup value={wizardData.cyclingMethod} onValueChange={(val) => updateData("cyclingMethod", val)}>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              value: "fishless",
                              label: "تدوير بدون أسماك (الأفضل)",
                              desc: "باستخدام الأمونيا النقية أو طعام الأسماك",
                              duration: "4-6 أسابيع",
                              safety: "✓ آمن 100%",
                              recommended: true
                            },
                            {
                              value: "with-hardy-fish",
                              label: "تدوير مع أسماك قوية",
                              desc: "عدد قليل من الأسماك المقاومة",
                              duration: "6-8 أسابيع",
                              safety: "⚠️ مرهق للأسماك"
                            },
                            {
                              value: "seeded",
                              label: "تدوير بالبذر",
                              desc: "باستخدام مادة فلتر من حوض قديم",
                              duration: "2-3 أسابيع",
                              safety: "✓ سريع وآمن"
                            },
                            {
                              value: "bottled-bacteria",
                              label: "بكتيريا معبأة",
                              desc: "منتجات بكتيريا جاهزة",
                              duration: "1-2 أسبوع",
                              safety: "⚠️ نتائج متغيرة"
                            }
                          ].map((option) => (
                            <div key={option.value} className="relative">
                              <RadioGroupItem value={option.value} id={`cycle-${option.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`cycle-${option.value}`}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                {option.recommended && (
                                  <Badge className="absolute -top-2 -right-2 bg-primary">مُوصى به</Badge>
                                )}
                                <div className="font-bold text-foreground mb-2">{option.label}</div>
                                <div className="text-sm text-muted-foreground mb-3">{option.desc}</div>
                                <div className="flex gap-4 text-xs">
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 ml-1" />
                                    {option.duration}
                                  </Badge>
                                  <span className={cn(
                                    "font-bold",
                                    option.safety.includes('✓') ? "text-green-500" : "text-amber-500"
                                  )}>
                                    {option.safety}
                                  </span>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* The Nitrogen Cycle Explanation */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-green-500/10 border border-primary/20 rounded-xl p-6">
                      <h3 className="font-bold text-foreground mb-4 flex items-center justify-end gap-2 text-right">
                        ما هي دورة النيتروجين؟
                        <Info className="h-5 w-5 text-primary" />
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="bg-red-500/20 text-red-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">1</div>
                          <div>
                            <div className="font-bold text-foreground text-right">الأمونيا (NH₃)</div>
                            <div className="text-muted-foreground text-right">سامة جداً - من فضلات الأسماك والطعام المتحلل</div>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-amber-500/20 text-amber-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">2</div>
                          <div>
                            <div className="font-bold text-foreground text-right">النيتريت (NO₂)</div>
                            <div className="text-muted-foreground text-right">سام أيضاً - تحوله بكتيريا Nitrosomonas</div>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-green-500/20 text-green-500 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">3</div>
                          <div>
                            <div className="font-bold text-foreground text-right">النترات (NO₃)</div>
                            <div className="text-muted-foreground text-right">أقل سمية - تزيله النباتات وتغييرات الماء</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        الجدول الزمني المتوقع
                      </h3>
                      <div className="space-y-3">
                        {[
                          { week: "الأسبوع 1-2", event: "ارتفاع الأمونيا", status: "danger" },
                          { week: "الأسبوع 2-3", event: "ظهور النيتريت، انخفاض الأمونيا", status: "warning" },
                          { week: "الأسبوع 3-4", event: "ظهور النترات، انخفاض النيتريت", status: "info" },
                          { week: "الأسبوع 4-6", event: "اكتمال التدوير - جاهز للأسماك!", status: "success" }
                        ].map((phase, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                            <div className={cn(
                              "font-bold text-sm px-3 py-1 rounded-full",
                              phase.status === "danger" && "bg-red-500/20 text-red-500",
                              phase.status === "warning" && "bg-amber-500/20 text-amber-500",
                              phase.status === "info" && "bg-blue-500/20 text-blue-500",
                              phase.status === "success" && "bg-green-500/20 text-green-500"
                            )}>
                              {phase.week}
                            </div>
                            <div className="text-sm text-foreground">{phase.event}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Critical Warning */}
                    <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-2 text-lg text-right">قاعدة ذهبية</div>
                        <p className="text-sm text-muted-foreground mb-3 text-right">
                          <strong>لا أمونيا + لا نيتريت = جاهز للأسماك</strong>
                        </p>
                        <p className="text-sm text-muted-foreground text-right">
                          اختبر الماء يومياً. عندما تصبح قراءات الأمونيا والنيتريت صفر لمدة 3-5 أيام متتالية،
                          حوضك جاهز أخيراً لاستقبال الأسماك. لا تتعجل هذه المرحلة!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 6: Fish Selection */}
              {currentStep === 6 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Fish className="h-7 w-7 text-primary" />
                        اختيار الأسماك
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        اختر أسماكاً متوافقة ولا تزدحم حوضك
                      </p>
                    </div>

                    {/* Fish Types */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">أنواع الأسماك المهتم بها</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { value: "community", label: "أسماك المجتمع", examples: "Tetras, Guppies, Mollies" },
                          { value: "cichlids", label: "سيكليد", examples: "Angelfish, Rams, Discus" },
                          { value: "bottom-dwellers", label: "أسماك القاع", examples: "Corydoras, Plecos, Loaches" },
                          { value: "schooling", label: "أسماك السرب", examples: "Neon Tetras, Rasboras" },
                          { value: "centerpiece", label: "سمكة مركزية", examples: "Betta, Gourami, Angelfish" },
                          { value: "shrimp-snails", label: "جمبري وحلزون", examples: "Cherry Shrimp, Nerite Snails" }
                        ].map((option) => (
                          <div key={option.value} className="flex items-start space-x-3 space-x-reverse">
                            <Checkbox
                              id={`fish-${option.value}`}
                              checked={wizardData.fishTypes.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateData("fishTypes", [...wizardData.fishTypes, option.value]);
                                } else {
                                  updateData("fishTypes", wizardData.fishTypes.filter(f => f !== option.value));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`fish-${option.value}`}
                              className="flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
                            >
                              <div className="mb-2">
                                <div className="font-bold text-foreground">{option.label}</div>
                              </div>
                              <div className="text-xs text-muted-foreground">أمثلة: {option.examples}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stocking Level */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">مستوى الكثافة السمكية</Label>
                      <RadioGroup value={wizardData.stockingLevel} onValueChange={(val) => updateData("stockingLevel", val)}>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              value: "light",
                              label: "خفيف (مُوصى به للمبتدئين)",
                              desc: "~1 سم من السمك لكل 2 لتر ماء",
                              benefit: "✓ أسهل في الصيانة، مياه أكثر استقراراً"
                            },
                            {
                              value: "moderate",
                              label: "معتدل",
                              desc: "~1 سم من السمك لكل 1.5 لتر ماء",
                              benefit: "متوازن بين الجمال والصيانة"
                            },
                            {
                              value: "heavy",
                              label: "كثيف (للخبراء فقط)",
                              desc: "~1 سم من السمك لكل 1 لتر ماء",
                              benefit: "⚠️ يحتاج فلترة قوية وصيانة يومية"
                            }
                          ].map((option) => (
                            <div key={option.value}>
                              <RadioGroupItem value={option.value} id={`stock-${option.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`stock-${option.value}`}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                <div className="font-bold text-foreground mb-1">{option.label}</div>
                                <div className="text-sm text-muted-foreground mb-2">{option.desc}</div>
                                <div className="text-xs text-primary">{option.benefit}</div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Stocking Calculator */}
                    <div className="bg-muted/30 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Calculator className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-foreground">حاسبة الكثافة التقريبية</h3>
                      </div>
                      {wizardData.tankSize && wizardData.stockingLevel && (
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            بناءً على اختياراتك:
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background rounded-lg p-3">
                              <div className="text-xs text-muted-foreground mb-1">حوضك</div>
                              <div className="text-lg font-bold text-primary">
                                {wizardData.tankSize === "small" && "~40 لتر"}
                                {wizardData.tankSize === "medium" && "~100 لتر"}
                                {wizardData.tankSize === "large" && "~200 لتر"}
                                {wizardData.tankSize === "xlarge" && "~400 لتر"}
                              </div>
                            </div>
                            <div className="bg-background rounded-lg p-3">
                              <div className="text-xs text-muted-foreground mb-1">يمكنك إضافة</div>
                              <div className="text-lg font-bold text-primary">
                                {wizardData.tankSize === "small" && wizardData.stockingLevel === "light" && "~10-15 سمكة صغيرة"}
                                {wizardData.tankSize === "small" && wizardData.stockingLevel === "moderate" && "~15-20 سمكة صغيرة"}
                                {wizardData.tankSize === "medium" && wizardData.stockingLevel === "light" && "~20-30 سمكة صغيرة"}
                                {wizardData.tankSize === "medium" && wizardData.stockingLevel === "moderate" && "~30-40 سمكة صغيرة"}
                                {wizardData.tankSize === "large" && wizardData.stockingLevel === "light" && "~40-60 سمكة صغيرة"}
                                {wizardData.tankSize === "large" && wizardData.stockingLevel === "moderate" && "~60-80 سمكة صغيرة"}
                                {wizardData.tankSize === "xlarge" && "أكثر من 100 سمكة صغيرة"}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            * هذه أرقام تقريبية للأسماك الصغيرة (2-3 سم). الأسماك الكبيرة تحتاج مساحة أكثر.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Compatibility Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">التوافق مهم جداً!</div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside text-right">
                          <li>لا تخلط أسماك عدوانية مع أسماك سلمية</li>
                          <li>تأكد من توافق متطلبات المياه (pH، درجة الحرارة)</li>
                          <li>بعض الأسماك تأكل الجمبري الصغير</li>
                          <li>استخدم أداة "مكتشف الأسماك" لمساعدة أفضل</li>
                        </ul>
                      </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                          أضف الأسماك تدريجياً! 3-5 أسماك كل أسبوعين. هذا يعطي البكتيريا المفيدة وقتاً للتكيف مع الحمل البيولوجي الجديد.
                          لا تضف كل الأسماك دفعة واحدة - حتى لو كان حوضك مدوّر!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 7: Maintenance Schedule */}
              {currentStep === 7 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-7 w-7 text-primary" />
                        جدول الصيانة
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        الصيانة المنتظمة = حوض صحي ومزدهر
                      </p>
                    </div>

                    {/* Maintenance Preference */}
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">كم من الوقت يمكنك تخصيصه للصيانة؟</Label>
                      <RadioGroup value={wizardData.maintenancePreference} onValueChange={(val) => updateData("maintenancePreference", val)}>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              value: "minimal",
                              label: "صيانة قليلة (15 دقيقة/أسبوع)",
                              desc: "نظام بسيط، نباتات قليلة، أسماك قليلة",
                              tasks: "تغيير ماء، تغذية، فحص بصري"
                            },
                            {
                              value: "moderate",
                              label: "صيانة معتدلة (30-45 دقيقة/أسبوع)",
                              desc: "التوازن المثالي لمعظم الناس",
                              tasks: "تغيير ماء، تنظيف فلتر شهري، تقليم نباتات"
                            },
                            {
                              value: "intensive",
                              label: "صيانة مكثفة (ساعة+/أسبوع)",
                              desc: "حوض نباتي غني، كثافة سمكية عالية",
                              tasks: "تغيير ماء متكرر، تسميد، تقليم، اختبارات"
                            }
                          ].map((option) => (
                            <div key={option.value}>
                              <RadioGroupItem value={option.value} id={`maint-${option.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`maint-${option.value}`}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                )}
                              >
                                <div className="font-bold text-foreground mb-1">{option.label}</div>
                                <div className="text-sm text-muted-foreground mb-2">{option.desc}</div>
                                <div className="text-xs text-primary">المهام: {option.tasks}</div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Maintenance Schedule */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        جدول الصيانة الموصى به
                      </h3>

                      {/* Daily */}
                      <div className="border-r-4 border-blue-500 bg-blue-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                          <Badge className="bg-blue-500">يومي</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>إطعام الأسماك (1-2 مرة، كمية تؤكل في 2-3 دقائق)</li>
                          <li>فحص بصري للأسماك (سلوك غريب، علامات مرض)</li>
                          <li>فحص درجة الحرارة</li>
                          <li>تأكد من عمل جميع المعدات</li>
                        </ul>
                      </div>

                      {/* Weekly */}
                      <div className="border-r-4 border-green-500 bg-green-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                          <Badge className="bg-green-500">أسبوعي</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>تغيير 20-30% من الماء</li>
                          <li>تنظيف زجاج الحوض من الطحالب</li>
                          <li>شفط الحصى (Gravel Vacuum)</li>
                          <li>اختبار معايير المياه (pH، أمونيا، نيتريت، نترات)</li>
                          <li>تقليم النباتات الزائدة</li>
                        </ul>
                      </div>

                      {/* Monthly */}
                      <div className="border-r-4 border-amber-500 bg-amber-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                          <Badge className="bg-amber-500">شهري</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>تنظيف/استبدال وسائط الفلتر</li>
                          <li>فحص وتنظيف السخان</li>
                          <li>فحص الأنابيب والخراطيم</li>
                          <li>تنظيف الإضاءة</li>
                        </ul>
                      </div>

                      {/* Quarterly */}
                      <div className="border-r-4 border-purple-500 bg-purple-500/5 rounded-lg p-4">
                        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
                          <Badge className="bg-purple-500">كل 3 أشهر</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>تنظيف عميق للفلتر</li>
                          <li>استبدال الكربون المنشط</li>
                          <li>فحص جميع المعدات الكهربائية</li>
                          <li>إعادة ترتيب الديكور حسب الحاجة</li>
                        </ul>
                      </div>
                    </div>

                    {/* Essential Tools */}
                    <div className="bg-muted/30 rounded-xl p-6">
                      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        أدوات الصيانة الأساسية
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {[
                          "سطل مخصص للحوض (5-10 لتر)",
                          "خرطوم للسحب (Siphon)",
                          "مكشطة طحالب",
                          "شبكة لالتقاط الأسماك",
                          "طقم اختبار المياه",
                          "ملقط طويل (للنباتات)",
                          "مقص للتقليم",
                          "معالج ماء (Seachem Prime)"
                        ].map((tool, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-muted-foreground">{tool}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-foreground mb-1 text-right">نصيحة الخبراء</div>
                        <p className="text-sm text-muted-foreground text-right">
                          حدد يوماً ثابتاً في الأسبوع لتغيير الماء - اجعله روتيناً! الانتظام أهم من الكمال.
                          تغيير ماء صغير منتظم أفضل بكثير من تغيير ماء كبير نادر. استخدم منبهاً على هاتفك لتذكيرك.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 8: Summary & Shopping List */}
              {currentStep === 8 && (
                <Card className="border-2">
                  <CardContent className="p-6 md:p-8 space-y-8">
                    <div className="space-y-2 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        مبروك! خطتك جاهزة
                      </h2>
                      <p className="text-lg text-muted-foreground">
                        إليك ملخص كامل لإعداد حوضك المثالي
                      </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-5 w-5 text-blue-500" />
                          <h3 className="font-bold text-foreground">الحوض</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الحجم:</span>
                            <span className="font-bold">
                              {wizardData.tankSize === "small" && "صغير (20-60 لتر)"}
                              {wizardData.tankSize === "medium" && "متوسط (60-150 لتر)"}
                              {wizardData.tankSize === "large" && "كبير (150-300 لتر)"}
                              {wizardData.tankSize === "xlarge" && "كبير جداً (+300 لتر)"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">النوع:</span>
                            <span className="font-bold">
                              {wizardData.tankType === "freshwater-community" && "مجتمع مياه عذبة"}
                              {wizardData.tankType === "planted" && "نباتي"}
                              {wizardData.tankType === "species-specific" && "نوع محدد"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Filter className="h-5 w-5 text-green-500" />
                          <h3 className="font-bold text-foreground">المعدات</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الفلتر:</span>
                            <span className="font-bold capitalize">{wizardData.filterType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">السخان:</span>
                            <span className="font-bold">{wizardData.heaterWattage} واط</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الإضاءة:</span>
                            <span className="font-bold capitalize">{wizardData.lightingType}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Mountain className="h-5 w-5 text-amber-500" />
                          <h3 className="font-bold text-foreground">الديكور</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الركيزة:</span>
                            <span className="font-bold">{wizardData.substrateType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">العناصر:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {wizardData.decorations.map(dec => (
                                <Badge key={dec} variant="outline" className="text-xs">{dec}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Fish className="h-5 w-5 text-purple-500" />
                          <h3 className="font-bold text-foreground">الأسماك</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الكثافة:</span>
                            <span className="font-bold">{wizardData.stockingLevel}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">الأنواع:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {wizardData.fishTypes.map(type => (
                                <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Timeline */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Clock className="h-6 w-6 text-primary" />
                        الجدول الزمني للإعداد
                      </h3>
                      <div className="space-y-3">
                        {[
                          { day: "اليوم 1", task: "تنظيف الحوض، إضافة الركيزة والديكور", icon: Package },
                          { day: "اليوم 1", task: "تركيب المعدات (فلتر، سخان، إضاءة)", icon: Filter },
                          { day: "اليوم 2", task: "ملء الحوض بالماء وإضافة معالج الكلور", icon: Droplets },
                          { day: "اليوم 2-3", task: "زراعة النباتات", icon: Leaf },
                          { day: "الأسبوع 1-6", task: "دورة النيتروجين - الصبر!", icon: TestTube },
                          { day: "بعد التدوير", task: "إضافة الأسماك تدريجياً", icon: Fish },
                          { day: "مستمر", task: "الصيانة الأسبوعية", icon: Calendar }
                        ].map((step, idx) => {
                          const StepIcon = step.icon;
                          return (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <StepIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-sm text-primary">{step.day}</div>
                                <div className="text-sm text-foreground">{step.task}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Recommended Products */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6 text-primary" />
                        المنتجات الموصى بها
                      </h3>

                      {productsData?.products ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {getRecommendedProducts().map((product, idx) => (
                            <div key={idx} className="flex gap-3 p-4 rounded-xl border bg-card hover:border-primary/50 transition-all">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-20 h-20 object-contain rounded-lg bg-muted"
                              />
                              <div className="flex-1">
                                <h4 className="font-bold text-sm text-foreground mb-1">{product.name}</h4>
                                <div className="text-primary font-bold mb-2">
                                  {Number(product.price).toLocaleString()} د.ع
                                </div>
                                <Badge variant="outline" className="text-xs">{product.category}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          جاري تحميل المنتجات...
                        </div>
                      )}

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={addRecommendedProductsToCart}
                      >
                        <ShoppingCart className="h-5 w-5 ml-2" />
                        أضف جميع المنتجات الموصى بها للسلة
                      </Button>
                    </div>



                    {/* Final Tips */}
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-bold text-foreground">نصائح نهائية للنجاح</h3>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          <span><strong>الصبر هو المفتاح:</strong> لا تتعجل دورة النيتروجين</span>
                        </li>
                        <li className="flex gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          <span><strong>الانتظام:</strong> تغيير ماء صغير منتظم أفضل من تغيير كبير نادر</span>
                        </li>
                        <li className="flex gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          <span><strong>لا تفرط في التغذية:</strong> معظم مشاكل الأحواض من التغذية الزائدة</span>
                        </li>
                        <li className="flex gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          <span><strong>اختبر المياه:</strong> خاصة في الأسابيع الأولى</span>
                        </li>
                        <li className="flex gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          <span><strong>انضم للمجتمع:</strong> تابع مجموعات الهواة للنصائح والدعم</span>
                        </li>
                      </ul>
                    </div>

                    {/* Reset Button */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          localStorage.removeItem("wizardStep");
                          localStorage.removeItem("wizardData");
                          window.location.reload();
                        }}
                      >
                        ابدأ من جديد
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => window.print()}
                      >
                        طباعة الخطة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ArrowRight className="ml-2 w-5 h-5" />
              السابق
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <WaterRippleButton
                size="lg"
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                التالي
                <ArrowLeft className="mr-2 w-5 h-5" />
              </WaterRippleButton>
            ) : (
              <Button
                size="lg"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex-1"
              >
                <CheckCircle2 className="ml-2 w-5 h-5" />
                تم
              </Button>
            )}
          </div>

          {/* Progress Text */}
          <div className="text-center text-sm text-muted-foreground mt-4">
            الخطوة {currentStep + 1} من {STEPS.length}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
