import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Star, Percent, Tag, TrendingDown, Timer, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { BackToTop } from "@/components/back-to-top";
import { Product } from "@/types";

export default function Deals() {
  const { data, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  });

  const { addItem } = useCart();
  const { toast } = useToast();

  // Filter products with discounts
  const dealsProducts = data?.products?.filter(
    (p: Product) => p.originalPrice && Number(p.originalPrice) > Number(p.price)
  ) || [];

  // Calculate discount percentage
  const getDiscountPercentage = (original: number, current: number) => {
    return Math.round(((original - current) / original) * 100);
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);

    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${product.name} إلى سلة التسوق`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12" dir="rtl">
        {/* Hero Section */}
        <div className="mb-12 text-center relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500 p-12 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h1 className="text-5xl font-bold">
                العروض والخصومات
              </h1>
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              اغتنم الفرصة! خصومات هائلة على منتجات مختارة لفترة محدودة
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Tag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{dealsProducts.length}</p>
                  <p className="text-sm text-muted-foreground">منتج بخصم</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingDown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">70%</p>
                  <p className="text-sm text-muted-foreground">خصم يصل إلى</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Timer className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">محدودة</p>
                  <p className="text-sm text-muted-foreground">عروض لفترة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-64" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dealsProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Percent className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">لا توجد عروض حالياً</h3>
              <p className="text-muted-foreground">
                تابعنا على وسائل التواصل الاجتماعي للحصول على آخر العروض والخصومات
              </p>
              <Link href="/products">
                <Button size="lg" className="mt-4">
                  تصفح جميع المنتجات
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                المنتجات المخفضة ({dealsProducts.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dealsProducts.map((product: Product) => {
                const discountPercent = getDiscountPercentage(
                  Number(product.originalPrice),
                  Number(product.price)
                );

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 relative"
                  >
                    {/* Discount Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-3 py-1 shadow-lg">
                        <Percent className="h-4 w-4 ml-1" />
                        {discountPercent}-
                      </Badge>
                    </div>

                    {/* Product Image */}
                    <Link href={`/products/${product.slug}`}>
                      <div className="relative aspect-square bg-muted/20 overflow-hidden cursor-pointer">
                        <img
                          src={product.thumbnail || product.images?.[0] || '/placeholder-product.png'}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-300"
                        />
                        {product.isNew && (
                          <Badge className="absolute top-4 left-4 bg-blue-500">
                            جديد
                          </Badge>
                        )}
                      </div>
                    </Link>

                    <CardContent className="p-4 space-y-3">
                      {/* Brand */}
                      <div className="text-xs text-muted-foreground font-medium">
                        {product.brand}
                      </div>

                      {/* Product Name */}
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="font-semibold text-sm line-clamp-2 h-10 hover:text-primary transition-colors cursor-pointer">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.floor(product.rating)
                                ? "fill-current"
                                : ""
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({product.reviewCount})
                        </span>
                      </div>

                      {/* Price */}
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {Number(product.price).toLocaleString()}{" "}
                            <span className="text-xs">د.ع</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            {Number(product.originalPrice).toLocaleString()} د.ع
                          </span>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            وفر {(Number(product.originalPrice) - Number(product.price)).toLocaleString()} د.ع
                          </Badge>
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        className="w-full gap-2 group-hover:bg-primary/90"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        أضف للسلة
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Call to Action */}
        <Card className="mt-16 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              لا تفوت عروضنا القادمة!
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              اشترك في نشرتنا البريدية واحصل على إشعارات فورية عند إضافة عروض جديدة
            </p>
            <form className="max-w-md mx-auto flex gap-3" onSubmit={(e) => {
              e.preventDefault();
              toast({
                title: "شكراً لك!",
                description: "تم الاشتراك بنجاح في النشرة البريدية",
              });
            }}>
              <input
                type="email"
                placeholder="بريدك الإلكتروني"
                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background"
                required
              />
              <Button type="submit" size="lg">
                اشترك الآن
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <WhatsAppWidget />
      <BackToTop />
      <Footer />
    </div>
  );
}
