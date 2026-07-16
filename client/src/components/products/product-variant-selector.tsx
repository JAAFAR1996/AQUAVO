import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Product } from "@/types";
import { Check, Ruler, Zap, Thermometer } from "lucide-react";

interface ProductVariantSelectorProps {
    /** المنتج الحالي المعروض */
    currentProduct: Product;
    /** قائمة المتغيرات المرتبطة (جميع الأحجام المتوفرة) */
    variants: Product[];
    /** العنوان المعروض فوق المحدد */
    title?: string;
}

/**
 * محدد متغيرات المنتج - يعرض الأحجام المتوفرة مع قياس الحوض المناسب
 * 
 * مثال: إضاءة HYGGER HG-978 متوفرة بـ 18W, 22W, 26W
 * كل حجم يناسب قياس حوض معين
 */
export function ProductVariantSelector({
    currentProduct,
    variants,
    title = "اختر الحجم المناسب لحوضك",
}: ProductVariantSelectorProps) {
    // لا تعرض المكون إذا لم يكن هناك متغيرات
    if (!variants || variants.length <= 1) {
        return null;
    }

    // تحديد نوع المنتج (إضاءة أو سخان) للأيقونة المناسبة
    const isHeater = currentProduct.category?.toLowerCase().includes("heater") ||
        currentProduct.subcategory?.toLowerCase().includes("heater") ||
        currentProduct.name?.toLowerCase().includes("heater");

    const Icon = isHeater ? Thermometer : Zap;

    // استخراج التسمية من الاسم (مثل: 18W, 22W, 26W أو 18 واط)
    const getVariantLabel = (product: Product): string => {
        // English wattage (18W)
        const wattMatchEn = product.name?.match(/(\d+)\s*W/i);
        if (wattMatchEn) {
            return `${wattMatchEn[1]}W`;
        }

        // Arabic wattage (18 واط)
        const wattMatchAr = product.name?.match(/(\d+)\s*واط/);
        if (wattMatchAr) {
            return `${wattMatchAr[1]} واط`;
        }

        // Flow rate (1200 لتر/ساعة)
        const flowMatch = product.name?.match(/(\d+)\s*لتر\/ساعة/);
        if (flowMatch) {
            return `${flowMatch[1]} ل/س`;
        }

        // Arabic size names
        const sizeMatch = product.name?.match(/-\s*(صغير|متوسط|كبير|كبير جداً)$/);
        if (sizeMatch) {
            return sizeMatch[1];
        }

        // محاولة استخراج من المواصفات
        if (product.specifications?.power) {
            return String(product.specifications.power);
        }

        // استخدام اسم المنتج كاحتياطي
        return product.name?.split("-").pop()?.trim() || product.name || "";
    };

    // الحصول على قياس الحوض المناسب
    const getTankSize = (product: Product): string | null => {
        const tankSize = product.specifications?.tankSize ||
            product.specifications?.["قياس الحوض"] ||
            product.specifications?.["حجم الحوض"];
        return tankSize != null ? String(tankSize) : null;
    };

    // ترتيب المتغيرات حسب الطاقة (الأصغر أولاً)
    const sortedVariants = [...variants].sort((a, b) => {
        const aWatt = parseInt(getVariantLabel(a)) || 0;
        const bWatt = parseInt(getVariantLabel(b)) || 0;
        return aWatt - bWatt;
    });

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" dir="rtl">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    <span id="legacy-variant-title">{title}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                    role="group"
                    aria-labelledby="legacy-variant-title"
                >
                    {sortedVariants.map((variant) => {
                        const isSelected = variant.id === currentProduct.id;
                        const label = getVariantLabel(variant);
                        const tankSize = getTankSize(variant);
                        const inStock = (variant.stock ?? 0) > 0;
                        const price = typeof variant.price === "number"
                            ? variant.price
                            : parseFloat(String(variant.price)) || 0;

                        return (
                            <Link
                                key={variant.id}
                                href={`/products/${variant.slug}`}
                                aria-current={isSelected ? "page" : undefined}
                                aria-label={`${label}${tankSize ? `، ${tankSize}` : ""}، ${price.toLocaleString()} د.ع${!inStock ? "، غير متوفر" : ""}`}
                                className={cn(
                                    "block relative rounded-xl border-2 p-4 transition-all duration-200",
                                    "hover:border-primary/50 hover:shadow-md",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                    "min-h-[140px] flex flex-col items-center justify-center",
                                    isSelected
                                        ? "border-primary bg-primary/10 shadow-sm"
                                        : "border-muted bg-background",
                                    !inStock && "opacity-60"
                                )}
                            >
                                {/* علامة الاختيار */}
                                {isSelected && (
                                    <div className="absolute top-2 left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary-foreground" aria-hidden="true" />
                                    </div>
                                )}

                                {/* التسمية (الطاقة) */}
                                <div className="text-center mb-2">
                                    <span className={cn(
                                        "text-xl font-bold",
                                        isSelected ? "text-primary" : "text-foreground"
                                    )}>
                                        {label}
                                    </span>
                                </div>

                                {/* قياس الحوض */}
                                {tankSize && (
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                                        <Ruler className="w-3 h-3" aria-hidden="true" />
                                        <span>{tankSize}</span>
                                    </div>
                                )}

                                {/* السعر */}
                                <div className="text-center">
                                    <span className="text-sm font-semibold">
                                        {price.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-muted-foreground mr-1">د.ع</span>
                                </div>

                                {/* حالة المخزون */}
                                {!inStock && (
                                    <Badge variant="secondary" className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px]" aria-hidden="true">
                                        غير متوفر
                                    </Badge>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* نصيحة */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <span className="text-lg">💡</span>
                        <span>
                            <strong>نصيحة:</strong> اختر الحجم بناءً على طول حوضك.
                            {isHeater
                                ? " قوة السخان يجب أن تتناسب مع حجم الماء."
                                : " الإضاءة الأقوى تناسب الأحواض الأكبر والنباتات."}
                        </span>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * نسخة مصغرة للعرض السريع
 */
export function ProductVariantSelectorCompact({
    currentProduct,
    variants,
}: Omit<ProductVariantSelectorProps, "title">) {
    if (!variants || variants.length <= 1) {
        return null;
    }

    const getVariantLabel = (product: Product): string => {
        // English wattage
        const wattMatchEn = product.name?.match(/(\d+)\s*W/i);
        if (wattMatchEn) return `${wattMatchEn[1]}W`;
        // Arabic wattage
        const wattMatchAr = product.name?.match(/(\d+)\s*واط/);
        if (wattMatchAr) return `${wattMatchAr[1]} واط`;
        // Flow rate
        const flowMatch = product.name?.match(/(\d+)\s*لتر\/ساعة/);
        if (flowMatch) return `${flowMatch[1]} ل/س`;
        // Size names
        const sizeMatch = product.name?.match(/-\s*(صغير|متوسط|كبير|كبير جداً)$/);
        if (sizeMatch) return sizeMatch[1];
        return product.name?.split("-").pop()?.trim() || "";
    };

    return (
        <div className="flex flex-wrap gap-2" dir="rtl" role="group" aria-label="خيارات الحجم">
            {variants.map((variant) => {
                const isSelected = variant.id === currentProduct.id;
                const label = getVariantLabel(variant);

                return (
                    <Link
                        key={variant.id}
                        href={`/products/${variant.slug}`}
                        aria-current={isSelected ? "page" : undefined}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all min-h-11 inline-flex items-center",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}
