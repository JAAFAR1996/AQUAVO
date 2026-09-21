import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { useWishlist, WishlistItem } from "@/contexts/wishlist-context";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

export default function Wishlist() {
  const { t } = useTranslation("account");
  const { items, removeItem, clearWishlist, totalItems } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { toast } = useToast();
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleRemoveFromWishlist = (id: string, name: string) => {
    removeItem(id);
    toast({
      title: t("wishlist.s1"),
      description: t("wishlist.s2", { v0: name }),
    });
  };

  const handleAddToCart = (item: WishlistItem) => {
    // Convert WishlistItem to Product-like object for cart
    addToCart({
      id: item.id,
      slug: item.slug,
      name: item.name,
      brand: item.brand,
      price: item.price,
      originalPrice: item.originalPrice,
      rating: item.rating,
      reviewCount: 0,
      thumbnail: item.image,
      images: [item.image],
      category: item.category,
    });
    toast({
      title: t("wishlist.s3"),
      description: t("wishlist.s4", { v0: item.name }),
    });
  };

  const handleClearWishlist = () => {
    clearWishlist();
    setShowClearDialog(false);
    toast({
      title: t("wishlist.s5"),
      description: t("wishlist.s6"),
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <MetaTags
        title={t("wishlist.s7")}
        description={t("wishlist.s8")}
        noIndex={true}
      />

      <main className="flex-1 container mx-auto px-4 py-8" id="main-content">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-950/30 p-3 rounded-full">
                <Heart className="h-6 w-6 text-red-500 fill-current" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{t("wishlist.s7")}</h1>
                <p className="text-muted-foreground mt-1">
                  {totalItems > 0 ? t("wishlist.s9", { v0: totalItems }) : t("wishlist.s10")}
                </p>
              </div>
            </div>
            {totalItems > 0 && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                {t("wishlist.s11")}
              </Button>
            )}
          </div>
          {totalItems > 0 && (
            <Badge variant="secondary" className="text-sm">
              {totalItems} {t("wishlist.s12")}
            </Badge>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted/30 p-8 rounded-full mb-6">
              <Heart className="h-24 w-24 text-muted-foreground/50" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("wishlist.s13")}</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t("wishlist.s14")}
            </p>
            <Link href="/products">
              <Button size="lg" className="gap-2">
                {t("wishlist.s15")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        )}

        {/* Wishlist Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <Card
                key={item.id}
                className="group overflow-hidden border-muted hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Image */}
                <Link href={`/products/${item.slug}`}>
                  <div className="relative pt-[100%] bg-muted/20 overflow-hidden cursor-pointer">
                    <img
                      src={item.image}
                      alt={t("wishlist.s16", { v0: item.name })}
                      className="absolute inset-0 w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal"
                      loading="lazy"
                    />
                  </div>
                </Link>

                <CardContent className="p-4 space-y-3">
                  {/* Brand */}
                  <div className="text-sm text-muted-foreground">{item.brand}</div>

                  {/* Title */}
                  <Link href={`/products/${item.slug}`}>
                    <h3 className="font-bold text-lg leading-tight transition-colors line-clamp-2 h-14 hover:text-primary cursor-pointer">
                      {item.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    {item.price > 0 ? (
                      <>
                        <span className="text-xl font-bold text-primary">
                          {item.price.toLocaleString("en-US")} {t("wishlist.s17")}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-sm text-muted-foreground line-through">
                            {item.originalPrice.toLocaleString("en-US")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{t("wishlist.s18")}</span>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 text-sm text-amber-500">
                    <span aria-hidden="true">★</span>
                    <span className="font-medium text-foreground">{item.rating}</span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleAddToCart(item)}
                    aria-label={t("wishlist.s19", { v0: item.name })}
                  >
                    <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                    {t("wishlist.s20")}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveFromWishlist(item.id, item.name)}
                    aria-label={t("wishlist.s21", { v0: item.name })}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Clear All Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("wishlist.s22")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("wishlist.s23")}{totalItems} {t("wishlist.s24")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("wishlist.s25")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearWishlist}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t("wishlist.s11")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
