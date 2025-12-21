import { useMemo } from "react";
import { Link } from "wouter";
import {
    X,
    Plus,
    Check,
    Star,
    ArrowRight,
    ShoppingCart,
    Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

// Re-export useComparison from context for backward compatibility
export { useComparison } from "@/contexts/comparison-context";
import { useComparison } from "@/contexts/comparison-context";

const MAX_COMPARE = 4;

// Compare Button for Product Cards
interface CompareButtonProps {
    productId: string;
    variant?: "icon" | "full";
    className?: string;
}

export function CompareButton({
    productId,
    variant = "icon",
    className,
}: CompareButtonProps) {
    const { addToCompare, removeFromCompare, isInCompare, canAdd } =
        useComparison();
    const { toast } = useToast();
    const inCompare = isInCompare(productId);

    const handleToggle = (e: React.MouseEvent) => {
        // Stop propagation to prevent navigation to product page
        e.preventDefault();
        e.stopPropagation();

        if (inCompare) {
            removeFromCompare(productId);
            // No toast, just visual feedback from button state change
        } else {
            if (!canAdd) {
                toast({
                    title: "الحد الأقصى للمقارنة",
                    description: `يمكنك مقارنة ${MAX_COMPARE} منتجات كحد أقصى`,
                    variant: "destructive",
                });
                return;
            }
            addToCompare(productId);

            // Confetti effect like wishlist
            import('canvas-confetti').then((confetti) => {
                const button = e.currentTarget as HTMLElement;
                const rect = button.getBoundingClientRect();
                const x = (rect.left + rect.width / 2) / window.innerWidth;
                const y = (rect.top + rect.height / 2) / window.innerHeight;

                confetti.default({
                    particleCount: 30,
                    spread: 60,
                    origin: { x, y },
                    colors: ['#10b981', '#3b82f6', '#8b5cf6'],
                    startVelocity: 15,
                    gravity: 0.8,
                    scalar: 0.8,
                });
            });
        }
    };

    if (variant === "icon") {
        return (
            <Button
                variant={inCompare ? "default" : "outline"}
                size="icon"
                className={cn("h-9 w-9 transition-all", inCompare && "bg-primary scale-110", className)}
                onClick={handleToggle}
                title={inCompare ? "إزالة من المقارنة" : "إضافة للمقارنة"}
            >
                <Scale className="w-4 h-4" />
            </Button>
        );
    }

    return (
        <Button
            variant={inCompare ? "default" : "outline"}
            size="sm"
            className={cn("gap-1 transition-all", inCompare && "bg-primary text-primary-foreground scale-105", className)}
            onClick={handleToggle}
        >
            {inCompare ? (
                <>
                    <Check className="w-4 h-4" />
                    في المقارنة
                </>
            ) : (
                <>
                    <Scale className="w-4 h-4" />
                    قارن
                </>
            )}
        </Button>
    );
}

// Comparison Drawer (Floating)
interface ComparisonDrawerProps {
    products: Product[];
}

export function ComparisonDrawer({ products }: ComparisonDrawerProps) {
    const { compareIds, removeFromCompare, clearCompare } = useComparison();

    const comparedProducts = useMemo(() => {
        return compareIds
            .map((id) => products.find((p) => p.id === id))
            .filter(Boolean) as Product[];
    }, [compareIds, products]);

    if (comparedProducts.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
            <Card className="shadow-2xl border-primary/20">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Scale className="w-4 h-4" />
                            المقارنة ({comparedProducts.length}/{MAX_COMPARE})
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={clearCompare}
                        >
                            مسح الكل
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pb-3">
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                        {comparedProducts.map((product) => (
                            <div
                                key={product.id}
                                className="relative flex-shrink-0 w-16 h-16"
                            >
                                <img
                                    src={product.image || product.thumbnail}
                                    alt={product.name}
                                    className="w-full h-full object-contain rounded border"
                                />
                                <button
                                    onClick={() => removeFromCompare(product.id)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {comparedProducts.length < MAX_COMPARE && (
                            <div className="flex-shrink-0 w-16 h-16 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                                <Plus className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                    <Link href="/compare">
                        <Button className="w-full gap-2">
                            عرض المقارنة
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}

// Full Comparison Table
interface ProductComparisonTableProps {
    products: Product[];
    onRemove?: (productId: string) => void;
}

export function ProductComparisonTable({
    products,
    onRemove,
}: ProductComparisonTableProps) {
    const { addItem } = useCart();
    const { toast } = useToast();

    const handleAddToCart = (product: Product) => {
        addItem(product);
        toast({
            title: "تمت الإضافة للسلة",
            description: product.name,
        });
    };

    if (products.length === 0) {
        return (
            <Card className="text-center py-12">
                <CardContent>
                    <Scale className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">لا توجد منتجات للمقارنة</h3>
                    <p className="text-muted-foreground mb-4">
                        أضف منتجات من صفحة المنتجات للمقارنة بينها
                    </p>
                    <Link href="/products">
                        <Button>تصفح المنتجات</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    // Extract all unique specs
    const allSpecs = new Set<string>();
    products.forEach((p) => {
        // Parse specs if it's a string description
        // For now, we'll use some common comparison points
    });

    const comparisonPoints = [
        { key: "price", label: "السعر" },
        { key: "rating", label: "التقييم" },
        { key: "brand", label: "العلامة التجارية" },
        { key: "category", label: "الفئة" },
        { key: "stock", label: "التوفر" },
    ];

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-40">المنتج</TableHead>
                        {products.map((product) => (
                            <TableHead key={product.id} className="min-w-[200px]">
                                <div className="relative">
                                    {onRemove && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6"
                                            onClick={() => onRemove(product.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    )}
                                    <div className="text-center">
                                        <img
                                            src={product.image || product.thumbnail}
                                            alt={product.name}
                                            className="w-24 h-24 object-contain mx-auto mb-2"
                                        />
                                        <Link href={`/products/${product.slug}`}>
                                            <span className="font-medium hover:text-primary line-clamp-2">
                                                {product.name}
                                            </span>
                                        </Link>
                                    </div>
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {/* Price Row */}
                    <TableRow>
                        <TableCell className="font-medium">السعر</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                <div className="font-bold text-lg text-primary">
                                    {product.price.toLocaleString()} د.ع
                                </div>
                                {product.originalPrice && product.originalPrice > product.price && (
                                    <div className="text-sm text-muted-foreground line-through">
                                        {product.originalPrice.toLocaleString()} د.ع
                                    </div>
                                )}
                            </TableCell>
                        ))}
                    </TableRow>

                    {/* Rating Row */}
                    <TableRow>
                        <TableCell className="font-medium">التقييم</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    <span className="font-medium">{product.rating}</span>
                                    <span className="text-muted-foreground text-sm">
                                        ({product.reviewCount})
                                    </span>
                                </div>
                            </TableCell>
                        ))}
                    </TableRow>

                    {/* Brand Row */}
                    <TableRow>
                        <TableCell className="font-medium">العلامة التجارية</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                {product.brand || "-"}
                            </TableCell>
                        ))}
                    </TableRow>

                    {/* Category Row */}
                    <TableRow>
                        <TableCell className="font-medium">الفئة</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                <Badge variant="secondary">{product.category}</Badge>
                            </TableCell>
                        ))}
                    </TableRow>

                    {/* Stock Row */}
                    <TableRow>
                        <TableCell className="font-medium">التوفر</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                {(product.stock ?? 0) > 0 ? (
                                    <Badge className="bg-green-500">متوفر</Badge>
                                ) : (
                                    <Badge variant="destructive">غير متوفر</Badge>
                                )}
                            </TableCell>
                        ))}
                    </TableRow>

                    {/* Badges Row */}
                    <TableRow>
                        <TableCell className="font-medium">مميزات</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                <div className="flex flex-wrap gap-1 justify-center">
                                    {product.isNew && (
                                        <Badge className="bg-blue-500">جديد</Badge>
                                    )}
                                    {product.isBestSeller && (
                                        <Badge className="bg-amber-500">الأكثر مبيعاً</Badge>
                                    )}
                                    {product.ecoFriendly && (
                                        <Badge className="bg-green-600">صديق للبيئة</Badge>
                                    )}
                                    {!product.isNew && !product.isBestSeller && !product.ecoFriendly && (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </div>
                            </TableCell>
                        ))}
                    </TableRow>

                    {/* Add to Cart Row */}
                    <TableRow>
                        <TableCell className="font-medium">الإجراء</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                <Button
                                    className="gap-2"
                                    onClick={() => handleAddToCart(product)}
                                    disabled={(product.stock ?? 0) <= 0}
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    أضف للسلة
                                </Button>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
