import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package, Filter, Mountain, Fish, Clock, ShoppingCart, Sparkles, Leaf, Droplets, TestTube, Calendar, Loader2, Utensils } from "lucide-react";
import { WizardData } from "@/types/journey";
import { Product } from "@/types";
import { getJourneyRecommendations } from "./utils";
import { getSpeciesById } from "./fish-species-data";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface JourneySummaryProps {
    wizardData: WizardData;
    products: Product[];
}

export function JourneySummary({ wizardData, products }: JourneySummaryProps) {
  const { t } = useTranslation("tools");
    const { addItem, addItems } = useCart();
    const { toast } = useToast();

    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            setIsLoading(true);
            try {
                // Fetch AI recommendations
                const response = await fetch('/api/ai/journey-recommendations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wizardData })
                });

                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                    setRecommendations(data.data);
                } else {
                    // Fallback to static logic
                    console.log("AI returned no results, using static fallback");
                    setRecommendations(getJourneyRecommendations(products, wizardData));
                }
            } catch (error) {
                console.error("Failed to fetch AI recommendations:", error);
                // Fallback to static logic
                setRecommendations(getJourneyRecommendations(products, wizardData));
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendations();
    }, [wizardData, products]); // Re-run if wizard data inputs change

    const addRecommendedProductsToCart = () => {
        addItems(recommendations);
        toast({
            title: t("journey-summary.s1"),
            description: t("journey-summary.s2"),
        });
    };


    return (
        <Card className="border-2">
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        {t("journey-summary.s3")}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        {t("journey-summary.s4")}
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="h-5 w-5 text-blue-500" />
                            <h3 className="font-bold text-foreground">{t("journey-summary.s5")}</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("journey-summary.s6")}</span>
                                <span className="font-bold">
                                    {wizardData.tankLiters > 0
                                        ? t("journey-summary.s7", { v0: wizardData.tankLiters })
                                        : <>
                                            {wizardData.tankSize === "small" && t("journey-summary.s8")}
                                            {wizardData.tankSize === "medium" && t("journey-summary.s9")}
                                            {wizardData.tankSize === "large" && t("journey-summary.s10")}
                                            {wizardData.tankSize === "xlarge" && t("journey-summary.s11")}
                                        </>
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("journey-summary.s12")}</span>
                                <span className="font-bold">
                                    {wizardData.tankType === "freshwater-community" && t("journey-summary.s13")}
                                    {wizardData.tankType === "planted" && t("journey-summary.s14")}
                                    {wizardData.tankType === "species-specific" && t("journey-summary.s15")}
                                    {!wizardData.tankType && t("journey-summary.s16")}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Filter className="h-5 w-5 text-green-500" />
                            <h3 className="font-bold text-foreground">{t("journey-summary.s17")}</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("journey-summary.s18")}</span>
                                <span className="font-bold capitalize">{wizardData.filterType || t("journey-summary.s16")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("journey-summary.s19")}</span>
                                <span className="font-bold">
                                    {wizardData.heaterWattage > 0 ? t("journey-summary.s20", { v0: wizardData.heaterWattage }) : t("journey-summary.s21")}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("journey-summary.s22")}</span>
                                <span className="font-bold capitalize">{wizardData.lightingType === "none" ? t("journey-summary.s23") : (wizardData.lightingType || t("journey-summary.s16"))}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Mountain className="h-5 w-5 text-amber-500" />
                            <h3 className="font-bold text-foreground">{t("journey-summary.s24")}</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("journey-summary.s25")}</span>
                                <span className="font-bold">{wizardData.substrateType || t("journey-summary.s23")}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">{t("journey-summary.s26")}</span>
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
                            <h3 className="font-bold text-foreground">{t("journey-summary.s27")}</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("journey-summary.s28")}</span>
                                <span className="font-bold">{wizardData.stockingLevel}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">{t("journey-summary.s29")}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {(wizardData.selectedSpecies && wizardData.selectedSpecies.length > 0)
                                        ? getSpeciesById(wizardData.selectedSpecies).map(species => (
                                            <Badge key={species.id} variant="outline" className="text-xs gap-1">
                                                <span>{species.emoji}</span>
                                                <span>{species.nameAr}</span>
                                            </Badge>
                                        ))
                                        : wizardData.fishTypes.map(type => (
                                            <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                        {/* Feeding summary for selected species */}
                        {wizardData.selectedSpecies && wizardData.selectedSpecies.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-purple-500/10">
                                <div className="flex items-center gap-1 mb-2 text-xs font-bold text-purple-600">
                                    <Utensils className="h-3 w-3" />
                                    {t("journey-summary.s30")}
                                </div>
                                <div className="space-y-1">
                                    {getSpeciesById(wizardData.selectedSpecies).map(species => (
                                        <div key={species.id} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <span>{species.emoji}</span>
                                            <span className="font-medium">{species.nameAr}:</span>
                                            <span>
                                                {species.feedingInfo.frequencyPerDay === 0
                                                    ? t("journey-summary.s31")
                                                    : t("journey-summary.s32", { v0: species.feedingInfo.frequencyPerDay, v1: species.feedingInfo.foodTypes.slice(0, 2).join(", ") })
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Clock className="h-6 w-6 text-primary" />
                        {t("journey-summary.s33")}
                    </h3>
                    <div className="space-y-3">
                        {[
                            { day: t("journey-summary.s34"), task: t("journey-summary.s35"), icon: Package },
                            { day: t("journey-summary.s34"), task: t("journey-summary.s36"), icon: Filter },
                            { day: t("journey-summary.s37"), task: t("journey-summary.s38"), icon: Droplets },
                            { day: t("journey-summary.s39"), task: t("journey-summary.s40"), icon: Leaf },
                            { day: t("journey-summary.s41"), task: t("journey-summary.s42"), icon: TestTube },
                            { day: t("journey-summary.s43"), task: t("journey-summary.s44"), icon: Fish },
                            { day: t("journey-summary.s45"), task: t("journey-summary.s46"), icon: Calendar }
                        ].map((step) => {
                            const StepIcon = step.icon;
                            return (
                                <div key={`${step.day}-${step.task}`} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
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
                        {t("journey-summary.s47")}
                    </h3>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <div className="text-center space-y-2">
                                <p className="font-bold text-foreground">{t("journey-summary.s48")}</p>
                                <p className="text-sm">{t("journey-summary.s49")}</p>
                            </div>
                        </div>
                    ) : recommendations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recommendations.map((product) => (
                                <a
                                    key={product.id}
                                    href={`/products/${product.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col gap-3 p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full"
                                >
                                    <div className="flex gap-3">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-20 h-20 object-contain rounded-lg bg-muted"
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-foreground mb-1 line-clamp-2">{product.name}</h4>
                                            <div className="text-primary font-bold mb-2">
                                                {product.price && Number(product.price) > 0
                                                    ? t("journey-summary.s50", { v0: Number(product.price).toLocaleString("en-US") })
                                                    : t("journey-summary.s51")}
                                            </div>
                                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                                        </div>
                                    </div>

                                    {/* AI Reason Display */}
                                    {product.reason && (
                                        <div className="mt-2 bg-primary/5 p-3 rounded-lg text-xs leading-relaxed border border-primary/10">
                                            <div className="flex items-center gap-1 mb-1 text-primary font-bold">
                                                <Sparkles className="w-3 h-3" />
                                                <span>{t("journey-summary.s52")}</span>
                                            </div>
                                            <p className="text-muted-foreground">{product.reason}</p>
                                        </div>
                                    )}
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {t("journey-summary.s53")}
                        </div>
                    )}

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={addRecommendedProductsToCart}
                    >
                        <ShoppingCart className="h-5 w-5 ml-2" />
                        {t("journey-summary.s54")}
                    </Button>
                </div>

                {/* Final Tips */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-bold text-foreground">{t("journey-summary.s55")}</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            <span><strong>{t("journey-summary.s56")}</strong> {t("journey-summary.s57")}</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            <span><strong>{t("journey-summary.s58")}</strong> {t("journey-summary.s59")}</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            <span><strong>{t("journey-summary.s60")}</strong> {t("journey-summary.s61")}</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            <span><strong>{t("journey-summary.s62")}</strong> {t("journey-summary.s63")}</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            <span><strong>{t("journey-summary.s64")}</strong> {t("journey-summary.s65")}</span>
                        </li>
                    </ul>
                </div>

                {/* Reset Button */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            if (confirm(t("journey-summary.s66"))) {
                                localStorage.removeItem("wizardStep");
                                localStorage.removeItem("wizardData");
                                window.location.reload();
                            }
                        }}
                    >
                        {t("journey-summary.s67")}
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={() => window.print()}
                    >
                        {t("journey-summary.s68")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
