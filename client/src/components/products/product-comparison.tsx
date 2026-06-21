import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types";

// --- Comparison helpers (mirror product-details + specifications-table logic) ---

// Real price for a product: use lowest variant price when it has variants,
// otherwise the base price. Returns original price only when it's a real discount.
function getComparePrice(p: Product): { price: number; original?: number; fromVariant: boolean } {
    const variantPrices = (p.hasVariants && p.variants?.length)
        ? p.variants.map((v) => v.price).filter((n) => n > 0)
        : [];
    const minVariant = variantPrices.length ? Math.min(...variantPrices) : undefined;
    const price = minVariant ?? p.price ?? 0;
    const original = p.originalPrice && p.originalPrice > price ? p.originalPrice : undefined;
    return { price, original, fromVariant: minVariant !== undefined };
}

// Keys that are shown elsewhere (or not real technical specs) — excluded from the spec rows.
const COMPARE_EXCLUDE_SPEC_KEYS = [
    "benefits", "difficulty", "ecoFriendly", "videoUrl",
    "explodedViewParts", "brand", "usageInstructions",
];

// Normalize a product's specifications into a flat label->value map.
function getCompareSpecs(p: Product): Record<string, string> {
    const out: Record<string, string> = {};
    const specs = p.specifications;
    if (!specs || typeof specs !== "object") return out;
    for (const [key, value] of Object.entries(specs)) {
        if (key.startsWith("__")) continue;
        if (COMPARE_EXCLUDE_SPEC_KEYS.includes(key)) continue;
        if (Array.isArray(value)) continue;
        if (value === null || value === undefined || value === "") continue;
        out[key] = typeof value === "boolean"
            ? (value ? "نعم ✓" : "لا ✗")
            : typeof value === "object"
                ? JSON.stringify(value)
                : String(value);
    }
    return out;
}

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

            // Confetti effect like wishlist — skipped when the user prefers reduced motion
            if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
                return;
            }
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

// Comparison Drawer (Floating, mobile-first)
//
// 2026 design: a compact thumb-reachable "dock" pinned to the bottom of the
// products page. Collapsed by default into a small pill (count + stacked
// thumbnails); tapping it springs open a bottom sheet with the full list and
// the "عرض المقارنة" CTA. Honours safe-area insets and prefers-reduced-motion.
interface ComparisonDrawerProps {
    products: Product[];
}

