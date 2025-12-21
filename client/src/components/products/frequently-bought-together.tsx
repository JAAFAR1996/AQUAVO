import { useState } from "react";
import { ShoppingCart, Plus, Check, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    slug: string;
    stock?: number;
}

interface FrequentlyBoughtTogetherProps {
    currentProduct: Product;
    relatedProducts: Product[];
    className?: string;
}

export function FrequentlyBoughtTogether({
    currentProduct,
    relatedProducts,
    className,
}: FrequentlyBoughtTogetherProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set([currentProduct.id, ...relatedProducts.slice(0, 2).map(p => p.id)])
    );
    const { addItem } = useCart();
    const { toast } = useToast();

    // Get first 3 related products
    const products = [currentProduct, ...relatedProducts.slice(0, 2)];

    const toggleProduct = (productId: string) => {
        // Don't allow deselecting the current product
        if (productId === currentProduct.id) return;

        const newSelected = new Set(selectedIds);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedIds(newSelected);
    };

    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const totalOriginalPrice = selectedProducts.reduce(
        (sum, p) => sum + (p.originalPrice || p.price),
        0
    );
    const savings = totalOriginalPrice - totalPrice;

    const handleAddAllToCart = () => {
        selectedProducts.forEach(product => {
            // Cast to full Product type for cart compatibility
            addItem(product as import("@/types").Product);
        });

        toast({
            title: "تمت الإضافة للسلة",
            description: `تم إضافة ${selectedProducts.length} منتجات إلى السلة`,
        });
    };

    if (relatedProducts.length === 0) {
        return null;
    }

    return (
        <Card className={cn("overflow-hidden border-primary/20", className)}>
            <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="w-5 h-5 text-amber-600" />
                    اشترِ معاً واوفر
                    {savings > 0 && (
                        <Badge className="bg-green-500 text-white mr-2">
                            وفر {savings.toLocaleString()} د.ع
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {/* Products Row */}
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                    {products.map((product, index) => {
                        const isSelected = selectedIds.has(product.id);
                        const isCurrentProduct = product.id === currentProduct.id;

                        return (
                            <div key={product.id} className="flex items-center gap-4">
                                {/* Product Card */}
                                <div
                                    onClick={() => toggleProduct(product.id)}
                                    className={cn(
                                        "relative flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer w-[120px] md:w-[140px]",
                                        isSelected
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-muted-foreground/30",
                                        isCurrentProduct && "cursor-default"
                                    )}
                                >
                                    {/* Checkbox */}
                                    <div className="absolute top-2 right-2">
                                        <Checkbox
                                            checked={isSelected}
                                            disabled={isCurrentProduct}
                                            className={cn(
                                                isCurrentProduct && "opacity-50"
                                            )}
                                        />
                                    </div>

                                    {/* Current Product Badge */}
                                    {isCurrentProduct && (
                                        <Badge
                                            variant="secondary"
                                            className="absolute top-2 left-2 text-[10px] px-1.5"
                                        >
                                            هذا المنتج
                                        </Badge>
                                    )}

                                    {/* Product Image */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-muted/30 mb-2">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-contain p-1"
                                        />
                                    </div>

                                    {/* Product Name */}
                                    <h4 className="text-xs font-medium text-center line-clamp-2 h-8 mb-1">
                                        {product.name}
                                    </h4>

                                    {/* Price */}
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-primary">
                                            {product.price.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mr-1">
                                            د.ع
                                        </span>
                                    </div>
                                </div>

                                {/* Plus Sign (except for last) */}
                                {index < products.length - 1 && (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Total and Add All Button */}
                <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-right">
                        <div className="text-sm text-muted-foreground">
                            المجموع ({selectedProducts.length} منتجات):
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-primary">
                                {totalPrice.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">د.ع</span>
                            {savings > 0 && (
                                <span className="text-sm text-muted-foreground line-through">
                                    {totalOriginalPrice.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="gap-2 min-w-[200px]"
                        onClick={handleAddAllToCart}
                        disabled={selectedProducts.length === 0}
                    >
                        <ShoppingCart className="w-5 h-5" />
                        إضافة الكل للسلة
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
