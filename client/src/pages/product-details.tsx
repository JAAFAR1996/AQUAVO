import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchProductBySlug } from "@/lib/api";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetails() {
  const params = useParams();
  const slug = params.slug;
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  const handleAddToCart = () => {
    if (product) {
      addItem(product);
      toast({
        title: "تمت الإضافة للسلة ✓",
        description: `تم إضافة ${product.name} إلى سلة المشتريات.`,
      });
    }
  };

  if (isError) {
    return <div>Error loading product.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 bg-gray-50 dark:bg-gray-900 py-12 md:py-20">
        <div className="container mx-auto px-4">
          {isLoading || !product ? (
            <ProductSkeleton />
          ) : (
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Product Image */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <img
                  src={product.image}
                  alt={`صورة منتج ${product.name}`}
                  className="w-full h-auto object-contain aspect-square"
                />
              </div>

              {/* Product Info */}
              <div>
                <span className="text-primary font-semibold">{product.brand}</span>
                <h1 className="text-3xl md:text-4xl font-bold my-2">{product.name}</h1>

                <div className="flex items-center gap-2 text-amber-500 my-4">
                  <Star className="w-5 h-5" />
                  <span>{product.rating} ({product.reviewCount} تقييم)</span>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
                  {product.specs}
                </p>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-bold text-primary">
                    {product.price.toLocaleString()} د.ع
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-gray-400 line-through">
                      {product.originalPrice.toLocaleString()} د.ع
                    </span>
                  )}
                </div>

                <Button size="lg" className="w-full md:w-auto" onClick={handleAddToCart}>
                  <ShoppingCart className="ml-2 w-5 h-5" />
                  أضف إلى السلة
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

const ProductSkeleton = () => (
  <div className="grid md:grid-cols-2 gap-12">
    <Skeleton className="w-full h-auto aspect-square rounded-lg" />
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-12 w-full md:w-1/2" />
    </div>
  </div>
);
