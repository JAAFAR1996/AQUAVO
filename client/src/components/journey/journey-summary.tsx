import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package, Filter, Mountain, Fish, Clock, ShoppingCart, Sparkles, Leaf, Droplets, TestTube, Calendar } from "lucide-react";
import { WizardData } from "@/types/journey";
import { Product } from "@/types";
import { getJourneyRecommendations } from "./utils";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";

interface JourneySummaryProps {
    wizardData: WizardData;
    products: Product[];
}

export function JourneySummary({ wizardData, products }: JourneySummaryProps) {
    const { addItem } = useCart();
    const { toast } = useToast();

    const recommendedProducts = getJourneyRecommendations(products, wizardData);

    const addRecommendedProductsToCart = () => {
        recommendedProducts.forEach(product => {
            addItem(product);
        });
        toast({
            title: "تمت الإضافة للسلة",
            description: "تم إضافة جميع المنتجات الموصى بها لسلة مشترياتك",
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

                    {products.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recommendedProducts.map((product, idx) => (
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
                            if (confirm("هل أنت متأكد من البدء من جديد؟")) {
                                localStorage.removeItem("wizardStep");
                                localStorage.removeItem("wizardData");
                                window.location.reload();
                            }
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
    );
}
