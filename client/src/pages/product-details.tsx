import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Product, type ProductVariant } from "@/types";
import { fetchProductBySlug, fetchProductVariants } from "@/lib/api";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPrice } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, Star, Truck, RotateCcw, Shield, Info, Heart, Share2, Leaf, ShieldCheck, Check, AlertTriangle, Package, FileText, ExternalLink, Clock } from "lucide-react";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { useCart } from "@/contexts/cart-context";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { CompareButton } from "@/components/products/product-comparison";
import { useToast } from "@/hooks/use-toast";
import { ProductReviews } from "@/components/products/product-reviews";
import { ProductImageGallery } from "@/components/products/product-image-gallery";
import { Product3DViewer } from "@/components/products/product-3d-viewer";
import { ExplodedProductView } from "@/components/products/exploded-product-view";
import { FrequentlyBoughtTogether } from "@/components/products/frequently-bought-together";
import { ProductVariantSelector } from "@/components/products/product-variant-selector";
import { EmbeddedVariantSelector } from "@/components/products/embedded-variant-selector";
import { MultiDimensionVariantSelector } from "@/components/products/multi-dimension-variant-selector";
import { ProductSpecificationsTable } from "@/components/products/product-specifications-table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from "wouter";

import { BackToTop } from "@/components/back-to-top";
import { MetaTags, ProductSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { fetchFrequentlyBoughtTogether, fetchSimilarProducts, fetchTrendingProducts } from "@/lib/recommendations";
import { ProductCard } from "@/components/products/product-card";
import { ttqViewContent, ttqAddToCart } from "@/lib/tiktok-pixel";
import { metaTrackViewContent, metaTrackAddToCart } from "@/lib/meta-pixel";
import { trackViewItem, trackAddToCart } from "@/lib/analytics";
import { phTrackViewContent, phTrackAddToCart, phTrackWhatsAppClick } from "@/lib/posthog";
import { DELIVERY_FEE, DELIVERY_DAYS, WHATSAPP_URL } from "@/lib/constants/shipping";

interface Product3DMeta {
  src: string;
  poster?: string;
  label?: string;
  pieceCode?: string;
}

function readProduct3DMeta(specifications: Product["specifications"] | undefined): Product3DMeta | null {
  const rawMeta = (specifications as Record<string, unknown> | undefined)?.__model3d;
  if (!rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta)) {
    return null;
  }

  const meta = rawMeta as Record<string, unknown>;
  if (typeof meta.src !== "string" || meta.src.trim().length === 0) {
    return null;
  }

  return {
    src: meta.src,
    poster: typeof meta.poster === "string" ? meta.poster : undefined,
    label: typeof meta.label === "string" ? meta.label : undefined,
    pieceCode: typeof meta.pieceCode === "string" ? meta.pieceCode : undefined,
  };
}

