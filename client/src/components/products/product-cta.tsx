import { ShoppingCart, Loader2, Check, AlertTriangle, Package, Truck } from "lucide-react";
import { DELIVERY_TEXT } from "@/lib/constants/shipping";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProductCTAProps {
    price: number;
    originalPrice?: number;
    currency?: string;
    stock: number;
    lowStockThreshold?: number;
    isLoading?: boolean;
    isAddedToCart?: boolean;
    quantity?: number;
    onAddToCart: () => void;
    onQuantityChange?: (delta: number) => void;
    className?: string;
}

export function ProductCTA({
    price,
    originalPrice,
    currency = "د.ع",
    stock,
    lowStockThreshold = 10,
    isLoading = false,
    isAddedToCart = false,
    quantity = 1,
    onAddToCart,
    onQuantityChange,
    className,
}: ProductCTAProps) {
    const inStock = stock > 0;
    const isLowStock = stock > 0 && stock <= lowStockThreshold;
    const discount = originalPrice
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Price Section */}
            <div className="space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-4xl font-bold text-purple-500">قريباً جداً ✨</span>
                </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
                {inStock ? (
                    isLowStock ? (
                        <>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                متبقي {stock} فقط - اطلب الآن!
                            </span>
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                متوفر في المخزن
                            </span>
                            <Badge variant="secondary" className="text-xs">
                                {stock} قطعة
                            </Badge>
                        </>
                    )
                ) : (
                    <>
                        <Package className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            غير متوفر حالياً
                        </span>
                    </>
                )}
            </div>

            {/* Quantity Selector & Add to Cart */}
            {inStock && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Quantity Selector */}
                    {onQuantityChange && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-muted-foreground">
                                الكمية:
                            </label>
                            <div className="flex items-center border rounded-lg">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-r-lg rounded-l-none"
                                    onClick={() => onQuantityChange(-1)}
                                    disabled={quantity <= 1}
                                >
                                    -
                                </Button>
                                <span className="w-12 text-center font-semibold">
                                    {quantity}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-l-lg rounded-r-none"
                                    onClick={() => onQuantityChange(1)}
                                    disabled={quantity >= stock}
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Add to Cart Button */}
                    <Button
                        size="lg"
                        className={cn(
                            "flex-1 gap-2 text-lg h-12 transition-all duration-300",
                            isAddedToCart && "bg-green-500 hover:bg-green-600"
                        )}
                        onClick={onAddToCart}
                        disabled={isLoading || !inStock}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                جاري الإضافة...
                            </>
                        ) : isAddedToCart ? (
                            <>
                                <Check className="w-5 h-5" />
                                تمت الإضافة!
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="w-5 h-5" />
                                أضف إلى السلة
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Out of Stock - Notify Me */}
            {!inStock && (
                <Button size="lg" variant="outline" className="w-full gap-2 h-12">
                    <Package className="w-5 h-5" />
                    أبلغني عند التوفر
                </Button>
            )}

            {/* Delivery Info */}
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Truck className="w-5 h-5 text-primary" />
                <div className="text-sm">
                    <span className="font-medium">{DELIVERY_TEXT}</span>
                </div>
            </div>
        </div>
    );
}