export function ComparisonDrawer({ products }: ComparisonDrawerProps) {
    const { compareIds, removeFromCompare, clearCompare } = useComparison();
    const [expanded, setExpanded] = useState(false);
    const reduceMotion = useReducedMotion();

    const comparedProducts = useMemo(() => {
        return compareIds
            .map((id) => products.find((p) => p.id === id))
            .filter(Boolean) as Product[];
    }, [compareIds, products]);

    const count = comparedProducts.length;

    // Bounce the dock whenever the count grows (a product was just added).
    const [bump, setBump] = useState(false);
    const prevCount = useRef(0);
    useEffect(() => {
        if (count > prevCount.current) {
            setBump(true);
            const t = setTimeout(() => setBump(false), 480);
            prevCount.current = count;
            return () => clearTimeout(t);
        }
        prevCount.current = count;
    }, [count]);

    // Auto-collapse when emptied.
    useEffect(() => {
        if (count === 0 && expanded) setExpanded(false);
    }, [count, expanded]);

    const spring = reduceMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 420, damping: 32 };

    return (
        <AnimatePresence>
            {count > 0 && (
                <motion.div
                    key="compare-dock"
                    initial={reduceMotion ? false : { y: 120, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { y: 120, opacity: 0 }}
                    transition={spring}
                    className="fixed inset-x-0 z-50 flex justify-center px-3 pointer-events-none"
                    style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
                >
                    <motion.div
                        animate={bump && !reduceMotion ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="pointer-events-auto w-full max-w-md"
                    >
                        {expanded ? (
                            /* ---- Expanded bottom sheet ---- */
                            <motion.div
                                layout
                                className="rounded-3xl border border-primary/25 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                    <span className="text-sm font-bold flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-primary" />
                                        المقارنة ({count}/{MAX_COMPARE})
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={clearCompare}>
                                            مسح الكل
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setExpanded(false)}
                                            aria-label="تصغير"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex gap-2.5 px-4 pb-3 overflow-x-auto">
                                    <AnimatePresence mode="popLayout">
                                        {comparedProducts.map((product) => (
                                            <motion.div
                                                key={product.id}
                                                layout
                                                initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={reduceMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
                                                transition={spring}
                                                className="relative flex-shrink-0 w-[4.25rem] h-[4.25rem]"
                                            >
                                                <img
                                                    src={product.image || product.thumbnail}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain rounded-xl border bg-background"
                                                />
                                                <button
                                                    onClick={() => removeFromCompare(product.id)}
                                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                                                    aria-label={`إزالة ${product.name}`}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {count < MAX_COMPARE && (
                                        <div className="flex-shrink-0 w-[4.25rem] h-[4.25rem] border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center text-muted-foreground/60">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>

                                <div className="px-4 pb-4">
                                    <Link href="/compare">
                                        <Button className="w-full gap-2 h-12 rounded-2xl text-base font-bold shadow-lg shadow-primary/20">
                                            عرض المقارنة
                                            <ArrowRight className="w-5 h-5" />
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                        ) : (
                            /* ---- Collapsed pill ---- */
                            <motion.button
                                layout
                                onClick={() => setExpanded(true)}
                                className="mx-auto flex items-center gap-3 rounded-full border border-primary/25 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/15 ps-2 pe-4 py-2 active:scale-[0.97] transition-transform"
                                aria-label={`فتح المقارنة (${count})`}
                            >
                                {/* Stacked thumbnails */}
                                <span className="flex items-center">
                                    {comparedProducts.slice(0, 3).map((product, i) => (
                                        <img
                                            key={product.id}
                                            src={product.image || product.thumbnail}
                                            alt=""
                                            aria-hidden="true"
                                            className="w-9 h-9 rounded-full border-2 border-card object-cover bg-background"
                                            style={{ marginInlineStart: i === 0 ? 0 : "-12px", zIndex: 3 - i }}
                                        />
                                    ))}
                                </span>
                                <span className="flex items-center gap-1.5 text-sm font-bold">
                                    <Scale className="w-4 h-4 text-primary" />
                                    قارن
                                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs">
                                        {count}
                                    </span>
                                </span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </motion.button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
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

    const handleAddToCart = async (product: Product) => {
        const ok = await addItem(product);
        if (!ok) return;
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

    // Collect the union of all spec keys across compared products
    const specMaps = products.map(getCompareSpecs);
    const allSpecKeys = Array.from(new Set(specMaps.flatMap((m) => Object.keys(m))));

    const difficultyLabels: Record<string, string> = {
        easy: "سهل",
        medium: "متوسط",
        hard: "صعب",
        expert: "خبير",
    };

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
                    {/* Price Row — real prices, with discount + "starting from" for variants */}
                    <TableRow>
                        <TableCell className="font-medium">السعر</TableCell>
                        {products.map((product) => {
                            const { price, original, fromVariant } = getComparePrice(product);
                            return (
                                <TableCell key={product.id} className="text-center">
                                    {price > 0 ? (
                                        <div className="flex flex-col items-center">
                                            {fromVariant && (
                                                <span className="text-[10px] text-muted-foreground">يبدأ من</span>
                                            )}
                                            <span className="font-bold text-lg text-primary">{formatPrice(price)}</span>
                                            {original && (
                                                <span className="text-xs text-muted-foreground line-through">
                                                    {formatPrice(original)}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                            );
                        })}
                    </TableRow>

                    {/* Rating Row */}
                    <TableRow>
                        <TableCell className="font-medium">التقييم</TableCell>
                        {products.map((product) => (
                            <TableCell key={product.id} className="text-center">
                                {(product.reviewCount ?? 0) > 0 ? (
                                    <div className="flex items-center justify-center gap-1">
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        <span className="font-medium">{product.rating}</span>
                                        <span className="text-muted-foreground text-sm">
                                            ({product.reviewCount})
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">لا توجد تقييمات</span>
                                )}
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
                                <div className="flex flex-col items-center gap-1">
                                    <Badge variant="secondary">{product.category}</Badge>
                                    {product.subcategory && (
                                        <span className="text-[10px] text-muted-foreground">{product.subcategory}</span>
                                    )}
                                </div>
                            </TableCell>
                        ))}
                    </TableRow>

                    {/* Stock Row */}
                    <TableRow>
                        <TableCell className="font-medium">التوفر</TableCell>
                        {products.map((product) => {
                            const stock = product.hasVariants && product.variants?.length
                                ? product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
                                : (product.stock ?? 0);
                            return (
                                <TableCell key={product.id} className="text-center">
                                    {stock > 0 ? (
                                        <Badge className="bg-green-500">متوفر{stock <= 5 ? ` (${stock})` : ""}</Badge>
                                    ) : (
                                        <Badge variant="destructive">غير متوفر</Badge>
                                    )}
                                </TableCell>
                            );
                        })}
                    </TableRow>

                    {/* Difficulty Row — only when at least one product has it */}
                    {products.some((p) => p.difficulty) && (
                        <TableRow>
                            <TableCell className="font-medium">مستوى الصعوبة</TableCell>
                            {products.map((product) => (
                                <TableCell key={product.id} className="text-center">
                                    {product.difficulty
                                        ? (difficultyLabels[product.difficulty] || product.difficulty)
                                        : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                            ))}
                        </TableRow>
                    )}

                    {/* Dynamic Specification Rows — union of all product specs */}
                    {allSpecKeys.map((key) => (
                        <TableRow key={`spec-${key}`}>
                            <TableCell className="font-medium">{key}</TableCell>
                            {products.map((product, i) => (
                                <TableCell key={product.id} className="text-center text-sm">
                                    {specMaps[i][key] ?? <span className="text-muted-foreground">-</span>}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}

                    {/* Description Row */}
                    {products.some((p) => p.description) && (
                        <TableRow>
                            <TableCell className="font-medium align-top">الوصف</TableCell>
                            {products.map((product) => (
                                <TableCell key={product.id} className="text-sm text-muted-foreground align-top text-right">
                                    {product.description
                                        ? <span className="line-clamp-4">{product.description}</span>
                                        : "-"}
                                </TableCell>
                            ))}
                        </TableRow>
                    )}

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
                        {products.map((product) => {
                            const stock = product.hasVariants && product.variants?.length
                                ? product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
                                : (product.stock ?? 0);
                            // Variant products need an option selected — send to the detail page.
                            if (product.hasVariants && product.variants?.length) {
                                return (
                                    <TableCell key={product.id} className="text-center">
                                        <Link href={`/products/${product.slug}`}>
                                            <Button variant="outline" className="gap-2" disabled={stock <= 0}>
                                                <ArrowRight className="w-4 h-4" />
                                                اختر الخيار
                                            </Button>
                                        </Link>
                                    </TableCell>
                                );
                            }
                            return (
                                <TableCell key={product.id} className="text-center">
                                    <Button
                                        className="gap-2"
                                        onClick={() => handleAddToCart(product)}
                                        disabled={stock <= 0}
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        أضف للسلة
                                    </Button>
                                </TableCell>
                            );
                        })}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