export default function ProductDetails() {
  const params = useParams();
  const slug = params.slug;
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  // Related products are rendered by <RecommendationsSection/> below (dedicated
  // endpoints). The previous full-catalog fetch here was unused dead code and is removed.

  // Fetch product variants (related sizes) - for legacy products without embedded variants
  const { data: legacyVariants = [] } = useQuery({
    queryKey: ["product-variants", slug],
    queryFn: () => fetchProductVariants(slug!),
    enabled: !!slug && !!product && !product.hasVariants,
  });

  // Use embedded variants if available, otherwise use legacy
  const hasEmbeddedVariants = product?.hasVariants && product?.variants && product.variants.length > 0;

  // Set default variant on product load
  useEffect(() => {
    if (hasEmbeddedVariants && product?.variants && !selectedVariant) {
      const defaultVariant = product.variants.find(v => v.isDefault) || product.variants[0];
      setSelectedVariant(defaultVariant);
    }
  }, [hasEmbeddedVariants, product?.variants]);

  // Current display values (from selected variant or product)
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;

  // Tracks which productId has already fired ViewContent — prevents double-fire
  // caused by displayPrice changing when selectedVariant initializes after product loads.
  const viewContentFiredForId = useRef<string | null>(null);

  // ViewContent: fires once per product, after variant price is resolved
  useEffect(() => {
    // For products with embedded variants, wait until selectedVariant is set
    const variantReady = !hasEmbeddedVariants || selectedVariant !== null;
    if (!product || displayPrice <= 0 || !variantReady) return;
    if (viewContentFiredForId.current === product.id) return;
    viewContentFiredForId.current = product.id;

    ttqViewContent({
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(displayPrice),
      brand: product.brand,
      description: product.description,
    });
    metaTrackViewContent({
      productId: product.id,
      productName: product.name,
      priceIQD: Number(displayPrice),
      category: product.category,
    });
    trackViewItem({
      id: product.id,
      name: product.name,
      price: Number(displayPrice),
      category: product.category,
    });
    phTrackViewContent({
      id: product.id,
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: Number(displayPrice),
      available: (product.stock ?? 0) > 0,
    });
  }, [product?.id, displayPrice, hasEmbeddedVariants, selectedVariant?.id]);

  const displayOriginalPrice = selectedVariant?.originalPrice ?? product?.originalPrice;
  const displayStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const isOutOfStock = product?.stock === 0 || (hasEmbeddedVariants && selectedVariant?.stock === 0);
  const displayModel = selectedVariant?.specifications?.['الموديل'] ?? product?.specifications?.['الموديل'];
  const product3DMeta = readProduct3DMeta(product?.specifications);
  const exactPieceCode = product3DMeta?.pieceCode ?? product3DMeta?.label;

  // أي منتج لديه سعر أكبر من صفر يمكن شراؤه
  const isPurchasableBrand = true; // Removed brand restriction — all brands are available
  const variantMinPriceDetail = (product?.hasVariants && product?.variants?.length)
    ? Math.min(...product.variants.map(v => v.price))
    : undefined;
  const hasPrice = (displayPrice > 0 || (variantMinPriceDetail !== undefined && variantMinPriceDetail > 0));

  const handleAddToCart = () => {
    if (product) {
      // IMPORTANT: Always use the BASE product ID for cart API
      // The variant-specific ID (e.g. "yxl-003-small") doesn't exist in DB
      const variantLabel = selectedVariant?.label || "";
      const variantId = selectedVariant?.id || "";
      const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;
      const productToAdd = selectedVariant
        ? {
          ...product,
          name: product.name,
          price: selectedVariant.price,
          id: product.id, // ← Always use base product ID (NOT variant composite ID)
          // Metadata for cart-context to pass to server
          _variantLabel: variantLabel || undefined,
          _variantId: variantId || undefined,
        }
        : product;

      addItem(productToAdd, quantity);
      // TikTok Pixel: AddToCart event
      const trackPrice = Number(productToAdd.price) > 0 ? Number(productToAdd.price) : Number(displayPrice);
      if (trackPrice > 0) {
        ttqAddToCart({
          id: productToAdd.id,
          name: displayName,
          price: trackPrice,
          quantity,
          category: product.category,
        });
        // Meta Pixel: AddToCart event
        metaTrackAddToCart({
          productId: productToAdd.id,
          productName: displayName,
          priceIQD: trackPrice,
          quantity,
          category: product.category,
        });
        // GA4: add_to_cart event
        trackAddToCart({
          id: productToAdd.id,
          name: displayName,
          price: trackPrice,
          quantity,
        });
        phTrackAddToCart({
          id: productToAdd.id,
          name: displayName,
          price: trackPrice,
          quantity,
          category: product.category,
        });
      }
      setIsAddedToCart(true);
      toast({
        title: "تمت الإضافة",
        description: `${quantity > 1 ? `${quantity} قطع من ` : ""}${displayName} انضاف للسلة.`,
      });
      setTimeout(() => setIsAddedToCart(false), 2000);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 99)) {
      setQuantity(newQuantity);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    const shareData = {
      title: product.name,
      text: `${product.name} - ${Number(product.price).toLocaleString('en-US')} د.ع`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "تمت المشاركة",
          description: "تم مشاركة المنتج بنجاح",
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "تم نسخ الرابط",
          description: "تم نسخ رابط المنتج إلى الحافظة",
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "خطأ",
          description: "تعذرت مشاركة المنتج",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto py-8">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto py-8 text-center bg-destructive/5 rounded-lg p-8 m-8 border border-destructive/20">
          <h1 className="text-2xl font-bold mb-4">المنتج غير موجود</h1>
          <p className="text-muted-foreground mb-4">عذراً، لم نتمكن من العثور على المنتج المطلوب.</p>
          <Button onClick={() => setLocation("/products")}>تصفح المنتجات</Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate rating
  const productRating = Number(product.rating || 0);
  const reviewCount = product.reviewCount || 0;
  const inStock = displayStock > 0;

  const breadcrumbItems = [
    { name: "الرئيسية", url: "https://www.aquavoiq.com/" },
    { name: "المنتجات", url: "https://www.aquavoiq.com/products" },
    { name: product.name, url: `https://www.aquavoiq.com/products/${product.slug}` }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MetaTags
        title={product.name}
        description={product.specs?.substring(0, 160) || `تسوق ${product.name} من AQUAVO بأفضل الأسعار.`}
        image={product.image || product.thumbnail || 'https://www.aquavoiq.com/og-image.jpg'}
        type="product"
        price={product.price}
      />

      <ProductSchema
        name={product.name}
        description={product.description || ""}
        image={product.image || product.thumbnail || ""}
        price={displayPrice}
        brand={product.brand}
        inStock={inStock}
        rating={productRating}
        reviewCount={reviewCount}
      />

      <BreadcrumbSchema items={breadcrumbItems} />

      <Navbar />
      <main id="main-content" className="flex-1 py-8 md:py-12" dir="rtl">
        <div className="container mx-auto px-4">
          <>
            {/* Breadcrumbs */}
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/">الرئيسية</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/products">المنتجات</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{product.category}</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{product.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Product Header */}
            {product.explodedViewParts && product.explodedViewParts.length > 0 && (
              <div className="mb-12">
                <ExplodedProductView product={product} />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-12">
              {/* Product Image Gallery with Zoom */}
              <div className="relative">
                {/* Product Badges */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  {product.isNew && <Badge className="bg-blue-500 shadow-lg">جديد</Badge>}
                  {product.isBestSeller && <Badge className="bg-amber-500 shadow-lg">الأكثر مبيعاً</Badge>}
                  {product.ecoFriendly && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1 shadow-lg">
                      <Leaf className="w-3 h-3" /> صديق للبيئة
                    </Badge>
                  )}
                </div>

                {product3DMeta ? (
                  <>
                    {/* 3D Viewer — يظهر مباشرة أول ما تفتح الصفحة */}
                    <Product3DViewer
                      src={product3DMeta.src}
                      poster={product3DMeta.poster}
                      productName={product.name}
                      pieceCode={exactPieceCode}
                    />
                    {/* الصور الفوتوغرافية تحت كمرجع */}
                    <div className="mt-4">
                      <ProductImageGallery
                        images={
                          selectedVariant?.image
                            ? [selectedVariant.image, ...product.images.filter(img => img !== selectedVariant.image)]
                            : (product.images && product.images.length > 0 ? product.images : (product.thumbnail ? [product.thumbnail] : (product.image ? [product.image] : [])))
                        }
                        productName={product.name}
                      />
                    </div>
                  </>
                ) : (
                  <ProductImageGallery
                    images={
                      selectedVariant?.image
                        ? [selectedVariant.image, ...product.images.filter(img => img !== selectedVariant.image)]
                        : (product.images && product.images.length > 0 ? product.images : (product.thumbnail ? [product.thumbnail] : (product.image ? [product.image] : [])))
                    }
                    productName={product.name}
                  />
                )}
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-primary font-semibold text-sm">{product.brand}</span>
                  <DifficultyBadge level={product.difficulty} />
                </div>

                <h1 className="text-xl md:text-2xl font-bold mb-4">{product.name}</h1>

                {product3DMeta && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                      القطعة نفسها التي تستلمها
                    </Badge>
                    <Badge variant="outline">
                      عرض 3D
                    </Badge>
                    {exactPieceCode && (
                      <Badge variant="outline">
                        {exactPieceCode}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Display Model */}
                {displayModel && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground bg-secondary/20 p-2 rounded-md w-fit border border-border/50">
                    <span className="font-semibold text-xs px-2 py-1 bg-primary/10 text-primary rounded-md uppercase tracking-wider">الموديل</span>
                    <span className="font-mono text-base font-medium">{displayModel}</span>
                  </div>
                )}

                {/* Rating — hide if no reviews */}
                {product.reviewCount > 0 && (
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(product.rating) ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.rating} ({product.reviewCount} تقييم)
                  </span>
                </div>
                )}

                <div className="mb-4">
                  {hasPrice ? (
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-4xl font-bold text-primary">
                        {formatPrice(displayPrice)}
                      </span>
                      {displayOriginalPrice && displayOriginalPrice > displayPrice && (
                        <span className="text-xl text-muted-foreground line-through decoration-destructive decoration-2">
                          {formatPrice(displayOriginalPrice)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-muted-foreground">قريباً</span>
                    </div>
                  )}
                </div>

                {/* Product Variants - Check for multi-dimensional first, then embedded */}
                {hasEmbeddedVariants && product.variants && (
                  <div className="mb-6">
                    {/* Try MultiDimensionVariantSelector first (for color + size products) */}
                    <MultiDimensionVariantSelector
                      variants={product.variants}
                      selectedVariantId={selectedVariant?.id || ""}
                      onVariantSelect={setSelectedVariant}
                    />
                    {/* Fall back to EmbeddedVariantSelector for single-dimension variants */}
                    {!product.variants.some(v => v.specifications?.["اللون"] && v.specifications?.["الحجم"]) && (
                      <EmbeddedVariantSelector
                        variants={product.variants}
                        selectedVariantId={selectedVariant?.id || ""}
                        onVariantSelect={setSelectedVariant}
                        productCategory={product.category}
                      />
                    )}
                  </div>
                )}

                {/* Product Variants - Legacy (separate products) */}
                {!hasEmbeddedVariants && legacyVariants && legacyVariants.length > 1 && (
                  <div className="mb-6">
                    <ProductVariantSelector
                      currentProduct={product}
                      variants={legacyVariants}
                    />
                  </div>
                )}

                {/* Stock Status */}
                <div className="flex items-center gap-2 mb-4">
                  {displayStock > 0 ? (
                    displayStock <= 5 ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          متبقي {displayStock} فقط
                        </span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          متوفر
                        </span>
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

                {/* Shipping Info */}
                <div className="flex flex-col gap-1 mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="font-medium">التوصيل: 5,000 د.ع لكل العراق</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>يوصل خلال 24 ساعة</span>
                  </div>
                </div>

                {/* Description — progressive disclosure for long text */}
                <div className="text-muted-foreground text-sm leading-relaxed mb-6" style={{ whiteSpace: 'pre-line' }}>
                  {(product.description?.length ?? 0) > 220 && !descriptionExpanded
                    ? product.description?.slice(0, 220) + "..."
                    : product.description}
                  {(product.description?.length ?? 0) > 220 && (
                    <button
                      onClick={() => setDescriptionExpanded((v) => !v)}
                      className="block mt-2 text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors text-sm"
                    >
                      {descriptionExpanded ? "اقرأ أقل" : "اقرأ المزيد"}
                    </button>
                  )}
                </div>

                {product3DMeta && (
                  <div className="mb-6 grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>هاي القطعة مو صورة تمثيلية؛ هذا نفس الشكل اللي تستلمه.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>تقدر تلفها 3D وتشوف تفاصيلها من كل زاوية قبل الشراء.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>مناسبة للي يريد يضيف عمق وشخصية طبيعية لترتيب الحوض.</span>
                    </div>
                  </div>
                )}

                {/* Quantity & Add to Cart */}
                {hasPrice && displayStock > 0 && (
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">الكمية:</label>
                      <div className="flex items-center border rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-r-lg rounded-l-none"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          aria-label="تقليل الكمية"
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-semibold">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-l-lg rounded-r-none"
                          onClick={() => handleQuantityChange(1)}
                          disabled={quantity >= displayStock}
                          aria-label="زيادة الكمية"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        size="lg"
                        className={`flex-1 gap-2 text-lg h-12 transition-all duration-300 ${isAddedToCart ? 'bg-green-500 hover:bg-green-600' : ''
                          }`}
                        onClick={handleAddToCart}
                      >
                        {isAddedToCart ? (
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
                      <WishlistButton
                        product={product}
                        variant="default"
                        size="lg"
                        className="gap-2"
                      />
                      <CompareButton
                        productId={product.id}
                        variant="full"
                        className="h-11 px-4"
                      />
                      <Button size="lg" variant="outline" onClick={handleShare} aria-label="مشاركة المنتج">
                        <Share2 className="w-5 h-5" />
                      </Button>
                    </div>
                    {/* WhatsApp CTA — secondary */}
                    <a
                      href={`${WHATSAPP_URL}?text=${encodeURIComponent(`مرحباً، أسأل عن ${product.name} ${window.location.href}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-md border border-green-600/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 text-sm font-medium transition-colors"
                      onClick={() => {
                        import("@/lib/analytics").then(m => m.trackWhatsAppClick("product", product.name));
                        phTrackWhatsAppClick({ sourcePage: "product", productName: product.name });
                      }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.624-1.467A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.115 0-4.142-.57-5.913-1.652l-.424-.252-2.744.871.876-2.67-.276-.44A9.72 9.72 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/></svg>
                      دعم AQUAVO متوفر 24/7
                    </a>
                  </div>
                )}

                {/* Out of Stock Button */}
                {!hasPrice && (
                  <Button size="lg" variant="outline" className="w-full gap-2 h-12 mb-6" disabled>
                    <Package className="w-5 h-5" />
                    قريباً
                  </Button>
                )}
                {hasPrice && displayStock <= 0 && (
                  <Button size="lg" variant="outline" className="w-full gap-2 h-12 mb-6">
                    <Package className="w-5 h-5" />
                    أبلغني عند التوفر
                  </Button>
                )}

                {/* Quick Info */}
                <Card className="border-primary/20">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">توصيل خلال 24 ساعة</p>
                          <p className="text-xs text-muted-foreground">لكل العراق</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <RotateCcw className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">استبدال المعيب</p>
                          <p className="text-xs text-muted-foreground">إذا وصل تالف</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {product3DMeta ? "نفس القطعة" : "ضمان الجودة"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product3DMeta ? "مو صورة تمثيلية" : "منتج أصلي"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* YEE Certificate of Authenticity - Trust Signal */}
                {product?.brand?.toLowerCase() === 'yee' && (
                  <Link href="/verify-certificate/yee" className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-l from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border border-yellow-200 dark:border-yellow-800/40 hover:border-yellow-400 dark:hover:border-yellow-600 transition-all group mt-4 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                        منتجات YEE أصلية 100%
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                      <p className="text-xs text-yellow-600/80 dark:text-yellow-400/60">شهادة أصالة من الشركة المصنعة — اضغط للتحقق</p>
                    </div>
                    <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  </Link>
                )}
              </div>
            </div>

            {/* Detailed Information Tabs */}
            <Tabs defaultValue="benefits" className="mb-12">
              <TabsList className="w-full justify-start gap-2 flex-wrap h-auto p-2">
                <TabsTrigger value="benefits" className="rounded-full">لماذا هذا المنتج؟</TabsTrigger>
                <TabsTrigger value="specs" className="rounded-full">المواصفات الفنية</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-full">التقييمات ({product.reviewCount ?? 0})</TabsTrigger>
                <TabsTrigger value="shipping" className="rounded-full">الشحن والإرجاع</TabsTrigger>
                <TabsTrigger value="usage" className="rounded-full">إرشادات الاستخدام</TabsTrigger>
              </TabsList>

              <TabsContent value="benefits" className="mt-6">
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Leaf className="w-5 h-5" />
                      لماذا تختار هذا المنتج؟
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border">
                          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">
                              {product3DMeta ? "قرار أوضح قبل الشراء" : "جودة مضمونة"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {product3DMeta
                                ? "تعاين نفس القطعة ثلاثي الأبعاد قبل ما تضيفها للسلة."
                                : `منتج أصلي 100% من علامة ${product.brand} العالمية`}
                            </p>
                          </div>
                        </div>
                        {/* Only show rating if there are reviews */}
                        {product.reviewCount > 0 && (
                          <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Star className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm">تقييم عالي</h3>
                              <p className="text-sm text-muted-foreground">حصل على {product.rating} من 5 نجوم من {product.reviewCount} عميل</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border">
                          <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Truck className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">توصيل خلال 24 ساعة</h3>
                            <p className="text-sm text-muted-foreground">لكل العراق مع تغليف آمن</p>
                          </div>
                        </div>
                      </div>

                      {/* Only show benefits if they exist in database */}
                      {Array.isArray(product.specifications?.benefits) && product.specifications.benefits.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-bold text-right">الفوائد الرئيسية:</h3>
                          <ul className="space-y-2 text-sm text-muted-foreground" dir="rtl">
                            {product.specifications.benefits.map((benefit: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-right">
                                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="specs" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      المواصفات التفصيلية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2">معلومات المنتج</h3>
                        <dl className="space-y-2">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">العلامة التجارية:</dt>
                            <dd className="font-medium">{product.brand}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">الفئة:</dt>
                            <dd className="font-medium">{product.category}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">مستوى الخبرة:</dt>
                            <dd className="font-medium">{product.difficulty}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">التقييم:</dt>
                            <dd className="font-medium">{product.rating}/5</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Custom Specifications Table */}
                    {product.specifications && Object.keys(product.specifications).length > 0 && (
                      <div className="mt-6">
                        <ProductSpecificationsTable
                          specifications={product.specifications}
                          category={product.category}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      تقييمات العملاء
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">


                    {/* Sample Reviews */}
                    <div className="space-y-4">
                      <ProductReviews
                        productId={product.id}
                        productName={product.name}
                      />
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-900">
                        اشتريت هذا المنتج؟ شاركنا تجربتك لمساعدة العملاء الآخرين!
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shipping" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      معلومات الشحن والإرجاع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4" dir="rtl">
                    <div>
                      <h3 className="font-semibold mb-2 text-right">سياسة الشحن</h3>
                      <ul className="list-disc space-y-1 text-muted-foreground text-right pr-5">
                        <li>توصيل ثابت لكل العراق: {DELIVERY_FEE.toLocaleString()} د.ع</li>
                        <li>يوصل خلال {DELIVERY_DAYS}</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-right">سياسة الاستبدال</h3>
                      <ul className="list-disc space-y-1 text-muted-foreground text-right pr-5">
                        <li>نستبدل المنتجات التالفة أو الخاطئة فقط</li>
                        <li>أبلغنا خلال 48 ساعة من الاستلام مع صور للمنتج</li>
                        <li>لا إرجاع لتغيير الرأي</li>
                        <li>تواصل معنا عبر واتساب للمطالبات</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      إرشادات الاستخدام والأمان
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4" dir="rtl">
                    <div>
                      <h3 className="font-semibold mb-2 text-right">طريقة الاستخدام</h3>
                      {Array.isArray(product.specifications?.usageInstructions) && product.specifications.usageInstructions.length > 0 ? (
                        <ul className="list-decimal list-inside space-y-1 text-muted-foreground text-right">
                          {product.specifications.usageInstructions.map((step: string, idx: number) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      ) : product.specifications?.["طريقة الاستخدام"] ? (
                        <p className="text-muted-foreground text-sm leading-relaxed text-right" style={{ whiteSpace: 'pre-line' }}>
                          {product.specifications["طريقة الاستخدام"]}
                        </p>
                      ) : (
                        <ul className="list-decimal list-inside space-y-1 text-muted-foreground text-right">
                          <li>اقرأ التعليمات الموجودة على العبوة بعناية</li>
                          <li>استخدم المنتج حسب التوصيات المذكورة</li>
                          <li>احفظ المنتج في مكان بارد وجاف بعيداً عن أشعة الشمس</li>
                          <li>تأكد من صلاحية المنتج قبل الاستخدام</li>
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-right">تحذيرات الأمان</h3>
                      {Array.isArray(product.specifications?.safetyWarnings) && product.specifications.safetyWarnings.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-right">
                          {product.specifications.safetyWarnings.map((warning: string, idx: number) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      ) : product.specifications?.["تحذيرات"] ? (
                        <p className="text-muted-foreground text-sm leading-relaxed text-right" style={{ whiteSpace: 'pre-line' }}>
                          {product.specifications["تحذيرات"]}
                        </p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-right">
                          <li>احفظ المنتج بعيداً عن متناول الأطفال</li>
                          <li>لا تستخدم المنتج بكميات أكبر من الموصى بها</li>
                          <li>في حالة ملامسة العينين، اغسلهما فوراً بالماء</li>
                          <li>استشر خبير أحواض السمك عند الشك</li>
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Frequently Bought Together (Real Data) */}
            <RecommendationsSection
              productId={product.id}
              type="frequently-bought-together"
              title="يتم شراؤها معاً عادةً"
            />


            {/* Similar Products (Real Data) */}
            <RecommendationsSection
              productId={product.id}
              type="similar"
              title="منتجات مشابهة قد تعجبك"
            />

            {/* Trending Products (Real Data) */}
            <RecommendationsSection
              productId={product.id}
              type="trending"
              title="الأكثر رواجاً الآن"
            />
          </>
        </div>
      </main>

      <BackToTop />
      <Footer />

      {/* P1.8: Sticky mobile Add to Cart bar */}
      {product && hasPrice && !isOutOfStock && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur border-t border-border p-3 flex items-center gap-3 safe-bottom">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary truncate">{formatPrice(displayPrice)}</p>
            <p className="text-xs text-muted-foreground truncate">{product.name}</p>
          </div>
          <Button
            size="sm"
            className="gap-2 h-10 px-6 font-bold shrink-0"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4" />
            أضف للسلة
          </Button>
        </div>
      )}
    </div>
  );
}

// --- New Recommendations Component ---

function RecommendationsSection({ productId, type, title }: { productId: string, type: 'frequently-bought-together' | 'similar' | 'trending', title: string }) {
  const { data: products, isLoading } = useQuery({
    queryKey: ['recommendations', type, productId],
    queryFn: () => {
      if (type === 'frequently-bought-together') return fetchFrequentlyBoughtTogether(productId);
      if (type === 'similar') return fetchSimilarProducts(productId);
      return fetchTrendingProducts();
    },
    enabled: !!productId
  });

  if (isLoading) return <div className="mt-16"><Skeleton className="h-64 w-full" /></div>;
  if (!products || products.length === 0) return null;

  return (
    <div className="mt-16">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
        {title}
        {type === 'trending' && <span className="text-sm font-normal text-red-500 bg-red-100 px-2 py-1 rounded-full animate-pulse">مباشر</span>}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product: Product) => (
          <div key={product.id} className="h-full">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}

